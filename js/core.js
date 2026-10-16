/* ===== منصة دحوم v2 — النواة المشتركة =====
   الصوت، التخزين، الشاشات، اللاعبين والفرق، الكونفيتي، الميمز، ورسم البطاقات
*/
window.Dahoom = (function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const rnd = a => a[Math.floor(Math.random()*a.length)];
  const shuffle = a => { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; };
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ic = (name, cls='') => `<i class="ic ${cls}" style="--i:url(../assets/icons/${name}.svg)"></i>`;

  // ---------- التخزين ----------
  const store = {
    get(k, d){ try{ const v=localStorage.getItem('dahoom_'+k); return v==null? d : JSON.parse(v);}catch(e){return d;} },
    set(k, v){ try{ localStorage.setItem('dahoom_'+k, JSON.stringify(v)); }catch(e){} },
    del(k){ try{ localStorage.removeItem('dahoom_'+k); }catch(e){} }
  };

  // ---------- الصوت ----------
  // الاسم العادي من assets/sfx، و'meme:xxx' من assets/sfx/meme، و'game:xxx' من assets/sfx/game
  const audio = { on: store.get('sound', true), vol: store.get('volume', 0.4), cache:{}, loops:{} };
  // أصوات التطبيق: كل اسم قديم يتحول لصوت قيمنق/ميم (تقدر ترجع أي واحد للأصلي بحذفه من هنا)
  const ALIAS = {
    correct:'game:g_ding', wrong:'game:g_feudx', steal:'game:g_mgs', coin:'game:g_mariocoin', bonus:'game:g_oneup',
    win:'game:g_ffwin', applause:'meme:passed', clockloop:'game:g_jeopardy', fx_tension:'game:g_suspense',
  };
  // أصوات القوائم والواجهة: نغمات قصيرة تتولّد بالمتصفح (خفيفة، ثابتة، وكل وحدة لها معنى)
  // كل نغمة: [تردد, بداية ms, مدة ms, نوع الموجة, قوة, تردد النهاية؟]
  const SYN = {
    pop:     [[520,0,60,'sine',.2,760]],                                         // تنقل / ضغطة
    tick:    [[1500,0,28,'triangle',.11]],                                       // عدّاد / اختيار صغير
    unlock:  [[784,0,80,'triangle',.17],[1175,75,130,'triangle',.17]],           // لاعب انضاف
    bling:   [[1319,0,70,'sine',.13],[1760,65,70,'sine',.11],[2349,130,150,'sine',.09]], // تلميح / تم
    jingle:  [[659,0,100,'triangle',.17],[784,95,100,'triangle',.17],[988,190,100,'triangle',.17],[1319,285,300,'triangle',.19]], // دخول المنصة
    cheer:   [[523,0,90,'triangle',.16],[659,85,90,'triangle',.16],[784,170,260,'triangle',.18],[1047,170,260,'sine',.1]],       // بداية المباراة
    levelup: [[880,0,80,'triangle',.15],[1320,80,200,'triangle',.15]],           // لفة جديدة / الخانة انسحبت
    drums:   [[300,0,220,'sine',.12,900]],                                       // بداية السحب
    drumroll:Array.from({length:8},(_,i)=>[900+i*70, i*95, 30,'triangle',.1]),   // ترتيب الفرق
    card:    [[420,0,110,'sine',.11,1100]],                                      // سحب بطاقة
    buzzer:  [[220,0,160,'square',.07],[165,150,240,'square',.07]],              // خلص الوقت
    fail:    [[523,0,120,'triangle',.14],[440,115,120,'triangle',.14],[349,230,260,'triangle',.14]], // فشل
  };
  let AC=null;
  const actx = () => { if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } } if(AC.state==='suspended') AC.resume(); return AC; };
  function synth(name, vol){
    const c=actx(); if(!c) return; const t0=c.currentTime+0.005;
    SYN[name].forEach(([f,st,du,type,g,f2])=>{
      const o=c.createOscillator(), a=c.createGain(), s=t0+st/1000, e=s+du/1000;
      o.type=type; o.frequency.setValueAtTime(f,s); if(f2) o.frequency.exponentialRampToValueAtTime(f2,e);
      a.gain.setValueAtTime(0.0001,s); a.gain.exponentialRampToValueAtTime(Math.max(0.0002,g*vol),s+0.008); a.gain.exponentialRampToValueAtTime(0.0001,e);
      o.connect(a); a.connect(c.destination); o.start(s); o.stop(e+0.03);
    });
  }
  const srcOf = n => n.startsWith('meme:') ? 'assets/sfx/meme/'+n.slice(5)+'.mp3' : n.startsWith('game:') ? 'assets/sfx/game/'+n.slice(5)+'.mp3' : 'assets/sfx/'+n+'.mp3';
  function base(name){ if(!audio.cache[name]){ const a=new Audio(srcOf(name)); a.preload='auto'; audio.cache[name]=a; } return audio.cache[name]; }
  Object.values(ALIAS).forEach(base);
  document.addEventListener('pointerdown', ()=>actx(), {once:true});
  // max: أقصى مدة بالملي ثانية (الميمز الطويلة تنقص)
  function play(name, {volume=1, loop=false, rate=1, max}={}){
    if(!audio.on || !name) return null;
    if(SYN[name] && !loop){ synth(name, Math.min(1.5, volume*audio.vol*2.5)); return null; }
    const key = ALIAS[name] || name;
    const b = base(key);
    const a = loop ? b : b.cloneNode();
    a.volume = Math.min(1, volume * audio.vol); a.loop = loop; a.currentTime = 0;
    try{ a.playbackRate = rate; a.preservesPitch = false; }catch(e){}
    a.play().catch(()=>{});
    if(loop) audio.loops[name]=a;
    else { const cap = max ?? (key.includes(':') ? 4200 : 0); if(cap) setTimeout(()=>fade(a), cap); }
    return a;
  }
  function fade(a){ let v=a.volume; const t=setInterval(()=>{ v-=.08; if(v<=0){ a.pause(); clearInterval(t); } else a.volume=v; },40); }
  function stop(name){ const a=audio.loops[name]; if(a){ a.pause(); a.currentTime=0; delete audio.loops[name]; } }
  function stopAll(){ Object.keys(audio.loops).forEach(stop); }
  function toggleSound(){ audio.on=!audio.on; store.set('sound',audio.on); if(!audio.on) stopAll(); updateSoundBtn(); }
  function setVolume(v){ audio.vol=Math.max(0,Math.min(1,v)); store.set('volume',audio.vol); Object.values(audio.loops).forEach(a=>a.volume=Math.min(1,.35*audio.vol)); }
  function updateSoundBtn(){ $$('.btn-sound').forEach(b=>b.innerHTML = audio.on ? ic('sound')+' الصوت' : ic('mute')+' مكتوم'); $$('.vol-slider').forEach(s=>s.value=Math.round(audio.vol*100)); }
  // صوت ميم للحظة معينة (من data/memes.js)
  function memeSound(kind, opts={}){
    const M=(window.DAHOOM_DATA||{}).memes||{}; const l=M.sounds&&M.sounds[kind];
    if(l&&l.length) return play('meme:'+rnd(l), Object.assign({volume:.8},opts));
  }

  // ---------- الشاشات ----------
  function go(id){
    $$('.screen').forEach(s=>s.classList.remove('active'));
    $('#'+id).classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
    play('pop',{volume:.4});
  }
  document.addEventListener('click', e => { const t = e.target.closest('[data-go]'); if(t) go(t.dataset.go); });

  // ---------- Toast / Modal ----------
  function toast(msg, ms=2400){
    $$('.toast').forEach(t=>t.remove());
    const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t);
    setTimeout(()=>t.remove(), ms);
  }
  function modal(html, {onMount, closable=true}={}){
    const m=document.createElement('div'); m.className='modal';
    m.innerHTML=`<div class="panel">${html}</div>`;
    $('#overlay-root').appendChild(m);
    if(closable) m.addEventListener('click', e=>{ if(e.target===m) m.remove(); });
    if(onMount) onMount(m);
    return m;
  }
  // سؤال نعم/لا يرجع Promise
  function confirmBox(html, yes='نعم', no='لا', yesCls='btn-hype'){
    return new Promise(res=>{ modal(`${html}<div class="row center mt"><button class="btn ${yesCls}" data-y>${yes}</button><button class="btn ghost" data-n>${no}</button></div>`,{closable:false,onMount(m){
      m.querySelector('[data-y]').onclick=()=>{m.remove();res(true);}; m.querySelector('[data-n]').onclick=()=>{m.remove();res(false);}; }}); });
  }

  // ---------- الكونفيتي ----------
  const conf = { c:null, ctx:null, parts:[], raf:null };
  function confetti(n=160, ms=3500, cols=['#FF3D81','#38B6FF','#FFC23A','#2EE59D','#B07CFF','#F4EEFF']){
    if(!conf.c){ conf.c=$('#confetti'); conf.ctx=conf.c.getContext('2d'); }
    const c=conf.c; c.width=innerWidth; c.height=innerHeight;
    for(let i=0;i<n;i++) conf.parts.push({x:Math.random()*c.width,y:-20-Math.random()*200,w:6+Math.random()*8,h:10+Math.random()*12,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.3,vy:2+Math.random()*4,vx:(Math.random()-.5)*2,col:rnd(cols)});
    const end=Date.now()+ms;
    cancelAnimationFrame(conf.raf);
    (function tick(){
      conf.ctx.clearRect(0,0,c.width,c.height);
      conf.parts.forEach(p=>{p.y+=p.vy;p.x+=p.vx;p.r+=p.vr;conf.ctx.save();conf.ctx.translate(p.x,p.y);conf.ctx.rotate(p.r);conf.ctx.fillStyle=p.col;conf.ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);conf.ctx.restore();});
      conf.parts=conf.parts.filter(p=>p.y<c.height+30);
      if(conf.parts.length && Date.now()<end+4000) conf.raf=requestAnimationFrame(tick); else conf.ctx.clearRect(0,0,c.width,c.height);
    })();
  }

  // ---------- الميمز ----------
  const memeSrc = x => /^(https?:|data:|\.|\/|assets\/)/.test(x) ? x : (/\.webp$/i.test(x) ? 'assets/memes/'+x : 'assets/gif/'+(/\.\w+$/.test(x)?x:x+'.gif'));
  const FALLBACK = { correct:['celebrate_0','win_3'], wrong:['wrong_0','facepalm_1'], steal:['steal_1'], think:['think_0'], win:['win_2'] };
  const M = () => (window.DAHOOM_DATA && window.DAHOOM_DATA.memes) || {};
  let reactOn = true;
  // reaction('correct') أو reaction({list, caption})
  function reaction(kind, ms=3200, caption){
    if(!reactOn) return;
    let list, cap=caption;
    if(kind && typeof kind==='object'){ list=kind.list; if(cap==null) cap=kind.caption; }
    else { list=(M().moments||{})[kind]; if(cap==null){ const c=(M().captions||{})[kind]; cap = c&&c.length ? rnd(c) : ''; } }
    if(!list || !list.length) return;
    $$('.reaction').forEach(r=>r.remove());
    const fb = rnd(FALLBACK[typeof kind==='string'?kind:'correct'] || ['card_0']);
    const d=document.createElement('div'); d.className='reaction';
    d.innerHTML=`<img src="${memeSrc(rnd(list))}" alt="" onerror="this.onerror=null;this.src='${memeSrc(fb)}'">${cap?`<div class="cap">${esc(cap)}</div>`:''}`;
    document.body.appendChild(d);
    setTimeout(()=>{ d.classList.add('out'); setTimeout(()=>d.remove(),400); }, ms);
  }
  function flash(kind){ const f=document.createElement('div'); f.className='flash '+kind; document.body.appendChild(f); setTimeout(()=>f.remove(),700); }

  // ---------- رسم البطاقة ----------
  const TIER_AR = { legendary:'حمراء', medium:'ذهبية', normal:'زرقاء', black:'سودا' };
  const TARGET_AR = { next:'اللي بعدك', prev:'اللي قبلك', leader:'المتصدر', choose:'اللي تختاره' };
  // size: 'big' | 'mini' | '' ، anim: صورة متحركة
  function cardHTML(c, {size='', anim=false, flag=''}={}){
    const K = (window.DAHOOM_DATA.cardKinds||{})[c.kind] || {name:'',icon:'cards'};
    const art = c.tweet
      ? `<div class="tweet"><div class="tw-h"><span class="tw-av">${esc(c.tweet.name[0])}</span><span><b>${esc(c.tweet.name)}</b><i>${esc(c.tweet.handle)}</i></span></div><p>${esc(c.tweet.text)}</p><div class="tw-f"><span>${ic('star')} ${esc(c.tweet.likes)}</span><span>${ic('recycle')} ترند</span></div></div>`
      : `<img src="assets/cards/${c.id}${anim?'.webp':'_s.gif'}" alt="" loading="lazy">`;
    // تشريح البطاقة: لوحة الاسم ← الصورة ← سطر النوع ← النص ← المصدر ورقم البطاقة
    return `<div class="tcg ${c.tier} ${size}" data-id="${c.id}">
      ${flag?`<span class="tcg-flag">${esc(flag)}</span>`:''}
      <div class="tcg-in">
        <div class="tcg-name"><span>${esc(c.name)}</span><span class="tcg-gem" title="${TIER_AR[c.tier]}"></span></div>
        <div class="tcg-art">${art}${c.target?`<span class="tcg-tgt">على ${TARGET_AR[c.target]}</span>`:''}</div>
        <div class="tcg-top"><span class="tcg-kind">${ic(K.icon)} ${K.name}</span><span class="tcg-tier">${TIER_AR[c.tier]}</span></div>
        <div class="tcg-desc">${esc(c.desc)}</div>
        <div class="tcg-meme" data-no="${c.id}">${esc(c.src||c.meme||'')}</div>
      </div>
      <div class="tcg-foil"></div>
    </div>`;
  }
  // ميلان خفيف للبطاقة الكبيرة — تحديث وحد كل فريم (rAF) بدل كل حركة ماوس
  let tiltEv=null, tiltRaf=0;
  document.addEventListener('pointermove', e=>{ tiltEv=e; if(!tiltRaf) tiltRaf=requestAnimationFrame(()=>{ tiltRaf=0;
    const t=tiltEv.target.closest && tiltEv.target.closest('.tcg.big'); if(!t) return;
    const r=t.getBoundingClientRect(); const x=(tiltEv.clientX-r.left)/r.width, y=(tiltEv.clientY-r.top)/r.height;
    t.style.transform=`perspective(900px) rotateY(${((x-.5)*12).toFixed(1)}deg) rotateX(${((.5-y)*12).toFixed(1)}deg)`; }); }, {passive:true});
  document.addEventListener('pointerout', e=>{ const t=e.target.closest && e.target.closest('.tcg.big'); if(t && !t.contains(e.relatedTarget)) t.style.transform=''; });

  // ---------- اللاعبين ----------
  const COLORS = ['#FF3D81','#38B6FF','#FFC23A','#2EE59D','#B07CFF','#FF8A3D','#2EC4B6','#FF5A5F','#C6F432','#F72585','#5B8CFF','#FFD166'];
  // صور اللاعبين: وجوه ميمز (assets/avatars) — الأسماء القديمة تتحول لصورة ثابتة حسب الاسم
  const AVATARS = ['doge','cheems','pepe_the_frog','trollface','gigachad','wojak','shrek_face','patrick_star','squidward','kermit','grumpy_cat','smudge_cat','crying_cat','pop_cat',
    'hide_the_pain_harold','mr_bean','nicolas_cage','the_rock_eyebrow','monkey_puppet','capybara','sad_hamster','chill_guy','minion','baby_yoda','side_eye_chloe','spongebob','saudi_smile','saudi_smirk'];
  const avatarSrc = a => { if(!AVATARS.includes(a)){ let h=0; for(const ch of String(a||'')) h=(h*31+ch.charCodeAt(0))>>>0; a=AVATARS[h%AVATARS.length]; } return 'assets/avatars/'+a+'.webp'; };

  const session = {
    players: store.get('players', []),
    teams: store.get('teams', []),
    mode: store.get('mode','teams'),
    game: 'alf',
    save(){ store.set('players',this.players); store.set('teams',this.teams); store.set('mode',this.mode); }
  };
  let pick = { color: COLORS[0], avatar: AVATARS[0] };
  let selectedPlayer = null;
  const TEAM_NAMES = ['السيقما','الأورا','الكوبيوم','الديلولو','النو كاب','الريز'];

  function renderPickers(){
    const cw=$('#p-colors'); cw.innerHTML='';
    COLORS.forEach(c=>{ const b=document.createElement('button'); b.style.background=c; b.className=c===pick.color?'sel':''; b.setAttribute('aria-label','لون '+c); b.onclick=()=>{pick.color=c; renderPickers(); play('tick',{volume:.4});}; cw.appendChild(b); });
    const aw=$('#p-avatars'); aw.innerHTML='';
    AVATARS.forEach(a=>{ const b=document.createElement('button'); b.className=a===pick.avatar?'sel':''; b.style.background=pick.color+'40'; b.innerHTML=`<img src="${avatarSrc(a)}" alt="${a}">`; b.onclick=()=>{pick.avatar=a; renderPickers(); play('pop',{volume:.4});}; aw.appendChild(b); });
  }
  // لاعب ينضم من جواله: يضاف (أو يتحدث) وينحط بفريقه
  function joinPlayer({pid, name, avatar, teamId}){
    name=String(name||'').trim().slice(0,16); if(!name) return null;
    if(!AVATARS.includes(avatar)) avatar=rnd(AVATARS);
    let p=session.players.find(x=>x.id===pid) || session.players.find(x=>x.name===name);
    const team=session.teams.find(t=>t.id===teamId);
    if(!p){ if(session.players.length>=16){ toast('الحد الأقصى 16 لاعب'); return null; }
      p={id:'p'+Date.now()+Math.floor(Math.random()*999), name, color: team?team.color:nextFreeColor(), avatar}; session.players.push(p); toast(`${name} دخل من جواله`); play('unlock',{volume:.7}); }
    else { p.name=name; p.avatar=avatar; }
    if(team && session.mode==='teams'){ session.teams.forEach(t=>t.members=t.members.filter(m=>m!==p.id)); team.members.push(p.id); }
    session.save(); renderPlayers(); renderTeams();
    return p;
  }
  // الفرق اللي يقدر الجوال يختارها (قبل بداية اللعبة)
  const joinable = () => session.mode==='solo' ? session.players.map(p=>({id:p.id,name:p.name,color:p.color})) : session.teams.map(t=>({id:t.id,name:t.name,color:t.color}));
  function nextFreeColor(){ const used=session.players.map(p=>p.color); return COLORS.find(c=>!used.includes(c)) || rnd(COLORS); }
  function addPlayer(){
    const name=$('#p-name').value.trim();
    if(!name){ toast('اكتب اسم اللاعب أول'); $('#p-name').focus(); return; }
    if(session.players.some(p=>p.name===name)){ toast('الاسم موجود، غيّره شوي'); return; }
    if(session.players.length>=16){ toast('الحد الأقصى 16 لاعب'); return; }
    session.players.push({id:'p'+Date.now()+Math.floor(Math.random()*999), name, color:pick.color, avatar:pick.avatar});
    $('#p-name').value=''; pick.color=nextFreeColor(); pick.avatar=rnd(AVATARS);
    play('unlock',{volume:.7}); session.save(); renderPickers(); renderPlayers(); renderTeams();
  }
  function removePlayer(id){
    session.players=session.players.filter(p=>p.id!==id);
    session.teams.forEach(t=>t.members=t.members.filter(m=>m!==id));
    session.save(); renderPlayers(); renderTeams();
  }
  function renderPlayers(){
    const g=$('#players-grid'); g.innerHTML='';
    $('#p-count').textContent=session.players.length;
    $('#players-empty').style.display=session.players.length?'none':'block';
    session.players.forEach(p=>{
      const d=document.createElement('div'); d.className='pchip'; d.style.setProperty('--c',p.color);
      d.innerHTML=`<div class="av"><img src="${avatarSrc(p.avatar)}" alt=""></div><div class="nm">${esc(p.name)}</div><button class="x" aria-label="حذف ${esc(p.name)}">${ic('cancel')}</button>`;
      d.querySelector('.x').onclick=()=>removePlayer(p.id);
      g.appendChild(d);
    });
  }
  function teamOf(pid){ return session.teams.find(t=>t.members.includes(pid)); }
  function newTeam(){ const used=session.teams.map(t=>t.color); const usedN=session.teams.map(t=>t.name);
    return {id:'t'+Date.now()+Math.floor(Math.random()*999), name:'فريق '+(TEAM_NAMES.find(n=>!usedN.includes('فريق '+n))||(session.teams.length+1)), color:COLORS.find(c=>!used.includes(c))||rnd(COLORS), members:[]}; }
  function addTeam(){
    if(session.teams.length>=6){ toast('الحد الأقصى 6 فرق'); return; }
    session.teams.push(newTeam()); play('pop'); session.save(); renderTeams();
  }
  function removeTeam(id){ session.teams=session.teams.filter(t=>t.id!==id); session.save(); renderTeams(); }
  function assign(pid, tid){
    session.teams.forEach(t=>t.members=t.members.filter(m=>m!==pid));
    if(tid){ const t=session.teams.find(t=>t.id===tid); if(t) t.members.push(pid); }
    selectedPlayer=null; session.save(); renderTeams(); play('tick',{volume:.5});
  }
  function autoTeams(){
    while(session.teams.length<2) session.teams.push(newTeam());
    session.teams.forEach(t=>t.members=[]);
    const n = session.game==='khaliya' ? 2 : session.teams.length;
    shuffle(session.players).forEach((p,i)=>session.teams[i%n].members.push(p.id));
    session.save(); renderTeams(); play('drums',{volume:.6});
  }
  function miniChip(p){
    const m=document.createElement('span'); m.className='pmini'+(selectedPlayer===p.id?' sel':''); m.draggable=true; m.dataset.pid=p.id;
    m.style.setProperty('--c',p.color);
    m.innerHTML=`<img src="${avatarSrc(p.avatar)}" alt=""> ${esc(p.name)}`;
    m.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',p.id);});
    m.onclick=()=>{ selectedPlayer = selectedPlayer===p.id ? null : p.id; renderTeams(); if(selectedPlayer) toast('الحين اضغط الفريق اللي تبيه'); };
    return m;
  }
  function dropZone(el, tid){
    el.addEventListener('dragover',e=>{e.preventDefault(); el.style.outline='2px dashed var(--hype)';});
    el.addEventListener('dragleave',()=>el.style.outline='');
    el.addEventListener('drop',e=>{e.preventDefault(); el.style.outline=''; assign(e.dataTransfer.getData('text/plain'), tid);});
    el.addEventListener('click',e=>{ if(selectedPlayer && !e.target.closest('.pmini') && !e.target.closest('input,button')) assign(selectedPlayer, tid); });
  }
  function renderTeams(){
    const kh = session.game==='khaliya';
    if(kh){ session.mode='teams'; while(session.teams.length<2) session.teams.push(newTeam()); }
    $$('input[name=mode]').forEach(r=>r.closest('.seg').style.display = kh ? 'none' : '');
    $('#btn-add-team').style.display = kh ? 'none' : '';
    $('#lobby-mode-note').textContent = kh ? '— خلية الحروف: فريقين بالضبط' : '';
    const solo = session.mode==='solo';
    $('#teams-area').style.display = solo ? 'none' : 'block';
    $$('input[name=mode]').forEach(r=>r.checked = r.value===session.mode);
    if(solo) return;
    const pool=$('#pool'); const fresh=pool.cloneNode(false); pool.replaceWith(fresh);
    session.players.filter(p=>!teamOf(p.id)).forEach(p=>fresh.appendChild(miniChip(p)));
    if(!fresh.children.length) fresh.innerHTML='<span class="muted small">الكل موزّع</span>';
    dropZone(fresh, null);
    const g=$('#teams-grid'); g.innerHTML='';
    (kh ? session.teams.slice(0,2) : session.teams).forEach(t=>{
      const d=document.createElement('div'); d.className='team-box'; d.style.setProperty('--c',t.color);
      d.innerHTML=`<div class="head"><input type="text" value="${esc(t.name)}" maxlength="18" aria-label="اسم الفريق"><input type="color" value="${t.color}" aria-label="لون الفريق" style="width:44px;height:38px;padding:2px;border-radius:10px"><button class="btn ghost small" aria-label="حذف الفريق">${ic('trash')}</button></div><div class="members"></div>`;
      const [nameIn,colIn]=d.querySelectorAll('input');
      nameIn.onchange=e=>{t.name=e.target.value.trim()||t.name; session.save();};
      colIn.oninput=e=>{t.color=e.target.value; d.style.setProperty('--c',t.color); session.save();};
      d.querySelector('button').onclick=()=>removeTeam(t.id);
      if(kh) d.querySelector('button').style.display='none';
      const mem=d.querySelector('.members');
      t.members.map(id=>session.players.find(p=>p.id===id)).filter(Boolean).forEach(p=>mem.appendChild(miniChip(p)));
      if(!t.members.length) mem.innerHTML='<span class="muted small">اسحب لاعبين هنا</span>';
      dropZone(d, t.id);
      g.appendChild(d);
    });
    if(window.DahoomNet && window.DahoomNet.refresh) window.DahoomNet.refresh();
  }
  function validateLobby(){
    if(session.mode==='solo' && session.game!=='khaliya'){
      if(session.players.length<2){ toast('نحتاج لاعبين اثنين على الأقل'); return false; }
      return true;
    }
    const teams=session.teams.filter(t=>t.members.length);
    if(teams.length<2){ toast('نحتاج فريقين على الأقل فيهم لاعبين'); return false; }
    if(session.game==='khaliya' && teams.length!==2){ toast('خلية الحروف فريقين بالضبط'); return false; }
    const loose=session.players.filter(p=>!teamOf(p.id));
    if(loose.length){ toast('فيه لاعبين بدون فريق: '+loose.map(p=>p.name).join('، ')); return false; }
    return true;
  }
  function competitors(){
    if(session.mode==='solo' && session.game!=='khaliya') return session.players.map(p=>({id:p.id,name:p.name,color:p.color,avatar:p.avatar,players:[p]}));
    return session.teams.filter(t=>t.members.length).map(t=>({id:t.id,name:t.name,color:t.color,players:t.members.map(id=>session.players.find(p=>p.id===id)).filter(Boolean)}));
  }

  // ---------- بطاقات الزينة (البداية والرئيسية) ----------
  function decorate(){
    const C=window.DAHOOM_DATA.cards; if(!C) return;
    const pickIds=['R4','G6','N11','R1','K1','G9','N3','R2'];
    const sc=$('#splash-cards'); if(sc){
      const spots=[[6,12,-14],[80,8,12],[3,62,10],[84,60,-10],[18,82,-6],[70,84,8]];
      sc.innerHTML=spots.map(([x,y,r],i)=>{ const c=C.find(k=>k.id===pickIds[i]); return `<div style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%) rotate(${r}deg);animation:fadeUp .8s ${.3+i*.12}s both">${cardHTML(c,{size:'mini'})}</div>`; }).join('');
      $$('.tcg',sc).forEach(t=>t.style.width='150px');
    }
    const fan=$('#home-fan'); if(fan){
      fan.innerHTML=['G6','R4','N11'].map(id=>cardHTML(C.find(k=>k.id===id),{size:'mini'})).join('');
      const t=$$('.tcg',fan); t[0].style.transform='rotate(-14deg)'; t[2].style.transform='rotate(14deg)'; t[1].style.zIndex=2;
    }
  }

  // ---------- الوضع النهاري / الليلي ----------
  // السكربت الصغير في <head> يطبّق الوضع قبل أول رسم؛ هنا الزر والحفظ ومتابعة النظام لو ما اختار المستخدم.
  const THEME_KEY='dahoom_theme';
  const savedTheme = () => { try{ const v=localStorage.getItem(THEME_KEY); return v==='day'||v==='night' ? v : null; }catch(e){ return null; } };
  const getTheme = () => document.documentElement.getAttribute('data-theme')==='day' ? 'day' : 'night';
  function applyTheme(t, save){
    document.documentElement.setAttribute('data-theme', t);
    if(save){ try{ localStorage.setItem(THEME_KEY, t); }catch(e){} }
    const m=document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute('content', t==='day' ? '#ECEAF1' : '#0D0B14');
    updateThemeBtns();
  }
  function updateThemeBtns(){
    const day=getTheme()==='day';
    $$('.btn-theme').forEach(b=>{ b.innerHTML = day ? ic('moon')+' ليلي' : ic('sun')+' نهاري'; b.setAttribute('aria-label', day?'الوضع الليلي':'الوضع النهاري'); b.title=b.getAttribute('aria-label'); });
  }
  function toggleTheme(){ applyTheme(getTheme()==='day'?'night':'day', true); play('tick',{volume:.4}); }
  document.addEventListener('click', e=>{ if(e.target.closest('.btn-theme')) toggleTheme(); });
  try{ matchMedia('(prefers-color-scheme: light)').addEventListener('change', e=>{ if(!savedTheme()) applyTheme(e.matches?'day':'night', false); }); }catch(e){}

  // ---------- تهيئة ----------
  function init(){
    renderPickers(); renderPlayers(); renderTeams(); updateSoundBtn(); updateThemeBtns(); decorate();
    $('#btn-enter').onclick=()=>{ play('jingle',{volume:.9}); go('home'); };
    $$('.btn-sound').forEach(b=>b.onclick=toggleSound);
    $$('.vol-slider').forEach(sl=>{ sl.oninput=()=>setVolume(sl.value/100); sl.onchange=()=>play('pop'); });
    const openGame=g=>{ session.game=g; renderTeams(); go('lobby'); };
    $('#card-alf').onclick=()=>openGame('alf');
    $('#card-khaliya').onclick=()=>openGame('khaliya');
    $$('.game-tile').forEach(t=>t.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target===t) t.click(); }));
    $('#btn-add-player').onclick=addPlayer;
    $('#p-name').addEventListener('keydown',e=>{ if(e.key==='Enter') addPlayer(); });
    $('#btn-add-team').onclick=addTeam;
    $('#btn-auto-teams').onclick=autoTeams;
    $$('input[name=mode]').forEach(r=>r.onchange=()=>{ session.mode=r.value; session.save(); renderTeams(); });
    $('#btn-to-settings').onclick=()=>{ if(validateLobby()) go(session.game==='khaliya' ? 'khaliya-settings' : 'settings'); };
    $('#btn-reset-used').onclick=async ()=>{
      if(await confirmBox('<h3>تصفير المحتوى المستخدم؟</h3><p class="muted">يرجع كل الأسئلة والعبارات والتحديات اللي انلعبت قبل.</p>','صفّر','إلغاء')){
        store.del('used'); store.del('used_letters'); toast('رجع كل المحتوى جديد'); play('bling'); }
    };
  }
  document.addEventListener('DOMContentLoaded', init);

  return { joinPlayer, joinable, AVATARS, $, $$, rnd, shuffle, sleep, esc, ic, store, play, stop, stopAll, memeSound, go, toast, modal, confirmBox, confetti, reaction, flash,
    session, competitors, avatarSrc, COLORS, setVolume, toggleTheme, applyTheme, cardHTML, TIER_AR, TARGET_AR,
    setReactions(v){ reactOn=!!v; } };
})();
