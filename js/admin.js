/* ===== دحوم — لوحة المراجعة =====
   تقرا البلاغات والمباريات من Firestore (لصاحب المشروع بس — القوانين تمنع غيره)
   وتطلع منها: وش اللي يحتاج تعديل، نسب نجاح الأسئلة، موازنة البطايق، واللاعبين.
   ?demo=1 يعرض بيانات تجريبية بدون Firebase.
*/
const FBV = '10.12.2';
const $ = (s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DATA = window.DAHOOM_DATA || {};
const CFG = window.DAHOOM_FB || {};
const DEMO = new URLSearchParams(location.search).has('demo');
const KIND_AR = { q:'سؤال', c:'بدون كلام', t:'تحدي', l:'حروف', card:'بطاقة' };
const TIER_AR = { legendary:'حمراء', medium:'ذهبية', normal:'زرقاء', black:'سودا' };
const PH_AR = { early:'بداية', mid:'وسط', late:'نهاية' };
const DIFF_AR = { 1:'سهل', 2:'متوسط', 3:'صعب' };
const pct = (a,b) => b ? Math.round(100*a/b) : null;
const fmtP = v => v==null ? '—' : `<bdi>${v}%</bdi>`;
const bar = (v, cls='') => v==null ? '' : `<span class="ad-bar ${cls}"><i style="width:${Math.max(2,Math.min(100,v))}%"></i></span>`;
const when = d => d ? d.toLocaleString('ar-SA-u-nu-latn',{ dateStyle:'medium', timeStyle:'short' }) : '';

// ---------- البنك الحالي: نجيب النص والجواب الحالي لأي عنصر ----------
const BANK = new Map();
(DATA.questions||[]).forEach(x=>BANK.set('q:'+x.id,{ text:x.q, answer:x.a, d:x.d, tag:x.tag }));
(DATA.charades||[]).forEach(x=>BANK.set('c:'+x.id,{ text:x.t, answer:'', d:x.d, tag:x.tag }));
(DATA.challenges||[]).forEach(x=>{ const m=String(x.t).match(/^(.*?)\s*\(الجواب:\s*(.*?)\)\s*$/s); BANK.set('t:'+x.id,{ text:m?m[1]:x.t, answer:m?m[2]:'', d:x.d, tag:x.tag }); });
(DATA.letters||[]).forEach(x=>BANK.set('l:'+x.id,{ text:x.q, answer:x.a, d:x.d||1, tag:x.l }));
(DATA.cards||[]).forEach(x=>BANK.set('card:'+x.id,{ text:`${x.name} — ${x.desc}`, answer:'', d:0, tag:TIER_AR[x.tier], card:x }));
const CARD = id => (DATA.cards||[]).find(c=>c.id===id);

// ---------- مصدر البيانات ----------
let api = null, reports = [], matches = [], tab = 'reports';
const ui = { rStatus:'open', rKind:'all', cKind:'q', cMin:3, cFlag:'flag', pSort:'matches', mOpen:null };

async function boot(){
  if(DEMO){ demoData(); return startApp({ email:'وضع تجريبي' }); }
  if(!CFG.apiKey || !CFG.projectId){ $('#ad-nocfg').classList.remove('hidden'); return; }
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FBV}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FBV}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FBV}/firebase-firestore.js`)]);
  const app = initializeApp(CFG), auth = A.getAuth(app), db = F.getFirestore(app);
  api = {
    async load(){
      const get = async (col, n) => (await F.getDocs(F.query(F.collection(db,col), F.orderBy('at','desc'), F.limit(n)))).docs.map(d=>({ _id:d.id, ...d.data(), at:d.data().at && d.data().at.toDate ? d.data().at.toDate() : null }));
      [reports, matches] = await Promise.all([get('reports', 1000), get('matches', 500)]);
    },
    async setStatus(ids, status){ const b=F.writeBatch(db); ids.forEach(id=>b.update(F.doc(db,'reports',id),{ status })); await b.commit(); },
    async remove(col, ids){ const b=F.writeBatch(db); ids.forEach(id=>b.delete(F.doc(db,col,id))); await b.commit(); },
    signOut:()=>A.signOut(auth),
  };
  $('#ad-signin').onclick = async ()=>{ $('#ad-login-err').textContent=''; try{ await A.signInWithPopup(auth, new A.GoogleAuthProvider()); }catch(e){ $('#ad-login-err').textContent='ما قدرنا ندخل: '+(e.code||e.message); } };
  A.onAuthStateChanged(auth, user=>{
    if(!user){ $('#ad-app').classList.add('hidden'); $('#ad-login').classList.remove('hidden'); $('#ad-user').innerHTML=''; return; }
    startApp(user);
  });
}

async function startApp(user){
  $('#ad-login').classList.add('hidden');
  $('#ad-user').innerHTML = `<span class="pill dim">${esc(user.email)}</span><button class="btn ghost small" id="ad-reload">تحديث</button>${api?'<button class="btn ghost small" id="ad-out">خروج</button>':''}`;
  $('#ad-reload').onclick = reload;
  if(api) $('#ad-out').onclick = ()=>api.signOut();
  $('#ad-app').classList.remove('hidden');
  await reload();
}
async function reload(){
  $('#ad-body').innerHTML = '<p class="muted">نحمّل…</p>';
  try{ if(api) await api.load(); }
  catch(e){ $('#ad-body').innerHTML = `<div class="ad-card"><h3>ما قدرنا نقرا البيانات</h3><p class="muted">${e.code==='permission-denied'?'هالحساب مو صاحب المشروع — تأكد إن إيميلك نفسه اللي بقوانين Firestore.':esc(e.message)}</p></div>`; return; }
  render();
}

// ---------- التبويبات ----------
$$('.ad-tab').forEach(b=>b.onclick=()=>{ tab=b.dataset.tab; $$('.ad-tab').forEach(x=>x.classList.toggle('on',x===b)); render(); });
function render(){
  const open = reports.filter(r=>(r.status||'open')==='open').length;
  const players = new Set(); matches.forEach(m=>(m.teams||[]).forEach(t=>(t.players||[]).forEach(p=>players.add(p.name))));
  const hosts = new Set(matches.map(m=>m.dev));
  $('#ad-kpis').innerHTML = [
    ['بلاغ مفتوح', open], ['مباراة', matches.length], ['لاعب', players.size], ['جهاز استضاف', hosts.size],
  ].map(([k,v])=>`<div class="ad-kpi"><b><bdi>${v}</bdi></b><span>${k}</span></div>`).join('');
  const f = { reports:renderReports, content:renderContent, cards:renderCards, players:renderPlayers, matches:renderMatches }[tab];
  $('#ad-body').innerHTML = ''; f($('#ad-body'));
}
const seg = (name, opts, cur) => `<div class="ad-seg" data-seg="${name}">${opts.map(([v,l])=>`<button class="${String(v)===String(cur)?'on':''}" data-v="${v}">${l}</button>`).join('')}</div>`;
function bindSeg(root, name, fn){ $$(`[data-seg="${name}"] button`, root).forEach(b=>b.onclick=()=>{ fn(b.dataset.v); render(); }); }

// ---------- البلاغات ----------
function groupReports(list){
  const g = new Map();
  list.forEach(r=>{ const k=r.kind+':'+r.item; if(!g.has(k)) g.set(k,{ key:k, kind:r.kind, item:r.item, list:[] }); g.get(k).list.push(r); });
  return [...g.values()].sort((a,b)=>b.list.length-a.list.length || (b.list[0].at||0)-(a.list[0].at||0));
}
function renderReports(root){
  const list = reports.filter(r=>(ui.rStatus==='all' || (r.status||'open')===ui.rStatus) && (ui.rKind==='all' || r.kind===ui.rKind));
  const groups = groupReports(list);
  root.innerHTML = `<div class="ad-tools">${seg('rs',[['open','مفتوحة'],['done','انعدلت'],['ignored','متجاهلة'],['all','الكل']],ui.rStatus)}
      ${seg('rk',[['all','الكل'],['q','أسئلة'],['c','تمثيل'],['t','تحديات'],['l','حروف'],['card','بطايق']],ui.rKind)}
      <button class="btn small" id="ad-copy">نسخ المفتوحة (عشان ترسلها لـClaude)</button></div>
    ${groups.length ? groups.map(gr=>{
      const now = BANK.get(gr.key) || {}, first = gr.list[0];
      const reasons = {}; gr.list.forEach(r=>reasons[r.reason]=(reasons[r.reason]||0)+1);
      const changed = now.text && first.text && now.text!==first.text;
      return `<article class="ad-rep">
        <div class="ad-rep-h"><span class="pill">${KIND_AR[gr.kind]||gr.kind}</span><span class="pill dim"><bdi>${esc(gr.item)}</bdi></span>${now.tag?`<span class="pill dim">${esc(now.tag)}</span>`:''}${now.d?`<span class="pill dim">${DIFF_AR[now.d]||''}</span>`:''}
          <span class="ad-count"><bdi>${gr.list.length}</bdi> بلاغ</span></div>
        <div class="ad-rep-text">${esc(now.text||first.text)}</div>
        ${(now.answer||first.answer)?`<div class="ad-rep-ans">الجواب: <b>${esc(now.answer||first.answer)}</b></div>`:''}
        ${changed?`<div class="fx-tag">انعدل بالبنك بعد البلاغ — كان: ${esc(first.text)}</div>`:''}
        <div class="ad-reasons">${Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([r,n])=>`<span class="fx-tag bad">${esc(r)} <bdi>×${n}</bdi></span>`).join('')}</div>
        <ul class="ad-notes">${gr.list.map(r=>`<li><span>${r.note?esc(r.note):'<i class="muted">بدون ملاحظة</i>'}</span><small>${esc(r.by||'')} · ${when(r.at)}${r.status&&r.status!=='open'?` · ${r.status==='done'?'انعدل':'متجاهل'}`:''}</small></li>`).join('')}</ul>
        <div class="row"><button class="btn small btn-mint" data-act="done" data-k="${esc(gr.key)}">تم التعديل</button><button class="btn small ghost" data-act="ignored" data-k="${esc(gr.key)}">تجاهل</button><button class="btn small ghost" data-act="open" data-k="${esc(gr.key)}">رجّعها مفتوحة</button><button class="btn small ghost" data-act="del" data-k="${esc(gr.key)}">حذف</button></div>
      </article>`; }).join('') : '<div class="ad-card"><p class="muted">ما فيه بلاغات هنا.</p></div>'}`;
  bindSeg(root,'rs',v=>ui.rStatus=v); bindSeg(root,'rk',v=>ui.rKind=v);
  $$('[data-act]', root).forEach(b=>b.onclick=async ()=>{
    const gr = groups.find(g=>g.key===b.dataset.k); const ids = gr.list.map(r=>r._id), act=b.dataset.act;
    if(act==='del' && !confirm('تحذف البلاغات هذي نهائياً؟')) return;
    b.disabled = true;
    try{
      if(api){ if(act==='del') await api.remove('reports', ids); else await api.setStatus(ids, act); }
      if(act==='del') reports = reports.filter(r=>!ids.includes(r._id)); else gr.list.forEach(r=>r.status=act);
      render();
    }catch(e){ alert('ما انحفظ: '+e.message); b.disabled=false; }
  });
  $('#ad-copy').onclick = ()=>{
    const txt = groupReports(reports.filter(r=>(r.status||'open')==='open')).map(gr=>{ const now=BANK.get(gr.key)||{}, f=gr.list[0];
      return `[${KIND_AR[gr.kind]} ${gr.item}${now.d?' · '+DIFF_AR[now.d]:''}${now.tag?' · '+now.tag:''}] ${now.text||f.text}${(now.answer||f.answer)?`\n  الجواب الحالي: ${now.answer||f.answer}`:''}\n  البلاغات: ${gr.list.map(r=>r.reason+(r.note?` («${r.note}»)`:'')).join(' | ')}`; }).join('\n\n');
    navigator.clipboard.writeText(txt||'ما فيه بلاغات مفتوحة').then(()=>{ $('#ad-copy').textContent='انسخت'; setTimeout(()=>$('#ad-copy').textContent='نسخ المفتوحة (عشان ترسلها لـClaude)',1600); });
  };
}

// ---------- الأسئلة والمحتوى ----------
// نجاح الفريق صاحب الدور: سؤال (صح أو لحقها) · تمثيل (أحد خمّن) · تحدي (نجح) · حروف (أحد جاوب)
const WIN = { q:r=>r==='ok'||r==='late', c:r=>r==='own'||r==='other', t:r=>r==='ok', l:r=>r==='ok' };
function itemStats(kind){
  const m = new Map();
  matches.forEach(x=>(x.items||[]).forEach(it=>{
    if(it.k!==kind || it.r==='skip' || it.r==='?') return;
    const k = it.id; if(!m.has(k)) m.set(k,{ id:k, d:it.d, tag:it.tag, x:it.x, n:0, win:0, known:0, skip:0, misses:0, phases:{} });
    const s = m.get(k); s.n++; if(WIN[kind](it.r)) s.win++; if(it.r!=='fail') s.known++; s.misses += it.miss||0;
  }));
  matches.forEach(x=>(x.items||[]).forEach(it=>{ if(it.k===kind && it.r==='skip' && m.has(it.id)) m.get(it.id).skip++; }));
  return [...m.values()];
}
// مؤشر "مو بمستواه": السهل لازم ينجح غالباً والصعب ما ينجح كثير
function flagOf(s){
  const r = pct(s.win, s.n);
  if(s.n < ui.cMin) return null;
  if(s.known===0) return { t:'ما أحد عرفه أبد', bad:true };
  if(s.d===1 && r < 40) return { t:'أصعب من "سهل"', bad:true };
  if(s.d===2 && r < 20) return { t:'أصعب من "متوسط"', bad:true };
  if(s.d===2 && r > 90) return { t:'أسهل من "متوسط"', bad:false };
  if(s.d===3 && r > 80) return { t:'أسهل من "صعب"', bad:false };
  return null;
}
function renderContent(root){
  const kind = ui.cKind, all = itemStats(kind);
  // مصفوفة الصعوبة: نسبة النجاح لكل مستوى (المفروض تنزل من سهل لصعب)
  const byD = [1,2,3].map(d=>{ const l=all.filter(s=>s.d===d); const n=l.reduce((a,s)=>a+s.n,0), w=l.reduce((a,s)=>a+s.win,0); return { d, n, r:pct(w,n) }; });
  const tags = new Map(); all.forEach(s=>{ const t=tags.get(s.tag)||{ tag:s.tag, n:0, w:0 }; t.n+=s.n; t.w+=s.win; tags.set(s.tag,t); });
  const bankCount = kind==='q'?(DATA.questions||[]).length : kind==='c'?(DATA.charades||[]).length : kind==='t'?(DATA.challenges||[]).length : (DATA.letters||[]).length;
  let rows = all.map(s=>({ ...s, rate:pct(s.win,s.n), flag:flagOf(s) }));
  if(ui.cFlag==='flag') rows = rows.filter(s=>s.flag); else rows = rows.filter(s=>s.n>=ui.cMin);
  rows.sort((a,b)=> (b.flag?1:0)-(a.flag?1:0) || b.n-a.n);
  root.innerHTML = `<div class="ad-tools">${seg('ck',[['q','أسئلة'],['c','تمثيل'],['t','تحديات'],['l','حروف']],kind)}
      ${seg('cf',[['flag','اللي يحتاج نظر'],['all','الكل']],ui.cFlag)}
      ${seg('cm',[[1,'من مرة'],[3,'3 مرات+'],[5,'5+']],ui.cMin)}</div>
    <div class="ad-grid3">
      <div class="ad-card"><div class="lbl">نسبة النجاح حسب الصعوبة</div>
        ${byD.map(x=>`<div class="ad-line"><span>${DIFF_AR[x.d]}</span>${bar(x.r)}<b>${fmtP(x.r)}</b><small class="muted"><bdi>${x.n}</bdi> مرة</small></div>`).join('')}
        <p class="muted small">المفروض السهل فوق والصعب تحت. لو متقاربين = الصعوبات مو مضبوطة.</p></div>
      <div class="ad-card"><div class="lbl">التغطية</div>
        <div class="ad-line"><span>انلعب منه</span><b><bdi>${all.length}</bdi> من <bdi>${bankCount}</bdi></b></div>
        <div class="ad-line"><span>تخطّوه (إعلان)</span><b><bdi>${all.reduce((a,s)=>a+s.skip,0)}</bdi></b></div></div>
      <div class="ad-card"><div class="lbl">حسب التصنيف</div><div class="ad-scroll">
        ${[...tags.values()].sort((a,b)=>b.n-a.n).map(t=>`<div class="ad-line"><span>${esc(t.tag)}</span>${bar(pct(t.w,t.n))}<b>${fmtP(pct(t.w,t.n))}</b><small class="muted"><bdi>${t.n}</bdi></small></div>`).join('')||'<p class="muted">ما فيه بيانات</p>'}</div></div>
    </div>
    <div class="ad-card mt-s"><div class="lbl">${ui.cFlag==='flag'?'عناصر نسبة نجاحها ما تناسب صعوبتها':'كل العناصر'}</div>
      ${rows.length?`<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>العنصر</th><th>الصعوبة</th><th>انلعب</th><th>نجاح</th><th>${kind==='q'?'أحد عرفه (مع السرقة)':kind==='l'?'غلطات':'—'}</th><th>ملاحظة</th></tr></thead><tbody>
        ${rows.slice(0,300).map(s=>{ const now=BANK.get(kind+':'+s.id)||{}; return `<tr><td><div class="ad-cell-t">${esc(now.text||s.x)}</div>${now.answer?`<small class="muted">${esc(now.answer)}</small>`:''}<small class="muted"> · <bdi>${esc(s.id)}</bdi> · ${esc(s.tag||'')}</small></td>
          <td>${DIFF_AR[s.d]||''}</td><td><bdi>${s.n}</bdi></td><td>${bar(s.rate)} ${fmtP(s.rate)}</td><td>${kind==='q'?fmtP(pct(s.known,s.n)):kind==='l'?`<bdi>${s.misses}</bdi>`:''}</td>
          <td>${s.flag?`<span class="fx-tag ${s.flag.bad?'bad':''}">${s.flag.t}</span>`:''}</td></tr>`; }).join('')}</tbody></table></div>`
      : `<p class="muted">${ui.cFlag==='flag'?'ما فيه شي واضح للحين — يحتاج مباريات أكثر (كل عنصر لازم ينلعب '+ui.cMin+' مرات على الأقل).':'ما فيه بيانات للحين.'}</p>`}</div>`;
  bindSeg(root,'ck',v=>ui.cKind=v); bindSeg(root,'cf',v=>ui.cFlag=v); bindSeg(root,'cm',v=>ui.cMin=+v);
}

// ---------- البطايق ----------
function renderCards(root){
  const S = new Map(); const get = id => { if(!S.has(id)) S.set(id,{ id, drawn:0, played:0, wins:0, exp:0, ph:{early:0,mid:0,late:0}, behind:0 }); return S.get(id); };
  let alfN = 0;
  matches.filter(m=>m.game==='alf').forEach(m=>{ alfN++;
    const nT = (m.teams||[]).length || 2, winT = (m.teams||[]).find(t=>t.win);
    (m.drawn||[]).forEach(id=>get(id).drawn++);
    (m.cards||[]).forEach(c=>{ const s=get(c.id); s.played++; s.exp += 1/nT; if(winT && winT.id===c.team) s.wins++; if(c.ph) s.ph[c.ph]++; if(c.s < c.lead) s.behind++; });
  });
  const rows = (DATA.cards||[]).map(c=>{ const s=get(c.id); return { c, ...s, playRate:pct(s.played,s.drawn), winRate:pct(s.wins,s.played), expRate: s.played?Math.round(100*s.exp/s.played):null }; });
  rows.forEach(r=>{ r.delta = r.winRate==null ? null : r.winRate - r.expRate; });
  rows.sort((a,b)=> (b.played>=3?1:0)-(a.played>=3?1:0) || (b.delta??-999)-(a.delta??-999));
  const tiers = ['legendary','medium','normal','black'].map(t=>{ const l=rows.filter(r=>r.c.tier===t); return { t, drawn:l.reduce((a,r)=>a+r.drawn,0), played:l.reduce((a,r)=>a+r.played,0) }; });
  root.innerHTML = `<div class="ad-grid3">
      <div class="ad-card"><div class="lbl">مباريات ألف نقطة</div><div class="ad-big"><bdi>${alfN}</bdi></div></div>
      <div class="ad-card"><div class="lbl">السحب حسب اللون</div>${tiers.map(t=>`<div class="ad-line"><span>${TIER_AR[t.t]}</span><b><bdi>${t.drawn}</bdi> سحب</b><small class="muted"><bdi>${t.played}</bdi> لعب</small></div>`).join('')}</div>
      <div class="ad-card"><div class="lbl">كيف تقرا الجدول</div><p class="muted small">"فوز من لعبها" = كم مرة الفريق اللي لعبها فاز بالمباراة. "المتوقع" = لو البطاقة ما لها أثر (1 على عدد الفرق). الفرق الكبير الموجب مع عدد كافي = البطاقة غالباً قوية زيادة. "لعبوها" منخفض = الناس ما تشوفها تستاهل.</p></div>
    </div>
    <div class="ad-card mt-s"><div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>البطاقة</th><th>انسحبت</th><th>لعبوها</th><th>نسبة اللعب</th><th>فوز من لعبها</th><th>المتوقع</th><th>الفرق</th><th>وقت اللعب</th><th>وهم متأخرين</th></tr></thead><tbody>
      ${rows.map(r=>{ const ph=r.ph, tot=ph.early+ph.mid+ph.late; return `<tr class="${r.played<3?'ad-dim':''}"><td><b>${esc(r.c.name)}</b> <span class="ad-tier t-${r.c.tier}">${TIER_AR[r.c.tier]}</span><small class="muted"> <bdi>${r.c.id}</bdi>${r.c.phase?` · تلمع ${PH_AR[r.c.phase]}`:''}</small></td>
        <td><bdi>${r.drawn}</bdi></td><td><bdi>${r.played}</bdi></td><td>${fmtP(r.playRate)}</td><td>${bar(r.winRate)} ${fmtP(r.winRate)}</td><td>${fmtP(r.expRate)}</td>
        <td>${r.delta==null?'—':`<b class="${r.played>=3&&r.delta>=25?'ad-hot':r.played>=3&&r.delta<=-25?'ad-cold':''}"><bdi>${r.delta>0?'+':''}${r.delta}</bdi></b>`}</td>
        <td><small>${tot?['early','mid','late'].map(k=>`${PH_AR[k]} <bdi>${ph[k]}</bdi>`).join(' · '):'—'}</small></td><td>${fmtP(pct(r.behind,r.played))}</td></tr>`; }).join('')}
    </tbody></table></div><p class="muted small">الصفوف الباهتة انلعبت أقل من 3 مرات — أرقامها مو موثوقة للحين.</p></div>`;
}

// ---------- اللاعبين ----------
function renderPlayers(root){
  const P = new Map(); const get = n => { const k=String(n||'').trim(); if(!P.has(k)) P.set(k,{ name:k, av:'', m:0, w:0, alf:0, kh:0, pts:0, acted:0, actedOk:0, first:0, ms:[] , last:null }); return P.get(k); };
  matches.forEach(m=>{
    (m.teams||[]).forEach(t=>(t.players||[]).forEach(p=>{ const s=get(p.name); s.m++; if(t.win) s.w++; if(m.game==='alf'){ s.alf++; s.pts+=t.score||0; } else s.kh++; if(!s.last || (m.at && m.at>s.last)){ s.last=m.at; s.av=p.av; } }));
    (m.items||[]).forEach(it=>{ if(it.k==='c' && it.by){ const s=get(it.by); s.acted++; if(WIN.c(it.r)) s.actedOk++; } });
    (m.buzz||[]).forEach(b=>{ if(b.by){ const s=get(b.by); s.first++; if(b.ms!=null) s.ms.push(b.ms); } });
  });
  let rows = [...P.values()].filter(p=>p.name && p.m);
  const key = { matches:p=>p.m, wins:p=>p.w, rate:p=>p.m>=3?pct(p.w,p.m):-1, buzz:p=>p.first }[ui.pSort];
  rows.sort((a,b)=>key(b)-key(a));
  root.innerHTML = `<div class="ad-tools">${seg('ps',[['matches','الأكثر لعب'],['wins','الأكثر فوز'],['rate','نسبة الفوز'],['buzz','أسرع بز']],ui.pSort)}</div>
    <div class="ad-card"><div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>اللاعب</th><th>مباريات</th><th>فوز</th><th>نسبة الفوز</th><th>ألف نقطة / حروف</th><th>مثّل (نجح)</th><th>بز أول</th><th>متوسط سرعة البز</th><th>آخر لعب</th></tr></thead><tbody>
      ${rows.map(p=>`<tr><td><span class="ad-pl">${p.av?`<img src="assets/avatars/${esc(p.av)}.webp" alt="">`:''}<b>${esc(p.name)}</b></span></td><td><bdi>${p.m}</bdi></td><td><bdi>${p.w}</bdi></td><td>${bar(pct(p.w,p.m))} ${fmtP(pct(p.w,p.m))}</td>
        <td><bdi>${p.alf}</bdi> / <bdi>${p.kh}</bdi></td><td><bdi>${p.acted}</bdi> (<bdi>${p.actedOk}</bdi>)</td><td><bdi>${p.first}</bdi></td><td>${p.ms.length?`<bdi>${(p.ms.reduce((a,b)=>a+b,0)/p.ms.length/1000).toFixed(2)}</bdi> ث`:'—'}</td><td><small>${when(p.last)}</small></td></tr>`).join('') || '<tr><td colspan="9" class="muted">ما فيه لاعبين للحين</td></tr>'}
    </tbody></table></div><p class="muted small">اللاعبين ينجمعون بالاسم — لو أحد كتب اسمه بأكثر من شكل بيطلع مرتين.</p></div>`;
  bindSeg(root,'ps',v=>ui.pSort=v);
}

// ---------- المباريات ----------
const R_AR = { ok:'صح', late:'لحقها', steal:'انسرق', fail:'ما أحد', own:'فريقه خمّن', other:'فريق ثاني خمّن', skip:'تخطّوه' };
function renderMatches(root){
  root.innerHTML = matches.length ? matches.map((m,i)=>`<article class="ad-match">
      <button class="ad-match-h" data-i="${i}"><span class="pill">${m.game==='alf'?'ألف نقطة':'خلية الحروف'}</span><span class="muted small">${when(m.at)}</span>
        <span class="ad-teams">${(m.teams||[]).map(t=>`<span class="${t.win?'ad-win':''}">${esc(t.name)} <bdi>${t.score}</bdi></span>`).join(' · ')}</span>
        <span class="muted small"><bdi>${m.mins||0}</bdi> د · <bdi>${m.rounds||0}</bdi> ${m.game==='alf'?'لفة':'جولة'}</span></button>
      ${ui.mOpen===i?`<div class="ad-match-b">
        ${(m.teams||[]).map(t=>`<div class="ad-line"><b>${t.rank}. ${esc(t.name)}</b><span class="muted">${(t.players||[]).map(p=>esc(p.name)).join('، ')||'—'}</span></div>`).join('')}
        ${m.items&&m.items.length?`<div class="lbl mt-s">اللي انلعب</div><ol class="ad-items">${m.items.map(it=>`<li><span class="pill dim">${KIND_AR[it.k]||it.k} · ${DIFF_AR[it.d]||''}</span> ${esc((BANK.get(it.k+':'+it.id)||{}).text||it.x)} <b class="${WIN[it.k]&&WIN[it.k](it.r)?'ad-ok':'ad-no'}">${R_AR[it.r]||it.r}</b>${it.by?` <small class="muted">مثّلها ${esc(it.by)}</small>`:''}</li>`).join('')}</ol>`:''}
        ${m.cards&&m.cards.length?`<div class="lbl mt-s">البطايق اللي انلعبت</div><div class="row">${m.cards.map(c=>{ const k=CARD(c.id), t=(m.teams||[]).find(x=>x.id===c.team); return `<span class="pill dim">${esc(k?k.name:c.id)} — ${esc(t?t.name:'')} (لفة <bdi>${c.r}</bdi>)</span>`; }).join('')}</div>`:''}
        <div class="row mt-s"><button class="btn small ghost" data-del="${i}">حذف المباراة</button></div></div>`:''}
    </article>`).join('') : '<div class="ad-card"><p class="muted">ما فيه مباريات للحين — تنحفظ تلقائياً لما تخلص أي مباراة.</p></div>';
  $$('[data-i]', root).forEach(b=>b.onclick=()=>{ const i=+b.dataset.i; ui.mOpen = ui.mOpen===i?null:i; render(); });
  $$('[data-del]', root).forEach(b=>b.onclick=async ()=>{ const m=matches[+b.dataset.del]; if(!confirm('تحذف المباراة من السجل؟')) return;
    try{ if(api) await api.remove('matches',[m._id]); matches=matches.filter(x=>x!==m); ui.mOpen=null; render(); }catch(e){ alert(e.message); } });
}

// ---------- بيانات تجريبية ----------
function demoData(){
  const R = a => a[Math.floor(Math.random()*a.length)], names=['دحوم','سارة','فهد','نورة','عبدالله','ريم','خالد'], avs=['tan_otori','anya','luffy','doge','frieren','gigachad','astolfo'];
  const qs=(DATA.questions||[]).slice(0,40), cs=(DATA.charades||[]).slice(0,20), ts=(DATA.challenges||[]).slice(0,20), cards=DATA.cards||[];
  for(let i=0;i<14;i++){
    const at=new Date(Date.now()-i*36e5*7), nT=2+(i%2), ps=[...names].sort(()=>Math.random()-.5);
    const teams=Array.from({length:nT},(_,k)=>({ id:'t'+k, name:['الذيابة','الهوامير','الكواسر'][k], score:0, rank:0, win:false, players:ps.slice(k*2,k*2+2).map((n,j)=>({ name:n, av:avs[names.indexOf(n)] })) }));
    const items=[]; for(let j=0;j<24;j++){ const k=R(['q','q','c','t']), it=R(k==='q'?qs:k==='c'?cs:ts), easy=it.d===1?.75:it.d===2?.5:.3;
      items.push({ k, id:it.id, d:it.d, tag:it.tag, x:(it.q||it.t).slice(0,50), r: Math.random()<easy ? (k==='c'?R(['own','other']):'ok') : (k==='q'?R(['fail','steal']):'fail'), ph:R(['early','mid','late']), by:k==='c'?R(ps):undefined }); }
    const cl=[]; for(let j=0;j<6;j++) cl.push({ id:R(cards).id, team:'t'+Math.floor(Math.random()*nT), r:j+1, ph:R(['early','mid','late']), s:100*j, lead:120*j });
    teams.forEach(t=>t.score=200+Math.floor(Math.random()*800)); teams.sort((a,b)=>b.score-a.score); teams.forEach((t,k)=>{ t.rank=k+1; t.win=k===0; });
    matches.push({ _id:'m'+i, at, game:i%4===3?'khaliya':'alf', dev:'demo'+(i%3), mins:25+i, rounds:8, teams, items, cards:cl, drawn:[...cl.map(c=>c.id), ...Array.from({length:8},()=>R(cards).id)], buzz:[{ by:R(ps), ms:300+Math.floor(Math.random()*900) }] });
  }
  reports = [
    { _id:'r1', kind:'q', item:qs[3].id, text:qs[3].q, answer:qs[3].a, reason:'الجواب غلط', note:'الصح شي ثاني', by:'دحوم (الذيابة)', status:'open', at:new Date() },
    { _id:'r2', kind:'q', item:qs[3].id, text:qs[3].q, answer:qs[3].a, reason:'الجواب غلط', note:'', by:'المضيف', status:'open', at:new Date() },
    { _id:'r3', kind:'card', item:cards[0].id, text:cards[0].name, reason:'قوية زيادة', note:'تقلب المباراة', by:'سارة (الهوامير)', status:'open', at:new Date() },
    { _id:'r4', kind:'c', item:cs[2].id, text:cs[2].t, reason:'صعبة تنمثّل', note:'', by:'المضيف', status:'done', at:new Date(Date.now()-864e5) },
  ];
}

boot();
