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
  function render(){
    const n=NET(), code=n && n.ready ? n.code : '…', scr=(document.querySelector('.screen.active')||{}).id||'';
    const playing = GAME_SCREENS.includes(scr), setup = scr==='lobby' || /settings/.test(scr);
    document.body.classList.toggle('own-on', on);
    document.body.classList.toggle('own-me', on && mode==='me');
    if(!on) return;
    const pub = !n || n.isPublic();
    dock().innerHTML = `<div class="own-l"><span class="own-code" title="كود الجلسة">${ic('team')}<b>${esc(code)}</b></span>
        <button class="own-b" data-own="copy">${ic('share')}<span>انسخ رابط الدعوة</span></button>
        <button class="own-b ${pub?'on':''}" data-own="pub" aria-pressed="${pub}">${ic(pub?'eye':'padlock')}<span>${pub?'جلسة عامة':'جلسة خاصة'}</span></button></div>
      <div class="own-r">${setup && mode==='me' ? `<button class="own-b hot" data-own="setup">${ic('play')}<span>${scr==='lobby'?'اختر الإعدادات وابدأ':'الإعدادات وابدأ'}</span></button>`:''}
        <button class="own-b sw" data-own="toggle">${ic(mode==='me'?'podium':'phone')}<span>${mode==='me'?'الطاولة':'شاشتي'}</span></button>
        ${playing?'':`<button class="own-b ghost" data-own="off" title="ما بلعب — أخلي هالجهاز شاشة عرض بس">${ic('cancel')}<span>ما بلعب</span></button>`}</div>`;
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
    try{ sessionStorage.removeItem(KEY); }catch(e){} render(); toast('صار هالجهاز شاشة عرض بس — اللاعبين يدخلون من أجهزتهم');
  }
  document.addEventListener('click', async e=>{
    const b=e.target.closest('[data-own]'); if(!b) return; const a=b.dataset.own, n=NET();
    if(a==='toggle'){ setMode(mode==='me'?'table':'me'); play('tick',{volume:.4}); }
    else if(a==='setup'){ const sc=(document.querySelector('.screen.active')||{}).id; if(sc==='lobby') $('#btn-to-settings').click(); setMode('table'); }
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
  return { joinModal, roomsHTML, enter, leave, setMode, get on(){ return on; }, get mode(){ return mode; }, render };
})();
