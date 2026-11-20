/* ===== صاحب الجلسة لاعب عادي =====
   اللي يسوي الجلسة يلعب من نفس الجهاز مثل الباقين: صفحة اللاعب (remote.html) تفتح فوق الطاولة،
   وفوقها شريط صغير ثابت فيه كود الجلسة ونسخ الرابط والتبديل بين «شاشتي» و«الطاولة».
   الطاولة (شاشة المضيف) تبقى شغالة ورا — هي اللي تدير اللعبة — وتقدر تفتحها لو تبي تعرضها على شاشة كبيرة أو تضبط الإعدادات.
*/
window.DahoomOwner = (function(){
  const D = window.Dahoom, { $, esc, ic, toast, play } = D;
  const NET = () => window.DahoomNet;
  const KEY = 'dahoom_owner';
  const GAME_SCREENS = ['game','khaliya','rasm','hawamir','sadq'];
  let on=false, mode='me', frameRoom=null;

  const dock = () => $('#own-dock'), wrap = () => $('#own');
  const JUDGED = ['alf','khaliya'];   // ألعاب المضيف فيها حَكَم (يضغط صح/غلط) — تحتاج لوحة الحكم
  const scrNow = () => (document.querySelector('.screen.active')||{}).id||'';
  // الشريط فوق: الشعار (يرجّعك للرئيسية) + كود الجلسة + نسخ الدعوة + عامة/خاصة.
  // أثناء اللعب بس: زر «لوحة الحكم» (ألف نقطة وخلية الحروف) أو «شاشة العرض» (للتلفزيون) — والإدارة نفسها صارت بشاشتك.
  function render(){
    const n=NET(), code=n && n.ready ? n.code : '…', scr=scrNow();
    const playing = GAME_SCREENS.includes(scr), judged = JUDGED.includes(D.session.game);
    document.body.classList.toggle('own-on', on);
    document.body.classList.toggle('own-me', on && mode==='me');
    if(!on) return;
    const pub = !n || n.isPublic();
    const view = mode==='me'
      ? (playing ? `<button class="own-b ${judged?'hot':''}" data-own="toggle" title="${judged?'تضغط فيها صح وغلط وتدير الأسئلة':'الطاولة كاملة — للتلفزيون أو البث'}">${ic(judged?'whistle':'podium')}<span>${judged?'لوحة الحكم':'شاشة العرض'}</span></button>` : '')
      : `<button class="own-b sw" data-own="toggle">${ic('phone')}<span>رجوع لشاشتي</span></button>`;
    dock().innerHTML = `<div class="own-l"><button class="own-brand" data-own="home" title="الرئيسية"><span class="brand-mark">د</span><span>دحوم</span></button>
        <span class="own-code" title="كود الجلسة">${ic('team')}<b>${esc(code)}</b></span>
        <button class="own-b" data-own="copy">${ic('share')}<span>انسخ رابط الدعوة</span></button>
        <button class="own-b ${pub?'on':''}" data-own="pub" aria-pressed="${pub}">${ic(pub?'eye':'padlock')}<span>${pub?'جلسة عامة':'جلسة خاصة'}</span></button></div>
      <div class="own-r">${view}</div>`;
  }
  function ensureFrame(){
    const n=NET(); if(!n || !n.ready) { setTimeout(ensureFrame, 500); return; }
    const f=$('#own-frame'); if(frameRoom===n.code && f.src) return;
    frameRoom=n.code; f.src=`remote.html?room=${encodeURIComponent(n.code)}&owner=1`;
  }
  function setMode(m){ mode=m; try{ sessionStorage.setItem(KEY, JSON.stringify({ on, mode })); }catch(e){} render(); }
  function enter(){
    const n=NET(); if(!n) return;
    if(/[?&]noown=1/.test(location.search)) { n.start(); return; }   // للاختبارات وشاشات العرض: الطاولة بس
    n.start(); on=true; wrap().classList.remove('hidden'); ensureFrame(); setMode('me');
  }
  function leave(){
    on=false; wrap().classList.add('hidden'); const f=$('#own-frame'); f.src='about:blank'; frameRoom=null;
    try{ sessionStorage.removeItem(KEY); }catch(e){} render(); toast('صار هالجهاز شاشة عرض بس — اللاعبين يدخلون من أجهزتهم'); try{ const n=NET(); n && n.refresh(); }catch(e){}
  }
  document.addEventListener('click', async e=>{
    const b=e.target.closest('[data-own]'); if(!b) return; const a=b.dataset.own, n=NET();
    if(a==='toggle'){ setMode(mode==='me'?'table':'me'); play('tick',{volume:.4}); }
    else if(a==='home'){ if(await D.confirmBox('<h3>ترجع للرئيسية؟</h3><p class="muted">الجلسة تنقفل والكل يطلع منها.</p>','إيه، اقفلها','لا','btn-bad')) closeSession(); }
    else if(a==='copy'){ const url=n.joinUrl(); try{ await navigator.clipboard.writeText(url); toast('انسخ الرابط — أرسله للشباب'); }catch(err){ toast(url, 6000); } }
    else if(a==='pub'){ n.setPublic(!n.isPublic()); render(); toast(n.isPublic()?'الجلسة تطلع بقائمة الجلسات للكل':'الجلسة خاصة — يدخلونها بالكود بس'); }
    else if(a==='off'){ if(await D.confirmBox('<h3>ما بتلعب؟</h3><p class="muted">تطلع من الجلسة كلاعب ويصير هالجهاز شاشة عرض بس (الطاولة).</p>','إيه','لا','btn-hype')) leave(); }
  });
  // لما تبدأ المباراة نرجع صاحب الجلسة لشاشته عشان يلعب
  document.addEventListener('dahoom:screen', ()=>{ if(!on) return; const scr=(document.querySelector('.screen.active')||{}).id||'';
    if((GAME_SCREENS.includes(scr) || scr==='results') && NET() && NET().ownerPid) { if(mode!=='me') setMode('me'); } render(); });
  // شارة الحساب بالرئيسية (دخول بقوقل / ضيف / ملفي)
  document.addEventListener('DOMContentLoaded', ()=>{ const A=window.DahoomAccount, el=document.getElementById('acc-badge'); if(A && el){ A.init(); A.mountBadge(el); } });
  // بعد تحديث الصفحة: نرجع زي ما كنا
  document.addEventListener('DOMContentLoaded', ()=>{ try{ const s=JSON.parse(sessionStorage.getItem(KEY)||'null'); if(s && s.on){ mode=s.mode||'me'; setTimeout(enter, 300); setTimeout(()=>setMode(s.mode||'me'), 600); } }catch(e){} });
  setInterval(()=>{ if(on){ ensureFrame(); render(); } }, 3000);


  // ---------- إدارة الجلسة من شاشة صاحب الجلسة (remote.html داخل الإطار ينادي هذي مباشرة — نفس الموقع) ----------
  const SET_SCREEN = { alf:'settings', khaliya:'khaliya-settings', rasm:'rasm-settings', hawamir:'hawamir-settings', sadq:'sadq-settings' };
  const START_BTN = { alf:'btn-start', khaliya:'btn-khaliya-start', rasm:'btn-rasm-start', hawamir:'btn-hawamir-start', sadq:'btn-sadq-start' };
  const GAMES = [ { id:'rasm', name:'ارسم وخمّن', icon:'pencil', modes:['solo','teams'] }, { id:'sadq', name:'ما أصدقك', icon:'masks', modes:['solo'] },
    { id:'hawamir', name:'هوامير', icon:'hm-building-bank', modes:['solo'] }, { id:'alf', name:'ألف نقطة', icon:'cards', modes:['teams','solo'] }, { id:'khaliya', name:'خلية الحروف', icon:'hive', modes:['teams'] } ];
  const txt = el => { let t=''; el.childNodes.forEach(n=>{ if(n.nodeType===3) t+=n.textContent; else if(n.nodeType===1 && !/^(SELECT|INPUT|OPTION|SPAN)$/.test(n.tagName) && !n.classList.contains('ic')) t+=n.textContent; }); return t.replace(/\s+/g,' ').trim(); };
  let fSeq=0;
  // نقرا حقول إعدادات اللعبة من شاشتها (نفس الحقول اللي على الطاولة) — كل حقل ياخذ رقم نرجع له
  function fields(){
    const g=D.session.game, root=document.getElementById(SET_SCREEN[g]); if(!root) return [];
    const out=[];
    const secOf = el => { const p=el.closest('.panel'); const h=p && p.querySelector('h3'); return h ? h.textContent.trim() : 'الإعدادات'; };
    root.querySelectorAll('input, select').forEach(el=>{
      if(el.type==='hidden' || el.disabled || el.closest('.hidden')) return;
      if(!el.dataset.ownf) el.dataset.ownf=String(++fSeq);
      const lab=el.closest('label'), tags=el.closest('.tags-wrap');
      const f={ id:el.dataset.ownf, sec:secOf(el), type: el.tagName==='SELECT' ? 'select' : el.type };
      if(tags){ const lb=tags.previousElementSibling; f.type='chip'; f.group=lb ? lb.textContent.trim() : ''; f.label=lab ? lab.textContent.trim() : ''; f.on=el.checked; }
      else { f.label = lab ? txt(lab) : (el.getAttribute('aria-label')||''); }
      if(f.type==='select'){ f.value=el.value; f.options=[...el.options].map(o=>({ v:o.value, t:o.textContent.trim() })); }
      else if(f.type==='checkbox'){ f.on=el.checked; }
      else if(f.type!=='chip'){ f.value=el.value; f.min=el.min; f.max=el.max; f.step=el.step; }
      out.push(f);
    });
    // خرائط هوامير (أزرار)
    root.querySelectorAll('[data-map]').forEach(b=>{
      out.unshift({ id:'map:'+b.dataset.map, sec:'الخريطة', type:'pick', group:'map', label:(b.querySelector('b')||b).textContent.trim(), sub:(b.querySelector('small')||{}).textContent||'', on:b.classList.contains('on') }); });
    return out;
  }
  function setField(id, v){
    const el = String(id).startsWith('map:') ? document.querySelector(`[data-map="${String(id).slice(4)}"]`) : document.querySelector(`[data-ownf="${id}"]`); if(!el) return;
    if(el.matches('[data-map]')){ el.click(); return; }
    if(el.type==='checkbox'){ el.checked=!!v; } else el.value=v;
    el.dispatchEvent(new Event('input', { bubbles:true })); el.dispatchEvent(new Event('change', { bubbles:true }));
  }
  function prepare(){ const g=D.session.game, sc=SET_SCREEN[g], cur=scrNow(); if(sc && cur!==sc && !GAME_SCREENS.includes(cur) && cur!=='results') D.go(sc); }
  function chooseGame(g){ const c=document.getElementById('card-'+g); if(c){ c.click(); } setTimeout(prepare, 50); }
  function setPlayMode(m){ const r=document.querySelector(`input[name=mode][value="${m}"]`); if(r){ r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); } }
  function start(){
    const g=D.session.game, comps=D.competitors();
    if(g==='khaliya' && comps.length!==2) return 'خلية الحروف تبي فريقين بالضبط — وزّع الفرق أول';
    if(comps.length<2) return D.session.mode==='solo' ? 'نحتاج لاعبين اثنين على الأقل — أرسل رابط الدعوة للشباب' : 'نحتاج فريقين فيهم لاعبين — وزّع الفرق أول';
    const loose = D.session.mode!=='solo' && g!=='hawamir' && g!=='sadq' ? D.session.players.filter(p=>!D.session.teams.some(t=>t.members.includes(p.id))) : [];
    if(loose.length) return 'فيه لاعبين بدون فريق: '+loose.map(p=>p.name).join('، ');
    prepare(); const b=document.getElementById(START_BTN[g]); if(!b) return 'ما لقينا زر البداية';
    b.click(); return '';
  }
  const api = {
    games:()=>GAMES, game:()=>D.session.game, mode:()=>D.session.mode, fields, setField, chooseGame, setPlayMode, start, prepare,
    autoTeams:()=>{ const b=document.getElementById('btn-auto-teams'); if(b) b.click(); },
    teams:()=>D.session.mode==='solo' ? [] : D.session.teams.map(t=>({ name:t.name, color:t.color, n:t.members.length })),
    phoneTeams:v=>{ const c=document.getElementById('opt-phone-teams'); if(!c) return false; if(v!=null){ c.checked=!!v; c.dispatchEvent(new Event('change',{bubbles:true})); } return c.checked; },
    players:()=>D.competitors().length, screen:scrNow, table:()=>setMode('table'), leave:()=>leave(),
    end:async()=>{ if(await D.confirmBox('<h3>تنهي الجلسة؟</h3><p class="muted">الجلسة تنقفل والكل يطلع منها، وترجع للرئيسية.</p>','إيه، أنهها','لا','btn-bad')) closeSession(); },
    again:()=>{ const b=document.getElementById('btn-again'); if(b) b.click(); }, toSetup:()=>{ const n=NET(); if(n) n.use(null); D.go('lobby'); prepare(); },
  };
  function closeSession(){ try{ window.DahoomLobby && window.DahoomLobby.close(); }catch(e){} const n=NET(); if(n) n.newSession(); on=false; wrap().classList.add('hidden'); const f=$('#own-frame'); f.src='about:blank'; frameRoom=null; try{ sessionStorage.removeItem(KEY); sessionStorage.removeItem('dahoom_room'); }catch(e){} render(); D.go('home'); }

  // ادخل جلسة: الجلسات العامة المفتوحة + الدخول بالكود
  const GAME_IC = { alf:'cards', khaliya:'hive', rasm:'pencil', hawamir:'hm-building-bank', sadq:'masks' };
  function roomsHTML(list){
    if(!list) return '<p class="muted small">نجيب الجلسات…</p>';
    if(!list.length) return `<div class="jl-empty">${ic('door')}<b>ما فيه جلسات مفتوحة الحين</b><span>سوّ جلستك وخلّ الشباب يدخلون، أو ادخل بكود من أحد.</span></div>`;
    return list.map(r=>`<a class="jl-room" href="remote.html?room=${encodeURIComponent(r.code)}"><span class="jl-gic">${ic(GAME_IC[r.game]||'star')}</span>
      <span class="jl-t"><b>${esc(r.gameName||'جلسة')}</b><small>${ic('person')} ${esc(r.host||'بدون اسم')}</small></span>
      <span class="jl-n">${ic('users')} ${r.players} من ${r.max}</span><span class="jl-ph ${r.phase==='play'?'live':''}">${r.phase==='play'?'شغالة':'بالانتظار'}</span><span class="jl-go">ادخل</span></a>`).join('');
  }
  function joinModal(){
    D.modal(`<div class="eyebrow">${ic('door')} ادخل جلسة</div><h3>الجلسات المفتوحة</h3>
      <div class="jl-list" id="jl-list">${roomsHTML(null)}</div>
      <form class="jl-code" id="jl-code"><input maxlength="4" placeholder="أو اكتب الكود" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="كود الجلسة"><button class="btn btn-hype" type="submit">ادخل</button></form>
      <div class="row center mt-s"><button class="btn ghost" data-x>إغلاق</button></div>`, { onMount(m){
        m.querySelector('[data-x]').onclick=()=>{ clearInterval(t); m.remove(); };
        m.querySelector('#jl-code').onsubmit=e=>{ e.preventDefault(); const c=e.target.querySelector('input').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,''); if(c.length!==4){ toast('الكود 4 حروف أو أرقام'); return; } location.href='remote.html?room='+c; };
        const load=async ()=>{ const L=window.DahoomLobby; const list=L?await L.list():[]; const el=m.querySelector('#jl-list'); if(el) el.innerHTML=roomsHTML(list); };
        load(); const t=setInterval(()=>{ if(!document.body.contains(m)) { clearInterval(t); return; } load(); }, 8000);
      }});
  }
  return { api, closeSession, joinModal, roomsHTML, enter, leave, setMode, get on(){ return on; }, get mode(){ return mode; }, render };
})();
