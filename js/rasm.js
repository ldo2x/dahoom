/* ===== ارسم وخمّن — محرك اللعبة على الشاشة =====
   الدور على فريق: واحد منهم يضغط «أنا برسم» من جواله ويختار كلمة من ثلاث (سهلة/متوسطة/صعبة)،
   يرسمها بجواله وتطلع على الشاشة مباشرة، والكل يكتب تخميناته من جواله (أو يقولها والمضيف يحكم).
   أول تخمين صح: الفريق اللي خمّن ياخذ نقاط حسب السرعة، وفريق الرسام ياخذ نص قيمة الكلمة.
   بدون جوالات: الرسام يرسم على الشاشة نفسها بالماوس أو اللمس.
*/
(function(){
  const D = window.Dahoom, DATA = window.DAHOOM_DATA;
  const { $, $$, rnd, shuffle, esc, ic, store, play, stop, stopAll, memeSound, go, toast, modal, confirmBox, confetti, reaction, flash } = D;

  const DEFAULTS = { drawTime:80, rounds:2, hints:true, noRepeat:true, mirror:true };
  let S = Object.assign({}, DEFAULTS, store.get('rasm_settings', {}));
  const PTS = { 1:100, 2:150, 3:200 };
  const DIFF = { 1:'سهلة', 2:'متوسطة', 3:'صعبة' };
  const COLORS = ['#111111','#E53935','#1E88E5','#43A047','#FDD835','#FB8C00','#8E24AA','#8D6E63'];
  const SIZES = [0.007, 0.015, 0.032];
  const r5 = n => Math.max(5, Math.round(n/5)*5);
  const NET = () => window.DahoomNet;
  const LOG = () => window.DahoomLog;
  const pushAll = () => { const n=NET(); if(n) n.pushAll(); };
  const used = { load(){ return new Set(store.get('used_words',[])); }, save(u){ store.set('used_words',[...u]); } };

  // ---------- مطابقة التخمين ----------
  // نوحّد الهمزات والتاء المربوطة والألف المقصورة، نشيل التشكيل و"ال"، ونتسامح بحرف غلط في الكلمات الطويلة
  function norm(s){
    return String(s||'').toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g,'')
      .replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
      .replace(/[^\u0600-\u06FFa-z0-9]+/g,' ').trim()
      .split(' ').filter(Boolean).map(w=>w.replace(/^(وال|بال|ال)(?=..)/,'')).join('');
  }
  function lev(a, b){
    if(Math.abs(a.length-b.length)>2) return 9;
    const m=[...Array(b.length+1).keys()];
    for(let i=1;i<=a.length;i++){ let prev=m[0]; m[0]=i;
      for(let j=1;j<=b.length;j++){ const t=m[j]; m[j]=Math.min(m[j]+1, m[j-1]+1, prev+(a[i-1]===b[j-1]?0:1)); prev=t; } }
    return m[b.length];
  }
  // 2 = صح، 1 = قريب، 0 = غلط
  function check(word, guess){
    const g=norm(guess); if(!g) return 0;
    const all=[word.w, ...word.alt].map(norm).filter(Boolean);
    if(all.includes(g)) return 2;
    if(all.some(x=>x.length>=3 && g.length<=x.length+8 && g.includes(x))) return 2;
    if(all.some(x=>x.length>=5 && lev(x,g)<=1)) return 2;
    if(all.some(x=>x.length>=3 && lev(x,g)<=2)) return 1;
    return 0;
  }

  // ---------- الإعدادات ----------
  function renderSettings(){
    $$('#rasm-form [data-k]').forEach(el=>{
      const k=el.dataset.k;
      if(el.type==='checkbox') el.checked=!!S[k]; else el.value=S[k];
      el.onchange=()=>{ S[k] = el.type==='checkbox' ? el.checked : Number(el.value); store.set('rasm_settings',S); };
    });
    const comps=D.competitors();
    $('#rasm-teams-preview').innerHTML = comps.map(t=>`<span class="kh-teamtag" style="--c:${t.color}">${esc(t.name)}</span>`).join('')
      + `<p class="muted small">كل ${D.session.mode==='solo'?'لاعب':'فريق'} بيرسم ${S.rounds} ${S.rounds===1?'مرة':'مرات'} — يعني ${comps.length*S.rounds} رسمات بالمباراة.</p>`;
  }

  // ---------- الحالة ----------
  let G=null, timerH=null;
  const cur = () => G.teams[G.order[G.turn]];
  const teamById = id => G.teams.find(t=>t.id===id);
  const nameOf = (t, pid) => ((t && t.players.find(p=>p.id===pid)) || {}).name || null;
  const tally = (o, k) => { if(k) o[k]=(o[k]||0)+1; };

  function newMatch(){
    const comps=D.competitors();
    if(comps.length<2){ toast('نحتاج فريقين أو لاعبين اثنين على الأقل'); go('lobby'); return; }
    G = { teams: comps.map(c=>({...c, score:0, drawnOk:0, guessedOk:0})), order:[], turn:0, round:1, phase:'idle',
      used: used.load(), drawer:null, choices:null, word:null, ratings:{}, feed:[], left:0, total:1, lastWord:null,
      stats:{ guesses:{}, drawings:{}, missed:{}, wrongBy:{}, fast:null, wrong:0, rated:{}, bestArt:null }, log:{ t0:Date.now(), items:[] }, lastGuessAt:{} };
    G.order = shuffle(G.teams.map((_,i)=>i));
    window.DAHOOM_ITEM = null;
    const n=NET(); if(n) n.use({ teams:()=>G.teams, state:phoneState, claim:onClaim, msg:onMsg, report:onReport, roster:syncRoster, onPhones:()=>{ if(G && G.phase==='claim') turnIntro(); } });
    go('rasm'); setupCanvas(); clearBoard();
    startTurn();
  }
  function syncRoster(){
    if(!G) return; const ss=D.session;
    G.teams.forEach(t=>{ const tm=ss.teams.find(x=>x.id===t.id); if(tm) t.players=tm.members.map(id=>ss.players.find(p=>p.id===id)).filter(Boolean); });
  }

  // ---------- العرض ----------
  function panel(html){ $('#rs-panel').innerHTML=html; pushAll(); }
  function renderScore(){
    const max=Math.max(1,...G.teams.map(t=>t.score));
    $('#rs-score').innerHTML=G.teams.map(t=>`<div class="tchip ${t===cur()&&G.phase!=='over'?'turn':''}" style="--c:${t.color}"><span class="sw">${t.avatar?`<img src="${D.avatarSrc(t.avatar)}" alt="">`:''}</span><span><span class="nm">${esc(t.name)}</span><span class="sub">${t.players.length>1?`${t.players.length} لاعبين`:''}</span></span><span class="sc">${t.score}</span><span class="bar"><i style="transform:scaleX(${(t.score/max).toFixed(3)})"></i></span></div>`).join('');
    $('#rs-round').textContent = `الجولة ${Math.min(G.round,S.rounds)} من ${S.rounds}`;
    pushAll();
  }
  function hintPattern(){
    if(!G.word) return '';
    const w=G.word.w, show=G.revealed||new Set();
    return [...w].map((ch,i)=> ch===' ' ? '<i class="sp"></i>' : `<b>${show.has(i)?esc(ch):''}</b>`).join('');
  }
  const hintText = () => G.word ? [...G.word.w].map((ch,i)=> ch===' ' ? '  ' : (G.revealed&&G.revealed.has(i) ? ch : '_')).join(' ') : '';

  // ---------- الدور ----------
  function startTurn(){
    stopTimer(); G.phase='claim'; G.result=null; G.rateBy={}; G.drawer=null; G.choices=null; G.word=null; G.revealed=new Set(); G.feed=[]; G.solved=[]; G.dpTurn=0;
    clearBoard(); setTvDraw(false); renderScore(); turnIntro();
  }
  function turnIntro(){
    const t=cur(), n=NET(), viaPhone = n && n.hasPhone(t.id);
    panel(`<div class="lower-third" style="--c:${t.color}"><span class="lt-k">يرسم</span><span class="lt-v">${esc(t.name)}</span></div>
      <div class="kh-status">${viaPhone?`مين بيرسم من ${esc(t.name)}؟`:`الرسام من ${esc(t.name)} يجي للشاشة`}</div>
      ${viaPhone?`<div class="ch-status">${ic('phone')} واحد منكم يضغط «أنا برسم» من جواله — الكلمات تطلع له بس</div>`:''}
      <div class="row center"><button class="btn ${viaPhone?'ghost small':'btn-hype big'}" id="rs-tvdraw">${ic('pencil')} ${viaPhone?'ارسم على الشاشة بدال الجوال':'أنا الرسام — وريني الكلمات'}</button></div>
      <p class="muted small">الباقين يكتبون تخميناتهم من جوالاتهم، أو يقولونها بصوت والمضيف يحكم.</p>`);
    $('#rs-tvdraw').onclick=()=>{ G.drawer={ teamId:t.id, cid:null, pid:null, name:null, tv:true }; offerChoices(); };
  }
  function pickChoices(){
    const words=DATA.words||[];
    return [1,2,3].map(d=>{
      let pool=words.filter(w=>w.d===d);
      let fresh=S.noRepeat ? pool.filter(w=>!G.used.has(w.id)) : pool;
      if(!fresh.length){ pool.forEach(w=>G.used.delete(w.id)); fresh=pool; }
      return rnd(fresh);
    });
  }
  function offerChoices(){
    G.phase='pick'; G.choices=pickChoices(); play('card',{volume:.6});
    const t=cur();
    if(G.drawer.tv){
      panel(`<div class="lower-third" style="--c:${t.color}"><span class="lt-k">الرسام</span><span class="lt-v">${esc(t.name)}</span></div>
        <div class="kh-status">اختار كلمة — لا تخلي أحد يشوف</div>
        <div class="covered" id="rs-cov"><div class="rs-choices">${G.choices.map((w,i)=>`<button class="btn rs-choice d${w.d}" data-i="${i}"><b>${esc(w.w)}</b><small>${DIFF[w.d]} · ${PTS[w.d]}</small></button>`).join('')}</div><div class="cover"><span>${ic('eye')} اضغط عشان تشوف الكلمات</span></div></div>`);
      $('#rs-cov .cover').onclick=e=>{ e.stopPropagation(); e.currentTarget.style.display='none'; play('pop'); };
      $$('#rs-cov [data-i]').forEach(b=>b.onclick=()=>choose(+b.dataset.i));
    } else {
      panel(`<div class="lower-third" style="--c:${t.color}"><span class="lt-k">الرسام</span><span class="lt-v">${esc(G.drawer.name||t.name)}</span></div>
        <div class="kh-status">يختار كلمة من جواله…</div><p class="muted">سهلة ${PTS[1]} · متوسطة ${PTS[2]} · صعبة ${PTS[3]}</p>
        <div class="row center"><button class="btn ghost small" id="rs-tvdraw">${ic('pencil')} ارسم على الشاشة بداله</button></div>`);
      $('#rs-tvdraw').onclick=()=>{ G.drawer={ teamId:t.id, cid:null, pid:null, name:null, tv:true }; offerChoices(); };
    }
  }
  function choose(i){
    if(G.phase!=='pick' || !G.choices || !G.choices[i]) return;
    G.word=G.choices[i]; G.choices=null; G.used.add(G.word.id); used.save(G.used);
    G.phase='draw'; G.feed=[]; G.solved=[]; G.dpTurn=0; G.revealed=new Set(); clearBoard();
    { const L=G.log.items, last=L[L.length-1]; if(last && last.r==='?') last.r='skip';
      L.push({ k:'w', id:G.word.id, d:G.word.d, tag:G.word.tag, r:'?', x:G.word.w, by:G.drawer.name||null }); }
    window.DAHOOM_ITEM = null; // الكلمة سرية لين تنكشف
    setTvDraw(!!G.drawer.tv);
    drawPanel(); play('unlock',{volume:.6});
    startTimer(S.drawTime);
  }
  function drawPanel(){
    const t=cur(), w=G.word;
    panel(`<div class="row center"><span class="pill">${esc(w.tag)}</span><span class="pill dim">${DIFF[w.d]} · ${PTS[w.d]}</span><span class="pill team" style="--c:${t.color}">${esc(G.drawer.name||t.name)} يرسم</span></div>
      ${G.drawer.tv?`<div class="covered rs-secret" id="rs-sec"><div class="qtext">${esc(w.w)}</div><div class="cover"><span>${ic('eye')} الكلمة (للرسام بس)</span></div></div>`:''}
      <div class="rs-hint" id="rs-hint" aria-label="عدد حروف الكلمة">${hintPattern()}</div>
      <div class="timer smooth" id="rs-timer"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="0"/></svg><div class="num">${S.drawTime}</div></div>
      <div class="rs-prog" id="rs-prog"></div>
      <div class="rs-feed" id="rs-feed"></div>
      <div class="lbl">خمّنوها بصوت؟ اضغط الفريق:</div>
      <div class="row center">${guessers().map(x=>`<button class="btn team small" style="--c:${x.color}" data-g="${x.id}">${esc(x.name)}</button>`).join('')}</div>
      <div class="row center"><button class="btn ghost small" id="rs-nobody">ما أحد عرفها — اكشف الكلمة</button></div>`);
    const sec=$('#rs-sec'); if(sec) sec.onclick=()=>{ const c=sec.querySelector('.cover'); c.style.display = c.style.display==='none' ? 'flex' : 'none'; };
    $$('#rs-panel [data-g]').forEach(b=>b.onclick=()=>win(b.dataset.g, null));
    $('#rs-nobody').onclick=()=>endTurn();
    renderFeed(); renderSolved();
  }
  function renderFeed(){
    const el=$('#rs-feed'); if(!el) return;
    el.innerHTML = G.feed.length ? G.feed.slice(-7).map(f=>`<div class="rs-msg ${f.ok?'ok':f.close?'close':''}" style="--c:${f.color}"><b>${esc(f.name)}</b><span>${f.ok?'خمّنها صح!':f.close?'قريب جداً!':esc(f.text)}</span></div>`).join('') : '<p class="muted small">التخمينات تطلع هنا</p>';
  }
  // مين خمّنها للحين — والدور مكمّل لين الكل يعرفها
  function renderSolved(){
    const el=$('#rs-prog'); if(!el || !G.solved) return;
    const all=guessers(), n=G.solved.length;
    el.innerHTML = `<div class="rs-prog-h"><b>${n}</b> من ${all.length} خمّنوها</div><div class="rs-prog-l">${all.map(t=>{ const s=solvedBy(t.id); return `<span class="${s?'ok':''}" style="--c:${t.color}">${esc(s?s.n:t.name)}</span>`; }).join('')}</div>`;
    $$('#rs-panel [data-g]').forEach(b=>{ b.disabled=!!solvedBy(b.dataset.g); });
    const nb=$('#rs-nobody'); if(nb) nb.textContent = n ? 'خلّص الدور واكشف الكلمة' : 'ما أحد عرفها — اكشف الكلمة';
  }

  // ---------- المؤقت + التلميحات ----------
  // العرض ناعم (كل فريم) ويطلع أجزاء الثانية بآخر 10 ثواني — والمنطق (التلميحات والنهاية) كل ثانية
  let rafH=0;
  function smooth(){
    cancelAnimationFrame(rafH);
    const f=()=>{ if(!G || G.phase!=='draw' || !G.deadline) return;
      const el=$('#rs-timer'); if(el){ const ms=Math.max(0, G.deadline-Date.now()), sec=ms/1000, frac=Math.min(1, ms/(G.total*1000));
        el.querySelector('.num').textContent = sec<=10 ? sec.toFixed(1) : Math.ceil(sec);
        el.querySelector('.fg').style.strokeDashoffset=(326.7*(1-frac)).toFixed(1);
        el.style.setProperty('--hue', Math.round(frac*140));
        el.classList.toggle('warn', sec<=G.total*.4 && sec>10); el.classList.toggle('danger', sec<=10); el.classList.toggle('crit', sec<=5); }
      rafH=requestAnimationFrame(f); };
    rafH=requestAnimationFrame(f);
  }
  function startTimer(sec){
    stopTimer(); G.total=sec; G.left=sec; G.deadline=Date.now()+sec*1000; smooth(); pushAll();
    const tick=()=>{
      const el=$('#rs-timer'); if(!el){ timerH=setTimeout(tick,1000); return; }
      // تلميح: حرف عند نص الوقت وحرف ثاني عند الربع الأخير (للكلمات الطويلة)
      if(S.hints && G.word){ const n=[...G.word.w].filter(c=>c!==' ').length;
        if(G.left===Math.floor(G.total/2) && n>=3) revealLetter();
        if(G.left===Math.floor(G.total/4) && n>=5) revealLetter(); }
      if(G.left<=10 && G.left>0) play('tick',{volume:.35});
      if(G.left<=0){ stopTimer(); reveal(null); return; }
      G.left--; timerH=setTimeout(tick,1000);
    };
    tick();
  }
  function stopTimer(){ clearTimeout(timerH); timerH=null; cancelAnimationFrame(rafH); if(G) G.deadline=0; }
  function revealLetter(){
    const idx=[...G.word.w].map((c,i)=>c!==' '&&!G.revealed.has(i)?i:-1).filter(i=>i>=0);
    if(!idx.length) return; G.revealed.add(rnd(idx));
    const h=$('#rs-hint'); if(h) h.innerHTML=hintPattern(); play('tick',{volume:.5}); pushAll();
  }

  // ---------- التخمين والنتيجة ----------
  // الدور ما يخلص بأول تخمين صح: كل فريق (أو لاعب بالفردي) يخمّن لحاله، والدور يخلص لما الكل يعرفها أو يخلص الوقت
  const guessers = () => G.teams.filter(t => t!==cur() || t.players.length>1);
  const solvedBy = id => (G.solved||[]).find(s=>s.teamId===id);
  function onGuess(teamId, cid, pid, text){
    if(!G || G.phase!=='draw' || !G.word) return;
    if(G.drawer && G.drawer.cid && G.drawer.cid===cid) return;
    const t=teamById(teamId); if(!t) return;
    if(solvedBy(teamId)){ NET().send(teamId,{t:'notice', msg:'خمّنتوها صح — انتظروا الباقين'}); return; }
    const now=Date.now(); if(now-(G.lastGuessAt[cid]||0)<900) return; G.lastGuessAt[cid]=now;
    text=String(text||'').trim().slice(0,40); if(!text) return;
    const name=nameOf(t,pid)||t.name, res=check(G.word, text);
    if(res===2) return win(teamId, name);
    if(res===1){ G.feed.push({name, color:t.color, text, close:true}); NET().send(teamId,{t:'notice', msg:`«${text}» قريب جداً!`}); play('tick',{volume:.7}); }
    else { G.feed.push({name, color:t.color, text}); G.stats.wrong++; tally(G.stats.wrongBy, name); play('pop',{volume:.35}); }
    renderFeed(); pushAll();
  }
  function win(teamId, guesserName){
    if(!G || G.phase!=='draw' || solvedBy(teamId)) return;
    const g=teamById(teamId), d=cur(); if(!g) return;
    const base=PTS[G.word.d], frac=Math.max(0,G.left)/G.total, first=!G.solved.length;
    const gp=r5(base*(0.5+0.5*frac)), dp=r5(base*(first?0.5:0.2));
    g.score+=gp; g.guessedOk++; d.score+=dp; G.dpTurn+=dp; if(first){ d.drawnOk++; tally(G.stats.drawings, G.drawer.name); }
    tally(G.stats.guesses, guesserName);
    const secs=G.total-G.left; if(guesserName && (!G.stats.fast || secs<G.stats.fast.s)) G.stats.fast={ name:guesserName, s:secs, w:G.word.w };
    const who=guesserName||g.name;
    G.solved.push({ teamId:g.id, n:who, c:g.color, gp, team:g.name });
    G.feed.push({ name:who, color:g.color, text:'', ok:true });
    { const l=G.log.items[G.log.items.length-1]; if(l && l.r==='?'){ if(first){ l.left=+frac.toFixed(2); l.g=who; l.gt=g.id; } (l.gs=l.gs||[]).push(who); } }
    const n=NET(); if(n) n.send(g.id,{t:'notice', msg:`صح! خمّنتها +${gp}`});
    play('correct'); flash('good'); confetti(first?60:30,1200);
    renderScore(); renderFeed(); renderSolved();
    if(guessers().every(t=>solvedBy(t.id))) return endTurn();
    pushAll();
  }
  // نهاية الدور: خلص الوقت، أو الكل خمّن، أو المضيف قفله
  function endTurn(){
    if(G.phase!=='draw') return;
    stopTimer();
    const S2=G.solved, d=cur(), l=G.log.items[G.log.items.length-1];
    if(!S2.length){
      if(l && l.r==='?'){ l.r='fail'; l.left=0; }
      play('fail',{volume:.6}); flash('bad'); tally(G.stats.missed, G.drawer.name);
      G.result={ ok:false };
      return finishTurn('ما أحد عرفها', 'ولا نقطة هالمرة');
    }
    if(l && l.r==='?') l.r='ok';
    const all=guessers().every(t=>solvedBy(t.id)), f=S2[0];
    if(all) confetti(90,1600);
    G.result={ ok:true, all, who:f.n, color:f.c, gp:f.gp, dp:G.dpTurn, dTeam:d.name, drawer:G.drawer.name||d.name, solvers:S2.map(s=>({ n:s.n, c:s.c, gp:s.gp, team:s.team })), of:guessers().length };
    finishTurn(`<span style="color:var(--mint)">${all?'الكل خمّنها!':`${S2.length} من ${guessers().length} خمّنوها`}</span>`,
      `${S2.map(s=>`${esc(s.n)} +${s.gp}`).join(' · ')} · الرسام +${G.dpTurn}`);
  }
  function reveal(){ endTurn(); }
  function finishTurn(title, sub){
    G.phase='reveal'; setTvDraw(false); G.lastWord=G.word; G.ratings={};
    window.DAHOOM_ITEM = { kind:'w', id:G.word.id, d:G.word.d, tag:G.word.tag, text:G.word.w, answer:'' };
    renderScore();
    const last = G.turn===G.order.length-1 && G.round>=S.rounds;
    panel(`<div class="eyebrow">الكلمة كانت</div><div class="rs-word">${esc(G.word.w)}</div>
      <div class="kh-status">${title}</div><p class="muted">${sub}</p>
      ${B && B.count ? '<div id="rs-rating" class="rs-rating"></div>' : ''}
      <div class="row center mt-s"><button class="btn btn-hype big" id="rs-next">${last?`${ic('podium')} النتائج`:`الدور الجاي ${ic('next')}`}</button></div>`);
    $('#rs-next').onclick=()=>nextTurn();
    drawRating();
  }
  function nextTurn(){
    closeRating();
    G.turn++;
    if(G.turn>=G.order.length){ G.turn=0; G.round++; }
    if(G.round>S.rounds) return endMatch();
    if(G.turn===0) toast(`الجولة ${G.round}`);
    startTurn();
  }

  // ---------- الجوال ----------
  function onClaim(teamId, cid, pid){
    if(!G || G.phase!=='claim' || cur().id!==teamId) return;
    const t=cur(); G.drawer={ teamId, cid, pid, name:nameOf(t,pid), tv:false };
    play('game:g_zelda',{volume:.6}); offerChoices();
  }
  function onMsg(c, d){
    if(!G || !c.teamId) return;
    const isDrawer = G.drawer && !G.drawer.tv && G.drawer.cid===c.cid;
    if(d.t==='rpick' && isDrawer) return choose(+d.i);
    if(d.t==='guess') return onGuess(c.teamId, c.cid, c.pid, d.text);
    if(d.t==='rate'){ const tm=teamById(c.teamId); G.rateBy=G.rateBy||{}; G.rateBy[c.cid]={ name:nameOf(tm,c.pid)||(tm&&tm.name)||'', color:tm?tm.color:'' }; return onRate(c.cid, d.v); }
    if(d.t==='rsync'){ if(S.mirror && B){ try{ c.send({ t:'rsfull', ops:B.ops }); }catch(e){} } return; }
    if(!isDrawer || G.phase!=='draw') return;
    if(d.t==='stroke') addStroke(d);
    else if(d.t==='fill') addFill(d);
    else if(d.t==='undo') undo();
    else if(d.t==='clear') clearBoard();
  }
  function onReport(id, pid, d){
    const L=LOG(), it=window.DAHOOM_ITEM, t=G && teamById(id);
    if(!L || !t || d.what!=='item' || !it || !(L.REASONS.w||[]).includes(d.reason)) return false;
    L.report(it, d.reason, d.note, `${nameOf(t,pid)||'جوال'} (${t.name})`); return true;
  }
  // نهاية المباراة: كل التتويجات والأرقام والكلمات — نفس اللي على شاشة المضيف، لكل لاعب
  function finalAll(sorted, id){
    const players=G.teams.flatMap(t=>t.players);
    const avOf = n => { const p=players.find(x=>x.name===n); return p ? p.avatar : ''; };
    return {
      awards:(G.awards||[]).map(a=>({ title:a.title, desc:a.desc, icon:a.icon, who:a.who, team:a.team&&a.team.name!==a.who?a.team.name:'', color:a.team?a.team.color:'', value:a.value, av:avOf(a.who), mine:!!(a.team&&a.team.id===id) })),
      tables:[{ title:'الأرقام', icon:'podium', head:['#', D.session.mode==='solo'?'اللاعب':'الفريق', 'النقاط', 'خمّن صح', 'رسماته انعرفت'],
        rows:sorted.map((t,i)=>({ rank:i+1, name:t.name, color:t.color, me:t.id===id, cells:[t.score, t.guessedOk, t.drawnOk] })) }],
      lists:[{ title:'كل الكلمات', icon:'pencil', items:G.log.items.filter(x=>x.r==='ok'||x.r==='fail').map(x=>({ b:x.x, ok:x.r==='ok',
        s:[x.by?'رسمها '+x.by:'', x.r==='ok'?(x.gs&&x.gs.length?'خمّنها '+x.gs.join('، '):x.g?'خمّنها '+x.g:'انعرفت'):'ما أحد عرفها', x.rate?x.rate.toFixed(1)+'/5':''].filter(Boolean).join(' · ') })) }] };
  }
  function phoneState(id, cid, pid){
    const t=G && teamById(id);
    if(!t) return { game:'rasm', waiting:true };
    const scores=G.teams.map(x=>({id:x.id,name:x.name,color:x.color,score:x.score,turn:x===cur()&&G.phase!=='over'}));
    if(G.phase==='over'){
      const sorted=[...G.teams].sort((a,b)=>b.score-a.score);
      return { game:'rasm', team:{id:t.id,name:t.name,color:t.color,score:t.score}, scores,
        final:{ rank:sorted.indexOf(t)+1, of:sorted.length, awards:(G.awards||[]).filter(a=>a.team&&a.team.id===id).map(a=>({title:a.title,value:a.value})),
          rows:[['نقاطكم',t.score],['تخمينات صح',t.guessedOk],['رسماتكم اللي انعرفت',t.drawnOk]], all:finalAll(sorted, id) } };
    }
    const mine = !!(G.drawer && !G.drawer.tv && G.drawer.cid===cid);
    const myTurn = cur().id===id, mySolve = G.phase==='draw' && !mine ? solvedBy(id) : null;
    return { game:'rasm', round:G.round, team:{id:t.id,name:t.name,color:t.color,score:t.score}, scores, myTurn, hand:[], canPlay:false, buzz:{open:false},
      item: G.lastWord && G.phase!=='draw' && G.phase!=='pick' ? { kind:'w', id:G.lastWord.id, label:'كلمة الرسم: '+G.lastWord.w } : null,
      rasm:{ phase:G.phase, mine, myTurn, drawer: G.drawer ? (G.drawer.name||cur().name) : null, drawerTeam:cur().name,
        canClaim: G.phase==='claim' && myTurn,
        choices: mine && G.phase==='pick' && G.choices ? G.choices.map(w=>({w:w.w, d:w.d, p:PTS[w.d]})) : null,
        word: mine && G.phase==='draw' ? G.word.w : null,
        hint: G.phase==='draw' ? hintText() : null, letters: G.word ? [...G.word.w].filter(c=>c!==' ').length : 0,
        mirror: !!S.mirror, canRate: G.phase==='reveal' && !mine && !!(B && B.count), myRate: (G.ratings||{})[cid]||0,
        canGuess: G.phase==='draw' && !mine && !mySolve,
        solved: mySolve ? { n:mySolve.n, gp:mySolve.gp, w:G.word.w } : null,
        prog: G.phase==='draw' && G.solved ? { n:G.solved.length, of:guessers().length, list:G.solved.map(s=>({ n:s.n, c:s.c })) } : null,
        reveal: G.phase==='reveal' && G.lastWord ? G.lastWord.w : null,
        timer: G.phase==='draw' && G.deadline ? { ms:Math.max(0,G.deadline-Date.now()), total:G.total*1000 } : null,
        feed: (G.feed||[]).slice(-14).map(f=>({ n:f.name, c:f.color, x:f.close?'':f.text, close:!!f.close, ok:!!f.ok })),
        result: G.phase==='reveal' ? G.result : null, tag: G.word && G.phase!=='pick' ? G.word.tag : null, diff: G.word ? DIFF[G.word.d]+' · '+PTS[G.word.d] : null,
        rating: G.phase==='reveal' ? { avg:rateAvg(), n:Object.keys(G.ratings||{}).length, votes:Object.entries(G.ratings||{}).map(([k,v])=>({ n:((G.rateBy||{})[k]||{}).name||'', c:((G.rateBy||{})[k]||{}).color||'', v })) } : null },
      phase: G.phase==='claim' ? `دور ${cur().name} يرسم` : G.phase==='pick' ? 'الرسام يختار كلمة' : G.phase==='draw' ? (mine ? 'ارسم! الكل يشوف رسمتك على الشاشة' : mySolve ? 'خمّنتها صح — انتظر الباقين' : 'خمّنوا الرسمة!') : '' };
  }

  // ---------- اللوحة ----------
  // اللوحة والأدوات من draw.js (نفسها بالجوال). الشاشة ترسم كل شي، وتعيد إرساله لجوالات المتفرجين لو الخيار مفعّل.
  const DR = window.DahoomDraw;
  let cv=null, B=null, tvDrawOn=false; const tvTool=DR.newTool();
  const relay = m => { if(!S.mirror || !G) return; const n=NET(); if(n) G.teams.forEach(t=>n.send(t.id, { t:'rs', m })); };
  function setupCanvas(){
    cv=$('#rs-canvas');
    if(!cv.dataset.ready){ cv.dataset.ready='1'; B=DR.board(cv);
      DR.attach(cv, B, tvTool, relay, ()=>tvDrawOn);
      DR.toolbar($('#rs-tools'), tvTool, { onUndo:undo, onClear:clearBoard }); }
  }
  function setTvDraw(on){ tvDrawOn=on; const tb=$('#rs-tools'); if(tb) tb.classList.toggle('hidden', !on); if(cv) cv.classList.toggle('drawable', on); }
  function clearBoard(){ if(B){ B.clear(); relay({t:'clear'}); } }
  function undo(){ if(B && B.undo()) relay({t:'undo'}); }
  function addStroke(d){ if(B && B.stroke(d)) relay(d); }
  function addFill(d){ if(B){ B.fill(d); relay({ t:'fill', x:d.x, y:d.y, c:d.c, a:d.a }); } }

  // ---------- تقييم الرسمة (1–5) ----------
  const RATE = ['خرابيش','ماشي حالها','حلوة','فنان','تحفة'];
  function rateAvg(){ const v=Object.values(G.ratings||{}); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; }
  function onRate(cid, v){
    v=Math.round(+v); if(!G || G.phase!=='reveal' || !(v>=1 && v<=5)) return;
    if(G.drawer && G.drawer.cid && G.drawer.cid===cid) return;
    G.ratings[cid]=v; drawRating(); pushAll();
    if(cid==='tv'){ G.rateBy=G.rateBy||{}; G.rateBy.tv={ name:'المضيف', color:'' }; }
  }
  function drawRating(){
    const el=$('#rs-rating'); if(!el) return;
    const a=rateAvg(), n=Object.keys(G.ratings).length;
    el.innerHTML=`<div class="lbl">تقييم الرسمة${n?` — ${n} ${n===1?'صوت':'أصوات'}`:''}</div>
      <div class="rs-rate">${RATE.map((r,i)=>`<button class="rs-rate-b ${a!=null&&Math.round(a)===i+1?'on':''}" data-rv="${i+1}"><b>${i+1}</b><span>${r}</span></button>`).join('')}</div>
      <p class="muted small">${a!=null?`المتوسط <bdi>${a.toFixed(1)}</bdi> من 5 — ${RATE[Math.round(a)-1]}`:'قيّموا من جوالاتكم، أو المضيف يضغط هنا'}</p>`;
    $$('#rs-rating [data-rv]').forEach(b=>b.onclick=()=>onRate('tv', b.dataset.rv));
  }
  function closeRating(){
    const a=rateAvg(); if(a==null || !G.lastWord) return;
    const l=[...G.log.items].reverse().find(x=>x.id===G.lastWord.id); if(l) l.rate=+a.toFixed(2);
    const who=(G.drawer && G.drawer.name) || cur().name;
    (G.stats.rated[who]=G.stats.rated[who]||[]).push(a);
    if(!G.stats.bestArt || a>G.stats.bestArt.a) G.stats.bestArt={ name:who, a, w:G.lastWord.w };
  }

  // ---------- النهاية ----------
  function endMatch(){
    stopTimer(); stopAll(); G.phase='over'; setTvDraw(false);
    const sorted=[...G.teams].sort((a,b)=>b.score-a.score), winner=sorted[0];
    go('results'); play('win'); setTimeout(()=>memeSound('win'),700); confetti(400,6000); reaction('win',4000);
    $('#winner-title').innerHTML=`<span class="who" style="--c:${winner.color}">${esc(winner.name)}</span> فاز بارسم وخمّن`;
    const pod=$('#podium'); pod.innerHTML='';
    const cls=['first','second','third'];
    sorted.slice(0,3).forEach((t,i)=>{ const d=document.createElement('div'); d.className='p '+cls[i]; d.style.setProperty('--c',t.color); d.style.animationDelay=(i*.25)+'s';
      d.innerHTML=`${i===0?ic('crown','crown'):''}<div class="rank">${i+1}</div><div class="pn">${esc(t.name)}</div><div class="muted small">${t.players.map(p=>esc(p.name)).join('، ')}</div><div class="ps">${t.score}</div>`; pod.appendChild(d); });
    if(sorted.length>3){ const rest=document.createElement('div'); rest.className='row center'; rest.style.width='100%'; rest.innerHTML=sorted.slice(3).map((t,i)=>`<span class="pill">${i+4}. ${esc(t.name)} — ${t.score}</span>`).join(''); pod.appendChild(rest); }
    $('#btn-again').onclick=()=>newMatch();
    // الجوائز (لاعبين) + الجدول
    const top = o => { const e=Object.entries(o).sort((a,b)=>b[1]-a[1]); return e.length && (e.length===1 || e[0][1]>e[1][1]) ? e[0] : null; };
    const teamOfName = n => G.teams.find(t=>t.players.some(p=>p.name===n)) || null;
    const aw=[]; const eye=top(G.stats.guesses), art=top(G.stats.drawings), f=G.stats.fast;
    if(eye) aw.push({ title:'عين الصقر', icon:'eye', desc:'أكثر تخمينات صح', who:eye[0], team:teamOfName(eye[0]), value:`${eye[1]} تخمينات` });
    if(art) aw.push({ title:'بيكاسو الجلسة', icon:'pencil', desc:'أكثر رسمات انعرفت', who:art[0], team:teamOfName(art[0]), value:`${art[1]} رسمات` });
    { const ba=G.stats.bestArt; if(ba) aw.push({ title:'أحلى رسمة', icon:'star', desc:`«${ba.w}» بتقييم اللاعبين`, who:ba.name, team:teamOfName(ba.name)||G.teams.find(t=>t.name===ba.name)||null, value:`${ba.a.toFixed(1)} من 5` }); }
    if(f) aw.push({ title:'أسرع تخمين', icon:'stopwatch', desc:`«${f.w}»`, who:f.name, team:teamOfName(f.name), value:`${f.s} ث` });
    // ألقاب الضحك
    { const who = n => teamOfName(n)||G.teams.find(t=>t.name===n)||null;
      const mis=top(G.stats.missed||{}); if(mis && mis[1]>=2) aw.push({ title:'محد فهمه', icon:'help', desc:'أكثر رسمات ما انعرفت', who:mis[0], team:who(mis[0]), value:`${mis[1]} رسمات` });
      const wb=top(G.stats.wrongBy||{}); if(wb && wb[1]>=4) aw.push({ title:'يخبّص', icon:'dice', desc:'أكثر تخمينات غلط', who:wb[0], team:who(wb[0]), value:`${wb[1]} تخمينات غلط` });
      const avgs=Object.entries(G.stats.rated||{}).map(([n,l])=>[n, l.reduce((x,y)=>x+y,0)/l.length]).sort((x,y)=>x[1]-y[1]);
      if(avgs.length>=2 && avgs[0][1]<avgs[1][1] && avgs[0][1]<3) aw.push({ title:'خرابيش الجلسة', icon:'broom', desc:'أقل تقييم لرسماته', who:avgs[0][0], team:who(avgs[0][0]), value:`${avgs[0][1].toFixed(1)} من 5` }); }
    G.awards=aw;
    try{ const DS=window.DahoomStats, order=['خرابيش الجلسة','يخبّص','محد فهمه','أسرع تخمين','عين الصقر','بيكاسو الجلسة','أحلى رسمة'];
      const avOf = n => { const p=G.teams.flatMap(t=>t.players).find(p=>p.name===n); return p ? [D.avatarSrc(p.avatar)] : []; };
      DS.autoShow(()=>({ items:[...aw].sort((x,y)=>order.indexOf(x.title)-order.indexOf(y.title)).map(a=>({ title:a.title, desc:a.desc, icon:a.icon, name:a.who, sub:a.team?a.team.name:'', color:a.team?a.team.color:'', value:a.value, avatars:avOf(a.who) })),
        pool:[...new Set(G.teams.flatMap(t=>t.players.length?t.players.map(p=>p.name):[t.name]))] })); }catch(e){ console.error(e); }
    const el=$('#match-stats');
    el.innerHTML=`<div class="ms"><div class="ms-head"><h2>وش صار بالرسم</h2><span class="muted">${G.log.items.filter(x=>x.r!=='skip').length} رسمات</span></div>
      ${aw.length?`<div class="aw-grid">${aw.map(a=>`<div class="aw" style="--c:${a.team?a.team.color:'var(--brand)'}"><span class="aw-ic">${ic(a.icon)}</span><div class="aw-t">${esc(a.title)}</div><div class="aw-team">${esc(a.who)}${a.team&&a.team.name!==a.who?` · ${esc(a.team.name)}`:''}</div><div class="aw-v">${esc(a.value)}</div><div class="aw-d">${esc(a.desc)}</div></div>`).join('')}</div>`:''}
      <section class="ms-card"><h3>الأرقام</h3><div class="viz-table-wrap"><table class="viz-table"><thead><tr><th>${D.session.mode==='solo'?'اللاعب':'الفريق'}</th><th>النقاط</th><th>تخمينات صح</th><th>رسمات انعرفت</th></tr></thead><tbody>
        ${sorted.map(t=>`<tr><td><span class="vt-team"><i style="--c:${t.color}"></i>${esc(t.name)}</span></td><td class="num"><bdi>${t.score}</bdi></td><td class="num"><bdi>${t.guessedOk}</bdi></td><td class="num"><bdi>${t.drawnOk}</bdi></td></tr>`).join('')}</tbody></table></div></section>
      <section class="ms-card"><h3>كل الكلمات</h3><div class="rs-words">${G.log.items.filter(x=>x.r!=='skip'&&x.r!=='?').map(x=>`<span class="pill ${x.r==='ok'?'':'dim'}">${esc(x.x)}${x.gs&&x.gs.length?` — ${esc(x.gs.join('، '))}`:x.g?` — ${esc(x.g)}`:''}${x.rate?` · <bdi>${x.rate.toFixed(1)}</bdi>/5`:''}</span>`).join('')}</div></section></div>`;
    try{ const L=LOG(); if(L && !G.logged){ G.logged=true;
      L.match({ game:'rasm', rounds:S.rounds, mins:Math.round((Date.now()-G.log.t0)/60000), mode:D.session.mode, opts:{ time:S.drawTime, hints:!!S.hints, mirror:!!S.mirror },
        teams: sorted.map((t,i)=>({ id:t.id, name:t.name, score:t.score, rank:i+1, win:t===winner, players:t.players.map(p=>({ name:p.name, av:p.avatar||'' })), st:{ guessed:t.guessedOk, drawn:t.drawnOk } })),
        items:G.log.items }); } }catch(e){ console.error(e); }
    pushAll();
  }

  function helpModal(){
    modal(`<h3>قوانين ارسم وخمّن</h3><div class="help-list mt">
      <p>بالدور: واحد من الفريق يضغط «أنا برسم» من جواله، تطلع له 3 كلمات (سهلة ${PTS[1]}، متوسطة ${PTS[2]}، صعبة ${PTS[3]}) ويختار وحدة.</p>
      <p>يرسمها بجواله وتطلع على الشاشة مباشرة. ممنوع الكتابة والحروف والأرقام بالرسمة.</p>
      <p>الكل يخمّن — حتى الفرق الثانية — يكتبون من جوالاتهم، أو يقولونها بصوت والمضيف يضغط اسم الفريق.</p>
      <p>أول تخمين صح: فريقه ياخذ من نص لكامل قيمة الكلمة حسب السرعة، وفريق الرسام ياخذ نص قيمتها.</p>
      ${S.hints?'<p>تلميح: يطلع حرف من الكلمة عند نص الوقت، وحرف ثاني بالربع الأخير.</p>':''}
      <p>أدوات الرسم: قلم، قطن، نيون، فلوماستر شفاف، ممحاة، دلو تعبئة، أشكال جاهزة، شفافية، وأي لون تبيه.</p>
      <p>بعد كل رسمة الكل يقيّمها من 1 إلى 5، وأحلى رسمة بالمباراة تاخذ جائزة.</p>
      <p>بدون جوال؟ الرسام يرسم على الشاشة نفسها بالماوس أو اللمس.</p></div><div class="row mt-s"><button class="btn" id="c">تمام</button></div>`,{onMount(m){ m.querySelector('#c').onclick=()=>m.remove(); }});
  }

  // ---------- ربط ----------
  document.addEventListener('DOMContentLoaded',()=>{
    renderSettings();
    $('#btn-to-settings').addEventListener('click',()=>setTimeout(renderSettings,0));
    $('#btn-rasm-start').onclick=()=>{ play('cheer',{volume:.5}); newMatch(); };
    $('#rs-help').onclick=helpModal;
    $('#rs-quit').onclick=async ()=>{ if(await confirmBox('<h3>تنهي المباراة؟</h3>','أنهِ','كمّل','btn-bad')){ stopTimer(); stopAll(); if(G) G.phase='over'; go('home'); } };
  });
  window.DAHOOM_DEBUG_RS = { state:()=>G, settings:()=>S, check, norm, choose, win, reveal, nextTurn, onGuess, addStroke, onRate, board:()=>B };
})();
