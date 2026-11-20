/* ===== دحوم — صفحة الملف الشخصي =====
   profile.html        → ملفي (مع التعديل والربع)
   profile.html?u=UID  → ملف أي لاعب (عام)
   كل البيانات من window.DahoomAccount (js/account.js).
*/
(function(){
  'use strict';
  const A = window.DahoomAccount;
  const $ = (s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ic = (n, cls='') => `<i class="ic ${cls}" style="--i:url(../assets/icons/${n}.svg)"></i>`;
  const target = new URLSearchParams(location.search).get('u') || '';
  const root = $('#pf');

  // ---------- الوضع النهاري / الليلي (نفس مفتاح باقي الصفحات: dahoom_theme) ----------
  const getTheme = () => document.documentElement.getAttribute('data-theme')==='day' ? 'day' : 'night';
  function setTheme(t, save){
    document.documentElement.setAttribute('data-theme', t);
    if(save){ try{ localStorage.setItem('dahoom_theme', t); }catch(e){} }
    const m=$('meta[name="theme-color"]'); if(m) m.setAttribute('content', t==='day' ? '#ECEAF1' : '#0D0B14');
    $$('.btn-theme').forEach(b=>{ const day=t==='day'; b.innerHTML = day ? ic('moon')+' ليلي' : ic('sun')+' نهاري'; b.setAttribute('aria-label', day?'الوضع الليلي':'الوضع النهاري'); });
  }
  $$('.btn-theme').forEach(b=>b.onclick=()=>setTheme(getTheme()==='day'?'night':'day', true));
  setTheme(getTheme(), false);
  try{ matchMedia('(prefers-color-scheme: light)').addEventListener('change', e=>{ let v=null; try{ v=localStorage.getItem('dahoom_theme'); }catch(_){} if(v!=='day'&&v!=='night') setTheme(e.matches?'day':'night', false); }); }catch(e){}

  // ---------- أدوات ----------
  function toast(msg){ $$('.toast').forEach(t=>t.remove()); const t=document.createElement('div'); t.className='toast'; t.setAttribute('role','status'); t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(), 2600); }
  const DAY = 864e5;
  function fmtWhen(t){
    if(!t) return ''; const d=new Date(t), now=new Date();
    const diff = Math.round((new Date(now.toDateString()) - new Date(d.toDateString()))/DAY);
    const time = d.toLocaleTimeString('ar-SA-u-nu-latn', { hour:'numeric', minute:'2-digit' });
    if(diff===0) return 'اليوم · '+time;
    if(diff===1) return 'أمس · '+time;
    return d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day:'numeric', month:'short', year: d.getFullYear()===now.getFullYear()?undefined:'numeric' });
  }
  const pct = (a,b) => b ? Math.round(100*a/b) : 0;
  const profUrl = uid => 'profile.html?u='+encodeURIComponent(uid);

  // ---------- الحالة ----------
  const V = { prof:null, mine:true, editing:false, draft:null, tab:'friends', friends:null, requests:null, q:'', results:null, achF:'all', achAll:false, recAll:false, loadingFriends:false };

  async function load(){
    const c=A.current();
    if(!target || (c && target===c.uid)){
      V.mine=true;
      if(!c){ renderGate(); return; }
      V.prof = await A.getProfile();
      if(!V.editing) render();
      if(!c.guest && V.friends===null) loadFriends();
    } else {
      V.mine=false; root.innerHTML=skeleton();
      const p = await A.getProfile(target);
      if(!p){ renderMissing(); return; }
      V.prof=p; render();
      if(c && !c.guest && V.friends===null) loadFriends();
    }
  }
  const skeleton = () => `<div class="pf-skel" aria-busy="true"><div class="pf-skel-b"></div><div class="pf-skel-l"></div><div class="pf-skel-l s"></div></div>`;

  // ---------- بدون هوية: سجّل أو كمّل كضيف ----------
  let gateAv = A.AVATARS[Math.floor(Math.random()*A.AVATARS.length)];
  function renderGate(){
    document.title='دحوم — ملفك';
    root.innerHTML=`<section class="pf-card pf-gate">
      <div class="pf-gate-top"><span class="pf-gate-mark">${ic('acc-award')}</span></div>
      <h1>ملفك في دحوم</h1>
      <p class="muted">أرقامك وإنجازاتك وربعك، كلها بمكان واحد.</p>
      <button class="btn btn-hype big pf-wide" id="g-google">${ic('acc-google')} سجّل دخول بقوقل</button>
      <div class="pf-or"><span>أو</span></div>
      <form id="g-guest" class="pf-gform" novalidate>
        <label class="field">اسمك<input type="text" id="g-name" maxlength="20" autocomplete="nickname" placeholder="وش نناديك؟" required></label>
        <div class="field"><span id="g-av-l">اختر شكلك</span><div class="pf-avs compact" role="radiogroup" aria-labelledby="g-av-l">${avButtons(gateAv)}</div></div>
        <button class="btn pf-wide" type="submit">${ic('acc-ghost')} كمّل كضيف</button>
        <p class="pf-err" id="g-err" role="alert"></p>
        <p class="small muted center">ملف الضيف ينحفظ بهالجهاز بس، وتقدر تنقله لحسابك بعدين.</p>
      </form></section>`;
    $('#g-google').onclick=signIn;
    bindRadio($('.pf-avs', root), v=>{ gateAv=v; });
    $('#g-guest').onsubmit=e=>{
      e.preventDefault(); const n=$('#g-name').value.trim();
      if(!n){ $('#g-err').textContent='اكتب اسمك أول'; $('#g-name').focus(); return; }
      A.continueAsGuest({ name:n, avatar:gateAv }); toast('هلا '+n+'، ملفك جاهز');
    };
  }
  function renderMissing(){
    document.title='دحوم — ملف غير موجود';
    root.innerHTML=`<section class="pf-card pf-gate"><div class="pf-gate-top"><span class="pf-gate-mark">${ic('acc-user-x')}</span></div><h1>ما لقينا هالملف</h1>
      <p class="muted">يمكن الرابط غلط، أو النت مقطوع.</p><a class="btn" href="profile.html">${ic('person')} ملفي</a></section>`;
  }
  async function signIn(e){
    const b=e && e.currentTarget; if(b){ b.disabled=true; }
    const r=await A.signInGoogle();
    if(b) b.disabled=false;
    if(r) toast('هلا '+r.name+'، دخلت');
    else if(A.offline || !navigator.onLine) toast('ما قدرنا نوصل، تأكد من النت');
  }

  // ---------- الصفحة ----------
  function render(){
    const p = V.editing ? Object.assign({}, V.prof, V.draft) : V.prof;
    const c = A.current();
    document.title = 'دحوم — ' + p.name;
    root.innerHTML = `<div id="pf-hero-slot">${heroHTML(p, c)}</div>
      ${V.mine && p.guest && !V.editing ? guestCta() : ''}
      ${V.editing ? editorHTML() : `<div class="pf-grid">
        <div class="pf-col">${statsHTML(p)}${achHTML(p)}</div>
        <aside class="pf-col pf-side">${friendsHTML(c)}${recentHTML(p)}</aside></div>`}`;
    bindHero();
    if(V.editing) bindEditor(); else { bindAch(); bindRecent(); bindFriends(); }
    const cta=$('#pf-cta-in'); if(cta) cta.onclick=signIn;
  }

  // ---------- الواجهة العلوية ----------
  function heroHTML(p, c){
    const L = A.levelInfo(p.xp);
    const me = c && !c.guest;
    let actions='';
    if(V.mine && !V.editing){
      actions = `<button class="btn small" id="pf-edit">${ic('pencil')} عدّل ملفك</button>`
        + (p.guest ? '' : `<button class="btn small ghost" id="pf-share">${ic('acc-send')} انسخ رابط ملفك</button><button class="btn small ghost" id="pf-out">${ic('acc-logout')} خروج</button>`);
    } else if(!V.mine){
      actions = friendAction(p.uid, me) + (c ? `<a class="btn small ghost" href="profile.html">${ic('person')} ملفي</a>` : '');
    }
    return `<section class="pf-hero" style="--pc:${esc(p.color)}">
      <div class="pf-banner" style="background:${A.bannerBg(p.banner)}"><span class="pf-banner-sadu"></span></div>
      <div class="pf-id">
        ${A.avatarHTML(p, 104, 'pf-avatar')}
        <div class="pf-who">
          <h1 class="pf-name">${esc(p.name)}</h1>
          <div class="pf-tags"><span class="pill pf-title">${esc(A.titleName(p.title))}</span>${p.guest?`<span class="pill dim">${ic('acc-ghost')} ضيف</span>`:''}${p.offline?`<span class="pill dim">${ic('acc-cloud-off')} بدون نت</span>`:''}</div>
        </div>
        ${actions ? `<div class="pf-actions">${actions}</div>` : ''}
      </div>
      ${p.bio ? `<p class="pf-bio">${esc(p.bio)}</p>` : (V.mine && !V.editing ? `<p class="pf-bio muted">ما كتبت نبذة للحين.</p>` : '')}
      <div class="pf-lvl" role="group" aria-label="المستوى">
        <span class="pf-lvl-n"><small>المستوى</small><b>${L.level}</b></span>
        <div class="pf-lvl-track"><div class="pf-lvl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${L.need}" aria-valuenow="${L.into}" aria-label="الخبرة للمستوى الجاي"><i style="width:${Math.round(L.pct*100)}%"></i></div>
          <small>${L.into} من ${L.need} خبرة للمستوى ${L.level+1}</small></div>
      </div>
    </section>`;
  }
  function friendAction(uid, me){
    if(!me) return '';
    const isF = (V.friends||[]).some(f=>f.uid===uid), req=(V.requests||[]).some(r=>r.uid===uid);
    if(isF) return `<span class="pill">${ic('acc-user-check')} صديقك</span>`;
    if(req) return `<button class="btn small btn-mint" data-accept="${esc(uid)}">${ic('check')} اقبل طلبه</button>`;
    if(A.pendingSentTo(uid)) return `<span class="pill dim">${ic('hourglass')} انرسل الطلب</span>`;
    return `<button class="btn small btn-hype" data-add="${esc(uid)}">${ic('acc-user-plus')} أضفه</button>`;
  }
  function bindHero(){
    const ed=$('#pf-edit'); if(ed) ed.onclick=startEdit;
    const out=$('#pf-out'); if(out) out.onclick=async()=>{ await A.signOut(); V.friends=V.requests=null; toast('طلعت من حسابك'); };
    const sh=$('#pf-share'); if(sh) sh.onclick=async()=>{
      const url = new URL(profUrl(A.current().uid), location.href).href;
      try{ await navigator.clipboard.writeText(url); toast('نسخنا الرابط، أرسله لربعك'); }catch(e){ prompt('انسخ الرابط:', url); }
    };
    bindFriendButtons($('#pf-hero-slot'));
  }
  const guestCta = () => `<section class="pf-cta" role="note"><span class="pf-cta-ic">${ic('acc-cloud-off')}</span>
      <div><b>سجّل دخول عشان ينحفظ ملفك</b><p>الحين أرقامك بهالجهاز بس. لو سجّلت، تنتقل كلها لحسابك وتقدر تضيف ربعك.</p></div>
      <button class="btn btn-hype" id="pf-cta-in">${ic('acc-google')} سجّل بقوقل</button></section>`;

  // ---------- الأرقام ----------
  function statsHTML(p){
    const games=Object.keys(A.GAMES);
    const fav = games.filter(g=>p.per[g] && p.per[g].g).sort((a,b)=>p.per[b].g-p.per[a].g)[0];
    const kpi = (v, l, cls='') => `<div class="pf-kpi ${cls}"><b>${v}</b><span>${l}</span></div>`;
    const rows = games.map(g=>{ const x=p.per[g]||{ g:0, w:0, best:0 }, G=A.GAMES[g], r=pct(x.w,x.g);
      return `<div class="pf-gr ${x.g?'':'zero'}"><i class="pf-gic">${ic(G.icon)}</i><span class="pf-gn"><b>${G.name}</b><small>${x.g ? `${x.g} مباراة · ${x.w} فوز${x.best?` · أعلى نتيجة ${x.best}`:''}` : 'ما لعبتها للحين'}</small></span>
        <span class="pf-gbar" aria-hidden="true"><i style="width:${r}%"></i></span><span class="pf-gp">${x.g?r+'%':'—'}</span></div>`; }).join('');
    return `<section class="pf-card"><h2 class="pf-h">${ic('acc-chart')} الأرقام</h2>
      <div class="pf-kpis">${kpi(p.games,'مباراة')}${kpi(p.wins,'فوز')}${kpi(p.games?pct(p.wins,p.games)+'%':'—','نسبة الفوز')}${kpi(fav?A.GAMES[fav].name:'—','لعبتك المفضلة','txt')}</div>
      <div class="pf-mini">${p.bestStreak?`<span class="chip">${ic('flame')} أطول سلسلة فوز ${p.bestStreak}</span>`:''}${p.podiums?`<span class="chip">${ic('podium')} على المنصة ${p.podiums}</span>`:''}${p.days?`<span class="chip">${ic('acc-calendar')} لعب في ${p.days} يوم</span>`:''}</div>
      <div class="pf-games">${rows}</div></section>`;
  }

  // ---------- الإنجازات ----------
  function achHTML(p){
    const all=A.ACHIEVEMENTS, got=all.filter(a=>p.ach[a.id]).length;
    const list = all.map(a=>({ a, pr:A.achProgress(a.id, p) }))
      .filter(x=>V.achF==='all' || (V.achF==='done') === x.pr.done)
      .sort((x,y)=> (y.pr.done-x.pr.done) || (x.pr.done ? y.pr.at-x.pr.at : y.pr.pct-x.pr.pct));
    const seg = (v,l) => `<button type="button" role="tab" aria-selected="${V.achF===v}" class="${V.achF===v?'on':''}" data-af="${v}">${l}</button>`;
    const CAP=9, shown = V.achAll ? list : list.slice(0, CAP);
    return `<section class="pf-card" id="pf-ach"><div class="pf-h-row"><h2 class="pf-h">${ic('trophy')} الإنجازات</h2><span class="pf-count"><b>${got}</b> من ${all.length}</span></div>
      <div class="pf-seg" role="tablist" aria-label="فلترة الإنجازات">${seg('all','الكل')}${seg('done','المفتوحة')}${seg('left','الباقية')}</div>
      <div class="pf-ach-grid">${shown.map(({a,pr})=>{ const R=A.RARITY[a.rarity];
        return `<article class="pf-ach ${pr.done?'done':'locked'}" style="--rc:${R.color}" aria-label="${esc(a.name)}${pr.done?'، مفتوح':'، مقفل'}">
          <i class="pf-ach-ic">${ic(pr.done?a.icon:'acc-lock')}</i>
          <div class="pf-ach-t"><b>${esc(a.name)}</b><p>${esc(a.desc)}</p>
          ${pr.done ? `<small class="pf-ach-r">${R.name}${pr.at?' · '+fmtWhen(pr.at):''}</small>`
            : `<div class="pf-ach-p"><span class="pf-ach-bar"><i style="width:${Math.round(pr.pct*100)}%"></i></span><small>${pr.value} من ${pr.goal}</small></div>`}</div></article>`; }).join('') || '<p class="muted">ما فيه شي هنا للحين.</p>'}</div>
      ${list.length>CAP ? moreBtn('ach', V.achAll, list.length) : ''}</section>`;
  }
  // زر "شوف الكل / أقل" للقوائم الطويلة
  const moreBtn = (k, open, n) => `<button type="button" class="btn small ghost pf-more" data-more="${k}" aria-expanded="${open}">${open ? ic('acc-chevron-up')+' أقل' : ic('acc-chevron-down')+` شوف الكل (${n})`}</button>`;
  function bindAch(){
    $$('[data-af]').forEach(b=>b.onclick=()=>{ V.achF=b.dataset.af; redrawAch(); $(`[data-af="${V.achF}"]`).focus(); });
    const m=$('[data-more="ach"]'); if(m) m.onclick=()=>{ V.achAll=!V.achAll; redrawAch(); const n=$('[data-more="ach"]'); if(n) n.focus(); };
  }
  function redrawAch(){ const s=$('#pf-ach'); if(!s) return; s.outerHTML=achHTML(currentP()); bindAch(); }
  function bindRecent(){ const m=$('[data-more="rec"]'); if(m) m.onclick=()=>{ V.recAll=!V.recAll; const s=$('#pf-rec'); s.outerHTML=recentHTML(currentP()); bindRecent(); const n=$('[data-more="rec"]'); if(n) n.focus(); }; }
  const currentP = () => V.editing ? Object.assign({}, V.prof, V.draft) : V.prof;

  // ---------- آخر المباريات ----------
  function recentHTML(p){
    const l=p.recent||[], CAP=6, shown = V.recAll ? l : l.slice(0, CAP);
    return `<section class="pf-card" id="pf-rec"><h2 class="pf-h">${ic('acc-history')} آخر المباريات</h2>
      ${l.length ? `<ol class="pf-recent">${shown.map(r=>{ const G=A.GAMES[r.game]||{ name:r.game, icon:'dice' };
        return `<li class="${r.won?'win':''}"><i class="pf-gic">${ic(G.icon)}</i><span class="pf-rn"><b>${G.name}</b><small>${fmtWhen(r.at)}${r.mode==='teams'?' · فرق':''}</small></span>
          <span class="pf-rank" aria-label="المركز ${r.rank} من ${r.of}">${r.won?ic('trophy'):''}<b>${r.rank}</b><small>من ${r.of}</small></span></li>`; }).join('')}</ol>${l.length>CAP ? moreBtn('rec', V.recAll, l.length) : ''}`
        : `<p class="muted pf-empty">${V.mine?'العب أول مباراة وتطلع هنا.':'ما لعب للحين.'}</p>`}</section>`;
  }

  // ---------- الربع ----------
  function friendsHTML(c){
    if(!V.mine) return '';
    if(!c || c.guest) return `<section class="pf-card"><h2 class="pf-h">${ic('acc-users')} الربع</h2><p class="muted">سجّل دخول عشان تضيف ربعك وتشوف ملفاتهم.</p></section>`;
    const F=V.friends, R=V.requests;
    const tab = (v,l,n) => `<button type="button" role="tab" aria-selected="${V.tab===v}" class="${V.tab===v?'on':''}" data-ft="${v}">${l}${n?` <span class="count">${n}</span>`:''}</button>`;
    let body='';
    if(V.results){
      body = V.results.length ? `<ul class="pf-people">${V.results.map(u=>person(u, friendAction(u.uid, true))).join('')}</ul>` : `<p class="muted pf-empty">ما لقينا أحد بهالاسم.</p>`;
    } else if(F===null) body = `<p class="muted pf-empty">نحمّل…</p>`;
    else if(V.tab==='friends') body = F.length ? `<ul class="pf-people">${F.map(f=>person(f, `<button class="btn small ghost pf-icon" data-rm="${esc(f.uid)}" aria-label="شيل ${esc(f.name)} من ربعك" title="شيله">${ic('acc-user-x')}</button>`)).join('')}</ul>`
      : `<p class="muted pf-empty">ما عندك ربع للحين. دوّر عليهم بالاسم فوق.</p>`;
    else body = (R&&R.length) ? `<ul class="pf-people">${R.map(r=>person(r, `<button class="btn small btn-mint pf-icon" data-accept="${esc(r.uid)}" aria-label="اقبل ${esc(r.name)}" title="اقبل">${ic('check')}</button><button class="btn small ghost pf-icon" data-reject="${esc(r.uid)}" aria-label="ارفض ${esc(r.name)}" title="ارفض">${ic('cancel')}</button>`)).join('')}</ul>`
      : `<p class="muted pf-empty">ما فيه طلبات.</p>`;
    return `<section class="pf-card pf-friends" id="pf-friends"><h2 class="pf-h">${ic('acc-users')} الربع</h2>
      <form class="pf-search" role="search"><input type="search" id="pf-q" maxlength="20" placeholder="دوّر لاعب باسمه" aria-label="دوّر لاعب باسمه" value="${esc(V.q)}" autocomplete="off"><button class="btn small" type="submit" aria-label="دوّر">${ic('search')}</button></form>
      ${V.results ? `<div class="pf-h-row small"><span class="muted">نتايج البحث</span><button class="btn small ghost" type="button" id="pf-clear">رجوع</button></div>`
        : `<div class="pf-seg" role="tablist" aria-label="الربع والطلبات">${tab('friends','ربعي', F?F.length:0)}${tab('requests','الطلبات', R?R.length:0)}</div>`}
      ${body}</section>`;
  }
  const person = (u, act) => `<li class="pf-person">${A.avatarHTML(u, 38)}<a class="pf-pn" href="${profUrl(u.uid)}"><b>${esc(u.name)}</b><small>المستوى ${u.level||1}${u.titleName?' · '+esc(u.titleName):''}</small></a><span class="pf-pa">${act}</span></li>`;
  async function loadFriends(){
    if(V.loadingFriends) return; V.loadingFriends=true;
    try{ const [f, r] = await Promise.all([A.listFriends(), A.listRequests()]); V.friends=f; V.requests=r; }
    finally{ V.loadingFriends=false; }
    if(V.mine && !V.editing && V.prof) rerenderFriends();
    else if(!V.mine && V.prof) { const s=$('#pf-hero-slot'); if(s){ s.innerHTML=heroHTML(V.prof, A.current()); bindHero(); } }
  }
  function rerenderFriends(){ const s=$('#pf-friends'); if(!s) return; s.outerHTML=friendsHTML(A.current()); bindFriends(); }
  function bindFriends(){
    const s=$('#pf-friends'); if(!s) return;
    $$('[data-ft]', s).forEach(b=>b.onclick=()=>{ V.tab=b.dataset.ft; rerenderFriends(); $(`[data-ft="${V.tab}"]`).focus(); });
    const f=$('.pf-search', s); f.onsubmit=async e=>{ e.preventDefault(); V.q=$('#pf-q').value.trim(); if(!V.q){ V.results=null; rerenderFriends(); return; }
      const btn=$('button',f); btn.disabled=true; V.results=await A.searchUsers(V.q); rerenderFriends(); const q=$('#pf-q'); if(q) q.focus(); };
    const cl=$('#pf-clear', s); if(cl) cl.onclick=()=>{ V.results=null; V.q=''; rerenderFriends(); };
    bindFriendButtons(s);
  }
  function bindFriendButtons(scope){
    if(!scope) return;
    const after = async (ok, okMsg, failMsg) => { toast(ok?okMsg:failMsg); await loadFriends(); if(!V.mine){ const h=$('#pf-hero-slot'); if(h){ h.innerHTML=heroHTML(V.prof, A.current()); bindHero(); } } else if(V.results) rerenderFriends(); };
    $$('[data-add]', scope).forEach(b=>b.onclick=async()=>{ b.disabled=true; after(await A.sendFriendRequest(b.dataset.add), 'انرسل الطلب', 'ما قدرنا نرسل الطلب'); });
    $$('[data-accept]', scope).forEach(b=>b.onclick=async()=>{ b.disabled=true; after(await A.respondFriendRequest(b.dataset.accept, true), 'صرتوا ربع', 'ما قدرنا نقبل الطلب'); });
    $$('[data-reject]', scope).forEach(b=>b.onclick=async()=>{ b.disabled=true; after(await A.respondFriendRequest(b.dataset.reject, false), 'انرفض الطلب', 'ما قدرنا نرفض الطلب'); });
    $$('[data-rm]', scope).forEach(b=>b.onclick=async()=>{ const f=(V.friends||[]).find(x=>x.uid===b.dataset.rm); if(!confirm(`تشيل ${f?f.name:'هالصديق'} من ربعك؟`)) return; b.disabled=true; after(await A.removeFriend(b.dataset.rm), 'انشال من ربعك', 'ما قدرنا نشيله'); });
  }

  // ---------- التعديل ----------
  function startEdit(){
    const p=V.prof; V.editing=true;
    V.draft={ name:p.name, bio:p.bio, avatar:p.avatar, color:p.color, banner:p.banner, frame:p.frame, title:p.title };
    render(); const n=$('#e-name'); if(n) n.focus();
  }
  function avButtons(sel){ return A.AVATARS.map(a=>`<button type="button" role="radio" aria-checked="${a===sel}" class="pf-pick ${a===sel?'sel':''}" data-v="${a}" aria-label="صورة ${a.replace(/_/g,' ')}"><img src="${A.avatarSrc(a)}" alt="" loading="lazy" width="56" height="56"></button>`).join(''); }
  function lockOf(kind, id){ return A.isUnlocked(kind, id, V.prof) ? '' : A.unlockHint(kind, id); }
  function editorHTML(){
    const d=V.draft;
    const pickGroup = (label, cls, items) => `<fieldset class="pf-fs"><legend>${label}</legend><div class="${cls}" role="radiogroup" aria-label="${label}">${items}</div></fieldset>`;
    const banners = A.BANNERS.map(b=>{ const lk=lockOf('banner', b.id);
      return `<button type="button" role="radio" aria-checked="${b.id===d.banner}" class="pf-pick pf-bn ${b.id===d.banner?'sel':''}" data-v="${b.id}" ${lk?'aria-disabled="true" disabled':''} title="${esc(lk||b.name)}"><span class="pf-bn-art" style="background:${b.bg}"></span><span class="pf-pl">${lk?ic('acc-lock'):''}${esc(b.name)}</span>${lk?`<small>${esc(lk)}</small>`:''}</button>`; }).join('');
    const frames = A.FRAMES.map(f=>{ const lk=lockOf('frame', f.id);
      return `<button type="button" role="radio" aria-checked="${f.id===d.frame}" class="pf-pick pf-fr ${f.id===d.frame?'sel':''}" data-v="${f.id}" ${lk?'aria-disabled="true" disabled':''} title="${esc(lk||f.name)}">${A.avatarHTML({ avatar:d.avatar, color:d.color, frame:f.id }, 44)}<span class="pf-pl">${lk?ic('acc-lock'):''}${esc(f.name)}</span>${lk?`<small>${esc(lk)}</small>`:''}</button>`; }).join('');
    const titles = A.TITLES.map(t=>{ const lk=lockOf('title', t.id);
      return `<button type="button" role="radio" aria-checked="${t.id===d.title}" class="pf-pick pf-tt ${t.id===d.title?'sel':''}" data-v="${t.id}" ${lk?'aria-disabled="true" disabled':''} title="${esc(lk||t.name)}">${lk?ic('acc-lock'):''}${esc(t.name)}</button>`; }).join('');
    const colors = A.COLORS.map(c=>`<button type="button" role="radio" aria-checked="${c===d.color}" class="pf-pick pf-sw ${c.toUpperCase()===String(d.color).toUpperCase()?'sel':''}" data-v="${c}" style="--sw:${c}" aria-label="لون ${c}"></button>`).join('');
    return `<section class="pf-card pf-edit" aria-label="تعديل الملف"><div class="pf-h-row"><h2 class="pf-h">${ic('pencil')} عدّل ملفك</h2><span class="muted small">التغييرات تبان فوق على طول</span></div>
      <div class="pf-edit-grid">
        <div class="pf-edit-col">
          <label class="field">الاسم<input type="text" id="e-name" maxlength="20" value="${esc(d.name)}" autocomplete="nickname"><small class="pf-cnt" id="e-name-c">${d.name.length} من 20</small></label>
          <label class="field">نبذة عنك<textarea id="e-bio" maxlength="120" rows="3" placeholder="سطر عنك: لعبتك، فريقك، تحدّيك…">${esc(d.bio)}</textarea><small class="pf-cnt" id="e-bio-c">${d.bio.length} من 120</small></label>
          ${pickGroup('اللون', 'pf-sws', colors)}
          ${pickGroup('اللقب', 'pf-tts', titles)}
        </div>
        <div class="pf-edit-col">
          ${pickGroup('الصورة', 'pf-avs', avButtons(d.avatar))}
        </div>
        <div class="pf-span">${pickGroup('الخلفية', 'pf-bns', banners)}</div>
        <div class="pf-span">${pickGroup('الإطار', 'pf-frs', frames)}</div>
      </div>
      <div class="pf-edit-bar"><button class="btn btn-hype" id="e-save">${ic('check')} احفظ</button><button class="btn ghost" id="e-cancel">إلغاء</button><p class="pf-err" id="e-err" role="alert"></p></div>
    </section>`;
  }
  // مجموعة اختيار: الضغط يحدّد بدون ما نعيد رسم القائمة (عشان التركيز ما يضيع)، والأسهم تتنقل
  function bindRadio(group, onPick){
    if(!group) return;
    const btns=()=>$$('.pf-pick:not([disabled])', group);
    group.addEventListener('click', e=>{
      const b=e.target.closest('.pf-pick'); if(!b || b.disabled) return;
      $$('.pf-pick', group).forEach(x=>{ x.classList.toggle('sel', x===b); x.setAttribute('aria-checked', x===b); });
      onPick(b.dataset.v);
    });
    group.addEventListener('keydown', e=>{
      const k={ ArrowLeft:1, ArrowDown:1, ArrowRight:-1, ArrowUp:-1 }[e.key]; if(!k) return;
      const l=btns(), i=l.indexOf(document.activeElement); if(i<0) return;
      e.preventDefault(); const n=l[(i+k+l.length)%l.length]; n.focus(); n.click();
    });
  }
  function preview(){ const s=$('#pf-hero-slot'); if(s){ s.innerHTML=heroHTML(Object.assign({}, V.prof, V.draft), A.current()); } }
  function bindEditor(){
    const d=V.draft;
    $('#e-name').oninput=e=>{ d.name=e.target.value.slice(0,20); $('#e-name-c').textContent=`${d.name.length} من 20`; preview(); };
    $('#e-bio').oninput=e=>{ d.bio=e.target.value.slice(0,120); $('#e-bio-c').textContent=`${d.bio.length} من 120`; preview(); };
    bindRadio($('.pf-avs', root), v=>{ d.avatar=v; preview(); refreshFrames(); });
    bindRadio($('.pf-sws', root), v=>{ d.color=v; preview(); refreshFrames(); });
    bindRadio($('.pf-tts', root), v=>{ d.title=v; preview(); });
    bindRadio($('.pf-bns', root), v=>{ d.banner=v; preview(); });
    bindRadio($('.pf-frs', root), v=>{ d.frame=v; preview(); });
    $('#e-cancel').onclick=()=>{ V.editing=false; V.draft=null; render(); };
    $('#e-save').onclick=async()=>{
      if(!d.name.trim()){ $('#e-err').textContent='الاسم ما يصير فاضي'; $('#e-name').focus(); return; }
      const ok=await A.saveProfile(d);
      if(!ok){ $('#e-err').textContent='ما قدرنا نحفظ، تأكد من الاسم والاختيارات'; return; }
      V.editing=false; V.draft=null; V.prof=await A.getProfile(); render(); toast('انحفظ ملفك'); const e=$('#pf-edit'); if(e) e.focus();
    };
  }
  // صور الإطارات تتبع الصورة واللون المختارين
  function refreshFrames(){ $$('.pf-fr', root).forEach(b=>{ const old=$('.dacc-av', b); const t=document.createElement('span'); t.innerHTML=A.avatarHTML({ avatar:V.draft.avatar, color:V.draft.color, frame:b.dataset.v }, 44); old.replaceWith(t.firstChild); }); }

  // ---------- تشغيل ----------
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && V.editing){ V.editing=false; V.draft=null; render(); } });
  A.init().then(()=>{
    load();
    let lastKey='';
    A.onChange(c=>{
      const key = c ? c.uid+'|'+c.guest : 'none', changed = key!==lastKey;
      lastKey=key;
      if(changed){ V.friends=V.requests=null; V.results=null; }
      if(V.editing) return;
      if(V.mine || changed) load();
    });
    lastKey = (c=>c ? c.uid+'|'+c.guest : 'none')(A.current());
  });
})();
