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
    w: ['صعبة ترسم','سهلة زيادة','أصعب من مستواها','أسهل من مستواها','مو مناسبة'],
    card: ['قوية زيادة','ضعيفة','وصفها مو واضح','ما اشتغلت صح (باق)','الصورة أو الصوت ما يناسب'],
    other: ['مشكلة بالاتصال','شي بالشكل أو الواجهة','خطأ باللعبة','اقتراح','شي ثاني'],
  };
  const KIND_AR = { q:'سؤال', c:'بدون كلام', t:'تحدي', l:'سؤال حروف', w:'كلمة رسم', card:'بطاقة', other:'شي ثاني' };

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
    // السجلات كبيرة: لو الصندوق ما وسع، نشيل سجلات البلاغات القديمة أول، وبعدين حتى الجديد (البلاغ نفسه أهم)
    const save = () => { try{ localStorage.setItem(OUT, JSON.stringify(box)); return true; }catch(e){ return false; } };
    if(!save()){ box.slice(0,-1).forEach(it=>{ if(it.data) delete it.data.log; }); if(!save()){ box.forEach(it=>{ if(it.data) delete it.data.log; }); save(); } }
    flush();
  }
  window.addEventListener('online', flush);
  setTimeout(flush, 3000);

  const clip = (s,n) => String(s==null?'':s).slice(0,n);

  // ---------- سجل الأحداث (للبلاغات) ----------
  // كل جهاز يحفظ آخر 200 حدث (ضغطات، شاشات، رسائل الاتصال، تنبيهات، أخطاء). لما أحد يبلّغ،
  // البلاغ ينرسل ومعه: سجل هالجهاز + حالته الحالية + سجلات كل الأجهزة الثانية بالجلسة (الشاشة تطلبها من الجوالات والعكس).
  // اللي يتسجل: أسماء الأزرار والشاشات وأنواع الرسائل — مو اللي يكتبه اللاعب بالحقول.
  const T0 = Date.now(), TRAIL = [], TRAIL_MAX = 200, SNAPS = {};
  let PEERS = null, lastTrail = '', lastTrailN = 0;
  const hhmmss = t => { const d=new Date(t); return [d.getHours(),d.getMinutes(),d.getSeconds()].map(x=>String(x).padStart(2,'0')).join(':'); };
  function trail(msg){
    try{
      msg = String(msg||'').replace(/\s+/g,' ').trim().slice(0,180); if(!msg) return;
      if(msg===lastTrail && TRAIL.length){ lastTrailN++; TRAIL[TRAIL.length-1].n=lastTrailN; return; }   // نفس الحدث ورا بعض: نعدّه بدل ما نكرره
      lastTrail=msg; lastTrailN=1;
      TRAIL.push({ t:Date.now(), m:msg }); if(TRAIL.length>TRAIL_MAX) TRAIL.shift();
    }catch(e){}
  }
  // صفحة تسجّل وش يطلع بحالتها: addSnap('الجلسة', ()=>({...}))
  const addSnap = (name, fn) => { SNAPS[name]=fn; };
  // الصفحة تسجّل كيف تجيب سجلات الأجهزة الثانية: fn(ms) → Promise<[{who, dump}]>
  const setPeers = fn => { PEERS = fn; };
  function deviceLine(){
    const c = navigator.connection || {};
    const up = Math.round((Date.now()-T0)/1000);
    return [where(), browser(), BUILD?'نسخة '+BUILD:'', `الشاشة ${innerWidth}×${innerHeight}`, c.effectiveType?'النت '+c.effectiveType:'', navigator.onLine===false?'بدون نت':'',
      document.visibilityState==='hidden'?'الصفحة بالخلفية':'', `مفتوحة من ${Math.floor(up/60)}د ${up%60}ث`, 'الجهاز '+dev].filter(Boolean).join(' · ');
  }
  function snapText(){
    const out=[];
    Object.keys(SNAPS).forEach(k=>{ let v; try{ v=SNAPS[k](); }catch(e){ v='(ما قدرنا نقرا: '+(e&&e.message)+')'; }
      let s; try{ s = typeof v==='string' ? v : JSON.stringify(v); }catch(e){ s=String(v); }
      out.push(`${k}: ${String(s).slice(0,3000)}`); });
    return out.join('\n');
  }
  // نص واحد فيه كل شي عن هالجهاز
  function dump(max){
    max = max || 14000;
    const head = `== ${where()} ==\n${deviceLine()}\n${snapText()}\n-- آخر الأحداث (الأقدم فوق) --\n`;
    const lines = TRAIL.map(x=>`${hhmmss(x.t)} ${x.m}${x.n>1?` (×${x.n})`:''}`);
    let body = lines.join('\n');
    while(body.length > max-head.length && lines.length>10){ lines.splice(0, Math.ceil(lines.length/5)); body='…\n'+lines.join('\n'); }
    return (head+body).slice(0, max);
  }
  async function gather(){
    const log = { here: dump(14000), peers: [] };
    if(PEERS){
      try{
        const list = await PEERS(2500) || [];
        let room = 48000;
        list.slice(0,14).forEach(p=>{ if(room<=0) return; const s=String(p.dump||'').slice(0, Math.min(8000, room)); room-=s.length; log.peers.push({ who:clip(p.who,40), dump:s }); });
      }catch(e){ log.peers.push({ who:'—', dump:'ما قدرنا نجيب سجلات الأجهزة الثانية: '+(e&&e.message) }); }
    }
    return log;
  }

  // ---------- البلاغ ----------
  // item: {kind, id, text, answer, d, tag}
  // البلاغ ينحفظ بعد ما نجمع السجلات (أقصى شي ثانيتين ونص) — اللاعب ما ينتظر شي
  function report(item, reason, note, by){
    const doc = { kind:item.kind, item:clip(item.id,20), text:clip(item.text,400), answer:clip(item.answer,200), d:item.d||0, tag:clip(item.tag,40),
      reason:clip(reason,60), note:clip(note,400), by:clip(by||'المضيف',30), status:'open' };
    trail(`بلاغ: ${doc.kind} ${doc.item} — ${doc.reason}`);
    const put = () => { if(LOCAL){ (window.__dahoomReports=window.__dahoomReports||[]).push(doc); return; } queue('reports', doc); };  // المحلي ما يرسل للقاعدة الحقيقية
    return gather().then(log=>{ doc.log=log; put(); }).catch(put);
  }
  // نافذة البلاغ على الشاشة الكبيرة
  function openReport(item){
    const D=window.Dahoom; if(!D || !item) return;
    const esc=D.esc, list=REASONS[item.kind]||[];
    let pick=null;
    const other = item.kind==='other';
    D.modal(`<div class="eyebrow">بلاغ — ${KIND_AR[item.kind]||''}</div>
      ${other?'<h3>وش المشكلة؟</h3>':`<div class="rep-item"><b>${esc(item.text)}</b>${item.answer?`<span class="muted small">الجواب: ${esc(item.answer)}</span>`:''}</div>`}
      <div class="rep-reasons">${list.map((r,i)=>`<button class="btn small ghost" data-r="${i}">${esc(r)}</button>`).join('')}</div>
      <textarea class="rep-note" maxlength="${other?400:300}" placeholder="${other?'اكتب وش صار بالتفصيل':'ملاحظة (اختياري): وش الصح؟ وش المشكلة؟'}"></textarea>
      <div class="row center mt-s"><button class="btn btn-hype" data-send disabled>أرسل البلاغ</button>${other?'':'<button class="btn ghost" data-other>بلاغ عن شي ثاني</button>'}<button class="btn ghost" data-x>إلغاء</button></div>`,{onMount(m){
        const ob=m.querySelector('[data-other]'); if(ob) ob.onclick=()=>{ m.remove(); openReport({ kind:'other', id:'', text:'بلاغ عام', answer:'', d:0, tag:'' }); };
        m.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{ pick=list[+b.dataset.r]; m.querySelectorAll('[data-r]').forEach(x=>x.classList.toggle('btn-hype', x===b)); m.querySelector('[data-send]').disabled=false; });
        m.querySelector('[data-x]').onclick=()=>m.remove();
        m.querySelector('[data-send]').onclick=()=>{ report(item, pick, m.querySelector('.rep-note').value.trim(), 'المضيف'); m.remove(); D.toast('وصل البلاغ — شكراً'); D.play('pop'); };
      }});
  }

  // ---------- سجل المباراة ----------
  function match(doc){ queue('matches', doc); }

  // ---------- الأعطال التلقائية ----------
  // أي خطأ برمجي بالشاشة أو الجوال ينحفظ مع البلاغات (kind:'err') ويطلع بتبويب «الأعطال» بلوحة الإدارة.
  // حدود: نفس العطل مرة بالصفحة، 5 أعطال بالصفحة كحد أقصى، ونفس العطل من نفس الجهاز مرة كل 6 ساعات.
  // على الجهاز المحلي (localhost) ما ينرسل شي — ينحفظ بـ window.__dahoomErrs للاختبار.
  const BUILD = (()=>{ try{ const m=((document.currentScript&&document.currentScript.src)||'').match(/[?&]v=(\d+)/); return m?m[1]:''; }catch(e){ return ''; } })();
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const ERR_SEEN = 'dahoom_errseen', ERR_MAX = 5, ERR_GAP = 6*36e5;
  const NOISE = /ResizeObserver loop|^(Uncaught )?Script error\.?$|Non-Error promise rejection|AbortError|NotAllowedError|play\(\) request was interrupted|Failed to fetch|Load failed|NetworkError when attempting|QuotaExceededError/i;
  let errN = 0; const errPage = new Set();
  function hash(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36); }
  // يختصر الرابط: https://…/dahoom/js/net.js?v=123 → /js/net.js
  const short = u => String(u||'').split(location.origin).join('').replace(/\?v=\d+/g,'').replace(/(^|[\s(@])\/dahoom(?=\/)/g,'$1');
  function stackOf(er){
    const s = er && er.stack ? String(er.stack) : ''; if(!s) return '';
    return s.split('\n').map(l=>short(l).trim()).filter(l=>/\.(js|html)\b|<anonymous>/.test(l)).slice(0,4).join('\n');
  }
  const firstLoc = st => { const m=String(st||'').match(/(\/[^\s()@]+\.(?:js|html)):(\d+):(\d+)/); return m?`${m[1]}:${m[2]}:${m[3]}`:''; };
  function browser(){
    const u = navigator.userAgent||'';
    const os = /iPhone|iPod/.test(u)?'آيفون' : /iPad/.test(u)?'آيباد' : /Android/.test(u)?'أندرويد' : /Mac OS X/.test(u)?'ماك' : /Windows/.test(u)?'ويندوز' : /Linux/.test(u)?'لينكس' : 'جهاز ثاني';
    const br = /SamsungBrowser/.test(u)?'متصفح سامسونج' : /Edg\//.test(u)?'إيدج' : /OPR\//.test(u)?'أوبرا' : /Firefox|FxiOS/.test(u)?'فايرفوكس' : /Chrome|CriOS/.test(u)?'كروم' : /Safari/.test(u)?'سفاري' : 'متصفح';
    const v = (u.match(/(?:SamsungBrowser|Edg|OPR|Firefox|FxiOS|CriOS|Chrome|Version)\/(\d+)/)||[])[1]||'';
    const app = /Instagram|FBAN|FBAV|Snapchat|TikTok|musical_ly|Twitter|Line\//.test(u) ? ' · داخل تطبيق' : '';
    return `${os} · ${br}${v?' '+v:''}${app}`;
  }
  function where(){
    const p = (location.pathname.split('/').pop()||'index.html').replace('.html','') || 'index';
    if(p==='remote') return /[?&]owner=1/.test(location.search) ? 'جوال المضيف' : 'جوال';
    return p==='index' ? 'الشاشة' : 'صفحة '+p;
  }
  function context(){
    try{
      const D=window.Dahoom, g=D && D.session && D.session.game;
      const sc=document.querySelector('.screen.active'), rs=document.querySelector('#r-main:not(.hidden)') ? 'باللعب' : document.querySelector('#r-reg:not(.hidden)') ? 'التسجيل' : '';
      return [g, sc && sc.id, rs].filter(Boolean).join(' · ');
    }catch(e){ return ''; }
  }
  function error(msg, loc, stack, reason){
    try{
      msg = String(msg||'').replace(/^Uncaught\s+/,'').trim().slice(0,300);
      if(!msg || NOISE.test(msg)) return;
      if(/(chrome|moz|safari(-web)?)-extension:\/\//.test(String(stack)+loc)) return;
      loc = loc || firstLoc(stack);
      const sig = 'e'+hash(msg.replace(/\d+/g,'#')+'|'+String(loc).replace(/:\d+:\d+$/,''));
      if(errPage.has(sig) || errN>=ERR_MAX) return;
      errPage.add(sig); errN++;
      const seen=ls.get(ERR_SEEN,{}), now=Date.now();
      if(seen[sig] && now-seen[sig] < ERR_GAP) return;
      seen[sig]=now;
      const ks=Object.keys(seen); if(ks.length>40) ks.sort((a,b)=>seen[a]-seen[b]).slice(0,ks.length-40).forEach(k=>delete seen[k]);
      ls.set(ERR_SEEN, seen);
      const doc = { kind:'err', item:sig, text:clip(msg+(stack?'\n'+stack:''),400), answer:clip(loc,200), tag:clip(context(),40),
        reason:clip(reason||'خطأ',60), note:clip(browser()+(BUILD?' · نسخة '+BUILD:''),400), by:clip(where(),30), status:'open', d:0 };
      trail(`خطأ: ${msg.slice(0,140)} @ ${loc}`);
      doc.log = { here: dump(6000), peers: [] };
      if(LOCAL){ (window.__dahoomErrs=window.__dahoomErrs||[]).push(doc); return; }
      queue('reports', doc);
    }catch(e){}
  }
  window.addEventListener('error', e=>{
    if(!e || (e.target && e.target!==window)) return;              // صور وملفات ما تحملت: مو خطأ برمجي
    if(e.filename && e.filename.indexOf(location.origin)!==0) return; // سكربت من موقع ثاني أو إضافة متصفح
    const er=e.error;
    error(e.message || (er && er.message), e.filename ? `${short(e.filename)}:${e.lineno}:${e.colno}` : '', stackOf(er), 'خطأ');
  });
  window.addEventListener('unhandledrejection', e=>{
    const r = e && e.reason;
    const msg = r && r.message ? ((r.name && r.name!=='Error') ? r.name+': ' : '')+r.message : (typeof r==='string' ? r : '');
    if(msg) error(msg, '', stackOf(r), 'خطأ بعملية بالخلفية');
  });

  // ---------- أحداث عامة تنسجل بكل صفحة ----------
  trail('فتح الصفحة: '+(location.pathname.split('/').pop()||'index.html')+(location.search ? ' '+location.search.slice(0,60) : ''));
  ['warn','error'].forEach(k=>{ const o=console[k]; if(typeof o!=='function') return;
    console[k]=function(){
      try{ trail((k==='warn'?'تحذير: ':'خطأ بالكونسول: ')+[].map.call(arguments, a=>{ if(a && a.message) return a.message; if(a && typeof a==='object'){ try{ return JSON.stringify(a); }catch(e){ return String(a); } } return String(a); }).join(' ').slice(0,160)); }catch(e){}
      return o.apply(this, arguments); }; });
  // الضغطات: اسم الزر أو معرفه — مو اللي ينكتب بالحقول
  document.addEventListener('click', e=>{
    try{
      const b = e.target.closest && e.target.closest('button, a, [role="button"], [data-go], [data-i], [data-r], .r-khx, .game-tile');
      if(!b) return;
      const label = (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g,' ').trim().slice(0,40);
      const attrs = [...b.attributes].filter(a=>/^data-/.test(a.name)).slice(0,3).map(a=>a.value ? `${a.name}=${String(a.value).slice(0,16)}` : a.name).join(' ');
      trail(`ضغط: ${b.id?'#'+b.id+' ':''}${attrs?'['+attrs+'] ':''}«${label}»${b.disabled?' (مقفل)':''}`);
    }catch(err){}
  }, true);
  document.addEventListener('dahoom:screen', e=>trail('شاشة: '+(e && e.detail)));
  document.addEventListener('visibilitychange', ()=>trail(document.visibilityState==='visible' ? 'رجع للصفحة' : 'طلع من الصفحة (خلفية)'));
  window.addEventListener('online', ()=>trail('النت رجع'));
  window.addEventListener('offline', ()=>trail('النت انقطع'));
  window.addEventListener('pagehide', ()=>trail('الصفحة تتقفل أو تتحدث'));

  return { report, openReport, match, error, trail, addSnap, setPeers, dump, gather, REASONS, KIND_AR, ready, flush, dev, pending:()=>ls.get(OUT,[]).length, clip };
})();

// زر "بلّغ" بالشاشة: يبلّغ عن آخر سؤال/تحدي/عبارة ظهرت
document.addEventListener('click', e=>{
  if(!e.target.closest('[data-report]')) return;
  const it=window.DAHOOM_ITEM;
  window.DahoomLog.openReport(it || { kind:'other', id:'', text:'بلاغ عام', answer:'', d:0, tag:'' });
});
