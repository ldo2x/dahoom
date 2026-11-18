/* ===== دحوم — جهة الجوال =====
   يتصل بالشاشة مباشرة (PeerJS)، يختار فريقه، ويستقبل الحالة والأسئلة.
   الشاشة هي المرجع: الجوال يرسل نية (بز / العب بطاقة / جواب) والشاشة تقرر.
*/
(function(){
  const $ = (s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc = s => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ic = n => `<i class="ic" style="--i:url(../assets/icons/${n}.svg)"></i>`;
  const DATA = window.DAHOOM_DATA;
  const C = id => DATA.cards.find(c=>c.id===id);
  const TIER_AR = { legendary:'حمراء', medium:'ذهبية', normal:'زرقاء', black:'سودا' };
  const TARGET_AR = { next:'اللي بعدك', prev:'اللي قبلك', leader:'المتصدر', choose:'اللي تختاره' };
  const PREFIX = 'dahoom-v2-';
  const vibe = ms => { try{ navigator.vibrate && navigator.vibrate(ms); }catch(e){} };

  function cardHTML(c, {size='', anim=false, flag=''}={}){
    const K = DATA.cardKinds[c.kind] || {name:'',icon:'cards'};
    const art = c.tweet
      ? `<div class="tweet"><div class="tw-h"><span class="tw-av">${esc(c.tweet.name[0])}</span><span><b>${esc(c.tweet.name)}</b><i>${esc(c.tweet.handle)}</i></span></div><p>${esc(c.tweet.text)}</p><div class="tw-f"><span>${ic('star')} ${esc(c.tweet.likes)}</span></div></div>`
      : c.art ? `<div class="tcg-icon">${ic(c.art)}</div>`
      : `<img src="assets/cards/${c.id}${anim?'.webp':'_s.gif'}" alt="" loading="lazy">`;
    return `<div class="tcg ${c.tier} ${size}${c.phase&&c.phase===window.DAHOOM_PHASE?' in-phase':''}" data-id="${c.id}">${flag?`<span class="tcg-flag">${esc(flag)}</span>`:''}
      <div class="tcg-in">
        <div class="tcg-art">${art}${c.target?`<span class="tcg-tgt">على ${TARGET_AR[c.target]}</span>`:''}</div>
        <div class="tcg-top"><span class="tcg-kind">${ic(K.icon)} ${K.name}</span><span class="tcg-tier">${TIER_AR[c.tier]}</span></div>
        <div class="tcg-name">${esc(c.name)}</div>
        <div class="tcg-desc">${esc(c.desc)}</div>
        <div class="tcg-meme">${c.phase?`<span class="tcg-phase ph-${c.phase}">تلمع في ${{early:'البداية',mid:'الوسط',late:'النهاية'}[c.phase]}</span>`:''}</div>
      </div>
      <div class="tcg-foil"></div>
    </div>`;
  }

  // ---------- الوضع النهاري / الليلي (نفس مفتاح الشاشة: dahoom_theme) ----------
  const getTheme = () => document.documentElement.getAttribute('data-theme')==='day' ? 'day' : 'night';
  function setTheme(t, save){
    document.documentElement.setAttribute('data-theme', t);
    if(save){ try{ localStorage.setItem('dahoom_theme', t); }catch(e){} }
    const m=$('meta[name="theme-color"]'); if(m) m.setAttribute('content', t==='day' ? '#ECEAF1' : '#0D0B14');
    $$('.btn-theme').forEach(b=>{ const day=t==='day'; b.innerHTML = day ? ic('moon')+' ليلي' : ic('sun')+' نهاري'; b.setAttribute('aria-label', day?'الوضع الليلي':'الوضع النهاري'); });
  }
  $$('.btn-theme').forEach(b=>b.onclick=()=>{ vibe(10); setTheme(getTheme()==='day'?'night':'day', true); });
  setTheme(getTheme(), false);
  try{ matchMedia('(prefers-color-scheme: light)').addEventListener('change', e=>{ let v=null; try{ v=localStorage.getItem('dahoom_theme'); }catch(_){} if(v!=='day'&&v!=='night') setTheme(e.matches?'day':'night', false); }); }catch(e){}

  // ---------- الحالة ----------
  const st = { room:null, peer:null, conn:null, teamId:null, S:null, askId:null, retry:0, wantOpen:false, mode:'teams', avatars:[], teams:[] };
  const teamKey = () => 'dahoom_team_'+st.room;
  const meKey = 'dahoom_me';   // الاسم والصورة يتذكرهم الجوال لكل الغرف
  const me = () => { try{ return JSON.parse(localStorage.getItem(meKey)||'null'); }catch(e){ return null; } };
  const avSrc = a => 'assets/avatars/'+a+'.webp';
  // نسخة احتياطية من قائمة الصور لو الشاشة ما أرسلتها
  const AV_FALLBACK = ['doge','cheems','pepe_the_frog','trollface','gigachad','wojak','shrek_face','patrick_star','squidward','kermit','grumpy_cat','smudge_cat','crying_cat','pop_cat',
    'hide_the_pain_harold','mr_bean','nicolas_cage','the_rock_eyebrow','monkey_puppet','capybara','sad_hamster','chill_guy','minion','baby_yoda','side_eye_chloe','spongebob','saudi_smile','saudi_smirk',
    'tan_otori','astolfo','felix_argyle','hideri','saika','nagisa','anya','chika','frieren','marin','bocchi','nezuko','zero_two','megumin','kaguya','power','mai','luffy','naruto','goku','saitama','hakari','pochita','pikachu','chiikawa','hamtaro'];
  function show(id){ $$('.r-screen').forEach(s=>s.classList.toggle('hidden', s.id!==id)); }
  function status(msg){ const s=$('#r-status'); s.textContent=msg||''; s.classList.toggle('hidden', !msg); }

  // ---------- الاتصال ----------
  function connect(){
    status('نتصل بالشاشة…');
    try{ st.peer && st.peer.destroy(); }catch(e){}
    const peer = st.peer = new window.Peer({debug:0});
    peer.on('open', ()=>{
      const conn = st.conn = peer.connect(PREFIX+st.room, {reliable:true});
      const to = setTimeout(()=>{ if(!conn.open) fail('ما قدرنا نوصل للشاشة — تأكد إن الشاشة فاتحة ومتصلة بالنت'); }, 9000);
      conn.on('open', ()=>{ clearTimeout(to); st.retry=0; status(''); conn.send({t:'hello', teamId: localStorage.getItem(teamKey()), pid:(me()||{}).pid}); });
      conn.on('data', onData);
      conn.on('close', lost);
      conn.on('error', lost);
    });
    peer.on('error', e=>{
      if(e.type==='peer-unavailable') return fail('الكود غلط أو الشاشة مقفلة. تأكد من الكود وجرب مرة ثانية.', true);
      lost();
    });
  }
  function fail(msg, toJoin){ status(''); $('#r-err').textContent=msg; if(toJoin){ show('r-join'); localStorage.removeItem('dahoom_last_room'); } else lost(); }
  function lost(){
    if(!st.room) return;
    status('انقطع الاتصال… نرجع نتصل');
    clearTimeout(st.rt); st.rt=setTimeout(()=>{ if(!st.conn || !st.conn.open) connect(); }, Math.min(8000, 1500*(++st.retry)));
  }
  function send(msg){ if(st.conn && st.conn.open){ st.conn.send(msg); return true; } lost(); return false; }

  // ---------- الرسائل ----------
  function onData(d){
    if(!d) return;
    if(d.t==='teams'){ st.teamId=null; st.mode=d.mode||'teams'; st.avatars=d.avatars||[]; st.teams=d.teams||[]; st.canCreate=!!d.canCreate; renderTeams(d.teams); return; }
    // فردي: ما فيه فرق — سجّل اسمك وصورتك على طول
    if(d.t==='soloreg'){ st.teamId=null; st.mode='solo'; st.avatars=d.avatars||[]; st.soloPlayers=d.players||[];
      if(!$('#r-reg').classList.contains('hidden')){ drawSoloList(); return; }
      const m=me(); if(m && m.name && !d.locked && st.autoReg!==st.room){ st.autoReg=st.room; send({t:'register', pid:m.pid, name:m.name, avatar:m.avatar}); return; }
      openReg(); return; }
    if(d.t==='joined'){ st.teamId=d.teamId; if(d.mode) st.mode=d.mode; if(d.avatars&&d.avatars.length) st.avatars=d.avatars; if(d.teams) st.teams=d.teams; localStorage.setItem(teamKey(), d.teamId); keepAwake();
      const m=me(); if(st.mode==='solo'){ show('r-main'); return; }
      if(m && m.name && st.registeredRoom===st.room+':'+d.teamId){ show('r-main'); return; }
      if(m && m.name){ send({t:'register', pid:m.pid, name:m.name, avatar:m.avatar}); return; }
      openReg(); return; }
    if(d.t==='registered'){ if(d.teamId){ st.teamId=d.teamId; st.mode=d.mode||st.mode; localStorage.setItem(teamKey(), d.teamId); keepAwake(); }
      const m=Object.assign(me()||{}, {pid:d.pid, name:d.name, avatar:d.avatar}); localStorage.setItem(meKey, JSON.stringify(m)); st.registeredRoom=st.room+':'+st.teamId; show('r-main'); renderMain(); return; }
    if(d.t==='state'){ st.S=d; window.DAHOOM_PHASE=d.phaseKey||null; if(st.teamId && $('#r-reg').classList.contains('hidden')) show('r-main'); renderMain(); return; }
    if(d.t==='rs'){ onMirror(d.m); return; }
    if(d.t==='rsfull'){ if(mirror) mirror.load(d.ops); return; }
    if(d.t==='ask'){ openAsk(d.reqId, d.spec); return; }
    if(d.t==='close'){ if(st.askId===d.reqId) closeSheet(); return; }
    if(d.t==='drawn'){ drawn(C(d.card)); return; }
    if(d.t==='notice'){ status(d.msg); vibe([40,30,40]); clearTimeout(st.nt); st.nt=setTimeout(()=>status(''),3500); return; }
  }

  // ---------- اختيار الفريق ----------
  function renderTeams(teams){
    $('#r-room-lbl').textContent=st.room;
    // كل فريق: اسمه + عدد لاعبينه + صورهم
    $('#r-teams').innerHTML = teams.length ? teams.map(t=>{ const pl=t.players||[], n=pl.length, shown=pl.slice(0,5);
      return `<button class="r-teamopt" style="--c:${t.color}" data-t="${esc(t.id)}">
        <span class="rt-name">${esc(t.name)}</span>
        <span class="rt-count">${n ? `${n} ${n===1?'لاعب':n===2?'لاعبين':'لاعبين'}` : 'فاضي — كن أول واحد'}</span>
        ${n ? `<span class="rt-avs">${shown.map(p=>`<img src="${avSrc(p.avatar)}" alt="" title="${esc(p.name)}">`).join('')}${n>5?`<i>+${n-5}</i>`:''}</span>` : ''}
        ${n ? `<span class="rt-names">${esc(pl.map(p=>p.name).join('، '))}</span>` : ''}
      </button>`; }).join('')
      : `<p class="muted">${st.canCreate?'ما فيه فرق بعد — أنشئ أول فريق.':'ما فيه فرق بعد — خلّ المضيف يضيف الفرق من شاشة اللاعبين.'}</p>`;
    $('#r-newteam').classList.toggle('hidden', !st.canCreate);
    $$('#r-teams [data-t]').forEach(b=>b.onclick=()=>{ vibe(20); send({t:'hello', teamId:b.dataset.t, pid:(me()||{}).pid}); });
    show('r-pick');
  }

  // ---------- تسجيل اللاعب ----------
  let regAv=null;
  function openReg(){
    if(!st.avatars.length) st.avatars=AV_FALLBACK.slice();
    const m=me()||{}; const t=st.teams.find(x=>x.id===st.teamId)||{};
    if(st.mode==='solo') drawSoloList(); else { $('#r-reg-lbl').textContent='فريقك'; $('#r-reg-team').innerHTML=`<span class="r-teamchip" style="--c:${t.color||'var(--line)'}">${esc(t.name||'')}</span>`; }
    $('#r-name').value=m.name||''; regAv = st.avatars.includes(m.avatar) ? m.avatar : st.avatars[Math.floor(Math.random()*st.avatars.length)];
    drawAvatars(); show('r-reg');
  }
  function drawSoloList(){ const l=st.soloPlayers||[]; $('#r-reg-lbl').textContent = l.length ? `اللاعبين (${l.length}):` : 'كل واحد لحاله — كن أول لاعب';
    $('#r-reg-team').innerHTML = l.map(p=>`<span class="r-solo"><img src="${avSrc(p.avatar)}" alt="">${esc(p.name)}</span>`).join(''); }
  function drawAvatars(){
    $('#r-avatars').innerHTML=st.avatars.map(a=>`<button class="r-av ${a===regAv?'sel':''}" data-a="${a}"><img src="${avSrc(a)}" alt=""></button>`).join('');
    $$('#r-avatars .r-av').forEach(b=>b.onclick=()=>{ regAv=b.dataset.a; vibe(10); drawAvatars(); });
  }
  $('#r-reg-go').onclick=()=>{
    const name=$('#r-name').value.trim();
    if(!name){ $('#r-reg-err').textContent='اكتب اسمك'; return; }
    $('#r-reg-err').textContent=''; vibe(30);
    const m=me()||{}; localStorage.setItem(meKey, JSON.stringify(Object.assign(m,{name, avatar:regAv})));
    send({t:'register', pid:m.pid, name, avatar:regAv});
  };

  // ---------- الشاشة الرئيسية ----------
  let buzzSent = 0;
  function renderMain(){
    const sw=$('#r-switch'); if(sw) sw.style.display = (st.S && st.S.locked) || st.mode==='solo' ? 'none' : '';
    const S=st.S; if(!S || S.waiting){ $('#r-phase').textContent='بانتظار ما تبدأ المباراة…'; return; }
    const t=S.team;
    document.body.style.setProperty('--team', t.color);
    const m=me();
    $('#r-head').innerHTML=`${m&&m.avatar&&st.mode!=='solo'?`<button class="r-me" id="r-me"><img src="${avSrc(m.avatar)}" alt=""></button>`:''}<span class="r-who"><span class="r-team" style="--c:${t.color}">${esc(t.name)}</span>${m&&m.name&&st.mode!=='solo'?`<small>${esc(m.name)}</small>`:''}</span>
      <span class="r-score"><b>${t.score}</b><small>${S.game==='khaliya'?'جولات':S.game==='hawamir'?'كاش':'نقطة'}</small></span>
      ${S.myTurn?'<span class="r-turn">دوركم</span>':''}`;
    const meBtn=$('#r-me'); if(meBtn) meBtn.onclick=openReg;
    $('#r-phase').innerHTML = S.letter ? `<span class="r-letter">${esc(S.letter)}</span> ${esc(S.phase||'')}` : esc(S.phase||'');
    // نهاية المباراة: مركز الفريق وجوائزه وأرقامه
    const fin=$('#r-final'), done=!!S.final;
    fin.classList.toggle('hidden', !done);
    ['#r-buzz','#r-fx','#r-hand-wrap','#r-charade'].forEach(q=>{ const e=$(q); if(e) e.style.display = done ? 'none' : ''; });
    if(done){
      const f=S.final;
      if(!st.finalShown){ st.finalShown=true; vibe(f.rank===1?[120,60,120,60,240]:[80]); }
      fin.innerHTML=`<div class="rf-rank ${f.rank===1?'win':''}"><small>انتهت المباراة</small><b>#${f.rank}</b><span>من ${f.of} ${f.rank===1?'— فزتوا!':''}</span></div>
        ${f.awards.length?`<div class="rf-aw">${f.awards.map(a=>`<span class="rf-badge"><b>${esc(a.title)}</b>${esc(a.value)}</span>`).join('')}</div>`:''}
        <div class="rf-rows">${f.rows.map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
        <p class="muted small center">${S.game==='alf'?'الإحصائيات الكاملة والمنحنى على الشاشة':'الإحصائيات الكاملة على الشاشة'}</p>`;
      $('#r-phase').textContent='';
    } else st.finalShown=false;
    // التمثيل: واحد من الفريق يختار يمثّل والعبارة تطلع له بس
    renderCharade(S.charade);
    // البز
    const b=$('#r-buzz'), sub=$('#r-buzz-sub'), z=S.buzz||{};
    b.className='r-buzz'; b.disabled=true;
    if(z.open && z.can){ b.disabled=false; b.classList.add('live'); sub.textContent= z.first ? `${z.first} سبقكم — اضغط تاخذ دورك` : 'اضغط أول!'; }
    else if(z.mine){ b.classList.add('won'); sub.textContent= z.rank>1 ? `دوركم تجاوبون (ترتيبكم #${z.rank})` : 'بزّيت أول! جاوب'; }
    else if(z.rank){ b.classList.add('lost'); sub.textContent=`ترتيبكم #${z.rank} · متأخرين ${z.gap.toFixed(3)} ث`; }
    else if(z.first){ b.classList.add('lost'); sub.textContent=`${z.first} سبقكم`; }
    else if(z.open){ sub.textContent='مو متاح لكم الحين'; }
    else sub.textContent='البز يفتح لما يجي وقته';
    if(S.benched){ b.className='r-buzz lost'; b.disabled=true; sub.textContent='انت برا السالفة هالدور'; }
    // الطاقات
    $('#r-fx').innerHTML=(S.fx||[]).map(f=>`<span class="fx-tag ${f.bad?'bad':''}">${esc(f.n)}</span>`).join('');
    // اليد
    const wrap=$('#r-hand-wrap'); wrap.classList.toggle('hidden', S.game!=='alf');
    if(S.game==='alf'){
      const hand=(S.hand||[]).map(C).filter(Boolean);
      $('#r-hand-lbl').innerHTML = hand.length ? (S.canPlay?`<b class="r-can">${ic('cards')} دوركم — العبوا بطاقة (وحدة بس)</b>`:`${ic('cards')} بطاقاتكم السرية (${hand.length})`) : 'ما عندكم بطاقات';
      $('#r-hand').innerHTML = hand.map((c,i)=>`<div class="r-card" data-i="${i}">${cardHTML(c,{size:'mini',flag:c.kind==='reaction'?'رد فعل':''})}</div>`).join('')
        + (S.fuse?`<button class="btn small r-fuse" id="r-fuse">${ic('recycle')} ادمج سودتين = زرقا</button>`:'');
      $$('#r-hand .r-card').forEach(el=>el.onclick=()=>preview(+el.dataset.i));
      const f=$('#r-fuse'); if(f) f.onclick=()=>{ vibe(30); send({t:'fuse'}); };
      $('#r-hand').classList.toggle('can', !!S.canPlay);
    }
    // النقاط
    $('#r-scores').innerHTML=(S.scores||[]).map(x=>`<span class="r-sc ${x.id===t.id?'me':''} ${x.turn?'turn':''}" style="--c:${x.color}"><i></i>${esc(x.name)} <b>${x.score}</b>${S.game==='alf'?`<small>${ic('cards')}${x.hand}</small>`:''}</span>`).join('');
    // ارسم وخمّن: لوحة الرسم للرسام، ومربع التخمين للباقين
    const rs=$('#r-rasm'), isR = S.game==='rasm' && !done && !!S.rasm;
    rs.classList.toggle('hidden', !isR);
    if(S.game==='rasm' || S.game==='hawamir') b.style.display='none';
    { const bs=$('#r-buzz-sub'); if(bs) bs.style.display = S.game==='hawamir' ? 'none' : ''; }
    if(isR) renderRasm(S.rasm); else if(rs.dataset.key){ rs.innerHTML=''; rs.dataset.key=''; }
  }
  // ---------- ارسم وخمّن ----------
  const RCOL = ['#111111','#E53935','#1E88E5','#43A047','#FDD835','#FB8C00','#8E24AA','#8D6E63'];
  const RSIZE = [0.007, 0.015, 0.032];
  let guessLog=[];
  function renderRasm(R){
    const box=$('#r-rasm');
    const key = R.phase + ':' + (R.mine?'m':'g') + ':' + (R.canClaim?'c':'') + ':' + (R.choices?'p':'') + ':' + (R.word||'') + ':' + (R.reveal||'');
    if(box.dataset.key===key){ const h=$('#rg-hint'); if(h && R.hint!=null) h.innerHTML=hintHTML(R); if(R.phase==='reveal' && R.myRate) markRate(R.myRate); return; }
    box.dataset.key=key; if(R.phase!=='draw') mirror=null;
    if(R.phase==='claim'){
      if(R.canClaim){
        box.innerHTML=`<div class="eyebrow">${ic('pencil')} ارسم وخمّن — دوركم</div><button class="btn btn-hype big ch-claim" id="rs-claim">أنا برسم</button><p class="muted small center">أول واحد يضغط تطلع له الكلمات بجواله بس</p>`;
        $('#rs-claim').onclick=()=>{ vibe([40,20,40]); send({t:'claim'}); };
      } else box.innerHTML=`<div class="ch-taken">${ic('pencil')} دور ${esc(R.drawerTeam)} يرسم — استعدوا تخمّنون</div>`;
      return;
    }
    if(R.phase==='pick'){
      if(R.mine && R.choices){ vibe([80,40,80]);
        box.innerHTML=`<div class="eyebrow">${ic('pencil')} اختار كلمة — لا تخلي أحد يشوف</div><div class="rp-choices">${R.choices.map((c,i)=>`<button class="btn big rp-choice" data-i="${i}"><b>${esc(c.w)}</b><small>${['','سهلة','متوسطة','صعبة'][c.d]} · ${c.p}</small></button>`).join('')}</div>`;
        $$('#r-rasm [data-i]').forEach(bt=>bt.onclick=()=>{ vibe(30); send({t:'rpick', i:+bt.dataset.i}); });
      } else box.innerHTML=`<div class="ch-taken">${ic('pencil')} ${esc(R.drawer||'الرسام')} يختار كلمة…</div>`;
      return;
    }
    if(R.phase==='draw' && R.mine && R.word){ buildPad(box, R.word); return; }
    if(R.phase==='draw'){ guessLog=[]; buildGuess(box, R); return; }
    if(R.phase==='reveal'){ mirror=null; buildReveal(box, R); return; }
    box.innerHTML='';
  }
  const hintHTML = R => `<span class="rg-pat">${esc(R.hint||'')}</span><small>${R.letters} ${R.letters>10?'حرف':'حروف'}</small>`;
  function buildGuess(box, R){
    box.innerHTML=`<div class="eyebrow">${ic('eye')} خمّن الرسمة${R.mirror?'':' اللي على الشاشة'}</div>
      ${R.mirror?'<canvas class="rp-canvas" id="rg-canvas"></canvas>':''}
      <div class="rg-hint" id="rg-hint">${hintHTML(R)}</div>
      <form class="rg-row" id="rg-form"><input id="rg-in" maxlength="40" placeholder="اكتب تخمينك" autocomplete="off" enterkeyhint="send"><button class="btn btn-hype" type="submit">خمّن</button></form>
      <div class="rg-log" id="rg-log"></div>`;
    $('#rg-form').onsubmit=e=>{ e.preventDefault(); const inp=$('#rg-in'), v=inp.value.trim(); if(!v) return;
      send({t:'guess', text:v}); vibe(15); guessLog.unshift(v); guessLog=guessLog.slice(0,5); inp.value=''; inp.focus();
      $('#rg-log').innerHTML=guessLog.map(g=>`<span>${esc(g)}</span>`).join(''); };
    if(R.mirror) buildMirror(); else mirror=null;
  }
  // لوحة الرسام: نفس أدوات الشاشة (draw.js) — كل عملية تنرسل للشاشة مباشرة
  let mirror=null;
  function buildPad(box, word){
    const DR=window.DahoomDraw;
    box.innerHTML=`<div class="rp-word"><small>ارسم:</small> <b>${esc(word)}</b></div>
      <canvas class="rp-canvas" id="rp-canvas"></canvas>
      <div class="dr-tools" id="rp-tools"></div>
      <p class="muted small center">ممنوع حروف وأرقام بالرسمة</p>`;
    const cv=$('#rp-canvas'), dpr=Math.min(2, window.devicePixelRatio||1);
    const W=cv.clientWidth, H=Math.round(W*0.75); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.height=H+'px';
    const B=DR.board(cv), tool=DR.newTool();
    DR.attach(cv, B, tool, m=>send(m));
    DR.toolbar($('#rp-tools'), tool, { tap:()=>vibe(8), onUndo:()=>{ if(B.undo()) send({t:'undo'}); }, onClear:()=>{ B.clear(); send({t:'clear'}); } });
    mirror=null;
  }
  // لوحة المتفرج: نسخة حية من رسمة الشاشة (لو المضيف مفعّل الخيار)
  function buildMirror(){
    const cv=$('#rg-canvas'); if(!cv){ mirror=null; return; }
    const dpr=Math.min(2, window.devicePixelRatio||1), W=cv.clientWidth, H=Math.round(W*0.75);
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.height=H+'px';
    mirror=window.DahoomDraw.board(cv); send({t:'rsync'});
  }
  function onMirror(m){
    if(!mirror || !m) return;
    if(m.t==='stroke') mirror.stroke(m); else if(m.t==='fill') mirror.fill(m); else if(m.t==='undo') mirror.undo(); else if(m.t==='clear') mirror.clear();
  }
  const RATE = ['خرابيش','ماشي حالها','حلوة','فنان','تحفة'];
  function buildReveal(box, R){
    box.innerHTML=`<div class="eyebrow">الكلمة كانت</div><div class="rp-reveal">${esc(R.reveal||'')}</div>
      ${R.canRate?`<div class="lbl center">قيّم الرسمة</div><div class="rs-rate" id="rp-rate">${RATE.map((r,i)=>`<button class="rs-rate-b" data-rv="${i+1}"><b>${i+1}</b><span>${r}</span></button>`).join('')}</div>`:''}`;
    $$('#rp-rate [data-rv]').forEach(b=>b.onclick=()=>{ vibe(20); send({t:'rate', v:+b.dataset.rv}); markRate(+b.dataset.rv); });
    markRate(R.myRate);
  }
  function markRate(v){ $$('#rp-rate [data-rv]').forEach(b=>b.classList.toggle('on', +b.dataset.rv===v)); }

  let showPhrase=false, lastPhrase=null;
  function renderCharade(ch){
    const box=$('#r-charade');
    if(!ch){ box.classList.add('hidden'); box.innerHTML=''; showPhrase=false; lastPhrase=null; return; }
    box.classList.remove('hidden');
    if(ch.mine){
      if(ch.text!==lastPhrase){ lastPhrase=ch.text; showPhrase=false; vibe([60,40,60]); }
      box.innerHTML=`<div class="eyebrow">${ic('masks')} انت الممثل — لا تخلي أحد يشوف</div>
        <div class="ch-phrase ${showPhrase?'':'blur'}" id="ch-phrase">${showPhrase?esc(ch.text):'العبارة مخفية'}</div>
        <button class="btn ${showPhrase?'ghost':'btn-hype big'}" id="ch-toggle">${ic('eye')} ${showPhrase?'اخفها':'اظهر العبارة'}</button>
        <p class="muted small center">${ch.acting?'الوقت شغّال — مثّل بدون كلام!':'احفظها وبعدين المضيف يبدأ الوقت'}</p>`;
      $('#ch-toggle').onclick=()=>{ showPhrase=!showPhrase; vibe(15); renderCharade(ch); };
    } else if(ch.taken){
      box.innerHTML=`<div class="ch-taken">${ic('masks')} واحد منكم بيمثّل — ${ch.acting?'خمّنوا وبزّوا!':'استعدوا تخمّنون'}</div>`;
    } else if(st.S && st.S.benched){
      box.innerHTML=`<div class="ch-taken">${ic('cancel')} انت برا السالفة هالدور — خلّ غيرك يمثّل</div>`;
    } else {
      box.innerHTML=`<div class="eyebrow">${ic('masks')} بدون كلام — دوركم</div>
        <button class="btn btn-hype big ch-claim" id="ch-claim">أنا بمثّل</button>
        <p class="muted small center">أول واحد يضغط تطلع له العبارة بجواله بس</p>`;
      $('#ch-claim').onclick=()=>{ vibe([40,20,40]); send({t:'claim'}); };
    }
  }
  $('#r-buzz').addEventListener('pointerdown', e=>{
    const b=e.currentTarget; if(b.disabled) return;
    const now=Date.now(); if(now-buzzSent<400) return; buzzSent=now;
    vibe([60,30,60]); b.classList.add('pressed'); setTimeout(()=>b.classList.remove('pressed'),250);
    send({t:'buzz'});
  });

  // ---------- عرض بطاقة / لعبها ----------
  function preview(i){
    const S=st.S, c=C(S.hand[i]); if(!c) return;
    const can = S.canPlay && c.kind!=='reaction' && c.fx!=='none';
    const why = c.kind==='reaction' ? (c.fx==='envy' ? 'رد فعل: تطلع لكم لحالها لما خصمكم يلعب بطاقة دعم' : c.fx==='wow' ? 'رد فعل: تطلع لكم لحالها لما فريق يكسب 200 أو أكثر بدور واحد' : 'رد فعل: تطلع لكم لحالها لما أحد يهاجمكم') : c.fx==='none' ? 'سودا — ما تنلعب. ادمجوها أو ارموها بـ"خذ وهات"' : !S.canPlay ? 'البطاقات تنلعب بداية دوركم' : '';
    sheet(`<div class="r-big">${cardHTML(c,{size:'big',anim:true})}</div>${why?`<p class="muted center">${why}</p>`:''}
      <div class="r-actions">${can?`<button class="btn btn-hype big" data-play>العبها</button>`:''}<button class="btn ghost" data-x>${can?'تراجع':'إغلاق'}</button></div>`);
    const p=$('#r-sheet [data-play]'); if(p) p.onclick=()=>{ vibe(40); send({t:'play', idx:i}); closeSheet(); };
    $('#r-sheet [data-x]').onclick=closeSheet;
  }

  // ---------- أسئلة الشاشة ----------
  function openAsk(reqId, spec){
    st.askId=reqId; vibe([80,40,80]);
    const cards = spec.options.some(o=>o.card);
    sheet(`<div class="eyebrow">مطلوب منكم</div><h3>${esc(spec.title)}</h3>${spec.text?`<p class="muted">${esc(spec.text)}</p>`:''}
      <div class="${cards?'r-opts-cards':'r-opts'}">${spec.options.map((o,i)=> o.card
        ? `<div class="r-opt-card" data-o="${i}">${cardHTML(C(o.card),{size:spec.big?'':'mini',anim:!!spec.big,flag:o.flag})}</div>`
        : `<button class="btn ${o.color?'team big':(o.cls||'btn-hype big')}" ${o.color?`style="--c:${o.color}"`:''} data-o="${i}">${esc(o.label)}</button>`).join('')}</div>
      ${spec.cancel?`<div class="r-actions"><button class="btn ghost" data-o="-1">${esc(spec.cancel)}</button></div>`:''}`, true);
    $$('#r-sheet [data-o]').forEach(b=>b.onclick=()=>{ vibe(25); send({t:'answer', reqId, value:+b.dataset.o}); st.askId=null; closeSheet(); });
  }

  // ---------- البلاغ: سؤال/تحدي غلط أو بطاقة مو موزونة ----------
  function openReportSheet(){
    const S=st.S||{}, opts=[];
    if(S.item) opts.push({ what:'item', kind:S.item.kind, label:S.item.label, head:{q:'آخر سؤال',c:'بدون كلام',t:'آخر تحدي',l:'آخر سؤال حروف'}[S.item.kind]||'' });
    const seen=new Set();
    [S.lastCard, ...(S.hand||[])].forEach((id,i)=>{ const c=id&&C(id); if(!c || seen.has(id)) return; seen.add(id);
      opts.push({ what:'card', id, kind:'card', label:c.name, head: i===0&&id===S.lastCard ? 'آخر بطاقة انلعبت' : 'بطاقة بيدكم' }); });
    if(!opts.length){ sheet(`<h3>بلّغ عن مشكلة</h3><p class="muted">ما فيه شي تبلّغ عنه للحين — البلاغ يكون على آخر سؤال أو تحدي ظهر، أو بطاقة.</p><div class="r-actions"><button class="btn ghost" data-x>إغلاق</button></div>`); $('#r-sheet [data-x]').onclick=closeSheet; return; }
    sheet(`<div class="eyebrow">بلّغ عن مشكلة</div><h3>على وش؟</h3>
      <div class="r-rep-list">${opts.map((o,i)=>`<button class="r-rep-opt" data-i="${i}"><small>${esc(o.head)}</small><b>${esc(o.label)}</b></button>`).join('')}</div>
      <div class="r-actions"><button class="btn ghost" data-x>إلغاء</button></div>`);
    $$('#r-sheet [data-i]').forEach(b=>b.onclick=()=>reasonSheet(opts[+b.dataset.i]));
    $('#r-sheet [data-x]').onclick=closeSheet;
  }
  function reasonSheet(o){
    const list=(window.DahoomLog&&window.DahoomLog.REASONS[o.kind])||[]; let pick=null;
    sheet(`<div class="eyebrow">${esc(o.head)}</div><h3>${esc(o.label)}</h3>
      <div class="r-rep-reasons">${list.map((r,i)=>`<button class="btn ghost" data-r="${i}">${esc(r)}</button>`).join('')}</div>
      <textarea class="r-rep-note" id="r-rep-note" maxlength="300" placeholder="ملاحظة (اختياري): وش الصح؟"></textarea>
      <div class="r-actions"><button class="btn btn-hype big" id="r-rep-send" disabled>أرسل</button><button class="btn ghost" data-x>إلغاء</button></div>`);
    $$('#r-sheet [data-r]').forEach(b=>b.onclick=()=>{ pick=list[+b.dataset.r]; vibe(10); $$('#r-sheet [data-r]').forEach(x=>x.classList.toggle('btn-hype',x===b)); $('#r-rep-send').disabled=false; });
    $('#r-rep-send').onclick=()=>{ vibe(30); send({ t:'report', what:o.what, id:o.id||null, reason:pick, note:$('#r-rep-note').value.trim().slice(0,300) }); closeSheet(); };
    $('#r-sheet [data-x]').onclick=closeSheet;
  }
  $('#r-report').onclick=()=>{ vibe(10); openReportSheet(); };

  // ---------- بطاقة جديدة وصلت ----------
  function drawn(c){
    if(!c) return; vibe([100,50,100]);
    sheet(`<div class="eyebrow">سحبتوا بطاقة — لا تخلون أحد يشوف</div><div class="r-big r-drawn">${cardHTML(c,{size:'big',anim:true})}</div><div class="r-actions"><button class="btn btn-hype big" data-x>تمام</button></div>`);
    $('#r-sheet [data-x]').onclick=closeSheet;
  }

  function sheet(html, locked){ const s=$('#r-sheet'); $('#r-sheet-in').innerHTML=html; s.classList.remove('hidden'); s.dataset.locked=locked?'1':''; }
  function closeSheet(){ $('#r-sheet').classList.add('hidden'); }
  $('#r-sheet').addEventListener('click', e=>{ if(e.target.id==='r-sheet' && !e.currentTarget.dataset.locked) closeSheet(); });

  // الشاشة تبقى شغالة
  let wl=null;
  async function keepAwake(){ try{ if('wakeLock' in navigator && !wl){ wl=await navigator.wakeLock.request('screen'); wl.addEventListener('release',()=>wl=null); } }catch(e){} }
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible'){ keepAwake(); if(st.room && (!st.conn || !st.conn.open)) connect(); } });

  // ---------- البداية ----------
  function join(code){
    code=(code||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(code.length!==4){ $('#r-err').textContent='الكود 4 حروف/أرقام'; return; }
    $('#r-err').textContent=''; st.room=code; localStorage.setItem('dahoom_last_room', code);
    history.replaceState(null,'','?room='+code);
    connect();
  }
  $('#r-go').onclick=()=>join($('#r-code').value);
  $('#r-code').addEventListener('keydown', e=>{ if(e.key==='Enter') join(e.target.value); });
  $('#r-newteam').onsubmit=e=>{ e.preventDefault(); vibe(20); send({t:'newteam', name:$('#r-newteam-name').value.trim(), pid:(me()||{}).pid}); $('#r-newteam-name').value=''; };
  $('#r-switch').onclick=()=>{ localStorage.removeItem(teamKey()); st.teamId=null; send({t:'leave'}); };
  const q=new URLSearchParams(location.search).get('room');
  if(q) join(q); else { const last=localStorage.getItem('dahoom_last_room'); if(last) $('#r-code').value=last; }
})();
