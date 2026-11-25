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
  // ---------- أصوات الجوال: نغمات قصيرة مولّدة (بدون ملفات) ----------
  // الآيفون ما يدعم الاهتزاز، فالصوت هو التنبيه: دورك، قرار جديد، صح/غلط، آخر الثواني. يحترم كتم الصوت من المنصة.
  let AC=null;
  const soundOn = () => { try{ return localStorage.getItem('dahoom_sound')!=='false'; }catch(e){ return true; } };
  const NOTES = { turn:[[523,0,.13],[784,.12,.2]], ask:[[880,0,.09],[1175,.08,.13]], good:[[523,0,.09],[659,.08,.09],[784,.16,.18]], bad:[[233,0,.16],[196,.13,.24]], tick:[[1500,0,.035]], coin:[[988,0,.06],[1319,.06,.14]] };
  function sfx(kind){
    if(!soundOn() || document.hidden) return;
    try{
      AC = AC || new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==='suspended') AC.resume();
      const now=AC.currentTime+.01;
      (NOTES[kind]||[]).forEach(([f,t,d])=>{ const o=AC.createOscillator(), e=AC.createGain(); o.type = kind==='bad' ? 'square' : 'triangle'; o.frequency.value=f;
        const peak = kind==='tick' ? .06 : kind==='bad' ? .07 : .16;
        e.gain.setValueAtTime(.0001, now+t); e.gain.exponentialRampToValueAtTime(peak, now+t+.012); e.gain.exponentialRampToValueAtTime(.0001, now+t+d);
        o.connect(e); e.connect(AC.destination); o.start(now+t); o.stop(now+t+d+.03); });
    }catch(e){}
  }
  // المتصفح ما يسمح بالصوت إلا بعد أول لمسة
  document.addEventListener('pointerdown', ()=>{ try{ AC = AC || new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==='suspended') AC.resume(); }catch(e){} }, { passive:true });

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
  window.DahoomCardHTML = cardHTML;   // شرح اللعبة (js/rules.js) يرسم البطاقات بنفس الشكل


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
  // البلاغ من الجوال: نطلب سجل الشاشة وباقي الجوالات (الشاشة تجمعهم)
  const logWait = new Map();
  if(window.DahoomLog){
    window.DahoomLog.setPeers(ms=>new Promise(res=>{
      if(!st.conn || !st.conn.open) return res([{ who:'الشاشة', dump:'(الجوال مو متصل بالشاشة وقت البلاغ)' }]);
      const id='P'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
      const to=setTimeout(()=>{ logWait.delete(id); res([{ who:'الشاشة', dump:'(الشاشة ما ردت على طلب السجل خلال المهلة)' }]); }, ms+1500);
      logWait.set(id, list=>{ clearTimeout(to); logWait.delete(id); res(list); });
      try{ st.conn.send({t:'logreq', id, all:1}); }catch(e){ clearTimeout(to); res([]); }
    }));
    window.DahoomLog.addSnap('الجوال', ()=>{ const S=st.S||{}, m=me()||{}, sc=[...document.querySelectorAll('.r-screen')].find(x=>!x.classList.contains('hidden'));
      return { owner:!!OWNER, me:m.name||null, room:st.room, team:st.teamId, mode:st.mode, connected:!!(st.conn && st.conn.open), retry:st.retry,
        screen:sc?sc.id:null, game:S.game||null, phase:S.phase||null, phaseKey:S.phaseKey||null, myTurn:!!S.myTurn, asking:st.askId||null,
        status:($('#r-status')||{}).textContent||'' }; });
  }
  const st = { room:null, peer:null, conn:null, teamId:null, S:null, askId:null, retry:0, wantOpen:false, mode:'teams', avatars:[], avGroups:null, teams:[], info:null, feed:[] };
  const teamKey = () => 'dahoom_team_'+st.room;
  const meKey = 'dahoom_me';   // الاسم والصورة يتذكرهم الجوال لكل الغرف
  // صاحب الجلسة يلعب من نفس جهاز الطاولة (صفحة اللاعب داخلها) — ما يحتاج شريطنا العلوي ولا «اطلع من الغرفة»
  const OWNER = new URLSearchParams(location.search).get('owner')==='1';
  if(OWNER) document.body.classList.add('is-owner');
  const me = () => { try{ return JSON.parse(localStorage.getItem(meKey)||'null'); }catch(e){ return null; } };
  const avSrc = a => 'assets/avatars/'+a+'.webp';
  // نسخة احتياطية من قائمة الصور لو الشاشة ما أرسلتها
  const AV_LIB = window.DAHOOM_AVATARS;
  const AV_FALLBACK = (AV_LIB && AV_LIB.all && AV_LIB.all.slice()) || ['doge','cheems','pepe_the_frog','trollface','gigachad','wojak','shrek_face','patrick_star','squidward','kermit','grumpy_cat','smudge_cat','crying_cat','pop_cat',
    'hide_the_pain_harold','mr_bean','nicolas_cage','the_rock_eyebrow','monkey_puppet','capybara','sad_hamster','chill_guy','minion','baby_yoda','side_eye_chloe','spongebob','saudi_smile','saudi_smirk',
    'tan_otori','astolfo','felix_argyle','hideri','saika','nagisa','anya','chika','frieren','marin','bocchi','nezuko','zero_two','megumin','kaguya','power','mai','luffy','naruto','goku','saitama','hakari','pochita','pikachu','chiikawa','hamtaro'];
  const LG = m => { try{ window.DahoomLog && window.DahoomLog.trail(m); }catch(e){} };
  function show(id){ LG('شاشة: '+id); $$('.r-screen').forEach(s=>s.classList.toggle('hidden', s.id!==id)); }
  // busy=true: شي شغال (اتصال/انتظار) — يطلع جنب الرسالة مؤشر تحميل صغير
  function status(msg, busy){ if(msg) LG('رسالة: '+msg); const s=$('#r-status'); s.textContent=msg||''; if(msg && busy) s.insertAdjacentHTML('afterbegin','<span class="dh-loader sm" aria-hidden="true"><i></i><i></i><i></i></span>'); s.classList.toggle('busy', !!(msg && busy)); s.classList.toggle('hidden', !msg); }

  // ---------- الاتصال ----------
  function connect(){
    LG('نتصل بالغرفة (محاولة '+(st.retry+1)+')');
    status('نتصل بالشاشة…', true);
    try{ st.peer && st.peer.destroy(); }catch(e){}
    // st.sig: 0 = سيرفر الربط العام، 1 = الاحتياطي (لو ما لقينا الشاشة بالعام نجرّبه)
    const BK = window.DAHOOM_ICE && window.DAHOOM_ICE.peerBackup; if(!BK) st.sig=0;
    const peer = st.peer = new window.Peer(Object.assign({debug:0}, st.sig===1 && BK ? BK : {}, window.DAHOOM_ICE ? {config:{ iceServers: window.DAHOOM_ICE.iceServers }} : {}));
    if(st.sig===1) LG('نجرب السيرفر الاحتياطي');
    peer.on('open', ()=>{
      const conn = st.conn = peer.connect(PREFIX+st.room, {reliable:true});
      if(window.DAHOOM_ICE) window.DAHOOM_ICE.watch(conn, lost);
      const to = setTimeout(()=>{ if(!conn.open){ const I=window.DAHOOM_ICE; if(I) lost(I.diagnose(peer, conn)); else fail('ما قدرنا نوصل للشاشة — تأكد إن الشاشة فاتحة ومتصلة بالنت'); } }, 9000);
      conn.on('open', ()=>{ LG('اتصل بالشاشة'); clearTimeout(to); st.retry=0; status(''); conn.send({t:'hello', teamId: localStorage.getItem(teamKey()), pid:(me()||{}).pid, owner:OWNER?1:0}); conn.send({t:'hb'}); });
      conn.on('data', onData);
      conn.on('close', ()=>{ LG('الاتصال بالشاشة انقفل'); lost(); });
      conn.on('error', e=>{ LG('خطأ بالاتصال: '+(e&&e.type||e)); lost(e); });
    });
    peer.on('error', e=>{
      LG('خطأ سيرفر الربط: '+(e&&e.type));
      // ما لقينا الشاشة بهالسيرفر: نجرّب الثاني قبل ما نقول الكود غلط
      if(e.type==='peer-unavailable'){ if(BK && st.sig===0){ st.sig=1; return connect(); } st.sig=0; return fail('الكود غلط أو الجلسة انقفلت. تأكد من الكود وجرب مرة ثانية.', true); }
      // انقطع سيرفر الربط بس واتصالنا بالشاشة شغال: نكمل عادي (قبل كنا نقطع الاتصال الشغال ونطلّع رسالة كل شوي)
      if(st.conn && st.conn.open && /network|server-error|socket-error|disconnected/.test(e.type||'')) return;
      // سيرفر الربط نفسه ما يرد: المحاولة الجاية على السيرفر الثاني
      if(BK && /network|server-error|socket-error/.test(e.type||'')) st.sig = st.sig===1 ? 0 : 1;
      lost(e);
    });
    peer.on('disconnected', ()=>{ if(st.conn && st.conn.open) setTimeout(()=>{ try{ if(peer.disconnected && !peer.destroyed && st.peer===peer) peer.reconnect(); }catch(err){} }, 3000); });
  }
  function fail(msg, toJoin){ status(''); $('#r-err').textContent=msg; if(toJoin){ show('r-join'); localStorage.removeItem('dahoom_last_room'); } else lost(); }
  function lost(why){
    if(!st.room) return;
    LG('انقطع: '+(typeof why==='string' ? why : (why && why.type) || 'بدون سبب واضح')+' (المحاولة '+st.retry+')');
    const I = window.DAHOOM_ICE;
    // أول مرة: «نرجع نتصل». لو فيه سبب واضح أو تكرر الفشل: نقول له وش يسوي
    status(I && ((why && typeof why!=='function') || st.retry>=2) ? I.why(why || 'ice') : 'انقطع الاتصال… نرجع نتصل', true);
    clearTimeout(st.rt); st.rt=setTimeout(()=>{ if(!st.conn || !st.conn.open) connect(); }, Math.min(8000, 1500*(++st.retry)));
  }
  function send(msg){ if(st.conn && st.conn.open){ st.conn.send(msg); return true; } lost(); return false; }
  // نبض: الشاشة تعرف إن الجوال لسا معها. بدونه الجوال اللي انقفل أو طلع يبقى «متصل» ويوقف البداية
  const beatConn = t => { try{ if(st.conn && st.conn.open) st.conn.send({t}); }catch(e){} };
  setInterval(()=>{ if(document.visibilityState==='visible') beatConn('hb'); }, 4000);
  document.addEventListener('visibilitychange', ()=>beatConn(document.visibilityState==='visible' ? 'hb' : 'away'));
  window.addEventListener('pagehide', ()=>beatConn('away'));

  // ---------- الرسائل ----------
  let lastPh='';
  function onData(d){
    if(!d) return;
    // سجل الأحداث: الشاشة تطلب سجلنا (لبلاغ) أو ترد على طلبنا
    if(d.t==='logreq'){ try{ st.conn.send({t:'logrep', id:d.id, dump:window.DahoomLog ? window.DahoomLog.dump(8000) : ''}); }catch(e){} return; }
    if(d.t==='logrep'){ const w=logWait.get(d.id); if(w) w(d.list||[]); return; }
    if(d.t==='state'){ const ph=[d.game, d.phaseKey||'', String(d.phase||'').slice(0,50), d.myTurn?'دوري':''].join(' · '); if(ph!==lastPh){ lastPh=ph; if(ph.replace(/[\s·]/g,'')) LG('الحالة: '+ph); } }
    else if(d.t!=='stroke' && d.t!=='rsync' && d.t!=='fill') LG('من الشاشة: '+d.t+(d.msg?' — '+String(d.msg).slice(0,60):''));
    if(d.t==='teams'){ st.teamId=null; st.mode=d.mode||'teams'; st.avatars=d.avatars||[]; st.avGroups=d.avatarGroups||null; st.teams=d.teams||[]; st.canCreate=!!d.canCreate;
      if(!$('#r-reg').classList.contains('hidden')) return;
      const m=me(); if(m && m.name && st.autoReg!==st.room){ st.autoReg=st.room; send({t:'register', pid:m.pid, name:m.name, avatar:m.avatar}); return; }
      openReg(); return; }
    // فردي: ما فيه فرق — سجّل اسمك وصورتك على طول
    if(d.t==='soloreg'){ st.teamId=null; st.mode='solo'; st.avatars=d.avatars||[]; st.avGroups=d.avatarGroups||null; st.soloPlayers=d.players||[];
      if(!$('#r-reg').classList.contains('hidden')){ drawSoloList(); return; }
      const m=me(); if(m && m.name && !d.locked && st.autoReg!==st.room){ st.autoReg=st.room; send({t:'register', pid:m.pid, name:m.name, avatar:m.avatar}); return; }
      openReg(); return; }
    if(d.t==='joined'){ st.teamId=d.teamId; if(d.mode) st.mode=d.mode; if(d.avatars&&d.avatars.length){ st.avatars=d.avatars; st.avGroups=d.avatarGroups||null; } if(d.teams) st.teams=d.teams; localStorage.setItem(teamKey(), d.teamId); keepAwake();
      const m=me(); if(st.mode==='solo'){ show('r-main'); return; }
      if(m && m.name && (d.known || st.registeredRoom===st.room+':'+d.teamId)){ st.registeredRoom=st.room+':'+d.teamId; show('r-main'); renderMain(); return; }
      if(m && m.name){ send({t:'register', pid:m.pid, name:m.name, avatar:m.avatar}); return; }
      openReg(); return; }
    if(d.t==='registered'){ if(d.teamId){ st.teamId=d.teamId; st.mode=d.mode||st.mode; localStorage.setItem(teamKey(), d.teamId); keepAwake(); }
      else if(d.teamless){ st.teamId=null; if(d.mode) st.mode=d.mode; localStorage.removeItem(teamKey()); keepAwake(); }
      const m=Object.assign(me()||{}, {pid:d.pid, name:d.name, avatar:d.avatar}); localStorage.setItem(meKey, JSON.stringify(m)); st.registeredRoom=st.room+':'+st.teamId; show('r-main'); renderMain(); return; }
    if(d.t==='state'){ st.S=d; window.DAHOOM_PHASE=d.phaseKey||null; if((st.teamId || d.teamless) && $('#r-reg').classList.contains('hidden')) show('r-main'); renderMain(); return; }
    if(d.t==='rs'){ onMirror(d.m); return; }
    if(d.t==='rsfull'){ if(mirror) mirror.load(d.ops); return; }
    if(d.t==='ask'){ openAsk(d.reqId, d.spec); return; }
    if(d.t==='close'){ if(st.askId===d.reqId){ closeSheet(); tog('#r-ask', false); $('#r-ask').innerHTML=''; st.askId=null; } if(st.hmAsk && st.hmAsk.reqId===d.reqId){ st.hmAsk=null; renderHMAsk(); } if(st.sqAsk && st.sqAsk.reqId===d.reqId){ st.sqAsk=null; renderSQAsk(); } return; }
    if(d.t==='hmbuild'){ if(hm.B) tradeBuilder(); return; }
    if(d.t==='drawn'){ drawn(C(d.card)); return; }
    if(d.t==='info'){ st.info=d; renderSess(); if(!$('#r-main').classList.contains('hidden')) renderMain(); return; }
    if(d.t==='feed'){ st.feed.push(d.f); if(st.feed.length>60) st.feed.shift(); renderFeed(true); return; }
    if(d.t==='feedall'){ st.feed=(d.list||[]).slice(-60); renderFeed(false); return; }
    if(d.t==='feedreset'){ st.feed=[]; renderFeed(false); return; }
    // الجلسة خاملة: تنبيه وزر «أنا هنا» (أي ضغطة منه ترجّع العداد)
    if(d.t==='idlewarn'){ let b=$('#r-idle');
      if(!d.on){ if(b) b.remove(); return; }
      if(!b){ b=document.createElement('div'); b.id='r-idle'; b.className='idle-warn'; b.setAttribute('role','alertdialog');
        b.innerHTML=`<b>الجلسة خاملة</b><span>ما أحد لعب من ربع ساعة تقريباً — بتنقفل بعد دقيقة</span><button type="button" class="btn btn-hype">${ic('check')} أنا هنا، كمّلوا</button>`;
        b.querySelector('button').onclick=()=>{ vibe(15); send({t:'here'}); b.remove(); }; document.body.appendChild(b); vibe([60,40,60]); }
      return; }
    if(d.t==='ended'){ st.room=null; try{ st.peer && st.peer.destroy(); }catch(e){} localStorage.removeItem('dahoom_last_room'); history.replaceState(null,'','remote.html'); $('#r-code').value=''; $('#r-err').textContent=d.msg||''; show('r-join'); return; }
    if(d.t==='notice'){ status(d.msg); vibe([40,30,40]); sfx(/صح|وافق|فزت|طلعت!|\+/.test(d.msg) ? 'good' : /رفض|ما زبطت|نشل|أخذ منك|خسر/.test(d.msg) ? 'bad' : 'coin'); clearTimeout(st.nt); st.nt=setTimeout(()=>status(''),3500); return; }
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
  // اللاعب عنده حساب (مسجّل أو ضيف) → اسمه وصورته من الحساب، وما نعرض تعديلهم هنا
  function hasAcct(){ try{ const A=window.DahoomAccount, c=A && A.current && A.current(); return !!(c && c.name); }catch(e){ return false; } }
  function openReg(){
    if(!st.avatars.length) st.avatars=AV_FALLBACK.slice();
    const A=window.DahoomAccount && window.DahoomAccount.current();
    const m=me() || (A ? { name:A.name, avatar:A.avatar } : {}); const t=st.teams.find(x=>x.id===st.teamId)||{};
    if(st.mode==='solo') drawSoloList();
    else if(t.name){ $('#r-reg-lbl').textContent='فريقك'; $('#r-reg-team').innerHTML=`<span class="r-teamchip" style="--c:${t.color||'var(--line)'}">${esc(t.name)}</span>`; }
    else { $('#r-reg-lbl').textContent='الفريق تختاره بعدين من قائمة الانتظار'; $('#r-reg-team').innerHTML=''; }
    $('#r-name').value=m.name||''; regAv = st.avatars.includes(m.avatar) ? m.avatar : st.avatars[Math.floor(Math.random()*st.avatars.length)];
    const editing = !!(m.name && st.registeredRoom);
    $('#r-reg-back').classList.toggle('hidden', !editing);
    $('#r-reg h1').textContent = editing ? 'عدّل اسمك وصورتك' : 'مين انت؟';
    drawAvatars(); show('r-reg');
  }
  function drawSoloList(){ const l=st.soloPlayers||[]; $('#r-reg-lbl').textContent = l.length ? `اللاعبين (${l.length}):` : 'كل واحد لحاله — كن أول لاعب';
    $('#r-reg-team').innerHTML = l.map(p=>`<span class="r-solo"><img src="${avSrc(p.avatar)}" alt="">${esc(p.name)}</span>`).join(''); }
  // الصور مقسّمة مجموعات (ميمز، أنمي…): من الشاشة لو أرسلتها، وإلا من js/avatars.js، وإلا قائمة وحدة
  function avGroups(){
    const ok=new Set(st.avatars), seen=new Set();
    const src=(st.avGroups&&st.avGroups.length) ? st.avGroups : (AV_LIB&&AV_LIB.groups) || [];
    const out=src.map(g=>({ name:g.name||'', list:(g.list||[]).filter(a=>ok.has(a)&&!seen.has(a)&&seen.add(a)) })).filter(g=>g.list.length);
    const rest=st.avatars.filter(a=>!seen.has(a)); if(rest.length) out.push({ name:out.length?'غيرها':'', list:rest });
    return out;
  }
  function drawAvatars(){
    const btn = a => `<button class="r-av ${a===regAv?'sel':''}" data-a="${a}"><img src="${avSrc(a)}" alt=""></button>`;
    const box=$('#r-avatars'), top=box.scrollTop;
    box.innerHTML=avGroups().map(g=>(g.name?`<div class="r-av-group">${esc(g.name)}</div>`:'')+g.list.map(btn).join('')).join(''); box.scrollTop=top;
    $$('#r-avatars .r-av').forEach(b=>b.onclick=()=>{ regAv=b.dataset.a; vibe(10); drawAvatars(); });
  }
  $('#r-reg-back').onclick=()=>{ vibe(10); show('r-main'); renderMain(); };
  $('#r-reg-go').onclick=()=>{
    const name=$('#r-name').value.trim();
    if(!name){ $('#r-reg-err').textContent='اكتب اسمك'; return; }
    if(window.DahoomBad && window.DahoomBad.has(name)){ $('#r-reg-err').textContent='فيه كلمة ما تصلح — اختر اسم ثاني'; return; }
    $('#r-reg-err').textContent=''; vibe(30);
    const m=me()||{}; localStorage.setItem(meKey, JSON.stringify(Object.assign(m,{name, avatar:regAv})));
    send({t:'register', pid:m.pid, name, avatar:regAv});
  };

  // ---------- الشاشة الرئيسية ----------
  let buzzSent = 0;
  const tog = (sel, on) => { const e=$(sel); if(e) e.classList.toggle('r-hide', !on); };
  // حالتي لأصدقائي: بجلسة لعبة كذا / يلعبها الحين
  function activity(){
    const A=window.DahoomAccount; if(!A || !A.setActivity) return;
    const I=st.info||{}, S=st.S, k = !st.room ? 'on' : (S && !S.waiting && S.locked) || I.locked ? 'play' : 'lobby', g=I.game||'';
    if(st.actKey===k+g) return; st.actKey=k+g; A.setActivity(k, g);
  }
  function renderMain(){
    activity();
    const sw=$('#r-switch'); if(sw) sw.style.display = (st.S && st.S.locked) || st.mode==='solo' ? 'none' : '';
    renderSess();
    const S=st.S, waiting = !S || !!S.waiting;   // لازم true/false بالضبط: toggle مع undefined يقلب الكلاس كل مرة (كان يخفي سطر الحالة ويرجّعه فتتحرك الشاشة)
    $('#r-main').classList.toggle('is-waiting', waiting);
    tog('#r-wait', waiting);
    if(waiting){
      renderWait(); renderMe();
      ['#r-timer','#r-view','#r-hmwrap','#r-hmaskjump'].forEach(q=>tog(q,false)); if(!st.askId) tog('#r-ask', false);
      $('#r-main').classList.remove('is-hm','is-sq'); $('#r-sq').classList.add('hidden');
      ['#r-final','#r-charade','#r-rasm'].forEach(q=>$(q).classList.add('hidden'));
      tog('#r-slot', false); $('#r-fx').innerHTML=''; $('#r-scores').innerHTML='';
      $('#r-phase').textContent=''; stopTimer(); return; }
    $('#r-buzz').style.display='';
    const t=S.team;
    document.body.style.setProperty('--team', t.color);
    if(S.myTurn && !st.wasTurn && !S.final) sfx('turn'); st.wasTurn=!!S.myTurn;
    const m=me();
    $('#r-head').innerHTML=`${m&&m.avatar?(hasAcct()?`<span class="r-me"><img src="${avSrc(m.avatar)}" alt=""></span>`:`<button class="r-me" id="r-me" aria-label="عدّل اسمك وصورتك"><img src="${avSrc(m.avatar)}" alt=""></button>`):''}<span class="r-who"><span class="r-team" style="--c:${t.color}">${esc(t.name)}</span>${m&&m.name&&st.mode!=='solo'?`<small>${esc(m.name)}</small>`:''}</span>
      ${t.id==='ref' ? '' : `<span class="r-score"><b>${t.score}</b><small>${S.game==='khaliya'?'جولات':S.game==='hawamir'?'كاش':S.game==='sadq'?'ريال':'نقطة'}</small></span>`}
      ${S.myTurn?`<span class="r-turn">${st.mode==='solo'?'دورك':'دوركم'}</span>`:''}`;
    const meBtn=$('#r-me'); if(meBtn) meBtn.onclick=()=>{ if(S.locked){ status('تعديل الاسم والصورة بعد ما تخلص المباراة'); clearTimeout(st.nt); st.nt=setTimeout(()=>status(''),2500); return; } openReg(); };
    $('#r-phase').innerHTML = S.letter ? `<span class="r-letter">${esc(S.letter)}</span> ${esc(S.phase||'')}` : esc(S.phase||'');
    renderKB(S.game==='khaliya' && !S.final ? S.kb : null);
    renderKH(S.game==='khaliya' && !S.final ? S.kh : null);
    // نهاية المباراة: مركز الفريق وجوائزه وأرقامه
    const fin=$('#r-final'), done=!!S.final;
    fin.classList.toggle('hidden', !done);
    ['#r-buzz','#r-fx','#r-hand-wrap','#r-charade'].forEach(q=>{ const e=$(q); if(e) e.style.display = done ? 'none' : ''; });
    if(done){
      const f=S.final;
      if(!st.finalShown){ st.finalShown=true; vibe(f.rank===1?[120,60,120,60,240]:[80]); }
      fin.innerHTML=`<div class="rf-rank ${f.rank===1?'win':''}"><small>انتهت المباراة</small><b>#${f.rank}</b><span>من ${f.of} ${f.rank===1?'— فزتوا!':''}</span></div>
        ${f.awards.length&&!f.all?`<div class="rf-aw">${f.awards.map(a=>`<span class="rf-badge"><b>${esc(a.title)}</b>${esc(a.value)}</span>`).join('')}</div>`:''}
        <div class="rf-rows">${f.rows.map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
        ${OWNER && OWN() ? `<div class="ow-after"><button type="button" class="btn btn-hype big" data-ow-again>${ic('recycle')} العبوا مرة ثانية</button><button type="button" class="btn" data-ow-setup>${ic('gears')} غيّر اللعبة أو الإعدادات</button></div>` : ''}
        ${f.all ? finalAllHTML(f.all) : `<p class="muted small center">${S.game==='alf'?'الإحصائيات الكاملة والمنحنى على الشاشة':'الإحصائيات الكاملة على الشاشة'}</p>`}`;
      $('#r-phase').textContent='';
      { const ag=$('[data-ow-again]'), su=$('[data-ow-setup]'); if(ag) ag.onclick=()=>{ vibe(20); OWN().again(); }; if(su) su.onclick=()=>{ vibe(10); OWN().toSetup(); }; }
      if(!st.recorded && window.DahoomAccount){ st.recorded=true;
        const mm=me()||{}, fx=f.stats||{};
        Promise.resolve(window.DahoomAccount.recordMatch({ id:`${st.room}-${S.game}-${f.mid||Math.floor(Date.now()/600000)}-${mm.pid||''}`, game:S.game, rank:f.rank, of:f.of, won:f.rank===1,
          score: typeof t.score==='number' ? t.score : Number(String(t.score).replace(/[^\d]/g,''))||0, mode:st.mode, stats:fx, name:mm.name, avatar:mm.avatar }))
          .then(res=>{ if(res) window.DahoomAccount.showUnlocks(res); }).catch(()=>{}); }
    } else { st.finalShown=false; st.recorded=false; }
    // التمثيل: واحد من الفريق يختار يمثّل والعبارة تطلع له بس
    renderCharade(S.charade);
    // البز
    const b=$('#r-buzz'), sub=$('#r-buzz-sub'), z=S.buzz||{};
    b.className='r-buzz'; b.disabled=true;
    if(z.open && z.can){ b.disabled=false; b.classList.add('live'); sub.textContent= z.first ? `${z.first} سبقكم — اضغط تاخذ دورك` : 'اضغط أول!'; }
    else if(z.mine){ b.classList.add('won'); sub.textContent= z.rank>1 ? `دوركم تجاوبون (ترتيبكم #${z.rank})` : 'بزّيت أول! جاوب'; }
    else if(z.rank){ b.classList.add('lost'); sub.textContent=`ترتيبك #${z.rank} · متأخر ${Math.round(z.gap*1000)}ms`; }
    else if(z.first){ b.classList.add('lost'); sub.textContent=`${z.first} سبقكم`; }
    else if(z.open){ sub.textContent='مو متاح لكم الحين'; }
    else sub.textContent='البز يفتح لما يجي وقته';
    // ألف نقطة: البز "قريب يفتح" لما فريق ثاني يجاوب سؤال على الشاشة (لو غلط تفتح السرقة)
    const isAlf = S.game==='alf', scoresL = S.scores||[];
    const soon = isAlf && !S.myTurn && !z.open && !!(S.view && S.view.kind==='q' && !S.view.answer);
    if(soon) sub.textContent='لو غلطوا تفتح السرقة — خلّك جاهز';
    if(S.benched){ b.className='r-buzz lost'; b.disabled=true; sub.textContent='انت برا السالفة هالدور'; }
    // الطاقات
    $('#r-fx').innerHTML=(S.fx||[]).map(f=>`<span class="fx-tag ${f.bad?'bad':''}">${esc(f.n)}</span>`).join('');
    // خانة الفعل: وحدة بارتفاع ثابت — البز لما يكون له داعي، وإلا اليد لما دوركم تلعبون بطاقة، وإلا سطر حالة هادي
    const slot=$('#r-slot'), hand=isAlf ? (S.hand||[]).map((id,i)=>({ c:C(id), i })).filter(x=>x.c) : [];
    const mode = !isAlf || soon || z.open || z.mine || z.rank ? 'buzz' : S.canPlay && hand.length ? 'play' : 'idle';
    tog('#r-slot', !done && !['rasm','hawamir','sadq'].includes(S.game) && !(S.kh && S.kh.ref));
    slot.dataset.mode=mode; slot.classList.toggle('has-hand', hand.length>0);
    if(mode==='idle'){
      const tn=(scoresL.find(x=>x.turn)||{}).name, solo=st.mode==='solo';
      const [mi,mt,ms] = S.myTurn ? ['eye',solo?'دورك — ركّز على الشاشة':'دوركم — ركّزوا على الشاشة', S.canPlay?'ما عندكم بطاقات تلعبونها هالدور':'المضيف يحكم على جوابكم']
        : ['hourglass', tn?`الدور عند ${tn}`:'استنوا شوي', 'البز يفتح لكم وقت السرقة أو التمثيل'];
      $('#r-slot-msg').innerHTML=`<span class="rsm-ic">${ic(mi)}</span><span class="rsm-t"><b>${esc(mt)}</b><small>${esc(ms)}</small></span>`;
    }
    // اليد (ألف نقطة): تنرسم بس لما تتغير عشان ما ترمش الصور ولا يرجع السحب لأوله
    if(isAlf){
      const hk=JSON.stringify([S.hand||[], !!S.canPlay, !!S.fuse, S.phaseKey||'']), h=$('#r-hand');
      $('#r-hand-lbl').innerHTML = S.canPlay && hand.length
        ? `<b class="r-can">${ic('cards')} ${st.mode==='solo'?'دورك — العب بطاقة وحدة':'دوركم — العبوا بطاقة وحدة'}</b>${S.fuse?`<button class="btn small r-fuse" id="r-fuse">${ic('recycle')} ادمج سودتين = زرقا</button>`:''}`
        : hand.length ? `<span>${ic('cards')} بطاقاتكم السرية (${hand.length})</span><small>اضغط البطاقة تشوفها</small>` : '';
      if(h.dataset.k!==hk){ const sl=h.scrollLeft; h.dataset.k=hk;
        h.innerHTML = hand.map(({c,i})=>`<button type="button" class="r-hcard" data-i="${i}" aria-label="${esc(c.name)}">${cardHTML(c,{size:'mini',flag:c.kind==='reaction'?'رد فعل':''})}</button>`).join('');
        h.scrollLeft=sl;
        $$('#r-hand .r-hcard').forEach(el=>el.onclick=()=>{ vibe(10); preview(+el.dataset.i); }); }
      const f=$('#r-fuse'); if(f) f.onclick=()=>{ vibe(30); send({t:'fuse'}); };
      h.classList.toggle('can', !!S.canPlay);
    } else if($('#r-hand').dataset.k){ $('#r-hand').innerHTML=''; $('#r-hand').dataset.k=''; $('#r-hand-lbl').innerHTML=''; }
    // النقاط
    $('#r-scores').innerHTML=(S.scores||[]).map(x=>`<span class="r-sc ${x.id===t.id?'me':''} ${x.turn?'turn':''}" style="--c:${x.color}"><i></i>${esc(x.name)} <b>${x.score}</b>${S.game==='alf'&&x.hand!=null?`<small>${ic('cards')}${x.hand}</small>`:''}</span>`).join('');
    // ارسم وخمّن: لوحة الرسم للرسام، ومربع التخمين للباقين
    const rs=$('#r-rasm'), isR = S.game==='rasm' && !done && !!S.rasm;
    rs.classList.toggle('hidden', !isR);
    if(S.game==='rasm' || S.game==='hawamir' || S.game==='sadq') b.style.display='none';
    { const bs=$('#r-buzz-sub'); if(bs) bs.style.display = S.game==='hawamir' ? 'none' : ''; }
    if(isR) renderRasm(S.rasm); else if(rs.dataset.key){ rs.innerHTML=''; rs.dataset.key=''; }
    // ما أصدقك
    const isSQ = S.game==='sadq' && !done && !!S.sq;
    $('#r-sq').classList.toggle('hidden', !isSQ); $('#r-main').classList.toggle('is-sq', isSQ);
    if(isSQ) renderSQ(S.sq); else if(st.sqAsk && !S.sq){ st.sqAsk=null; }
    // المؤقت (ألف نقطة وارسم وخمّن) + السؤال كما هو على الشاشة + لوحة هوامير
    setTimer(done ? null : (S.timer || (S.rasm && S.rasm.timer) || null));
    { const tm=$('#r-timer'), keep = S.game==='rasm' && !done && !(S.rasm && S.rasm.timer);
      if(keep){ tm.classList.remove('r-hide'); tm.classList.add('r-ghost'); } else tm.classList.remove('r-ghost'); }
    renderView(done ? null : S.view);
    const hm = S.game==='hawamir' && S.hm && !done;
    tog('#r-hmwrap', hm); $('#r-main').classList.toggle('is-hm', !!hm);
    if(hm) renderHM(S.hm); else { tog('#r-ask', false); tog('#r-hmaskjump', false); if(st.hmAsk){ st.hmAsk=null; renderHMAsk(); } }
    $('#r-scores').classList.toggle('r-hide', S.game==='hawamir' && !done);
    { const fb=$('.r-feedbox'); if(fb) fb.classList.toggle('r-hide', S.game==='rasm' || S.game==='sadq'); }
    $('#r-scores').classList.toggle('r-hide', (S.game==='hawamir' || S.game==='sadq') && !done);
  }

  // ---------- الجلسة: اللعبة والمضيف واللاعبين ----------
  function renderSess(){
    const I=st.info; if(!I) return;
    const m=me()||{}, n=I.players.length, on=I.players.filter(p=>p.on).length;
    const host = I.host || 'المضيف', lobby = !st.S || !!st.S.waiting;
    $('#r-sess-sum').innerHTML=`<span class="rs-game">${esc(I.gameName||'دحوم')}</span><span class="rs-code">${esc(I.code||st.room||'')}</span><span class="rs-n">${n} ${n===1?'لاعب':'لاعبين'}</span>`;
    const pl = p => `<div class="rs-p ${p.on?'on':''} ${p.id===m.pid?'me':''}" style="--c:${p.tc||p.color}"><img src="${avSrc(p.avatar)}" alt=""><span><b>${esc(p.name)}${p.own?` <em class="rs-own" title="صاحب الجلسة">${ic('crown')}</em>`:''}${p.id===m.pid?' <i>(انت)</i>':''}</b>${p.team&&I.mode!=='solo'?`<small>${esc(p.team)}</small>`:''}</span>${p.rd&&!I.locked?`<strong class="rs-rd" title="مستعد">${ic('check')}</strong>`:''}<em title="${p.on?'متصل':'مو متصل'}"></em></div>`;
    let list='';
    if(I.mode==='solo' || !I.teams.length) list = I.players.map(pl).join('');
    else { list = I.teams.map(t=>{ const mem=I.players.filter(p=>p.team===t.name); return `<div class="rs-team" style="--c:${t.color}"><div class="rs-th"><i></i>${esc(t.name)} <small>${mem.length}</small></div>${mem.map(pl).join('')||'<p class="muted small">فاضي</p>'}</div>`; }).join('');
      const loose=I.players.filter(p=>!p.team); if(loose.length) list += `<div class="rs-team" style="--c:var(--line)"><div class="rs-th"><i></i>بدون فريق <small>${loose.length}</small></div>${loose.map(pl).join('')}</div>`; }
    $('#r-sess-body').innerHTML=`<div class="rs-rows">
        <div><span>اللعبة</span><b>${esc(I.gameName||'—')}</b></div>
        <div><span>صاحب الجلسة</span><b>${esc(host)}</b></div>
        <div><span>الطريقة</span><b>${I.mode==='solo'?'كل واحد لحاله':'فرق'}</b></div>
        <div><span>متصلين</span><b>${on} من ${n}</b></div></div>
      <div class="rs-where k-${esc(I.where.k)}"><i></i>${esc(I.where.x)}</div>
      ${lobby ? '' : `<div class="rs-list">${list||'<p class="muted small">ما فيه لاعبين للحين</p>'}</div>`}
      <div class="rs-acts">${lobby ? '' : rulesBtn(I.game)}${!I.locked && st.registeredRoom && !hasAcct()?'<button class="btn small" data-edit>عدّل اسمي وصورتي</button>':''}${OWNER?'':'<button class="btn ghost small" data-leave>اطلع من الغرفة</button>'}</div>`;
    const e=$('#r-sess-body [data-edit]'); if(e) e.onclick=()=>{ vibe(10); openReg(); };
    bindRoster($('#r-sess-body'));
    const lv=$('#r-sess-body [data-leave]'); if(lv) lv.onclick=()=>{ if(!confirm('تطلع من الغرفة؟')) return; try{ send({t:'leave'}); }catch(err){} st.room=null; try{ st.peer && st.peer.destroy(); }catch(err){} localStorage.removeItem('dahoom_last_room'); localStorage.removeItem(teamKey()); history.replaceState(null,'','remote.html'); show('r-join'); };
    // وسط المباراة بالجوال نطوي القائمة عشان اللعب ياخذ الشاشة (إلا لو اللاعب فتحها بنفسه)
    const det=$('#r-sess'), wide=matchMedia('(min-width:900px)').matches;
    if(!st.sessTouched) det.open = (wide && !(st.S && st.S.game==='hawamir')) || !I.locked;   // بهوامير اللوحة أهم
    const mini=$('#r-sess-mini'); if(mini) mini.innerHTML=`<span>${esc(I.gameName||'')}</span><span>المضيف: <b>${esc(host)}</b></span><span>${n} ${n===1?'لاعب':'لاعبين'}</span>`;
  }
  $('#r-sess').addEventListener('toggle', ()=>{ if(st.info) st.sessTouched=true; });
  // ---------- لوحة إدارة الجلسة (لصاحب الجلسة بس) ----------
  // صاحب الجلسة يلعب من نفس الجهاز: هالصفحة داخل إطار بصفحة الطاولة، فنقدر نكلّم مدير الطاولة مباشرة (نفس الموقع)
  const OWN = () => { try{ return OWNER && window.parent!==window && window.parent.DahoomOwner ? window.parent.DahoomOwner.api : null; }catch(e){ return null; } };
  let ownSig='';
  function renderOwnerPanel(box){
    const A=OWN(); if(!A) return false;
    A.prepare();
    const g=A.game(), games=A.games(), G=games.find(x=>x.id===g)||games[0], F=A.fields(), mode=A.mode(), n=A.players();
    const sig=JSON.stringify([g, mode, F.map(f=>[f.id,f.type,f.label,f.sec,f.group,(f.options||[]).length])]);
    if(ownSig!==sig || !box.querySelector('.ow')){
      ownSig=sig;
      const secs=[]; F.forEach(f=>{ let s=secs.find(x=>x.t===f.sec); if(!s){ s={ t:f.sec, f:[] }; secs.push(s); } s.f.push(f); });
      const field = f => {
        if(f.type==='select') return `<label class="ow-f"><span>${esc(f.label)}</span><select data-f="${f.id}">${f.options.map(o=>`<option value="${esc(o.v)}">${esc(o.t)}</option>`).join('')}</select></label>`;
        if(f.type==='checkbox') return `<label class="ow-sw"><input type="checkbox" data-f="${f.id}"><i></i><span>${esc(f.label)}</span></label>`;
        if(f.type==='chip' || f.type==='pick') return '';
        return `<label class="ow-f"><span>${esc(f.label)}</span><input type="number" inputmode="numeric" data-f="${f.id}" ${f.min?`min="${f.min}"`:''} ${f.max?`max="${f.max}"`:''} ${f.step?`step="${f.step}"`:''}></label>`; };
      const chips = list => { const groups=[]; list.forEach(f=>{ let gr=groups.find(x=>x.t===f.group); if(!gr){ gr={ t:f.group, f:[] }; groups.push(gr); } gr.f.push(f); });
        return groups.map(gr=>`<div class="ow-chg">${gr.t&&gr.t!=='map'?`<div class="ow-lbl">${esc(gr.t)}</div>`:''}<div class="ow-chips">${gr.f.map(f=>`<button type="button" class="ow-chip ${f.type==='pick'?'pick':''}" data-c="${f.id}" data-t="${f.type}"><b>${esc(f.label)}</b>${f.sub?`<small>${esc(f.sub)}</small>`:''}</button>`).join('')}</div></div>`).join(''); };
      const modes = G.modes.length>1 ? `<div class="ow-seg" role="group" aria-label="طريقة اللعب"><button type="button" data-mode="solo">${ic('person')} كل واحد لحاله</button><button type="button" data-mode="teams">${ic('team')} فرق</button></div>` : '';
      box.innerHTML=`<section class="ow">
        <div class="ow-h"><span class="ow-crown">${ic('crown')}</span><div><b>جلستك</b><small>اختر اللعبة واضبطها، وأول ما يكون الكل مستعد اضغط ابدأ</small></div><span id="ow-rules"></span></div>
        <div class="ow-sec"><div class="ow-lbl">اللعبة</div><div class="ow-games">${games.map(x=>`<button type="button" class="ow-g" data-g="${x.id}">${ic(x.icon)}<span>${esc(x.name)}</span>${x.tag?`<small class="ow-gtag">${esc(x.tag)}</small>`:''}</button>`).join('')}</div></div>
        <div class="ow-sec"><div class="ow-lbl">اللاعبين</div>
          <div class="ow-plrow"><span class="ow-n"><b id="ow-n"></b> <span id="ow-nl"></span></span><span class="ow-inv"><button type="button" class="btn small ghost ${canInvite()?'':'hidden'}" data-invfr>${ic('acc-user-plus')} ادعُ صديق</button><button type="button" class="btn small" data-copy>${ic('share')} انسخ رابط الدعوة</button></span></div>
          <div class="ow-pub" role="group" aria-label="من يقدر يدخل الجلسة"><button type="button" data-pub="0">${ic('padlock')}<span><b>جلسة خاصة</b><small>يدخلون بالكود بس</small></span></button><button type="button" data-pub="1">${ic('eye')}<span><b>جلسة عامة</b><small>تطلع بقائمة الجلسات للكل</small></span></button></div>
          ${modes}<div id="ow-teams"></div></div>
        ${secs.length?`<details class="ow-set" ${st.owSetOpen?'open':''}><summary>${ic('gears')}<span>إعدادات ${esc(G.name)}</span><small>اختياري — الافتراضي مضبوط</small></summary>
          ${secs.map(s=>`<div class="ow-ss"><div class="ow-lbl">${esc(s.t)}</div>${s.f.map(field).join('')}${chips(s.f.filter(f=>f.type==='chip'||f.type==='pick'))}</div>`).join('')}</details>`:''}
        <p class="r-err" id="ow-err"></p><p class="rw-note hidden" id="ow-over"></p><button type="button" class="btn ghost small hidden" id="ow-force">ابدأ بدون اللي ما ضغطوا مستعد</button>
        <button type="button" class="btn btn-hype big ow-start" data-start>${ic('play')} <span id="ow-start-l">ابدأ ${esc(G.name)}</span></button>
        <div class="ow-more"><button type="button" class="btn ghost small" data-table>${ic('podium')} اعرض الطاولة على شاشة ثانية</button><button type="button" class="btn ghost small" data-leave>${ic('cancel')} ما بلعب — أخلي الجهاز شاشة عرض</button><button type="button" class="btn ghost small ow-end" data-end>${ic('door')} أنهِ الجلسة</button></div>
      </section>`;
      const A2=OWN(), again=()=>setTimeout(()=>renderOwnerPanel(box), 80);
      { const d=$('.ow-set'); if(d) d.ontoggle=()=>{ st.owSetOpen=d.open; }; }
      $$('.ow [data-g]').forEach(b=>b.onclick=()=>{ vibe(10); A2.chooseGame(b.dataset.g); again(); });
      $$('.ow [data-mode]').forEach(b=>b.onclick=()=>{ vibe(10); A2.setPlayMode(b.dataset.mode); again(); });
      $$('.ow [data-pub]').forEach(b=>b.onclick=()=>{ vibe(10); A2.pub(b.dataset.pub==='1'); status(b.dataset.pub==='1'?'الجلسة عامة — تطلع للكل بقائمة الجلسات':'الجلسة خاصة — يدخلونها بالكود بس'); setTimeout(()=>status(''),2500); again(); });
      $$('.ow [data-f]').forEach(el=>el.onchange=()=>{ A2.setField(el.dataset.f, el.type==='checkbox' ? el.checked : el.value); again(); });
      $$('.ow [data-c]').forEach(b=>b.onclick=()=>{ vibe(8); const f=A2.fields().find(x=>x.id===b.dataset.c); A2.setField(b.dataset.c, b.dataset.t==='pick' ? true : !(f && f.on)); again(); });
      $('.ow [data-copy]').onclick=async()=>{ const url=location.href.replace(/remote\.html.*$/,'remote.html?room='+st.room); try{ await navigator.clipboard.writeText(url); status('انسخ الرابط — أرسله للشباب'); }catch(e){ status(url); } setTimeout(()=>status(''),2500); };
      $('.ow [data-start]').onclick=()=>{ vibe(30); const err=A2.start(); $('#ow-err').textContent=err||''; clearTimeout(st.owErrT); if(err){ vibe([40,30,40]); sfx('bad'); st.owErrT=setTimeout(()=>{ const e=$('#ow-err'); if(e) e.textContent=''; }, 6000); } };
      $('.ow [data-table]').onclick=()=>A2.table();
      $('.ow [data-end]').onclick=()=>A2.end();
      $('.ow [data-leave]').onclick=()=>{ if(confirm('ما بتلعب؟ تطلع من الجلسة كلاعب ويصير هالجهاز شاشة عرض بس.')) A2.leave(); };
    }
    // الأجزاء اللي تتحدث بدون إعادة بناء
    $$('.ow [data-g]').forEach(b=>b.classList.toggle('on', b.dataset.g===g));
    $$('.ow [data-mode]').forEach(b=>b.classList.toggle('on', b.dataset.mode===mode));
    const solo=mode==='solo' || g==='hawamir' || g==='sadq';
    const I=st.info||{players:[],teams:[]}, P=(I.players||[]).filter(p=>p.on), nRd=P.filter(p=>p.rd).length, wait=A.waiting();
    $('#ow-n').textContent=P.length; $('#ow-nl').textContent = `${P.length===1?'لاعب متصل':'لاعبين متصلين'} · ${nRd} مستعد`;
    $$('.ow [data-pub]').forEach(b=>{ const on=(b.dataset.pub==='1')===!!A.pub(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    { const r=$('#ow-rules'); if(r && r.dataset.g!==g){ r.dataset.g=g; r.innerHTML=rulesBtn(g); bindRoster(r); } }
    { const sb=$('.ow [data-start]'), sl=$('#ow-start-l'); if(sb && sl){ sb.classList.toggle('is-wait', wait.length>0); sl.textContent = wait.length ? `ننتظر ${wait.length===1?'لاعب واحد':wait.length+' لاعبين'} يضغطون مستعد` : `ابدأ ${G.name}`; } }
    { const f=$('#ow-force'); if(f){ f.classList.toggle('hidden', !wait.length); if(!f.onclick) f.onclick=()=>{ vibe(30); const err=A.start(true); $('#ow-err').textContent=err||''; }; } }
    { const o=$('#ow-over'), ov=I.over||[]; if(o){ o.classList.toggle('hidden', !ov.length); o.textContent = ov.length ? `${G.name} تكفي ${I.cap} لاعبين — يتفرجون هالمرة: ${ov.join('، ')}` : ''; } }
    const tb=$('#ow-teams'); if(tb){
      const sig2=JSON.stringify([I.players,I.teams,solo,A.phoneTeams(),I.canCreate]);
      if(tb.dataset.sig!==sig2 && !editingName()){ tb.dataset.sig=sig2;
        tb.innerHTML = rosterHTML(Object.assign({}, I, { mode: solo?'solo':'teams' }), !solo) + (solo ? '' : `
          <div class="ow-trow"><button type="button" class="btn small" data-auto>${ic('recycle')} وزّع الفرق عشوائي</button><label class="ow-sw"><input type="checkbox" data-pt ${A.phoneTeams()?'checked':''}><i></i><span>اللاعبين يقدرون يسوون فرق جديدة</span></label></div>`);
        bindRoster(tb);
        const au=tb.querySelector('[data-auto]'); if(au) au.onclick=()=>{ vibe(10); A.autoTeams(); setTimeout(()=>renderOwnerPanel(box),160); };
        const pt=tb.querySelector('[data-pt]'); if(pt) pt.onchange=()=>A.phoneTeams(pt.checked); } }
    F.forEach(f=>{ const el=box.querySelector(`[data-f="${f.id}"]`); if(el && document.activeElement!==el){ if(f.type==='checkbox') el.checked=!!f.on; else el.value=f.value; }
      const c=box.querySelector(`[data-c="${f.id}"]`); if(c){ c.classList.toggle('on', !!f.on); c.setAttribute('aria-pressed', !!f.on); } });
    return true;
  }
  if(OWNER) setInterval(()=>{ if(!$('#r-wait').classList.contains('r-hide') && OWN()) renderOwnerPanel($('#r-wait')); }, 2500);
  // ---------- قائمة الانتظار: الفرق واللاعبين وحالة «مستعد» (للاعب ولصاحب الجلسة) ----------
  function rosterHTML(I, canJoin){
    const m=me()||{}, P=I.players||[], solo=I.mode==='solo';
    const pl = p => `<li class="rr-p ${p.rd?'rd':''} ${p.on?'':'off'} ${p.id===m.pid?'me':''}"><img src="${avSrc(p.avatar)}" alt="">
      <span class="rr-n">${esc(p.name)}${p.own?` <em class="rr-own" title="صاحب الجلسة">${ic('crown')}</em>`:''}${p.id===m.pid?' <i>(انت)</i>':''}</span>
      <span class="rr-st">${!p.on?'<span>مو متصل</span>':p.rd?`${ic('check')}<span>مستعد</span>`:'<span>ينتظر</span>'}</span></li>`;
    if(solo) return P.length ? `<ul class="rr-list">${P.map(pl).join('')}</ul>` : '<p class="rr-empty">ما فيه لاعبين للحين — أرسلوا رابط الدعوة</p>';
    const myT=(P.find(p=>p.id===m.pid)||{}).tid;
    let h=(I.teams||[]).map(t=>{ const mem=P.filter(p=>p.tid===t.id), mine=!!myT && t.id===myT;
      // اسم الفريق ينضغط ويتعدّل: صاحب الجلسة أي فريق، واللاعب فريقه بس (قبل المباراة)
      const canName = !I.locked && !!m.pid && (OWNER || mine);
      return `<div class="rr-team ${mine?'mine':''}" style="--c:${t.color}"><div class="rr-th"><i></i>${canName?`<b class="rr-tn" data-tname="${esc(t.id)}" role="button" tabindex="0" title="اضغط عشان تعدّل الاسم"><span>${esc(t.name)}</span>${ic('pencil')}</b>`:`<b>${esc(t.name)}</b>`}<small>${mem.length}</small>
        ${mine?'<span class="rr-mine">فريقك</span>':(!I.locked && canJoin && m.pid?`<button type="button" class="btn small rr-join" data-join="${esc(t.id)}">${myT?'انتقل له':'انضم'}</button>`:'')}</div>
        <ul class="rr-list">${mem.map(pl).join('')||'<li class="rr-empty">فاضي</li>'}</ul></div>`; }).join('');
    if(I.ref){ const rf=P.filter(p=>p.tid==='ref'), mine=myT==='ref';
      h+=`<div class="rr-team rr-ref ${mine?'mine':''}" style="--c:${I.ref.color}"><div class="rr-th"><i></i><b>${ic('whistle')} الحكم</b><small>${rf.length}</small>
        ${mine?'<span class="rr-mine">انت الحكم</span>':(!I.locked && canJoin && m.pid?`<button type="button" class="btn small rr-join" data-ref>${rf.length?'خذ مكانه':'كن الحكم'}</button>`:'')}</div>
        <p class="rr-refnote">يدير الجولة من جواله: يأكد الحرف، ويحكم مين جاوب صح — وما يلعب مع أحد</p>
        <ul class="rr-list">${rf.map(pl).join('')||'<li class="rr-empty">ما فيه حكم للحين</li>'}</ul></div>`; }
    const loose=P.filter(p=>!p.tid);
    if(loose.length) h+=`<div class="rr-team loose"><div class="rr-th"><i></i><b>بدون فريق</b><small>${loose.length}</small></div><ul class="rr-list">${loose.map(pl).join('')}</ul></div>`;
    if(!(I.teams||[]).length) h+='<p class="rr-empty">ما فيه فرق للحين</p>';
    if(canJoin && m.pid && I.canCreate && !I.locked && (I.teams||[]).length<(I.maxTeams||6)) h+=`<button type="button" class="btn ghost small rr-new" data-newteam>${ic('plus')} فريق جديد</button>`;
    return `<div class="rr-teams">${h}</div>`;
  }
  function bindRoster(root){
    if(!root) return;
    $$('[data-join]', root).forEach(b=>b.onclick=()=>{ vibe(15); sfx('coin'); send({t:'team', id:b.dataset.join}); });
    $$('[data-ref]', root).forEach(b=>b.onclick=()=>{ vibe(15); sfx('coin'); send({t:'ref'}); });
    $$('[data-tname]', root).forEach(b=>{ const edit=()=>{
        const id=b.dataset.tname, lbl=b.querySelector('span'), old=lbl.textContent.trim(), inp=document.createElement('input');
        inp.className='rr-tin'; inp.value=old; inp.maxLength=16; inp.setAttribute('aria-label','اسم الفريق'); inp.enterKeyHint='done';
        b.replaceWith(inp); inp.focus(); inp.select(); vibe(8);
        let done=false; const fin=save=>{ if(done) return; done=true; const v=inp.value.trim();
          if(save && v && v!==old){ send({t:'tname', id, name:v}); sfx('coin'); lbl.textContent=v; }
          inp.replaceWith(b); };
        inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); fin(true); } else if(e.key==='Escape') fin(false); };
        inp.onblur=()=>fin(true); };
      b.onclick=edit; b.onkeydown=e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); edit(); } }; });
    const nt=root.querySelector('[data-newteam]'); if(nt) nt.onclick=()=>{ const n=prompt('اسم الفريق؟'); if(n===null) return; vibe(15); send({t:'newteam', name:n}); };
    $$('[data-rules]', root).forEach(b=>b.onclick=()=>{ vibe(8); const g=b.dataset.rules; if(window.DahoomRules && g) window.DahoomRules.open(g); });
  }
  const rulesBtn = g => g && window.DahoomRules ? `<button type="button" class="btn ghost small rr-rules" data-rules="${esc(g)}">${ic('book')} طريقة اللعب</button>` : '';
  // لا نعيد رسم القائمة وهو يكتب اسم الفريق (كانت تمسح اللي يكتبه)
  const editingName = () => !!(document.activeElement && document.activeElement.classList.contains('rr-tin'));
  function renderWait(){
    if(editingName()) return;
    if(OWNER && renderOwnerPanel($('#r-wait'))) return;
    const I=st.info||{players:[],teams:[]}, m=me()||{}, P=I.players||[], mine=P.find(p=>p.id===m.pid);
    const rd=!!(mine && mine.rd), solo=I.mode==='solo', needTeam=!solo && !I.locked && !!mine && !mine.tid;
    const nRd=P.filter(p=>p.on && p.rd).length, nOn=P.filter(p=>p.on).length;
    $('#r-wait').innerHTML=`<section class="rw">
      <div class="rw-top"><div class="rw-game"><small>اللعبة</small><b>${esc(I.gameName||'ما انختارت للحين')}</b></div>${rulesBtn(I.game)}</div>
      <div class="rw-status"><span class="rw-dot"></span>${esc((I.where&&I.where.x)||'بانتظار صاحب الجلسة')}</div>
      ${I.locked ? '<p class="rw-note">المباراة شغالة — تنضم للجولة الجاية</p>' : `
      <button type="button" class="rw-ready ${rd?'on':''}" data-ready aria-pressed="${rd}" ${needTeam||!mine?'disabled':''}>
        <span class="rw-tick">${ic('check')}</span><span class="rw-rt"><b>${rd?'أنا مستعد':'اضغط إذا مستعد'}</b><small>${needTeam?'اختر فريقك أول':rd?'اضغط مرة ثانية لو تبي تلغي':'اللعبة ما تبدأ إلا لما الكل يكون مستعد'}</small></span>
      </button>
      <div class="rw-count">${nRd} من ${nOn} مستعدين</div>`}
      ${needTeam?'<p class="rw-pick">اختر فريقك من القائمة تحت</p>':''}
      ${(I.over||[]).length && !I.locked ? `<p class="rw-note">${(I.over||[]).includes(m.name) ? `اللعبة تكفي ${I.cap} لاعبين — انت تتفرج هالمرة وتلعب الجاية` : `اللعبة تكفي ${I.cap} لاعبين — يتفرجون هالمرة: ${esc(I.over.join('، '))}`}</p>` : ''}
      ${rosterHTML(I, true)}
      <div class="rw-acts">${canInvite()?`<button type="button" class="btn ghost small" data-invfr>${ic('acc-user-plus')} ادعُ صديق</button>`:''}${!I.locked && !hasAcct()?`<button type="button" class="btn ghost small" data-edit>${ic('pencil')} عدّل اسمك وصورتك</button>`:''}</div>
    </section>`;
    const w=$('#r-wait'); bindRoster(w);
    const e=w.querySelector('[data-edit]'); if(e) e.onclick=()=>{ vibe(10); openReg(); };
    const r=w.querySelector('[data-ready]'); if(r) r.onclick=()=>{ vibe(rd?10:[20,30,20]); sfx(rd?'tick':'good'); send({t:'ready', on:!rd}); r.classList.toggle('on', !rd); };
  }
  function renderMe(){
    const m=me()||{}, t=(st.teams||[]).find(x=>x.id===st.teamId)||{};
    $('#r-head').innerHTML=`${m.avatar?(hasAcct()?`<span class="r-me"><img src="${avSrc(m.avatar)}" alt=""></span>`:`<button class="r-me" id="r-me" aria-label="عدّل اسمك وصورتك"><img src="${avSrc(m.avatar)}" alt=""></button>`):''}<span class="r-who"><span class="r-team">${esc(m.name||'')}</span>${t.name&&st.mode!=='solo'?`<small>${esc(t.name)}</small>`:''}</span>`;
    const b=$('#r-me'); if(b) b.onclick=()=>openReg();
  }

  // ---------- سجل الأحداث ----------
  const money = n => Math.round(n).toLocaleString('en-US');
  function renderFeed(fresh){
    const L=st.feed.slice(-40).reverse();
    $('#r-feed-n').textContent = L.length ? `(${st.feed.length})` : '';
    const html = L.length ? L.map((f,i)=>`<div class="rf-e ${f.k||''} ${fresh&&i===0?'new':''}" style="--c:${f.c||'var(--line)'}">${f.av?`<img src="${avSrc(f.av)}" alt="">`:'<i></i>'}<span>${f.ic?`<i class="rf-ic">${ic(f.ic)}</i>`:''}${f.n?`<b>${esc(f.n)}</b> `:''}${esc(f.x)}</span>${f.a?`<em class="${f.a>0?'up':'dn'}">${f.a>0?'+':'−'}${money(Math.abs(f.a))}</em>`:''}</div>`).join('')
      : '<p class="muted small">هنا يطلع كل شي يصير باللعبة أول بأول</p>';
    // نفس السجل بتبويب «وش صار» تحت لوحة هوامير
    ['#r-feed','#r-hmlog'].forEach(q=>{ const box=$(q); if(box) box.innerHTML=html; });
  }

  // ---------- المؤقت: لونه يتغير، وبآخر 10 ثواني يطلع أجزاء الثانية ----------
  let tmr={ end:0, total:1, raf:0 };
  function setTimer(T){
    if(!T){ stopTimer(); return; }
    const end=Date.now()+T.ms;
    if(!tmr.end || Math.abs(end-tmr.end)>350 || tmr.total!==T.total){ tmr.end=end; tmr.total=T.total||1; }
    tog('#r-timer', true);
    if(!tmr.raf) tmr.raf=requestAnimationFrame(timerFrame);
  }
  function stopTimer(){ tmr.end=0; cancelAnimationFrame(tmr.raf); tmr.raf=0; tog('#r-timer', false); }
  let lastWhole=-1;
  function timerFrame(){
    tmr.raf=0; if(!tmr.end) return;
    const ms=Math.max(0, tmr.end-Date.now()), sec=ms/1000, frac=Math.min(1, ms/tmr.total), el=$('#r-timer');
    $('#rt-num').textContent = ms<=0 ? '0' : sec<=10 ? sec.toFixed(1) : String(Math.ceil(sec));
    el.querySelector('.fg').style.strokeDashoffset=(326.7*(1-frac)).toFixed(1);
    $('#rt-bar').style.transform=`scaleX(${frac.toFixed(4)})`;
    el.style.setProperty('--hue', Math.round(frac*140));
    const late = tmr.total>12000 ? sec<=10 : frac<=.5;
    el.classList.toggle('warn', late && sec>5 && frac<.75); el.classList.toggle('crit', sec<=5 && frac<.75 && ms>0); el.classList.toggle('over', ms<=0);
    $('#rt-lbl').textContent = ms<=0 ? 'خلص الوقت' : late ? 'آخر الثواني!' : 'الوقت';
    const whole=Math.ceil(sec); if(whole!==lastWhole){ lastWhole=whole; if(whole<=5 && whole>0){ vibe(25); sfx('tick'); } }
    if(ms>0) tmr.raf=requestAnimationFrame(timerFrame);
  }

  // ---------- السؤال كما هو على الشاشة (ألف نقطة) ----------
  const DIFF_AR = ['','سهل','متوسط','صعب'];
  function renderView(V){
    const box=$('#r-view');
    if(!V){ tog('#r-view', false); box.dataset.k=''; return; }
    tog('#r-view', true);
    const k=V.text+'|'+(V.img||'')+'|'+V.opts.join('/');
    if(box.dataset.k!==k){ box.dataset.k=k;
      box.innerHTML=`<div class="rv-tags"><span class="pill">${esc(V.tag)}</span>${V.d?`<span class="pill dim">${DIFF_AR[V.d]||''}</span>`:''}${V.kind==='t'?'<span class="pill dim">تحدي</span>':''}</div>
        ${V.img?`<img class="rv-img" src="${esc(V.img)}" alt="">`:''}<div class="rv-q">${esc(V.text)}</div>
        ${V.opts.length?`<div class="rv-opts">${V.opts.map(o=>`<span>${esc(o)}</span>`).join('')}</div>`:''}<div class="rv-ans" id="rv-ans"></div>`; }
    const a=$('#rv-ans'); a.innerHTML = V.answer ? `<small>الإجابة</small> <b>${esc(V.answer)}</b>` : ''; a.classList.toggle('on', !!V.answer);
  }

  // ---------- هوامير: اللوحة كاملة بجهاز كل لاعب ----------
  const hm = { S:null, key:null, built:false, B:null, tab:'mine', pt:false };
  // بالجوال الطولي اللوحة تنقلب طولية (8 × 12) عشان تعبّي الشاشة؛ وبالكمبيوتر عرضية مثل الشاشة
  const hmPT = matchMedia('(max-width:760px) and (orientation:portrait)');
  const onPT = () => { if(hm.S && hm.B && hm.pt!==hmPT.matches){ hm.built=false; renderHM(hm.B); } };
  if(hmPT.addEventListener) hmPT.addEventListener('change', onPT); else if(hmPT.addListener) hmPT.addListener(onPT);
  function buildHM(){
    const S=hm.S, box=$('#r-hm'), pt=hmPT.matches; hm.pt=pt;
    box.innerHTML=`<div class="hm-board r-hmboard ${pt?'pt':''}" style="--felt:${S.felt}"><div class="hm-tiles" id="r-hmtiles">
        ${S.tiles.map((t,i)=>{ const [r,c]=hmCell(i,pt), sd=hmSide(i,pt), pos=`grid-row:${r};grid-column:${c};`;
          return t.p ? `<button class="hm-tile ${t.t} s-${sd}" data-i="${i}" style="${pos}--g:${t.c}"><span class="hm-band">${t.fl}<em>${esc(t.k)}</em></span><span class="hm-body"><b class="hm-name">${esc(t.n)}</b><span class="hm-sub"></span></span><span class="hm-bld"></span><i class="hm-own"></i><span class="hm-ownav"></span></button>`
            : `<button class="hm-tile sp ${t.t} s-${sd}" data-i="${i}" style="${pos}"><span class="hm-spic">${ic(t.ic)}</span><b class="hm-name">${esc(t.n)}</b><span class="hm-sub"></span></button>`; }).join('')}
        <div class="hm-center"><div class="hm-mid"><div class="hm-head"><span class="hm-word">هوامير</span><span class="hm-mapname">${esc(S.name)}</span><span class="hm-chip" id="r-hmround"></span><span class="hm-chip clock" id="r-hmclock"></span><span class="hm-chip pot">${ic('hm-building-bank')} <b id="r-hmpot"></b></span></div>
          <div id="hm-stage"></div><div class="r-hmask" id="r-hmask"></div></div></div>
      </div><div class="hm-toks" id="r-hmtoks"></div></div>`;
    $$('#r-hmtiles [data-i]').forEach(b=>b.onclick=()=>{ vibe(8); tileSheet(+b.dataset.i); });
    hm.built=true;
    // لو القرار نزل والواحد نازل تحت يشوف عقاراته: زر صغير يرجّعه للوحة
    if(hm.io) hm.io.disconnect();
    if('IntersectionObserver' in window){ hm.io=new IntersectionObserver(es=>{ hm.askSeen=es[0].isIntersecting; jumpBtn(); }, { threshold:.35 }); hm.io.observe($('#r-hmask')); }
    renderHMAsk();
  }
  function jumpBtn(){ tog('#r-hmaskjump', !!st.hmAsk && hm.askSeen===false); }
  $('#r-hmaskjump').onclick=()=>{ vibe(10); const a=$('#r-hmask'); if(a) a.scrollIntoView({behavior:'smooth', block:'center'}); };
  // [صف, عمود] — الطريق يبدأ من الزاوية اليمين فوق
  const hmCell = (i, pt) => pt
    ? (i<12 ? [i+1,8] : i<18 ? [12,19-i] : i<30 ? [30-i,1] : [1,i-28])
    : (i<12 ? [1,12-i] : i<18 ? [i-10,1] : i<30 ? [8,i-17] : [8-(i-29),12]);
  const hmSide = (i, pt) => (i===0||i===11||i===18||i===29) ? 'corner' : pt ? (i<12?'right':i<18?'bottom':i<30?'left':'top') : (i<12?'top':i<18?'left':i<30?'bottom':'right');
  const tokIn = p => p.av ? `<img src="${avSrc(p.av)}" alt="">` : `<b>${esc((p.name||'')[0]||'')}</b>`;
  function renderHM(H){
    if(H.st){ hm.S=H.st; hm.key=H.key; hm.built=false; }
    if(!hm.S || hm.key!==H.key){ $('#r-hm').innerHTML='<p class="muted center">نجهّز اللوحة…</p>'; return; }
    hm.B=H;
    if(!hm.built || hm.pt!==hmPT.matches) buildHM();
    const byId=id=>H.pl.find(p=>p.id===id);
    $$('#r-hmtiles [data-i]').forEach(el=>{ const i=+el.dataset.i, t=hm.S.tiles[i], o=H.own[i]?byId(H.own[i]):null;
      el.classList.toggle('focus', H.focus===i);
      el.querySelector('.hm-sub').innerHTML=H.sub[i]||'';
      if(t.p){ el.classList.toggle('owned', !!o); el.classList.toggle('mine', !!o && o.id===H.me); el.classList.toggle('mort', !!(H.mort&&H.mort[i])); el.style.setProperty('--own', o?o.color:'transparent');
        const lv=H.lv[i]||0, bl=el.querySelector('.hm-bld'), L=hm.S.levels; bl.innerHTML = lv ? ic(L[lv-1].icon)+(lv<4?`<b>${lv}</b>`:'') : ''; bl.className='hm-bld'+(lv?' on l'+lv:'');
        const oa=el.querySelector('.hm-ownav'), k=o?o.id:''; if(oa.dataset.k!==k){ oa.dataset.k=k; oa.innerHTML=o?tokIn(o):''; }
        el.setAttribute('aria-label', `${t.full}${o?' — ملك '+o.name:' — بدون مالك'}`); } });
    $('#r-hmround').textContent='اللفة '+H.round; $('#r-hmpot').textContent=money(H.pot);
    hm.endAt=Date.now()+H.endsIn; hm.lastRound=H.lastRound; hm.open=!!H.open; hm.t0=Date.now()-(H.up||0); hmClock();
    const sg=$('#hm-stage'); if(sg.dataset.h!==H.stage){ sg.dataset.h=H.stage; sg.innerHTML=H.stage; }
    // القطع
    const tl=$('#r-hmtoks'); const ids=H.pl.map(p=>p.id).join(',');
    if(tl.dataset.ids!==ids){ tl.dataset.ids=ids; tl.innerHTML=H.pl.map(p=>`<span class="hm-tok" data-p="${p.id}" style="--c:${p.color}">${tokIn(p)}</span>`).join(''); }
    hmTokens();
    renderMine(H); renderPlayers(H); renderTrades(H); renderMeCard(H);
  }
  // بطاقتي جنب اللوحة (بالكمبيوتر بدل الشريط اللي فوق — عشان اللوحة تاخذ الطول كله)
  function renderMeCard(H){
    const el=$('#r-hmme'); if(!el) return; const p=H.pl.find(x=>x.id===H.me); if(!p) return;
    const rank=[...H.pl].sort((a,b)=>(a.out-b.out)||b.worth-a.worth).indexOf(p)+1;
    const html=`<span class="hm-tok ${p.jail?'jail':''}" style="--c:${p.color}">${tokIn(p)}</span><span class="r-hmme-n"><b>${esc(p.name)}</b><small>${p.out?`${ic('skull')} أفلست`:H.debt&&H.debt.id===p.id?`<em class="rh-dbt">${ic('hm-receipt-tax')} عليك ${money(H.debt.n)}</em>`:p.jail?`${ic('hm-jail')} بالسجن`:`${ic('hm-home')} ${p.props} عقار · المركز ${rank}`}</small></span>
      <span class="r-hmme-c"><small>كاش</small><b>${money(p.cash)}</b></span><span class="r-hmme-c w"><small>الثروة</small><b>${money(p.worth)}</b></span>${p.turn?'<span class="r-hmme-turn">دورك</span>':''}`;
    if(el.dataset.h!==html){ el.dataset.h=html; el.innerHTML=html; }
    el.classList.toggle('turn', !!p.turn);
  }
  // ---------- تبويبات تحت/جنب اللوحة ----------
  function setHmTab(k){
    hm.tab=k;
    $$('#r-hmtabs [data-tab]').forEach(b=>{ const on=b.dataset.tab===k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $$('.r-hmpane').forEach(p=>p.classList.toggle('on', p.dataset.pane===k));
  }
  $$('#r-hmtabs [data-tab]').forEach(b=>b.onclick=()=>{ vibe(8); setHmTab(b.dataset.tab); });
  // عقاراتي: مرتبة حسب النوع — الدول (وكم ناقصك منها)، المطارات، الشركات
  function renderMine(H){
    const box=$('#r-hmmine'); if(!box) return;
    const sig=JSON.stringify([H.own, H.lv, H.sub, H.me, H.mort]); if(box.dataset.sig===sig) return; box.dataset.sig=sig;
    const T=hm.S.tiles, me=H.me, pl=id=>H.pl.find(p=>p.id===id);
    const mine=T.map((t,i)=>H.own[i]===me?i:-1).filter(i=>i>=0);
    if(!mine.length){ box.innerHTML=`<div class="mp-empty"><b>ما عندك عقارات للحين</b><span>لما توقف على مدينة أو مطار أو شركة بدون مالك تقدر تشتريها، أو اعرض صفقة على لاعب.</span></div>`; return; }
    const value=mine.reduce((a,i)=>a+T[i].p,0);
    const cell = i => { const t=T[i], o=H.own[i]?pl(H.own[i]):null, lv=H.lv[i]||0, me2=o&&o.id===me;
      return `<button type="button" class="mp-c ${me2?'me':o?'oth':'free'} ${H.mort&&H.mort[i]?'mort':''}" data-i="${i}" style="--o:${o?o.color:'transparent'}"><b>${esc(t.n)}</b>
        <small>${me2 ? (H.mort&&H.mort[i] ? `<span class="mp-mort">${ic('hm-lock')} مرهون · فكّه بـ ${money(H.mort[i])}</span>` : `${lv?`<span class="mp-lv">${ic(hm.S.levels[lv-1].icon)}${esc(hm.S.levels[lv-1].name)}</span>`:''}<span class="mp-rent">${H.sub[i]||''}</span>`) : o ? `ملك ${esc(o.name)}` : `بدون مالك · ${money(t.p)}`}</small></button>`; };
    // الدول
    const groups=[]; T.forEach((t,i)=>{ if(t.t!=='city') return; let g=groups.find(x=>x.k===t.k); if(!g){ g={ k:t.k, c:t.c, fl:t.fl, tiles:[] }; groups.push(g); } g.tiles.push(i); });
    const myG=groups.filter(g=>g.tiles.some(i=>H.own[i]===me));
    const gHTML = myG.map(g=>{ const n=g.tiles.filter(i=>H.own[i]===me).length, full=n===g.tiles.length;
      const miss=g.tiles.filter(i=>H.own[i]!==me).map(i=>{ const o=H.own[i]?pl(H.own[i]):null; return `${esc(T[i].n)} (${o?'عند '+esc(o.name):'بدون مالك'})`; });
      return `<div class="mp-g ${full?'full':''}" style="--g:${g.c}"><div class="mp-gh">${g.fl}<b>${esc(g.k)}</b><span class="mp-n">${n} من ${g.tiles.length}</span>${full?'<span class="mp-ok">كاملة — تقدر تبني</span>':''}</div>
        <div class="mp-cs">${g.tiles.map(cell).join('')}</div>${!full?`<div class="mp-miss">ناقصك: ${miss.join('، ')}</div>`:''}</div>`; }).join('');
    // المطارات والشركات
    const kind = (t, title, icon, note) => { const all=T.map((x,i)=>x.t===t?i:-1).filter(i=>i>=0), n=all.filter(i=>H.own[i]===me).length; if(!n) return '';
      return `<div class="mp-g ${t}" style="--g:${T[all[0]].c}"><div class="mp-gh"><span class="hm-flag air">${ic(icon)}</span><b>${title}</b><span class="mp-n">${n} من ${all.length}</span></div>
        <div class="mp-cs">${all.map(cell).join('')}</div><div class="mp-miss">${note(n)}</div></div>`; };
    const air = kind('air', 'المطارات', 'hm-plane', n=>`إيجار المطار يكبر كل ما زادت مطاراتك (عندك ${n})`);
    const co = kind('co', 'الشركات', 'hm-building-factory-2', n=>n>1?'عندك الشركتين: الإيجار النرد × أكبر رقم':'لو أخذت الشركة الثانية يتضاعف إيجارها');
    box.innerHTML=`<div class="mp-sum"><div><b>${mine.length}</b><small>عقار</small></div><div><b>${money(value)}</b><small>قيمتها</small></div><div><b>${myG.filter(g=>g.tiles.every(i=>H.own[i]===me)).length}</b><small>دول كاملة</small></div></div>
      ${myG.length?`<div class="mp-sec">${ic('hm-map-pin')} الدول</div>${gHTML}`:''}${air||co?`<div class="mp-sec">${ic('hm-plane')} مطارات وشركات</div>${air}${co}`:''}
      <p class="muted small mp-hint">${ic('hm-briefcase')} الهدم والرهن والبيع للبنك من زر «أملاكي» بدورك · اضغط أي عقار تشوف صكه</p>`;
    $$('#r-hmmine [data-i]').forEach(b=>b.onclick=()=>{ vibe(8); tileSheet(+b.dataset.i); });
  }
  function renderPlayers(H){
    const box=$('#r-hmpl'); if(!box) return;
    const rank=[...H.pl].sort((a,b)=>(a.out-b.out)||b.worth-a.worth);
    box.innerHTML=rank.map(p=>{ const props=hm.S.tiles.map((t,i)=>H.own[i]===p.id?i:-1).filter(i=>i>=0);
      return `<div class="r-hmp ${p.turn?'turn':''} ${p.out?'out':''} ${p.id===H.me?'me':''}" style="--c:${p.color}"><span class="hm-tok ${p.jail?'jail':''}" style="--c:${p.color}">${tokIn(p)}</span>
      <span class="rh-n"><b>${esc(p.name)}${p.id===H.me?' <i>(انت)</i>':''}</b><small>${p.out?`${ic('skull')} أفلس`:H.debt&&H.debt.id===p.id?`<em class="rh-dbt">${ic('hm-receipt-tax')} عليه ${money(H.debt.n)} — يدبّرها</em>`:p.jail?`${ic('hm-jail')} بالسجن`:`${ic('hm-home')} ${p.props} عقار · ${ic('hm-wallet')} ${money(p.worth)}`}</small></span><span class="rh-c"><b>${money(p.cash)}</b><small>كاش</small></span><span class="rh-r">${rank.indexOf(p)+1}</span>
      ${props.length?`<span class="rh-dots">${props.map(i=>`<i style="--g:${hm.S.tiles[i].c}" title="${esc(hm.S.tiles[i].full)}"></i>`).join('')}</span>`:''}</div>`; }).join('');
  }
  // القرار يطلع وسط اللوحة نفسها — ما يدف شي ولا يحرك الصفحة
  function renderHMAsk(){
    const box=$('#r-hmask'); jumpBtn();
    if(!box) return;
    const A=st.hmAsk; box.classList.toggle('on', !!A); $('#r-hm').classList.toggle('asking', !!A);
    if(!A){ box.innerHTML=''; box.dataset.id=''; return; }
    if(box.dataset.id===String(A.reqId)) return; box.dataset.id=String(A.reqId);
    const { reqId, spec }=A, d = spec.deed!=null && hm.S && hm.S.tiles[spec.deed] ? hm.S.tiles[spec.deed].deed : '';
    box.innerHTML=`<div class="rq ${d?'with-deed':''}">${d?`<div class="r-deed rq-deed">${d}</div>`:''}<div class="rq-in"><div class="rq-eb">دورك تقرر</div><h3>${esc(spec.title)}</h3>${spec.text?`<p>${esc(spec.text)}</p>`:''}
      ${spec.input?`<form class="rq-form" id="ra-in" novalidate><input type="number" inputmode="numeric" min="${spec.input.min}" max="${spec.input.max}" step="any" value="${spec.input.def}" aria-label="السعر"><button class="btn btn-hype" type="submit">${esc(spec.input.ok||'تمام')}</button></form>
        <div class="rq-inv" id="ra-inv">${money(spec.input.def)}</div><div class="rq-chips">${(spec.input.chips||[]).map(v=>`<button type="button" class="btn small" data-chip="${v}">${money(v)}</button>`).join('')}</div>`:''}
      <div class="rq-opts ${spec.options.length>3?'many':''}">${spec.options.map((o,i)=>`<button class="btn ${o.cls||'btn-hype'}" data-o="${i}" ${o.dis?'disabled':''}>${o.icon?ic(o.icon):''}<span>${esc(o.label)}</span></button>`).join('')}${spec.cancel?`<button class="btn ghost" data-o="-1">${esc(spec.cancel)}</button>`:''}</div></div></div>`;
    const done = v => { vibe(25); send({t:'answer', reqId, value:v}); st.askId=null; st.hmAsk=null; renderHMAsk(); };
    if(spec.input){ const I=spec.input, inp=$('#ra-in input'), lbl=$('#ra-inv');
      const num=v=>{ const n=Math.round(Number(String(v).replace(/[^\d.]/g,''))); return n>=I.min && n<=I.max ? n : null; };
      inp.oninput=()=>{ const n=num(inp.value); lbl.textContent = n!=null ? money(n) : `من ${money(I.min)} إلى ${money(I.max)}`; lbl.classList.toggle('bad', n==null); };
      $$('#r-hmask [data-chip]').forEach(b=>b.onclick=()=>{ vibe(8); inp.value=b.dataset.chip; inp.oninput(); });
      $('#ra-in').onsubmit=e=>{ e.preventDefault(); const n=num(inp.value); if(n==null){ inp.oninput(); vibe([40,30,40]); return; } done({num:n}); }; }
    $$('#r-hmask [data-o]').forEach(b=>b.onclick=()=>done(+b.dataset.o));
  }

  // ---------- هوامير: الصفقات (عروض معلّقة يشوفها الكل) ----------
  const TR_ST = { pending:'معلّقة', accepted:'تمت', rejected:'انرفضت', cancelled:'انسحبت', failed:'ما زبطت', countered:'رد بعرض ثاني' };
  const plOf = id => (hm.B && hm.B.pl.find(p=>p.id===id)) || { name:'?', color:'var(--line)' };
  const tileOf = i => hm.S.tiles[i];
  const trSide = s => `${s.props.map(i=>`<span class="r-tp" style="--g:${tileOf(i).c}">${esc(tileOf(i).full)}</span>`).join('')}${s.cash?`<span class="r-tp cash">${money(s.cash)}</span>`:''}${!s.props.length&&!s.cash?'<span class="r-tp none">ولا شي</span>':''}`;
  const tradableOf = pid => { const H=hm.B; return H.own.map((o,i)=>o===pid && tileOf(i).p ? i : -1).filter(i=>i>=0); };
  let trSeen=new Set();
  function renderTrades(H){
    const box=$('#r-hmtr'); const L=H.trades||[], me=H.me;
    const pend=L.filter(t=>t.st==='pending');
    const mine=pend.filter(t=>t.to===me), sent=pend.filter(t=>t.from===me), others=pend.filter(t=>t.to!==me && t.from!==me), done=L.filter(t=>t.st!=='pending').slice(-4).reverse();
    // صفقة جديدة وصلتك: اهتزاز
    mine.forEach(t=>{ if(!trSeen.has(t.id)){ trSeen.add(t.id); vibe([60,40,60]); sfx('ask'); } });
    const tn=$('#r-hmtrn'); if(tn){ tn.textContent = mine.length ? String(mine.length) : pend.length ? String(pend.length) : ''; tn.classList.toggle('hot', !!mine.length); }
    const card = (t, acts) => { const A=plOf(t.from), B=plOf(t.to);
      return `<div class="r-trc ${t.st}"><div class="r-trw"><b style="color:${A.color}">${esc(A.name)}</b> <span>${t.counter?'رد بعرض على':'يعرض على'}</span> <b style="color:${B.color}">${esc(B.name)}</b>${t.st!=='pending'?`<em class="r-trs ${t.st}">${TR_ST[t.st]}</em>`:''}</div>
        <div class="r-trx"><div><small>${esc(A.name)} يعطي</small><div class="r-tps">${trSide(t.give)}</div></div><div><small>${esc(B.name)} يعطي</small><div class="r-tps">${trSide(t.get)}</div></div></div>
        ${acts?`<div class="r-tra">${acts}</div>`:''}</div>`; };
    const sig=JSON.stringify([L.map(t=>t.id+t.st), H.cash]);
    if(box.dataset.sig===sig) return; box.dataset.sig=sig;
    box.innerHTML=`<div class="r-trh"><h4>${ic('team')} الصفقات ${mine.length?`<span class="r-trbadge">${mine.length} لك</span>`:''}</h4><button class="btn small btn-hype" data-trnew>صفقة جديدة</button></div>
      ${mine.length?`<div class="r-trsec"><div class="lbl">مرسولة لك — رد عليها</div>${mine.map(t=>card(t,`<button class="btn btn-mint" data-op="accept" data-id="${t.id}">موافق</button><button class="btn btn-bad" data-op="reject" data-id="${t.id}">لا</button><button class="btn" data-op="counter" data-id="${t.id}">عرض ثاني</button>`)).join('')}</div>`:''}
      ${sent.length?`<div class="r-trsec"><div class="lbl">أرسلتها — تنتظر الرد</div>${sent.map(t=>card(t,`<button class="btn ghost" data-op="cancel" data-id="${t.id}">اسحب العرض</button>`)).join('')}</div>`:''}
      ${others.length?`<div class="r-trsec"><div class="lbl">بين الباقين</div>${others.map(t=>card(t,'')).join('')}</div>`:''}
      ${!pend.length?'<p class="muted small">ما فيه صفقات معلّقة. اعرض على أي لاعب: عقار مقابل عقار، أو كاش، أو الاثنين.</p>':''}
      ${done.length?`<div class="r-trsec"><div class="lbl">آخر النتائج</div>${done.map(t=>card(t,'')).join('')}</div>`:''}`;
    box.querySelector('[data-trnew]').onclick=()=>{ vibe(10); tradeBuilder(); };
    $$('#r-hmtr [data-op]').forEach(b=>b.onclick=()=>{ const t=L.find(x=>x.id===b.dataset.id); if(!t) return; vibe(20);
      if(b.dataset.op==='counter') return tradeBuilder({ to:t.from, give:t.get, get:t.give, counter:t.id });
      send({ t:'hmtrade', op:b.dataset.op, id:t.id }); b.closest('.r-tra').innerHTML='<span class="muted small">انرسل…</span>'; });
  }
  // بناء عرض: مع مين + اللي تعطيه + اللي تبيه — الكاش بأزرار +/−، وملخص واضح قبل الإرسال
  const STEPS = [10000, 5000, 1000];
  function tradeBuilder(pre){
    const H=hm.B; if(!H || !hm.S) return;
    const others=H.pl.filter(p=>p.id!==H.me && !p.out); if(!others.length) return;
    const meP=plOf(H.me);
    let to=(pre&&others.find(p=>p.id===pre.to))||others[0];
    const sel={ give:new Set((pre&&pre.give.props)||[]), get:new Set((pre&&pre.get.props)||[]) };
    let cash={ give:(pre&&pre.give.cash)||0, get:(pre&&pre.get.cash)||0 };
    const valOf = i => (H.val && H.val[i]) || tileOf(i).p;
    const owner = k => k==='give' ? meP : to;
    const sideVal = k => [...sel[k]].reduce((a,i)=>a+valOf(i),0) + cash[k];
    const tag = i => { const lv=H.lv[i]||0, L=hm.S.levels; return `${lv?`<span class="r-tbt">${ic(L[lv-1].icon)}${esc(L[lv-1].name)}</span>`:''}${H.mort&&H.mort[i]?`<span class="r-tbt bad">${ic('hm-lock')}مرهون</span>`:''}`; };
    const propBtn = (i,k) => { const t=tileOf(i), on=sel[k].has(i);
      return `<button type="button" class="r-tbp ${on?'on':''}" data-k="${k}" data-i="${i}" aria-pressed="${on}" style="--g:${t.c}"><span class="r-tbck">${ic(on?'check':'plus')}</span><span class="r-tbn"><b>${esc(t.full)}</b><small>${esc(t.k)} ${tag(i)}</small></span><span class="r-tbv">${money(valOf(i))}</span></button>`; };
    const col = k => { const p=owner(k), list=tradableOf(p.id);
      return `<section class="r-tbc ${k}" style="--c:${p.color}"><div class="r-tbh"><b>${k==='give'?'أنت تعطي':'تاخذ من '+esc(p.name)}</b><span class="r-tbhas">${ic('hm-wallet')} معه <b>${money(p.cash)}</b></span></div>
        <div class="r-tbps">${list.map(i=>propBtn(i,k)).join('')||`<p class="muted small">${k==='give'?'ما عندك عقارات':'ما عنده عقارات'} — تقدر تحط كاش بس.</p>`}</div>
        <div class="r-tbcash"><div class="r-tbcv"><span>كاش</span><b data-cv="${k}">${money(cash[k])}</b></div>
          <div class="r-tbst">${STEPS.map(s=>`<button type="button" class="btn small" data-st="${k}:-${s}">−${money(s/1000)} ألف</button>`).join('')}${STEPS.slice().reverse().map(s=>`<button type="button" class="btn small" data-st="${k}:${s}">+${money(s/1000)} ألف</button>`).join('')}</div>
          <div class="r-tbst2"><input type="number" inputmode="numeric" min="0" max="${p.cash}" step="any" value="${cash[k]||''}" placeholder="أو اكتب المبلغ" data-c="${k}"><button type="button" class="btn small ghost" data-st="${k}:0">صفّر</button><button type="button" class="btn small ghost" data-st="${k}:all">الكل</button></div></div></section>`; };
    const sum = () => { const g=sideVal('give'), t=sideVal('get'), d=t-g;
      const list = k => [...[...sel[k]].map(i=>esc(tileOf(i).full)), cash[k]?money(cash[k])+' كاش':''].filter(Boolean).join('، ') || 'ولا شي';
      return `<div class="r-tbsum"><div><small>تعطي</small><b>${list('give')}</b><em>قيمتها ${money(g)}</em></div><span class="r-tbx">${ic('hm-exchange')}</span><div><small>تاخذ</small><b>${list('get')}</b><em>قيمتها ${money(t)}</em></div>
        <p class="r-tbd ${d>0?'up':d<0?'dn':''}">${d>0?`الصفقة لصالحك بـ ${money(d)}`:d<0?`تدفع زيادة ${money(-d)}`:'متعادلة'}</p></div>`; };
    const draw=()=>{
      sheet(`<div class="eyebrow">${ic('hm-exchange')} ${pre&&pre.counter?'رد بعرض ثاني':'صفقة جديدة'}</div><h3>مع مين؟</h3>
        <div class="r-tbto">${others.map(p=>`<button class="r-tbwho ${p===to?'on':''}" style="--c:${p.color}" data-to="${p.id}">${p.av?`<img src="${avSrc(p.av)}" alt="">`:''}<span><b>${esc(p.name)}</b><small>${money(p.cash)} كاش</small></span></button>`).join('')}</div>
        <div class="r-tbcols">${col('give')}${col('get')}</div>
        <div id="r-tbsum">${sum()}</div>
        <p class="r-err" id="r-tberr"></p>
        <div class="r-actions"><button class="btn btn-hype big" data-send>${ic('hm-exchange')} أرسل العرض</button><button class="btn ghost" data-x>تراجع</button></div>
        <p class="muted small center">العرض يطلع للكل، و${esc(to.name)} يوافق أو يرفض أو يرد بعرض ثاني. العقار المبني ينتقل بمبانيه، والمرهون ينتقل برهنه.</p>`);
      const refresh = () => { $('#r-tbsum').innerHTML=sum(); ['give','get'].forEach(k=>{ const v=$(`#r-sheet [data-cv="${k}"]`); if(v) v.textContent=money(cash[k]); const inp=$(`#r-sheet [data-c="${k}"]`); if(inp && document.activeElement!==inp) inp.value=cash[k]||''; }); };
      $$('#r-sheet [data-to]').forEach(b=>b.onclick=()=>{ to=others.find(p=>p.id===b.dataset.to); sel.get.clear(); cash.get=0; vibe(8); draw(); });
      $$('#r-sheet [data-i]').forEach(b=>b.onclick=()=>{ const k=b.dataset.k, s=sel[k], i=+b.dataset.i; s.has(i)?s.delete(i):s.add(i); vibe(8);
        const on=s.has(i); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.querySelector('.r-tbck').innerHTML=ic(on?'check':'plus'); refresh(); });
      $$('#r-sheet [data-st]').forEach(b=>b.onclick=()=>{ const [k,v]=b.dataset.st.split(':'), max=owner(k).cash; vibe(6);
        cash[k] = v==='all' ? max : v==='0' ? 0 : Math.max(0, Math.min(max, cash[k]+Number(v))); refresh(); });
      $$('#r-sheet [data-c]').forEach(inp=>inp.oninput=()=>{ const k=inp.dataset.c; cash[k]=Math.max(0, Math.min(owner(k).cash, Math.round(+inp.value||0))); refresh(); });
      $('#r-sheet [data-x]').onclick=closeSheet;
      $('#r-sheet [data-send]').onclick=()=>{
        const err=$('#r-tberr'), give={ props:[...sel.give], cash:cash.give }, get={ props:[...sel.get], cash:cash.get };
        if(!give.props.length && !get.props.length && !give.cash && !get.cash){ err.textContent='حط شي بالعرض: عقار أو كاش'; vibe([40,30,40]); return; }
        if(give.cash>meP.cash){ err.textContent=`ما معك ${money(give.cash)}`; return; }
        if(get.cash>to.cash){ err.textContent=`${to.name} ما معه ${money(get.cash)}`; return; }
        vibe(30); send({ t:'hmtrade', op:'new', to:to.id, give, get, counter:(pre&&pre.counter)||null }); closeSheet(); };
    };
    draw();
  }
  function hmTokens(){
    const H=hm.B, b=$('#r-hmtiles'), tl=$('#r-hmtoks'); if(!H||!b||!tl) return;
    const by={}; H.pl.forEach(p=>{ if(!p.out) (by[p.pos]=by[p.pos]||[]).push(p); });
    H.pl.forEach(p=>{ const el=tl.querySelector(`[data-p="${p.id}"]`); if(!el) return;
      if(p.out){ el.style.display='none'; return; }
      const tile=b.querySelector(`[data-i="${p.pos}"]`); if(!tile) return;
      const grp=by[p.pos], k=grp.indexOf(p), n=grp.length, w=el.offsetWidth||20;
      const spread=Math.min(w*0.7, (tile.offsetWidth-w)/Math.max(1,n-1));
      const x=tile.offsetLeft+tile.offsetWidth/2-w/2+(k-(n-1)/2)*spread, y=tile.offsetTop+tile.offsetHeight-w*(hm.pt?0.55:0.84);
      el.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; el.style.zIndex=String(5+k);
      el.classList.toggle('me', p.turn); el.classList.toggle('mine', p.id===H.me); el.classList.toggle('jail', !!p.jail); });
  }
  function hmClock(){ const el=$('#r-hmclock'); if(!el) return;
    if(hm.open){ const up=Date.now()-hm.t0, m=Math.floor(up/60000), s2=Math.floor(up%60000/1000); el.textContent=`بدون وقت · ${m}:${String(s2).padStart(2,'0')}`; return; }
    if(!hm.endAt) return;
    const left=Math.max(0, hm.endAt-Date.now()), m=Math.floor(left/60000), s2=Math.floor(left%60000/1000);
    el.textContent = hm.lastRound ? 'اللفة الأخيرة' : `${m}:${String(s2).padStart(2,'0')}`; }
  setInterval(()=>{ if(hm.B && !$('#r-hmwrap').classList.contains('r-hide')) hmClock(); }, 1000);
  window.addEventListener('resize', ()=>requestAnimationFrame(hmTokens));
  function tileSheet(i){
    const t=hm.S.tiles[i], H=hm.B; if(!t) return;
    const o=H && H.own[i] ? H.pl.find(p=>p.id===H.own[i]) : null, lv=H?H.lv[i]:0;
    const here=H ? H.pl.filter(p=>!p.out && p.pos===i) : [];
    sheet(`${t.deed?`<div class="r-deed">${t.deed}</div>`:`<h3>${esc(t.full)}</h3>`}
      <div class="r-tinfo">${t.p?`<div><span>المالك</span><b>${o?`<span class="r-teamchip" style="--c:${o.color}">${esc(o.name)}</span>`:'بدون مالك — للبيع'}</b></div>`:''}
        ${t.p&&H?`<div><span>${o?'عليه الحين':'السعر'}</span><b>${H.sub[i]||''}</b></div>`:''}
        ${lv?`<div><span>البناء</span><b>${esc(hm.S.levels[lv-1].name)}</b></div>`:''}
        ${here.length?`<div><span>واقف عليها</span><b>${here.map(p=>esc(p.name)).join('، ')}</b></div>`:''}</div>
      <div class="r-actions"><button class="btn ghost" data-x>إغلاق</button></div>`);
    $('#r-sheet [data-x]').onclick=closeSheet;
  }
  // نهاية المباراة للكل: التتويجات + جداول الأرقام + قوائم (الكلمات، اللحظات، الممتلكات)
  // A = { awards:[{title,desc,icon,who,team,color,value,av,mine}], tables:[{title,icon,head,rows:[{rank,name,color,me,cells}]}], lists:[{title,icon,items:[{b,s,ok}]}] }
  function finalAllHTML(A){
    const aw = (A.awards||[]).length ? `<section class="rf-sec"><h4>${ic('trophy')} التتويجات</h4><div class="rf-awards">${A.awards.map((a,i)=>`<div class="rf-award ${a.mine?'mine':''}" style="--c:${a.color||'var(--brand)'};--i:${i}">
        <span class="rfa-ic">${ic(a.icon||'star')}</span><div class="rfa-t">${esc(a.title)}</div>
        <div class="rfa-who">${a.av?`<img src="${avSrc(a.av)}" alt="">`:''}<b>${esc(a.who)}</b>${a.team?`<small>${esc(a.team)}</small>`:''}</div>
        <div class="rfa-v">${esc(a.value)}</div><div class="rfa-d">${esc(a.desc)}</div>${a.mine?'<span class="rfa-me">لك</span>':''}</div>`).join('')}</div></section>` : '';
    const tb = (A.tables||[]).map(T=>{ const cols=`28px minmax(96px,1.6fr) repeat(${T.head.length-2},minmax(58px,1fr))`;
      return `<section class="rf-sec"><h4>${ic(T.icon||'podium')} ${esc(T.title)}</h4><div class="rf-table"><div class="rf-tr rf-th" style="grid-template-columns:${cols};min-width:${150+T.head.length*62}px">${T.head.map(h=>`<span>${esc(h)}</span>`).join('')}</div>
        ${T.rows.map(r=>`<div class="rf-tr ${r.me?'me':''}" style="--c:${r.color||'var(--line)'};grid-template-columns:${cols};min-width:${150+T.head.length*62}px"><span>${r.rank||''}</span><span class="rf-tn"><i></i>${esc(r.name)}</span>${r.cells.map((c,k)=>k===0?`<b>${esc(c)}</b>`:`<span>${esc(c)}</span>`).join('')}</div>`).join('')}</div></section>`; }).join('');
    const ls = (A.lists||[]).filter(L=>L.items.length).map(L=>`<section class="rf-sec"><h4>${ic(L.icon||'pencil')} ${esc(L.title)} (${L.items.length})</h4><div class="rf-words">${L.items.map(w=>`<div class="rf-w ${w.ok===false?'no':''}" ${w.c?`style="border-inline-start-color:${w.c}"`:''}><b>${esc(w.b)}</b>${w.s?`<small>${esc(w.s)}</small>`:''}</div>`).join('')}</div></section>`).join('');
    return aw + tb + ls;
  }

  // ---------- ما أصدقك: أوراقك السرية والقرارات ----------
  // الأوراق مغطاة افتراضياً: تضغط مطوّل تشوفها، أو «خلّها مكشوفة»
  const sq = { built:false, open:false, Q:null };
  const SQART = k => (window.DahoomSqArt ? window.DahoomSqArt.portrait(k) : '');
  const SQCARD = r => (window.DahoomSqArt ? window.DahoomSqArt.card(r.k, { name:r.name, color:r.color, icon:r.icon, move:r.act, desc:r.actDesc, block:r.block }) : `<b>${esc(r.name)}</b>`);
  const SQBACK = () => (window.DahoomSqArt ? window.DahoomSqArt.back() : '');
  function buildSQ(){
    $('#r-sq').innerHTML=`<div class="sq-r">
      <div class="sq-rmain">
        <div class="sq-rtop"><span class="sq-chip" id="sq-rround"></span><span class="sq-chip pot">${ic('hm-building-bank')} الصندوق <b id="sq-rpot"></b></span><span class="sq-chip" id="sq-rdeck"></span></div>
        <div class="sq-rev" id="sq-rev"></div>
        <div class="sq-ract" id="sq-ract"></div>
        <div class="sq-rask" id="sq-rask"></div>
      </div>
      <div class="sq-rside">
        <section class="sq-rhand"><div class="sq-rhh"><b>أوراقك</b><span id="sq-rme"></span><button type="button" class="btn ghost small" id="sq-rhide"></button></div><div class="sq-rcards cover" id="sq-rcards"></div><p class="sq-rhint" id="sq-rhint">اضغط مطوّل على أوراقك تشوفها — وارفع إصبعك تتغطى</p></section>
        <section class="sq-rpl" id="sq-rpl"></section>
        <details class="sq-rref"><summary>${ic('book')} الشخصيات وحركاتها</summary><div id="sq-rref"></div></details>
        <section class="sq-rlogw"><div class="lbl">وش صار</div><div class="sq-rlog" id="sq-rlog"></div></section>
      </div></div>`;
    $('#sq-rhide').onclick=()=>{ vibe(8); sq.open=!sq.open; if(sq.Q) renderSQ(sq.Q, true); const a=$('#sq-rask'); if(a) a.dataset.k=''; renderSQAsk(); };
    const rc=$('#sq-rcards'), on=e=>{ if(sq.open) return; rc.classList.add('peek'); vibe(8); }, off=()=>rc.classList.remove('peek');
    rc.addEventListener('pointerdown', on); ['pointerup','pointercancel','pointerleave','blur'].forEach(ev=>rc.addEventListener(ev, off));
    rc.addEventListener('contextmenu', e=>e.preventDefault());
    document.addEventListener('visibilitychange', off);
    sq.built=true;
  }
  const sqRole = (Q, k) => (Q.roles||[]).find(r=>r.k===k) || { name:k, icon:'masks', color:'#888' };
  const sqChip = (Q, k) => { const r=sqRole(Q,k); return `<span class="sq-rchip" style="--rc:${r.color}">${ic(r.icon)}${esc(r.name)}</span>`; };
  function renderSQ(Q, force){
    if(!sq.built || !$('#sq-rcards')) buildSQ();
    sq.Q=Q;
    $('#sq-rround').textContent='اللفة '+Q.round; $('#sq-rpot').textContent=Q.pot; $('#sq-rdeck').innerHTML=`${ic('cards')} الكومة ${Q.deck}`;
    const E=Q.event; $('#sq-rev').innerHTML = Q.events ? (E ? `<span class="sq-evi">${ic(E.icon)}</span><span><small>حدث المجلس</small><b>${esc(E.name)}</b> <em>${esc(E.desc)}</em></span>` : `<span class="sq-evi">${ic('star')}</span><span><small>حدث المجلس</small><b>اللفة الأولى</b> <em>الأحداث تبدأ من اللفة الثانية</em></span>`) : '';
    $('#sq-rev').classList.toggle('r-hide', !Q.events);
    // الحركة الحالية
    const A=Q.act, pl=id=>Q.pl.find(x=>x.id===id), turnP=Q.pl.find(x=>x.turn);
    let act='';
    if(A){ const st={ ch:'ينتظر: أحد ما يصدقه؟', 'block-ch':'ينتظر: أحد ما يصدق الصد؟', block:`${esc(A.t)} يقرر يصد ولا لا`, blocked:`${esc(A.blk)} صدّها — يقول إنه ${esc(A.blkRole)}`, done:'' }[A.stage]||'';
      act=`<div class="sq-ra-l">${A.claimK?`<span class="sq-ra-art">${SQCARD(sqRole(Q, A.claimK))}</span>`:`<span class="sq-ra-ic" style="--rc:${A.claimC||'var(--line)'}">${ic(A.icon)}</span>`}<span><b style="color:${A.byC}">${esc(A.by)}</b> ${A.claim?`يقول إنه <b style="color:${A.claimC}">${esc(A.claim)}</b> و`:''}يسوي <b>${esc(A.name)}</b>${A.t?` على <b style="color:${A.tC}">${esc(A.t)}</b>`:''}</span></div>
        ${A.ch?`<div class="sq-ra-x">${ic('search')} ${esc(A.ch)} قال: ما أصدقك!</div>`:''}${A.reveal?`<div class="sq-ra-x good">${ic('check')} طلع صادق — عنده ${esc(A.reveal)}</div>`:''}${st?`<div class="sq-ra-s">${st}</div>`:''}`; }
    else act=`<div class="sq-ra-l"><span class="sq-ra-ic">${ic('hourglass')}</span><span>${turnP?`دور <b style="color:${turnP.color}">${esc(turnP.name)}</b>`:'استنوا'}</span></div>`;
    const ae=$('#sq-ract'); if(ae.dataset.h!==act){ ae.dataset.h=act; ae.innerHTML=act; }
    // أوراقي
    $('#sq-rme').innerHTML=`<span class="sq-chip">${ic('coins')} <b>${Q.coins}</b> ريال</span>${Q.loan?`<span class="sq-chip bad">${ic('hm-cash')} عليك سلفة</span>`:''}${Q.coins>=Q.forceAt?`<span class="sq-chip bad">لازم تطرد</span>`:''}`;
    $('#sq-rhide').textContent = sq.open ? 'غطّها' : 'خلّها مكشوفة';
    $('#sq-rcards').classList.toggle('cover', !sq.open); $('#sq-rhint').classList.toggle('r-hide', sq.open || Q.cards.every(c=>c.up));
    const ck=JSON.stringify(Q.cards);
    const ce=$('#sq-rcards'); if(force || ce.dataset.k!==ck){ ce.dataset.k=ck;
      ce.innerHTML = Q.cards.map(c=>{ const r=sqRole(Q,c.r);
        return `<div class="sq-hc ${c.up?'dead':''} ${c.nw?'fresh':''}" style="--rc:${r.color}">${c.nw?'<span class="sq-hc-new">جديدة</span>':''}${c.up?'':`<div class="sq-hc-cov"><span class="sq-hc-cb">${SQBACK()}</span><span>مغطاة</span></div>`}<div class="sq-hc-art">${SQCARD(r)}</div><small>${esc(r.line)}</small>
          <div class="sq-hc-r"><span>حركته</span><b>${esc(r.act)}</b><em>${esc(r.actDesc)}</em></div>${r.block?`<div class="sq-hc-r"><span>يصد</span><b>${esc(r.block)}</b></div>`:''}${c.up?'<div class="sq-hc-dead">انكشفت — خسرتها</div>':''}</div>`; }).join(''); }
    // اللاعبين
    $('#sq-rpl').innerHTML=Q.pl.map(x=>`<div class="sq-rp ${x.turn?'turn':''} ${x.out?'out':''} ${x.id===Q.me?'me':''}" style="--c:${x.color}">
      ${x.av?`<img src="${avSrc(x.av)}" alt="">`:'<i class="sq-rp-av"></i>'}<span class="sq-rp-n"><b>${esc(x.name)}${x.id===Q.me?' <i>(انت)</i>':''}</b><small>${x.out?`${ic('skull')} طلع`:`${ic('coins')} ${x.coins}${x.loan?` · ${ic('hm-cash')} سلفة`:''}`}</small></span>
      <span class="sq-rp-c">${Array.from({length:x.hid},()=>'<span class="sq-mini back"></span>').join('')}${x.up.map(k=>{ const r=sqRole(Q,k); return `<span class="sq-mini dead" style="--rc:${r.color}" title="${esc(r.name)}">${ic(r.icon)}</span>`; }).join('')}</span>
      </div>`).join('');
    if(!$('#sq-rref').innerHTML) $('#sq-rref').innerHTML=`<div class="sq-ref">${(Q.roles||[]).map(r=>`<div class="sq-rcard" style="--rc:${r.color}"><div class="sq-rart">${SQART(r.k)}</div><div class="sq-rh">${ic(r.icon)}<b>${esc(r.name)}</b></div><small>${esc(r.line)}</small><div class="sq-rl"><span>حركته</span><b>${esc(r.act)}</b><em>${esc(r.actDesc)}</em></div>${r.block?`<div class="sq-rl blk"><span>يصد</span><b>${esc(r.block)}</b></div>`:''}</div>`).join('')}</div>`;
    const lg=(Q.log||[]).slice().reverse(), lk=lg.length+(lg[0]?lg[0].ts:'');
    const le=$('#sq-rlog'); if(le.dataset.k!==String(lk)){ le.dataset.k=lk; le.innerHTML=lg.map(e=>`<div class="sq-lg ${e.k}" style="--c:${e.c||'var(--line)'}">${e.ic?`<i>${ic(e.ic)}</i>`:''}<span>${e.n?`<b>${esc(e.n)}</b> `:''}${esc(e.x)}</span></div>`).join(''); }
    renderSQAsk();
  }
  // القرار: مكانه ثابت فوق الأوراق (ما يدف شي). لو ما فيه قرار يطلع وش ننتظر
  function renderSQAsk(){
    const box=$('#sq-rask'); if(!box) return;
    const A=st.sqAsk, Q=sq.Q;
    if(!A){ const W=Q&&Q.wait; const k='w:'+(W?W.label:'');
      if(box.dataset.k!==k){ box.dataset.k=k; box.className='sq-rask idle';
        box.innerHTML = W ? `<div class="sq-qw">${ic('hourglass')}<span>${esc(W.label)}</span></div><div class="sq-qbar"><i style="--ms:${W.left}ms;--from:${(W.left/W.ms).toFixed(3)}"></i></div>` : `<div class="sq-qw">${ic('hourglass')}<span>${Q&&Q.out?'طلعت — تابع اللي باقين':'استنى… القرار يطلع لك هنا'}</span></div>`; }
      return; }
    const k='a:'+A.reqId; if(box.dataset.k===k) return; box.dataset.k=k;
    const { reqId, spec }=A; box.className='sq-rask on';
    const mineR = new Set(Q ? Q.cards.filter(c=>!c.up).map(c=>c.r) : []);
    const opt=(o,i)=>{ const role=o.role && Q ? sqRole(Q,o.role) : null, have = sq.open && o.role && mineR.has(o.role);
      return spec.grid
        ? `<button class="sq-qa ${o.dis?'dis':''} ${have?'have':''}" data-o="${i}" ${o.dis?'disabled':''} style="--rc:${o.color||'var(--line)'}"><span class="sq-qa-ic">${ic(o.icon||'star')}</span><span class="sq-qa-t"><b>${esc(o.label)}</b>${role?`<em>${esc(role.name)}</em>`:'<em class="any">أي أحد</em>'}${have?'<i class="sq-have">عندك</i>':''}</span><small>${esc(o.sub||'')}</small></button>`
        : `<button class="btn ${o.cls||'btn-hype'} ${o.color?'sq-qc':''}" data-o="${i}" ${o.dis?'disabled':''} ${o.color?`style="--rc:${o.color}"`:''}>${o.icon?ic(o.icon):''}<span>${esc(o.label)}</span>${o.sub?`<small>${esc(o.sub)}</small>`:''}</button>`; };
    box.innerHTML=`<div class="sq-qh"><b>${esc(spec.title)}</b>${spec.text?`<p>${esc(spec.text)}</p>`:''}</div>
      ${spec.ms?`<div class="sq-qbar"><i style="--ms:${spec.ms}ms;--from:1"></i></div>`:''}
      <div class="${spec.grid?'sq-qgrid':'sq-qopts'}">${spec.options.map(opt).join('')}${spec.cancel?`<button class="btn ghost" data-o="-1">${esc(spec.cancel)}</button>`:''}</div>`;
    $$('#sq-rask [data-o]').forEach(b=>b.onclick=()=>{ vibe(25); send({t:'answer', reqId, value:+b.dataset.o}); st.askId=null; st.sqAsk=null; box.dataset.k=''; renderSQAsk(); });
  }

  // ---------- ارسم وخمّن ----------
  const RCOL = ['#111111','#E53935','#1E88E5','#43A047','#FDD835','#FB8C00','#8E24AA','#8D6E63'];
  const RSIZE = [0.007, 0.015, 0.032];
  let guessLog=[];
  function renderRasm(R){
    const box=$('#r-rasm');
    const key = R.phase + ':' + (R.mine?'m':'g') + ':' + (R.canClaim?'c':'') + ':' + (R.choices?'p':'') + ':' + (R.word||'') + ':' + (R.reveal||'') + ':' + (R.solved?'s':'');
    if(box.dataset.key===key){ updateRasm(R); return; }
    box.dataset.key=key; if(R.phase!=='draw') mirror=null;
    renderRasmBody(box, R); updateRasm(R);
  }
  // الأجزاء اللي تتغير بدون ما نعيد بناء اللوحة: التلميح، التخمينات، التقييم
  function updateRasm(R){
    const h=$('#rg-hint'); if(h && R.hint!=null) h.innerHTML=hintHTML(R);
    const pg=$('#rg-prog'); if(pg){ const P=R.prog;
      pg.innerHTML = P ? `<span class="rg-prog-n"><b>${P.n}</b> من ${P.of} خمّنوها</span>${P.list.map(s=>`<span class="rg-prog-p" style="--c:${s.c||'var(--line)'}">${esc(s.n)}</span>`).join('')}` : ''; }
    { const mine=(me()||{}).name, L0=R.feed||[], last=L0[L0.length-1];
      if(last && mine && last.n===mine && !last.ok && st.rgLast!==L0.length){ st.rgLast=L0.length; const inp=$('#rg-in');
        if(inp){ inp.classList.toggle('rg-bad', false); void inp.offsetWidth; inp.classList.add('rg-bad'); if(!last.close) sfx('tick'); } } }
    const f=$('#rg-feed'); if(f){ const L=(R.feed||[]).slice().reverse();
      const k=L.map(x=>x.n+x.x+x.close+x.ok).join('|');
      if(f.dataset.k!==k){ const fresh=f.dataset.k!=null && f.dataset.k!==''; f.dataset.k=k;
        f.innerHTML = L.length ? L.map((x,i)=>`<div class="rg-m ${x.ok?'ok':x.close?'close':''} ${fresh&&i===0?'new':''}" style="--c:${x.c||'var(--line)'}"><b>${esc(x.n)}</b><span>${x.ok?'خمّنها صح!':x.close?'قريب جداً!':esc(x.x)}</span></div>`).join('')
          : `<p class="muted small">${R.mine?'تخمينات الباقين تطلع هنا':'التخمينات تطلع هنا — حتى تخمينات الفرق الثانية'}</p>`; } }
    { const nx=$('#rp-next'); if(nx) nx.innerHTML = R.nextIn ? `${ic('next')} الدور الجاي بعد <b>${R.nextIn}</b>` : ''; }
    if(R.phase==='reveal'){ if(R.myRate) markRate(R.myRate);
      const ri=$('#rp-rinfo'), g=R.rating; if(ri && g){ ri.innerHTML = g.n ? `<div class="rp-avg"><b>${g.avg.toFixed(1)}</b><span>من 5 — ${RATE[Math.max(0,Math.round(g.avg)-1)]}</span><small>${g.n} ${g.n===1?'صوت':'أصوات'}</small></div>
        <div class="rp-votes">${g.votes.map(v=>`<span style="--c:${v.c||'var(--line)'}"><b>${esc(v.n||'لاعب')}</b> ${v.v}</span>`).join('')}</div>` : '<p class="muted small center">محد قيّم للحين</p>'; } }
  }
  function renderRasmBody(box, R){
    if(R.phase==='claim'){
      if(R.canClaim){
        box.innerHTML=`<div class="eyebrow">${ic('pencil')} ارسم وخمّن — دوركم</div><button class="btn btn-hype big ch-claim" id="rs-claim">أنا برسم</button><p class="muted small center">أول واحد يضغط تطلع له الكلمات بجواله بس</p>`;
        $('#rs-claim').onclick=()=>{ vibe([40,20,40]); send({t:'claim'}); };
      } else box.innerHTML=`<div class="ch-taken">${ic('pencil')} دور ${esc(R.drawerTeam)} يرسم — استعدوا تخمّنون</div>`;
      return;
    }
    if(R.phase==='pick'){
      if(R.mine && R.choices){ vibe([80,40,80]);
        box.innerHTML=`<div class="eyebrow">${ic('pencil')} اختار كلمة — لا تخلي أحد يشوف</div>${R.pickMs?`<div class="sq-qbar rp-pickbar"><i style="--ms:${R.pickMs}ms;--from:1"></i></div><p class="muted small center">لو ما اخترت نختار لك المتوسطة</p>`:''}<div class="rp-choices">${R.choices.map((c,i)=>`<button class="btn big rp-choice" data-i="${i}"><b>${esc(c.w)}</b><small>${['','سهلة','متوسطة','صعبة'][c.d]} · ${c.p}</small></button>`).join('')}</div>`;
        $$('#r-rasm [data-i]').forEach(bt=>bt.onclick=()=>{ vibe(30); send({t:'rpick', i:+bt.dataset.i}); });
      } else box.innerHTML=`<div class="ch-taken">${ic('pencil')} ${esc(R.drawer||'الرسام')} يختار كلمة…</div>`;
      return;
    }
    if(R.phase==='draw' && R.mine && R.word){ buildPad(box, R.word); return; }
    if(R.phase==='draw'){ buildGuess(box, R); return; }
    if(R.phase==='reveal'){ mirror=null; buildReveal(box, R); return; }
    box.innerHTML='';
  }
  const hintHTML = R => `<span class="rg-pat">${esc(R.hint||'')}</span><small>${R.letters} ${R.letters>10?'حرف':'حروف'}</small>`;
  function buildGuess(box, R){
    box.innerHTML=`<div class="eyebrow">${ic('eye')} خمّن الرسمة${R.mirror?'':' اللي على الشاشة'}${R.tag?` · <span class="pill">${esc(R.tag)}</span>`:''}${R.diff?` <span class="pill dim">${esc(R.diff)}</span>`:''}</div>
      <div class="muted small">${esc(R.drawer||'')} يرسم</div>
      <div class="rg-stage ${R.mirror?'':'solo'}">
        ${R.mirror?'<div class="rg-board"><canvas class="rp-canvas" id="rg-canvas"></canvas></div>':''}
        <div class="rg-aside"><div class="rg-aside-in">
          ${R.solved?`<div class="rg-done"><small>خمّنتها صح</small><b>${esc(R.solved.w)}</b><span>+${R.solved.gp} · انتظر لين الباقين يخمّنون أو يخلص الوقت</span></div>`:`<div class="rg-hint" id="rg-hint">${hintHTML(R)}</div>
          <form class="rg-row" id="rg-form"><input id="rg-in" maxlength="40" placeholder="اكتب تخمينك" autocomplete="off" enterkeyhint="send"><button class="btn btn-hype" type="submit">خمّن</button></form>`}
          <div class="rg-fh"><span class="lbl">التخمينات</span><div class="rg-prog" id="rg-prog"></div></div>
          <div class="rg-feed" id="rg-feed"></div>
        </div></div>
      </div>`;
    if(R.solved) vibe([60,30,120]);
    // بعد كل تخمين نرجع المؤشر للمربع بدون ما تنسحب الصفحة — اللوحة تبقى مكانها
    const fm=$('#rg-form'); if(fm) fm.onsubmit=e=>{ e.preventDefault(); const inp=$('#rg-in'), v=inp.value.trim(); if(!v) return;
      send({t:'guess', text:v}); vibe(15); inp.value=''; try{ inp.focus({preventScroll:true}); }catch(err){} };
    if(R.mirror) buildMirror(); else mirror=null;
  }
  // لوحة الرسام: نفس أدوات الشاشة (draw.js) — كل عملية تنرسل للشاشة مباشرة
  let mirror=null;
  function buildPad(box, word){
    const DR=window.DahoomDraw;
    box.innerHTML=`<div class="rp-word"><small>ارسم:</small> <b>${esc(word)}</b></div>
      <div class="rg-stage pad">
        <div class="rg-board"><canvas class="rp-canvas" id="rp-canvas"></canvas>
          <div class="dr-tools" id="rp-tools"></div>
          <p class="muted small center">ممنوع حروف وأرقام بالرسمة</p></div>
        <div class="rg-aside"><div class="rg-aside-in">
          <div class="rg-fh"><span class="lbl">تخمينات الباقين</span><div class="rg-prog" id="rg-prog"></div></div>
          <div class="rg-feed" id="rg-feed"></div>
        </div></div>
      </div>`;
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
    const res=R.result||{};
    const myTeam = st.S && st.S.team ? st.S.team.name : '';
    const SV = res.solvers || (res.ok ? [{ n:res.who, c:res.color, gp:res.gp, team:res.gTeam }] : []);
    const won = res.ok && (SV.some(s=>s.team===myTeam) || res.dTeam===myTeam);
    box.innerHTML=`<div class="rp-res ${res.ok?'ok':'fail'} ${won?'mine':''}">
        ${res.ok?`<div class="rp-burst" aria-hidden="true">${Array.from({length:14},(_,i)=>`<i style="--a:${i*26}deg;--d:${(i%3)*60}ms"></i>`).join('')}</div>`:''}
        <small>الكلمة كانت</small><div class="rp-reveal">${esc(R.reveal||'')}</div>
        <div class="rp-who">${res.ok?`${res.all?'الكل خمّنها!':`${SV.length} من ${res.of||SV.length} خمّنوها`} · الرسام <span class="rp-pts">+${res.dp}</span>`:'ما أحد عرفها — ولا نقطة'}</div>
        ${res.ok?`<div class="rp-solvers">${SV.map((s,i)=>`<span style="--c:${s.c||'var(--line)'}"><i>${i+1}</i><b>${esc(s.n)}</b><em>+${s.gp}</em></span>`).join('')}</div>`:''}</div>
      ${R.canRate?`<div class="lbl center">قيّم الرسمة</div><div class="rs-rate" id="rp-rate">${RATE.map((r,i)=>`<button class="rs-rate-b" data-rv="${i+1}"><b>${i+1}</b><span>${r}</span></button>`).join('')}</div>`:'<div class="lbl center">تقييم الرسمة</div>'}
      <div class="rp-rinfo" id="rp-rinfo"></div>
      <div class="rp-next" id="rp-next"></div>
      <div class="lbl">التخمينات</div><div class="rg-feed" id="rg-feed"></div>`;
    vibe(res.ok ? (won?[80,40,80,40,160]:[60]) : [200]); sfx(res.ok ? 'good' : 'bad');
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
    const S=st.S||{}, q=st.khQ;
    send(S.game==='khaliya' && q && S.kh && S.kh.qid===q.qid ? {t:'buzz', dt:Math.round(performance.now()-q.at), qid:q.qid} : {t:'buzz'});
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
  // خلية الحروف: اللوحة مصغّرة بالجوال — اللي عليهم الدور يضغطون الحرف بدل ما ينادون المضيف
  // لوحة الحروف بالجوال: نفس رسمة الشاشة بالضبط (SVG، الصفوف الفردية مزاحة لليمين، والعمود الأول يسار)
  // قبل كانت أزرار بصف من اليمين لليسار — الشكل ينعكس والخلايا تبان متجاورة وهي مو متجاورة باللعبة
  function renderKB(kb){
    let box=$('#r-khb');
    if(!box){ box=document.createElement('div'); box.id='r-khb'; box.className='r-khb'; $('#r-phase').after(box); }
    box.classList.toggle('hidden', !kb);
    if(!kb){ box.dataset.k=''; box.innerHTML=''; return; }
    const key=JSON.stringify(kb); if(box.dataset.k===key) return; box.dataset.k=key;
    const N=kb.n, Rr=40, w=Math.sqrt(3)*Rr, h=2*Rr, W=w*N+w/2+48, H=h*.75*(N-1)+h+48;
    const A=kb.colors[0], B=kb.colors[1];
    const pts=(cx,cy,r)=>[0,1,2,3,4,5].map(i=>{ const an=Math.PI/180*(60*i-30); return `${(cx+r*Math.cos(an)).toFixed(1)},${(cy+r*Math.sin(an)).toFixed(1)}`; }).join(' ');
    const x0=4, y0=4, x1=W-4, y1=H-4, mx=W/2, my=H/2;
    let back='', cells='';
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      const idx=r*N+c, [l,o]=kb.cells[idx]||['',-1], cx=24+w/2+c*w+(r%2?w/2:0), cy=24+Rr+r*h*.75;
      const can=kb.can && (o<0 || kb.edit);
      back+=`<polygon class="kx-gap" points="${pts(cx,cy,Rr*1.06)}"/>`;
      cells+=`<g class="kx ${o>=0?'taken':''} ${idx===kb.sel?'sel':''} ${can?'can':''}" data-kx="${idx}" ${can?'role="button" tabindex="0"':''} aria-label="حرف ${esc(l)}" style="${o>=0?`--o:${kb.colors[o]};`:''}transform-origin:${cx.toFixed(1)}px ${cy.toFixed(1)}px"><polygon points="${pts(cx,cy,Rr*.95)}"/><text x="${cx.toFixed(1)}" y="${(cy+2).toFixed(1)}">${esc(l)}</text></g>`;
    }
    const svg=`<svg class="r-khsvg" viewBox="-6 -6 ${(W+12).toFixed(0)} ${(H+12).toFixed(0)}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="لوحة الحروف">
      <defs><clipPath id="r-khclip"><rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" rx="26"/></clipPath></defs>
      <g clip-path="url(#r-khclip)"><polygon points="${x0},${y0} ${x1},${y0} ${mx},${my}" fill="${A}"/><polygon points="${x0},${y1} ${x1},${y1} ${mx},${my}" fill="${A}"/>
      <polygon points="${x0},${y0} ${x0},${y1} ${mx},${my}" fill="${B}"/><polygon points="${x1},${y0} ${x1},${y1} ${mx},${my}" fill="${B}"/></g>
      <rect class="kx-edge" x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" rx="26"/>${back}${cells}</svg>`;
    // مين يوصل وين: لون الإطار نفسه + سطر واضح
    const dirTxt = d => d==='v' ? 'من فوق لتحت' : 'من اليمين لليسار';
    const legend = (kb.names||[]).length===2 ? `<div class="r-khleg">${kb.names.map((n,i)=>`<span style="--c:${kb.colors[i]}"><i></i><b>${esc(n)}</b> ${dirTxt((kb.dirs||['v','h'])[i])}</span>`).join('')}</div>` : '';
    box.classList.toggle('can', !!kb.can);
    const isRef = st.teamId==='ref';
    const hint = kb.edit ? 'اضغط أي خلية تغيّر لونها' : isRef ? 'اختر حرف للفريق اللي عليه الدور' : `${st.mode==='solo'?'دورك':'دوركم'} — اختاروا حرف`;
    box.innerHTML=`${kb.can?`<p class="r-khh">${hint}</p>`:''}${svg}${legend}`;
    $$('[data-kx].can', box).forEach(g=>{ const pick=()=>{ vibe(20); sfx('tick'); send({t:'khpick', i:+g.dataset.kx}); if(!kb.edit){ box.classList.remove('can'); $$('[data-kx]', box).forEach(x=>{ x.classList.remove('can'); x.removeAttribute('tabindex'); }); } };
      g.onclick=pick; g.onkeydown=e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); pick(); } }; });
  }
  // ---------- خلية الحروف: السؤال + ترتيب الجرس + الجواب + أزرار الحكم ----------
  // st.khQ: متى طلع السؤال بهالجوال — ضغطة الجرس تنقاس منه (عشان اللي نته أبطأ ما ينظلم)
  function renderKH(V){
    let box=$('#r-kh');
    if(!box){ box=document.createElement('div'); box.id='r-kh'; box.className='r-kh'; $('#r-phase').after(box); const kb=$('#r-khb'); if(kb) box.after(kb); }
    box.classList.toggle('hidden', !V);
    { const kb=$('#r-khb'); if(kb) kb.classList.toggle('mini', !!V && ['ready','buzz','answer','open','reveal'].includes(V.phase) && !V.edit); }
    if(!V){ box.dataset.k=''; box.innerHTML=''; st.khQ=null; return; }
    if(V.q && V.qid && (!st.khQ || st.khQ.qid!==V.qid)) st.khQ={ qid:V.qid, at:performance.now() };
    // الهيكل يتبنى لما تتغير المرحلة أو السؤال — عشان ما تنمسح الكتابة بخانة الجواب مع كل تحديث
    const key=[V.qid, V.phase, V.canType, V.ref, !!V.answer, V.edit, V.over, (V.answering||{}).name, (V.tries||[]).length, JSON.stringify(V.acts||[])].join('|');
    if(box.dataset.k!==key){ box.dataset.k=key;
      const typing = V.canType;
      box.innerHTML=`<div class="r-khres" id="r-khres"></div>
        ${V.q ? `<div class="r-khq"><span class="r-letter">${esc(V.letter||'')}</span><p>${esc(V.q)}</p>${V.answer?`<div class="r-khans ${V.ref?'ref':''}"><small>${V.ref?'الجواب (يطلع لك بس)':'الجواب'}</small><b>${esc(V.answer)}</b></div>`:''}</div>`
          : V.phase==='ready' ? `<div class="r-khq ready"><span class="r-letter">${esc(V.letter||'')}</span><p>استعدوا… السؤال جاي</p></div>`
          : V.phase==='selected' ? `<div class="r-khq ready"><span class="r-letter">${esc(V.letter||'')}</span><p>${V.ref?'الفريق اختار هالحرف — أكّده أو غيّره':'ننتظر الحكم يأكد الحرف'}</p></div>` : ''}
        <div class="r-khst" id="r-khst"></div>
        ${typing ? `<form class="r-khform" id="r-khform" autocomplete="off"><input id="r-khin" maxlength="40" placeholder="اكتب الجواب" enterkeyhint="send" aria-label="الجواب"><button class="btn btn-hype" type="submit">أرسل</button></form>` : ''}
        <div id="r-khqueue"></div><div id="r-khtries"></div>
        ${V.ref && V.acts ? `<div class="r-khacts">${V.acts.map((x,k)=>x.a==='hint' ? `<p class="muted small">${esc(x.t)}</p>` : `<button type="button" class="btn ${x.k==='hype'?'btn-hype big':x.k==='bad'?'btn-bad':x.k==='ok'?'r-khok':'ghost small'}" data-ka="${k}" ${x.c?`style="--c:${x.c}"`:''}>${esc(x.t)}</button>`).join('')}</div>` : ''}`;
      const f=$('#r-khform'); if(f){ const inp=$('#r-khin'); setTimeout(()=>{ try{ inp.focus(); }catch(e){} }, 60);
        f.onsubmit=e=>{ e.preventDefault(); const v=inp.value.trim(); if(!v) return; vibe(30); sfx('tick'); send({t:'khans', text:v}); inp.value=''; inp.blur(); f.classList.add('sent'); f.querySelector('button').disabled=true; }; }
      $$('[data-ka]', box).forEach(b=>b.onclick=()=>{ const x=V.acts[+b.dataset.ka]; if(!x) return; vibe(25); sfx('tick'); send(Object.assign({t:'khref', a:x.a}, x.i!=null?{i:x.i}:{})); });
    }
    // الأجزاء المتغيرة
    const a=V.answering, rs=V.result;
    $('#r-khres').innerHTML = rs ? (rs.none ? `<div class="r-khbanner none">ما أحد جابها</div>` : `<div class="r-khbanner" style="--c:${rs.color}">${ic('check')} ${esc(rs.name)} ${rs.mine?'— جبتوها!':'جابوها'}</div>`) : '';
    $('#r-khst').innerHTML = V.phase==='answer' && a ? `<div class="r-khwho ${a.mine?'mine':''}" style="--c:${a.color}">${a.mine ? (V.judge==='human'?'دوركم! قولوا الجواب بصوت عالي':'دوركم! اكتبوا الجواب') : V.ref ? `يجاوب: <b>${esc(a.name)}</b>${V.timeUp?' — خلص الوقت':''}` : `يجاوب: <b>${esc(a.name)}</b>`}</div>`
      : V.phase==='open' ? `<div class="r-khwho">مفتوح للفريقين${V.judge==='human'?' — قولوا الجواب':V.canType?' — اكتبوا بسرعة':''}</div>`
      : V.phase==='buzz' ? `<div class="r-khwho hot">${V.ref?'ننتظر الجرس…':'اضغط الجرس تحت!'}</div>` : '';
    $('#r-khqueue').innerHTML = V.queue && V.queue.length ? `<ol class="r-khqueue">${V.queue.map((o,k)=>`<li class="${o.me?'me':''}" style="--c:${o.color}"><b>${k+1}</b><span>${esc(o.name)}<small>${esc(o.team)}</small></span><i dir="ltr">${o.gap==null?(o.dt/1000).toFixed(2)+'s':'+'+o.gap+'ms'}</i></li>`).join('')}</ol>` : '';
    $('#r-khtries').innerHTML = V.tries && V.tries.length ? `<div class="r-khtries">${V.tries.map(t=>`<span class="${t.ok?'ok':'no'}" style="--c:${t.color}">${ic(t.ok?'check':'cancel')}<b>${esc(t.name)}</b> ${t.text?`«${esc(t.text)}»`:t.ok?"— صح بحكم الحكم":"— غلط بحكم الحكم"}</span>`).join('')}</div>` : '';
  }
  function openAsk(reqId, spec){
    sfx('ask');
    st.askId=reqId; vibe([80,40,80]);
    if(spec.sq){ st.sqAsk={ reqId, spec }; renderSQAsk(); return; }
    const isHM = spec.hm || (st.S && st.S.game==='hawamir');
    if(isHM && !spec.options.some(o=>o.card)){ st.hmAsk={ reqId, spec }; renderHMAsk(); return; }
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
    opts.push({ what:'other', kind:'other', label:'مشكلة أو اقتراح بأي شي ثاني', head:'شي ثاني' });
    sheet(`<div class="eyebrow">بلّغ عن مشكلة</div><h3>على وش؟</h3>
      <div class="r-rep-list">${opts.map((o,i)=>`<button class="r-rep-opt" data-i="${i}"><small>${esc(o.head)}</small><b>${esc(o.label)}</b></button>`).join('')}</div>
      <div class="r-actions"><button class="btn ghost" data-x>إلغاء</button></div>`);
    $$('#r-sheet [data-i]').forEach(b=>b.onclick=()=>reasonSheet(opts[+b.dataset.i]));
    $('#r-sheet [data-x]').onclick=closeSheet;
  }
  function reasonSheet(o){
    const list=(window.DahoomLog&&window.DahoomLog.REASONS[o.kind])||[]; let pick=null;
    if(o.what==='other'){
      sheet(`<div class="eyebrow">${ic('flag')} بلاغ أو اقتراح</div><h3>وش المشكلة؟</h3>
        <div class="r-rep-reasons">${list.map((r,i)=>`<button class="btn ghost" data-r="${i}">${esc(r)}</button>`).join('')}</div>
        <textarea class="r-rep-note" id="r-rep-note" maxlength="400" placeholder="اكتب وش صار بالتفصيل: وش كنت تسوي، ووش طلع لك"></textarea>
        <p class="r-err" id="r-rep-err"></p>
        <div class="r-actions"><button class="btn btn-hype big" id="r-rep-send">أرسل</button><button class="btn ghost" data-x>إلغاء</button></div>`);
      $$('#r-sheet [data-r]').forEach(b=>b.onclick=()=>{ pick=list[+b.dataset.r]; vibe(10); $$('#r-sheet [data-r]').forEach(x=>x.classList.toggle('btn-hype',x===b)); });
      $('#r-rep-send').onclick=()=>{ const note=$('#r-rep-note').value.trim();
        if(!pick && note.length<4){ $('#r-rep-err').textContent='اختر نوع المشكلة أو اكتب وش صار'; vibe([40,30,40]); return; }
        const S=st.S||{}, m=me()||{};
        try{ window.DahoomLog.report({ kind:'other', id:(S.game||'').slice(0,12), text:`${S.game||'خارج اللعب'} — ${(S.phase||'').slice(0,80)}`, answer:'', d:0, tag:'' }, pick||'شي ثاني', note, m.name||'لاعب'); status('وصل البلاغ — شكراً'); }catch(e){ status('ما قدرنا نرسل البلاغ'); }
        setTimeout(()=>status(''),2500); vibe(30); closeSheet(); };
      $('#r-sheet [data-x]').onclick=closeSheet; return;
    }
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

  // ---------- دعوة صديق لجلستك (للمسجّلين بس) ----------
  function canInvite(){ const A=window.DahoomAccount, c=A && A.current && A.current(); return !!(c && !c.guest && A.sendInvite && st.room); }
  async function inviteSheet(){
    const A=window.DahoomAccount; if(!canInvite()) return;
    const sent=st.invSent||(st.invSent={});
    const row = f => { const on=f.pres&&f.pres.on, s=sent[f.uid];
      return `<li><img src="${esc(A.avatarSrc(f.avatar))}" alt=""><span><b>${esc(f.name)}</b><small class="${on?'on':''}">${esc((f.pres&&f.pres.text)||'')}</small></span><button type="button" class="btn small ${s?'ghost':'btn-hype'}" data-inv="${esc(f.uid)}" ${s?'disabled':''}>${s?'انرسلت':'ادعُ'}</button></li>`; };
    const draw = list => {
      sheet(`<div class="eyebrow">${ic('acc-user-plus')} جلستك ${esc(st.room)}</div><h3>ادعُ أصدقاءك</h3><p class="muted small">يطلع لهم إشعار بالموقع، ويدخلون بضغطة</p>
        ${list===null ? '<p class="muted">نجيب أصدقاءك…</p>' : !list.length ? '<p class="muted">ما عندك أصدقاء للحين. تقدر تضيفهم من ملفك.</p>' : `<ul class="r-invl">${list.map(row).join('')}</ul>`}
        <button type="button" class="btn ghost" data-x>تم</button>`);
      $('#r-sheet [data-x]').onclick=closeSheet;
      $$('#r-sheet [data-inv]').forEach(b=>b.onclick=async()=>{
        b.disabled=true; vibe(20);
        const ok=await A.sendInvite(b.dataset.inv, st.room, (st.info||{}).game);
        if(ok){ sent[b.dataset.inv]=Date.now(); b.textContent='انرسلت'; b.classList.remove('btn-hype'); b.classList.add('ghost'); sfx('good'); }
        else { b.disabled=false; b.textContent='ما انرسلت — جرّب'; }
      });
    };
    draw(null);
    const list=await A.listFriends().catch(()=>[]);
    if(!$('#r-sheet').classList.contains('hidden')) draw(list);
  }
  document.addEventListener('click', e=>{ if(e.target.closest('[data-invfr]')){ vibe(10); inviteSheet(); } });
  // الحساب ممكن يجهز بعد ما انرسمت لوحة صاحب الجلسة
  setInterval(()=>{ const b=document.querySelector('.ow [data-invfr]'); if(b) b.classList.toggle('hidden', !canInvite()); }, 2000);

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
    history.replaceState(null,'','?room='+code+(OWNER?'&owner=1':''));
    connect();
  }
  $('#r-go').onclick=()=>join($('#r-code').value);
  $('#r-code').addEventListener('keydown', e=>{ if(e.key==='Enter') join(e.target.value); });
  $('#r-newteam').onsubmit=e=>{ e.preventDefault(); vibe(20); send({t:'newteam', name:$('#r-newteam-name').value.trim(), pid:(me()||{}).pid}); $('#r-newteam-name').value=''; };
  $('#r-switch').onclick=()=>{ localStorage.removeItem(teamKey()); st.teamId=null; send({t:'leave'}); };
  // شعار المنصة = الرئيسية (لو انت داخل جلسة نسألك أول)
  { const lg=$('.r-logo'); if(lg){ lg.setAttribute('role','link'); lg.tabIndex=0; const goHome=()=>{
      const inRoom = st.room && $('#r-join').classList.contains('hidden');
      if(inRoom && !confirm('تطلع من الجلسة وترجع للرئيسية؟')) return;
      try{ if(st.room) send({t:'leave'}); }catch(e){} try{ localStorage.removeItem('dahoom_last_room'); }catch(e){} location.href='index.html'; };
    lg.onclick=goHome; lg.onkeydown=e=>{ if(e.key==='Enter') goHome(); }; } }
  // الجلسات المفتوحة (اللوبي العام) — تتحدث كل شوي وأنت بشاشة الدخول
  const GIC = { alf:'cards', khaliya:'hive', rasm:'pencil', hawamir:'hm-building-bank', sadq:'masks' };
  async function loadRooms(){
    const el=$('#r-rooms'); if(!el || $('#r-join').classList.contains('hidden')) return;
    const L=window.DahoomLobby, list=L ? await L.list() : [];
    el.innerHTML = list.length ? list.map(r=>`<button class="jl-room" data-room="${esc(r.code)}"><span class="jl-gic">${ic(GIC[r.game]||'star')}</span><span class="jl-t"><b>${esc(r.gameName||'جلسة')}</b><small>${ic('person')} ${esc(r.host||'بدون اسم')}</small></span><span class="jl-n">${ic('users')} ${r.players} من ${r.max}</span><span class="jl-ph ${r.phase==='play'?'live':''}">${r.phase==='play'?'شغالة':'بالانتظار'}</span><span class="jl-go">ادخل</span></button>`).join('')
      : `<div class="jl-empty">${ic('door')}<b>ما فيه جلسات مفتوحة الحين</b><span>سوّ جلستك وخلّ الشباب يدخلون، أو ادخل بكود من أحد.</span></div>`;
    $$('#r-rooms [data-room]').forEach(b=>b.onclick=()=>{ vibe(15); join(b.dataset.room); });
  }
  setInterval(loadRooms, 8000);
  { const A=window.DahoomAccount, el=$('#acc-badge');
    const syncAcct = () => { const c=A.current(); if(!c || !c.name) return; const m=me();
      if(m && m.name===c.name && m.avatar===c.avatar) return;
      try{ localStorage.setItem(meKey, JSON.stringify(Object.assign({}, m||{}, { name:c.name, avatar:c.avatar }))); }catch(e){}
      if(m && m.pid && st.registeredRoom && st.room && st.conn && st.conn.open){ try{ send({t:'register', pid:m.pid, name:c.name, avatar:c.avatar}); }catch(e){} } };
    if(A){ A.init().then(()=>{ syncAcct(); if(A.onChange) A.onChange(syncAcct); }); if(el) A.mountBadge(el); } }
  const q=new URLSearchParams(location.search).get('room');
  if(q) join(q); else { const last=localStorage.getItem('dahoom_last_room'); if(last) $('#r-code').value=last; loadRooms(); }
})();
