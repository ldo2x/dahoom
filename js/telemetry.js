/* ===== دحوم — البلاغات وسجل المباريات =====
   يرسل لـ Firestore عن طريق REST (بدون مكتبة). أي شي ما ينرسل (نت مقطوع أو المفاتيح فاضية)
   يبقى بصندوق بالجهاز وينرسل بعدين.
*/
window.DahoomLog = (function(){
  const VER = 3;
  const CFG = () => window.DAHOOM_FB || {};
  const ready = () => !!(CFG().apiKey && CFG().projectId);
  const OUT = 'dahoom_outbox';
  const ls = { get(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} } };
  const dev = (()=>{ let v=null; try{ v=localStorage.getItem('dahoom_dev'); if(!v){ v=Math.random().toString(36).slice(2,10); localStorage.setItem('dahoom_dev',v); } }catch(e){ v='anon'; } return v; })();

  // أسباب البلاغ حسب النوع
  const REASONS = {
    q: ['الجواب غلط','أسهل من مستواه','أصعب من مستواه','السؤال مو واضح','قديم أو معلومة تغيرت','مكرر أو ممل'],
    c: ['صعبة تنمثّل','سهلة زيادة','أصعب من مستواها','أسهل من مستواها','مو مناسبة'],
    t: ['مستحيل أو صعب زيادة','سهل زيادة','الوقت مو مناسب','الجواب غلط','مو واضح','مو مناسب'],
    l: ['الجواب غلط','الجواب ما يبدأ بالحرف','صعب زيادة','سهل زيادة','السؤال مو واضح'],
    card: ['قوية زيادة','ضعيفة','وصفها مو واضح','ما اشتغلت صح (باق)','الصورة أو الصوت ما يناسب'],
  };
  const KIND_AR = { q:'سؤال', c:'بدون كلام', t:'تحدي', l:'سؤال حروف', card:'بطاقة' };

  // ---------- تحويل JSON لصيغة Firestore ----------
  function val(v){
    if(v===null || v===undefined) return { nullValue:null };
    if(v instanceof Date) return { timestampValue:v.toISOString() };
    if(typeof v==='boolean') return { booleanValue:v };
    if(typeof v==='number') return Number.isInteger(v) ? { integerValue:String(v) } : { doubleValue:v };
    if(typeof v==='string') return { stringValue:v };
    if(Array.isArray(v)) return { arrayValue: v.length ? { values:v.map(val) } : {} };
    return { mapValue:{ fields:fields(v) } };
  }
  function fields(o){ const f={}; Object.keys(o).forEach(k=>{ if(o[k]!==undefined) f[k]=val(o[k]); }); return f; }

  async function post(col, data){
    const c=CFG(), url=`https://firestore.googleapis.com/v1/projects/${c.projectId}/databases/(default)/documents/${col}?key=${c.apiKey}`;
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ fields:fields(data) }) });
    return r.status;
  }
  let flushing=false;
  async function flush(){
    if(flushing || !ready() || !navigator.onLine) return; flushing=true;
    try{
      let box=ls.get(OUT,[]);
      while(box.length){
        const it=box[0]; let st=0;
        try{ st=await post(it.col, Object.assign({}, it.data, { at:new Date(it.at) })); }catch(e){ st=0; }
        // نجح أو انرفض نهائياً (قوانين) = نشيله. نت أو ضغط = نوقف ونحاول بعدين
        if(st===0 || st===429 || st>=500) break;
        if(st>=400) console.warn('[DahoomLog] rejected', st, it.col);
        box=ls.get(OUT,[]); box.shift(); ls.set(OUT, box);
      }
    } finally { flushing=false; }
  }
  function queue(col, data){
    const box=ls.get(OUT,[]); box.push({ col, at:Date.now(), data:Object.assign({ v:VER, dev }, data) });
    while(box.length>60) box.shift();
    ls.set(OUT, box); flush();
  }
  window.addEventListener('online', flush);
  setTimeout(flush, 3000);

  const clip = (s,n) => String(s==null?'':s).slice(0,n);

  // ---------- البلاغ ----------
  // item: {kind, id, text, answer, d, tag}
  function report(item, reason, note, by){
    queue('reports', { kind:item.kind, item:clip(item.id,20), text:clip(item.text,400), answer:clip(item.answer,200), d:item.d||0, tag:clip(item.tag,40),
      reason:clip(reason,60), note:clip(note,400), by:clip(by||'المضيف',30), status:'open' });
  }
  // نافذة البلاغ على الشاشة الكبيرة
  function openReport(item){
    const D=window.Dahoom; if(!D || !item) return;
    const esc=D.esc, list=REASONS[item.kind]||[];
    let pick=null;
    D.modal(`<div class="eyebrow">بلاغ — ${KIND_AR[item.kind]||''}</div>
      <div class="rep-item"><b>${esc(item.text)}</b>${item.answer?`<span class="muted small">الجواب: ${esc(item.answer)}</span>`:''}</div>
      <div class="rep-reasons">${list.map((r,i)=>`<button class="btn small ghost" data-r="${i}">${esc(r)}</button>`).join('')}</div>
      <textarea class="rep-note" maxlength="300" placeholder="ملاحظة (اختياري): وش الصح؟ وش المشكلة؟"></textarea>
      <div class="row center mt-s"><button class="btn btn-hype" data-send disabled>أرسل البلاغ</button><button class="btn ghost" data-x>إلغاء</button></div>`,{onMount(m){
        m.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{ pick=list[+b.dataset.r]; m.querySelectorAll('[data-r]').forEach(x=>x.classList.toggle('btn-hype', x===b)); m.querySelector('[data-send]').disabled=false; });
        m.querySelector('[data-x]').onclick=()=>m.remove();
        m.querySelector('[data-send]').onclick=()=>{ report(item, pick, m.querySelector('.rep-note').value.trim(), 'المضيف'); m.remove(); D.toast('وصل البلاغ — شكراً'); D.play('pop'); };
      }});
  }

  // ---------- سجل المباراة ----------
  function match(doc){ queue('matches', doc); }

  return { report, openReport, match, REASONS, KIND_AR, ready, flush, dev, pending:()=>ls.get(OUT,[]).length, clip };
})();

// زر "بلّغ" بالشاشة: يبلّغ عن آخر سؤال/تحدي/عبارة ظهرت
document.addEventListener('click', e=>{
  if(!e.target.closest('[data-report]')) return;
  const it=window.DAHOOM_ITEM;
  if(it) window.DahoomLog.openReport(it);
  else window.Dahoom.toast('البلاغ يكون على آخر سؤال أو تحدي ظهر — ما ظهر شي للحين. للبطاقات: افتح البطاقة واضغط بلّغ');
});
