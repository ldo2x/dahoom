/* ===== ألف نقطة v2 — محرك اللعبة (شاشة واحدة) =====
   المضيف يحسم كل شي، المؤقتات للتنبيه.
   البطاقات: تنلعب بداية الدور (وحدة كل دور)، وبطاقات رد الفعل تنلعب برا الدور لحظة الهجوم.
*/
(function(){
  const D = window.Dahoom, DATA = window.DAHOOM_DATA;
  const { $, $$, rnd, shuffle, sleep, esc, ic, store, play, stop, stopAll, memeSound, go, toast, modal, confirmBox, confetti, reaction, flash, cardHTML } = D;

  // ---------- الإعدادات ----------
  const DEFAULTS = {
    target:1000, answerTime:10, stealTime:5, charadeTime:60, stealEnabled:true, noRepeat:true,
    pts1:50, pts2:100, pts3:200, cardsEnabled:true, noCardRounds:2, handMax:3,
    wLegendary:8, wMedium:26, wNormal:50, wBlack:16,
    cardFxEnabled:true, reactionsEnabled:true, fuseBlack:true, comebackEnabled:true,
    climaxEnabled:true, climaxThreshold:750, finalStretchEnabled:true, finalStretchThreshold:900,
    tagsQ:Object.fromEntries(DATA.questionTags.map(t=>[t,true])),
    tagsC:Object.fromEntries(DATA.charadeTags.map(t=>[t,true])),
    tagsT:Object.fromEntries(DATA.challengeTags.map(t=>[t,true])),
  };
  let S = Object.assign({}, DEFAULTS, store.get('settings3', {}));
  ['tagsQ','tagsC','tagsT'].forEach(k=> S[k]=Object.assign({}, DEFAULTS[k], S[k]||{}));
  const saveS = () => store.set('settings3', S);

  function renderSettings(){
    $$('#settings-form [data-s]').forEach(el=>{
      const k=el.dataset.s;
      if(el.type==='checkbox') el.checked=!!S[k]; else el.value=S[k];
      el.onchange=()=>{ S[k]= el.type==='checkbox'? el.checked : Number(el.value); saveS(); };
    });
    const mk=(wrap, tags, key)=>{
      const w=$(wrap); w.innerHTML='';
      tags.forEach(t=>{ const l=document.createElement('label'); l.className=S[key][t]?'':'off'; l.innerHTML=`<input type="checkbox" ${S[key][t]?'checked':''}>${esc(t)}`;
        l.querySelector('input').onchange=e=>{ S[key][t]=e.target.checked; l.className=e.target.checked?'':'off'; saveS(); play('tick',{volume:.4}); };
        w.appendChild(l); });
    };
    mk('#tags-q', DATA.questionTags, 'tagsQ'); mk('#tags-c', DATA.charadeTags, 'tagsC'); mk('#tags-t', DATA.challengeTags, 'tagsT');
  }
  const pts = d => S['pts'+d];
  const DIFF = {1:'سهل',2:'متوسط',3:'صعب'};
  const SECTIONS = { q:{name:'أسئلة عامة',icon:'brain'}, c:{name:'بدون كلام',icon:'masks'}, t:{name:'تحديات',icon:'flame'} };
  const r25 = n => Math.round(n/25)*25;
  const NET = () => window.DahoomNet;
  const phoneOf = t => !!(t && NET() && NET().hasPhone(t.id));
  const pushAll = () => { const n=NET(); if(n) n.pushAll(); };
  const strip = x => String(x||'').replace(/<[^>]+>/g,'');
  // قرار موحّد: يروح لجوال الفريق لو متصل (والشاشة تنتظر مع زر احتياطي)، وإلا يطلع على الشاشة
  // options: [{v, label, card, color, cls, flag}] — يرجع v أو null لو "تراجع"
  function decide(team, spec){
    return new Promise(res=>{
      let done=false, rid=null, m=null;
      const finish=v=>{ if(done) return; done=true; if(m) m.remove(); if(rid) NET().cancel(rid); pushAll(); res(v); };
      const tvHTML=()=>`<div class="eyebrow">${esc(team.name)}</div><h3>${spec.title}</h3>${spec.text?`<p class="muted">${spec.text}</p>`:''}
        <div class="${spec.options.some(o=>o.card)?'choice-row':'row center'} mt-s">${spec.options.map((o,i)=>o.card
          ? `<div data-o="${i}">${cardHTML(o.card,{size:spec.big?'':'mini',anim:!!spec.big,flag:o.flag||''})}</div>`
          : `<button class="btn ${o.color?'team big':(o.cls||'btn-hype')}" ${o.color?`style="--c:${o.color}"`:''} data-o="${i}">${esc(o.label)}</button>`).join('')}</div>
        ${spec.cancel?`<div class="row center mt-s"><button class="btn ghost" data-o="-1">${esc(spec.cancel)}</button></div>`:''}`;
      const bind=()=>$$('[data-o]',m).forEach(b=>b.onclick=()=>{ const i=+b.dataset.o; finish(i<0?null:spec.options[i].v); });
      if(phoneOf(team)){
        rid=NET().ask(team.id, { title:strip(spec.title), text:strip(spec.text), cancel:spec.cancel||null, big:!!spec.big,
          options:spec.options.map(o=>({label:o.label||'', card:o.card?o.card.id:null, color:o.color||null, cls:o.cls||'', flag:o.flag||''})) },
          i=>finish(i==null||i<0?null:spec.options[i].v));
        m=modal(`<div class="eyebrow">${ic('phone')} بانتظار الجوال</div><h3><span class="who" style="--c:${team.color}">${esc(team.name)}</span> يقررون من جوالهم…</h3><p class="muted">${strip(spec.title)}</p><div class="row center mt-s"><button class="btn ghost" data-tv>اختيار من الشاشة</button></div>`,{closable:false,onMount(mm){
          mm.querySelector('[data-tv]').onclick=()=>{ NET().cancel(rid); rid=null; mm.querySelector('.panel').innerHTML=tvHTML(); bind(); }; }});
      } else { m=modal(tvHTML(),{closable:false}); bind(); }
    });
  }

  // ---------- البز من الجوالات ----------
  function openBuzz(ids, onFirst, {retry=false}={}){ G.buzz={open:true, eligible:ids, tried:[], first:null, onFirst, retry}; pushAll(); }
  function closeBuzz(){ if(G && G.buzz) G.buzz.open=false; }
  function onBuzz(id){
    const b=G && G.buzz; if(!b || !b.open || b.first || !b.eligible.includes(id) || b.tried.includes(id)) return;
    b.first=id; const t=G.teams.find(x=>x.id===id);
    play('game:g_mgs',{volume:.9}); flash('steal'); pushAll(); b.onFirst(t);
  }
  function buzzBox(t, onRight){
    const box=$('#buzzbox'); if(!box) return;
    box.innerHTML=`<div class="buzzbox" style="--c:${t.color}"><span class="bz-t">${ic('whistle')} ${esc(t.name)} بزّ أول!</span><button class="btn btn-mint" data-bz="1">${ic('check')} صح</button><button class="btn btn-bad" data-bz="0">${ic('cancel')} غلط</button></div>`;
    box.querySelector('[data-bz="1"]').onclick=()=>{ box.innerHTML=''; onRight(t); };
    box.querySelector('[data-bz="0"]').onclick=()=>{ box.innerHTML=''; const b=G.buzz; if(!b.retry) b.tried.push(b.first); b.first=null; play('wrong',{volume:.6}); pushAll(); };
  }

  // ---------- حالة الجوال ----------
  function phoneState(id){
    const t=G && G.teams.find(x=>x.id===id);
    if(!t) return { game:'alf', waiting:true };
    const mine = cur()===t, can = !!(G.canPlayNow && mine && canPlayCard(t));
    const b=G.buzz && G.buzz.open ? G.buzz : null;
    const first = b && b.first ? G.teams.find(x=>x.id===b.first) : null;
    return { game:'alf', round:G.round, target:S.target,
      team:{id:t.id,name:t.name,color:t.color,score:t.score},
      scores:G.teams.map(x=>({id:x.id,name:x.name,color:x.color,score:x.score,hand:x.hand.length,turn:x===cur()})),
      hand:t.hand.map(c=>c.id), canPlay:can, myTurn:mine,
      fuse: can && S.fuseBlack && t.hand.filter(c=>c.tier==='black').length>=2,
      fx: fxList(t).map(([n,bad])=>({n,bad})),
      buzz: b ? { open:true, can: b.eligible.includes(id) && !b.tried.includes(id) && !b.first, first: first?first.name:null, mine: b.first===id } : { open:false },
      phase: strip(($('#stage .big')||{}).innerText||'').slice(0,90) };
  }
  async function onPhonePlay(id, idx){
    const t=cur(); if(!G || !G.canPlayNow || !t || t.id!==id || !canPlayCard(t) || !t.hand[idx]) return;
    G.canPlayNow=false; pushAll();
    await playCard(t, idx);
    if(cur()===t && !t.playedCard){ G.canPlayNow=true; pushAll(); }
  }
  function onPhoneFuse(id){ const t=cur(); if(G && G.canPlayNow && t && t.id===id && canPlayCard(t)) fuseBlack(t); }
  function registerNet(){ const n=NET(); if(n) n.use({ teams:()=>G?G.teams:D.competitors(), state:phoneState, buzz:onBuzz, play:onPhonePlay, fuse:onPhoneFuse,
    onPhones:()=>{ if(G && $('#game').classList.contains('active')){ renderBoard(); renderHand(cur(), !!(G.canPlayNow && canPlayCard(cur()))); } } }); }

  // بطاقة انلعبت: تنعرض للكل على الشاشة ثواني
  function showPlayed(c, t){
    $$('.played-card').forEach(x=>x.remove());
    const d=document.createElement('div'); d.className='played-card';
    d.innerHTML=`<div class="pc-by" style="--c:${t.color}">${esc(t.name)} لعب</div>${cardHTML(c,{size:'big',anim:true})}`;
    document.body.appendChild(d); setTimeout(()=>{ d.classList.add('out'); setTimeout(()=>d.remove(),400); }, 2600);
  }

  // ---------- الحالة ----------
  let G = null, timerH = null, timerLeft = 0, timerTotal = 1;
  const used = { load(){ const u=store.get('used',{q:[],c:[],t:[]}); return {q:new Set(u.q),c:new Set(u.c),t:new Set(u.t)}; }, save(u){ store.set('used',{q:[...u.q],c:[...u.c],t:[...u.t]}); } };

  function newGame(){
    G = {
      teams: D.competitors().map(c=>({...c, score:0, hand:[], fx:{}, drew:false, lastGain:0, turnStart:0})),
      round:1, order:[], turn:0, used: used.load(), finalRound:false
    };
    G.order = shuffle(G.teams.map((_,i)=>i));
    $('#target-label').textContent='الهدف '+S.target;
    const fx=window.DahoomFX; if(fx) fx.setEnabled(S.cardFxEnabled!==false);
    D.setReactions(S.cardFxEnabled!==false);
    registerNet();
    go('game'); introDraw();
  }
  const cur = () => G.teams[G.order[G.turn]];
  const others = t => G.teams.filter(x=>x!==t);
  const stealPts = p => Math.max(50, Math.ceil((p/2)/50)*50);
  const inFinalStretch = () => S.finalStretchEnabled && G.teams.some(x=>x.score>=S.finalStretchThreshold);
  const inClimax = t => S.climaxEnabled && t.score>=S.climaxThreshold;
  const leader = () => [...G.teams].sort((a,b)=>b.score-a.score)[0];

  // مفاتيح الطاقات (تنمسح بفاكت تشيك) والضربات (تنمسح بتشل قاي)
  const BUFFS = { x2next:'خلك ذيب ×2', jackpot:'يا طخه يا كسر مخه', extraTurn:'طقها والحقها', reroll:'اصرمني', spoiler:'وش السالفة', immune:'محد قدّك', streak:'مولّعة',
    nocap:'من جد', copium:'بسيطة', speedrun:'تفحيط', choose:'على كيفي', lock:'خلها بيننا', rizz:'فنّان', fullsteal:'ببلاش', wasta:'الواسطة', hayat:'هياط', sawalif:'سواليف', yasalam:'يا سلام' };
  const DEBUFFS = { harder:'شد حيلك', lag:'النت فاصل', ratioTo:'نص نص', noSteal:'ممنوع يسرق', noCard:'ممنوع بطاقات', npc:'قم تحرك', skipDraw:'رح نام', evilEye:'عين وصابتك', coal:'الجمرة بيده' };

  // ---------- العرض ----------
  function renderBoard(bumpId){
    const sb=$('#scoreboard'); sb.innerHTML='';
    const top=Math.max(S.target, ...G.teams.map(t=>t.score));
    G.teams.forEach(t=>{
      const d=document.createElement('div'); d.className='tchip'+(t===cur()?' turn':'')+(t.id===bumpId?' bump':'')+(t.score<0?' debt':'');
      d.style.setProperty('--c',t.color);
      const sw = t.players.length===1 ? `<span class="sw"><img src="${D.avatarSrc(t.players[0].avatar)}" alt=""></span>` : `<span class="sw"></span>`;
      const nb=Object.keys(BUFFS).filter(k=>t.fx[k]!=null).length, nd=Object.keys(DEBUFFS).filter(k=>t.fx[k]!=null).length;
      d.innerHTML=`${sw}<span><div class="nm">${esc(t.name)}${phoneOf(t)?ic('phone','tphone'):''}</div><div class="sub">${S.cardsEnabled?`${ic('cards')} ${t.hand.length}`:''}<span class="fxdots">${'<i></i>'.repeat(nb)}${'<i class="bad"></i>'.repeat(nd)}</span></div></span><span class="sc">${t.score}</span><span class="bar"><i style="width:${Math.max(0,Math.min(100,t.score/top*100))}%"></i></span>`;
      d.title=fxList(t).map(x=>x[0]).join('، ');
      sb.appendChild(d);
    });
    $('#round-label').textContent='اللفة '+G.round;
    pushAll();
  }
  function stage(html){ if(G){ G.canPlayNow=false; closeBuzz(); } const s=$('#stage'); s.innerHTML=html; pushAll(); return s; }
  function addScore(team, n, {silent, allowNegative}={}){
    team.score = allowNegative ? team.score + n : Math.max(team.score<0?team.score:0, team.score + n);
    renderBoard(team.id);
    if(!silent && n>0) play('coin',{volume:.8});
  }
  function fxList(t){
    const out=[];
    Object.entries(BUFFS).forEach(([k,v])=>{ if(t.fx[k]!=null) out.push([v+(k==='reroll'&&t.fx.reroll>1?' ×'+t.fx.reroll:''),false]); });
    Object.entries(DEBUFFS).forEach(([k,v])=>{ if(t.fx[k]!=null) out.push([v,true]); });
    return out;
  }
  const fxTags = t => { const l=fxList(t); return l.length?`<div class="fx-tags">${l.map(([n,b])=>`<span class="fx-tag ${b?'bad':''}">${esc(n)}</span>`).join('')}</div>`:''; };
  const lowerThird = (t, label='الدور') => `<div class="lower-third" style="--c:${t.color}"><span class="lt-k">${label}</span><span class="lt-v">${esc(t.name)}</span></div>`;

  // اليد: playable = يقدر يلعب الحين
  function renderHand(team, playable){
    const h=$('#hand-panel'), lab=$('#hand-label'); h.innerHTML=''; lab.innerHTML='';
    if(!S.cardsEnabled || !team) return;
    pushAll();
    if(phoneOf(team)){ h.classList.remove('locked'); lab.innerHTML=`<span class="hand-phone">${ic('phone')} يد ${esc(team.name)} سرّية على الجوال — ${team.hand.length} بطاقات${playable?' · العبوا من الجوال':''}</span>`; return; }
    h.classList.toggle('locked', !playable);
    team.hand.forEach((c,i)=>{
      const w=document.createElement('div'); w.innerHTML=cardHTML(c,{size:'mini',flag:c.kind==='reaction'?'رد فعل':''}); const el=w.firstElementChild;
      el.onclick=()=>previewCard(team,i,playable);
      h.appendChild(el);
    });
    const blacks=team.hand.filter(c=>c.tier==='black').length;
    let txt = !team.hand.length ? `يد ${esc(team.name)} فاضية` :
      playable ? `يد ${esc(team.name)} — اضغط بطاقة عشان تلعبها (وحدة بس هالدور)` :
      team.fx.noCard ? 'شادو بان: ممنوع تلعب بطاقة هالدور' : team.playedCard ? 'لعبت بطاقتك هالدور' : 'البطاقات تنلعب بداية الدور';
    lab.innerHTML=`<span>${txt}</span>${playable&&S.fuseBlack&&blacks>=2?`<button class="btn small" id="btn-fuse">${ic('recycle')} ادمج سودتين = زرقا</button>`:''}`;
    const f=$('#btn-fuse'); if(f) f.onclick=()=>fuseBlack(team);
  }
  function previewCard(team, idx, playable){
    const c=team.hand[idx];
    const canPlay = playable && c.kind!=='reaction' && c.fx!=='none';
    const why = c.kind==='reaction' ? 'هذي رد فعل: تطلع لحالها لما أحد يهاجمك' : c.fx==='none' ? 'سودا… ما تنلعب. ادمجها أو ارمها بعرض تجاري' : '';
    const m=modal(`<div class="co-wrap">${cardHTML(c,{size:'big',anim:true})}
      ${why?`<p class="muted mt-s">${why}</p>`:''}
      <div class="row center mt-s">${canPlay?`<button class="btn btn-hype big" data-play>العبها</button>`:''}<button class="btn ghost" data-x>${canPlay?'تراجع':'إغلاق'}</button></div></div>`,{onMount(m){
        m.querySelector('.panel').style.cssText='background:transparent;border:0;box-shadow:none;max-width:420px';
        const fx=window.DahoomFX; if(fx) fx.aura(m.querySelector('.tcg'),c.tier);
        m.querySelector('[data-x]').onclick=()=>m.remove();
        const p=m.querySelector('[data-play]'); if(p) p.onclick=()=>{ m.remove(); playCard(team,idx); };
      }});
  }

  // ---------- المؤقت ----------
  function timerHTML(sec, cls=''){ return `<div class="timer ${cls}" id="timer"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="0"/></svg><div class="num">${sec}</div></div>`; }
  function startTimer(sec, onEnd){
    clearTimer();
    const el=$('#timer'); if(!el) return; const num=el.querySelector('.num'), fg=el.querySelector('.fg');
    timerLeft=sec; timerTotal=sec;
    play('clockloop',{volume:.3,loop:true});
    const step=()=>{
      num.textContent=timerLeft; fg.style.strokeDashoffset = 326.7*(1-timerLeft/timerTotal);
      el.classList.toggle('warn', timerLeft<=Math.ceil(timerTotal/2) && timerLeft>3); el.classList.toggle('danger', timerLeft<=3 && timerLeft>0);
      if(timerLeft<=3 && timerLeft>0) play('tick',{volume:.9});
      if(timerLeft<=0){ clearTimer(); play('buzzer',{volume:.7}); el.classList.add('done'); num.textContent='0'; const b=$('#timeup'); if(b) b.classList.remove('hidden'); onEnd&&onEnd(); return; }
      timerLeft--; timerH=setTimeout(step,1000);
    };
    step();
  }
  function clearTimer(){ clearTimeout(timerH); timerH=null; stop('clockloop'); }
  function restartTimer(sec, onEnd){ const el=$('#timer'); if(!el) return; el.classList.remove('done'); const b=$('#timeup'); if(b) b.classList.add('hidden'); startTimer(sec,onEnd); }
  const timeupHTML = `<div class="banner hidden" id="timeup">خلص الوقت — المضيف يحكم</div>`;
  const fracLeft = () => timerTotal ? (timerLeft+1)/timerTotal : 0;

  // ---------- المحتوى ----------
  function pickContent(kind, diff, tagsKey){
    const list = kind==='q'?DATA.questions: kind==='c'?DATA.charades: DATA.challenges;
    const solo = cur().players.length===1;
    const ok = x => x.d===diff && !(solo && x.tag==='تحديات جماعية');
    let pool = list.filter(x=>ok(x) && S[tagsKey][x.tag]!==false);
    if(!pool.length) pool = list.filter(ok);
    if(!pool.length) pool = list.filter(x=>x.d===diff);
    let fresh = S.noRepeat ? pool.filter(x=>!G.used[kind].has(x.id)) : pool;
    if(!fresh.length){ toast('خلص المحتوى الجديد لهالمستوى، بنعيد من الأول'); pool.forEach(x=>G.used[kind].delete(x.id)); fresh=pool; }
    const item=rnd(fresh); G.used[kind].add(item.id); used.save(G.used);
    return item;
  }
  function countFresh(kind, diff, tagsKey){
    const list = kind==='q'?DATA.questions: kind==='c'?DATA.charades: DATA.challenges;
    const solo = cur().players.length===1;
    return list.filter(x=>x.d===diff && S[tagsKey][x.tag]!==false && !(solo && x.tag==='تحديات جماعية') && !(S.noRepeat&&G.used[kind].has(x.id))).length;
  }
  function splitAnswer(text){ const m=text.match(/^(.*?)\s*\(الجواب:\s*(.*?)\)\s*$/s); return m? {t:m[1], a:m[2]} : {t:text, a:null}; }

  // ---------- حساب النجاح والفشل (كل طاقات "دورك الجاي" تنصرف هنا) ----------
  function resolveSuccess(t, base, {hard=false, section}={}){
    const f=t.fx; let gain=base; const notes=[];
    if(f.x2next){ gain*=2; delete f.x2next; notes.push('خلك ذيب ×2'); }
    if(f.jackpot){ gain*=2; delete f.jackpot; notes.push('يا طخه ضربت'); reaction('jackpotWin',3000); memeSound('correct'); }
    if(f.nocap){ const b=hard?50:25; gain+=b; delete f.nocap; notes.push('من جد +'+b); }
    if(f.speedrun){ if(section==='q' && fracLeft()>=.5){ const b=r25(base*.5)||25; gain+=b; notes.push('تفحيط +'+b); } delete f.speedrun; }
    if(f.streak){ gain+=20; notes.push('مولّعة +20'); }
    if(f.flatBonus){ gain+=f.flatBonus; notes.push((f.hayatFail?'هياط':'واسطة')+' +'+f.flatBonus); delete f.flatBonus; }
    delete f.hayatFail; delete f.copium;
    announce(t, true);
    return payout(t, gain, notes);
  }
  function resolveFail(t, base){
    const f=t.fx; const notes=[];
    delete f.x2next; delete f.nocap; delete f.speedrun; delete f.flatBonus;
    if(f.jackpot){ delete f.jackpot; addScore(t,-base,{silent:true,allowNegative:true}); notes.push(`يا طخه: كسر مخه −${base}`); reaction('jackpotLose',2800); }
    if(f.hayatFail){ delete f.hayatFail; addScore(t,-25,{silent:true}); notes.push('هياط −25'); }
    if(f.streak){ delete f.streak; notes.push('طفت المولّعة'); }
    if(f.copium){ delete f.copium; addScore(t,40); notes.push('بسيطة +40'); }
    announce(t, false);
    return notes;
  }
  // مذيع السلسلة: نجاحين ورا بعض Double Kill … لين Godlike
  const ANN = {2:'g_doublekill',3:'g_triplekill',4:'g_ultrakill',5:'g_monsterkill'};
  function announce(t, ok){
    if(!ok){ t.combo=0; return; }
    t.combo=(t.combo||0)+1;
    const s = t.combo>=6 ? 'g_godlike' : ANN[t.combo];
    if(s){ setTimeout(()=>play('game:'+s,{volume:1}),500); toast(`${t.name}: ${t.combo} نجاحات ورا بعض`); }
  }
  // يطبق الريشيو ويضيف النقاط — يرجع النص
  function payout(t, gain, notes=[]){
    if(t.fx.evilEye && gain>0){ delete t.fx.evilEye; const lost=r25(gain/2)||25; gain-=lost; notes.push(`عين وصابتك −${lost}`); play('meme:sa_yasatr',{volume:.6}); }
    if(G.pot>0 && gain>0){ notes.push(`أخذ القطة +${G.pot}`); gain+=G.pot; G.pot=0; play('game:g_mariocoin'); }
    if(t.fx.ratioTo && gain>0){
      const to=G.teams.find(x=>x.id===t.fx.ratioTo); delete t.fx.ratioTo;
      if(to && to!==t){ const cut=Math.min(100, r25(gain/2)||25); gain-=cut; addScore(to,cut,{silent:true}); notes.push(`ريشيو: ${esc(to.name)} أخذ ${cut}`); }
    }
    addScore(t,gain);
    if(gain>0) G.teams.forEach(y=>{ if(y!==t && y.fx.yasalam!=null){ addScore(y,15,{silent:true}); notes.push(`يا سلام: ${esc(y.name)} +15`); } });
    return { net:gain, note: notes.length?` <span class="muted">(${notes.join(' · ')})</span>`:'' };
  }

  // ---------- بداية اللعبة والأدوار ----------
  async function introDraw(){
    renderBoard(); renderHand(null);
    stage(`<div class="eyebrow">قبل ما نبدأ</div><div class="big">مين يبدأ؟</div><p class="muted">نسحب ترتيب أول لفة… بعدها الترتيب حسب النقاط</p><div class="roller" id="order-roll"></div>`);
    play('drumroll',{volume:.7});
    const roll=$('#order-roll');
    G.order.forEach(()=>{ const s=document.createElement('div'); s.className='slot'; s.innerHTML=`${ic('dice')}<span>…</span>`; roll.appendChild(s); });
    await sleep(1300);
    for(let i=0;i<G.order.length;i++){ const t=G.teams[G.order[i]]; const s=roll.children[i]; s.style.setProperty('--c',t.color); s.innerHTML=`<span class="ord">${i+1}</span><span>${esc(t.name)}</span>`; s.classList.add('win'); play('pop'); await sleep(420); s.classList.remove('win'); }
    await sleep(600);
    startTurn();
  }

  async function startTurn(){
    const t=cur(); renderBoard();
    t.playedCard=false; t.turnStart=t.score;
    if(S.cardsEnabled && G.round > S.noCardRounds && !t.drew){
      t.drew=true;
      if(t.fx.skipDraw){ delete t.fx.skipDraw; toast('روح المس عشب: ما فيه سحب هالدور'); }
      else if(S.comebackEnabled && leader().score - t.score >= 300 && G.teams.length>1){ toast('دفعة الرجعة: اختر من بطاقتين'); await pickFrom(t, [randomCard(), randomCard()], 'دفعة الرجعة — اختر وحدة'); }
      else await drawCard(t);
    }
    turnIntro();
  }
  function turnIntro(){
    const t=cur();
    const npc = t.fx.npc, choose = t.fx.choose;
    stage(`<div class="row center">${G.finalRound?'<span class="banner">اللفة الأخيرة — الحسم بنهايتها</span>':''}${inFinalStretch()?'<span class="banner">الشوط الأخير: وقت السرقة بالنص</span>':''}${inClimax(t)&&!inFinalStretch()?'<span class="banner dim">الجولة الحاسمة: ما فيه سهل بالأسئلة</span>':''}${G.pot?`<span class="banner dim">${ic('coins')} القطة: ${G.pot} لأول واحد ينجح</span>`:''}</div>
      <div class="eyebrow">اللفة ${G.round}</div>
      <div class="big">دور <span class="who" style="--c:${t.color}">${esc(t.name)}</span></div>
      <div class="row center">${t.players.map(p=>`<span class="pmini" style="--c:${p.color}"><img src="${D.avatarSrc(p.avatar)}" alt=""> ${esc(p.name)}</span>`).join('')}</div>
      ${fxTags(t)}
      <div class="row center mt-s">
        ${npc? `<button class="btn btn-bad big" id="btn-roll">${ic('person')} وضع NPC: تحديات بالغصب</button>` : choose ? `<button class="btn btn-mint big" id="btn-roll">${ic('dice')} ديلولو: اختر خانتك</button>` : `<button class="btn btn-hype big pulse" id="btn-roll">${ic('dice')} اسحب الخانة</button>`}
      </div>`);
    G.canPlayNow=true;
    renderHand(t, canPlayCard(t));
    $('#btn-roll').onclick=()=>{ if(npc){ rollSection('t'); } else if(choose){ delete t.fx.choose; pickSection(); } else rollSection(); };
  }
  const canPlayCard = t => S.cardsEnabled && !t.playedCard && !t.fx.noCard;

  function pickSection(){
    stage(`<div class="big">اختر الخانة</div><div class="roller">${Object.entries(SECTIONS).map(([k,v])=>`<button class="slot ${k} pick" data-k="${k}">${ic(v.icon)}<span>${v.name}</span></button>`).join('')}</div>`);
    renderHand(cur(),false);
    $$('#stage .slot').forEach(s=>s.onclick=()=>{ play('pop'); enterSection(s.dataset.k); });
  }
  async function rollSection(forcedKey){
    renderHand(cur(),false);
    stage(`<div class="big">السحب…</div><div class="roller">${Object.entries(SECTIONS).map(([k,v])=>`<div class="slot ${k}" data-k="${k}">${ic(v.icon)}<span>${v.name}</span></div>`).join('')}</div>`);
    play('drums',{volume:.6});
    const slots=$$('#stage .slot'); const keys=Object.keys(SECTIONS);
    const target = forcedKey || rnd(keys);
    const spins=12+keys.indexOf(target);
    for(let n=0;n<spins;n++){ slots.forEach(s=>s.classList.remove('lit')); slots[n%3].classList.add('lit'); play('tick',{volume:.4}); await sleep(80+n*22); }
    slots.forEach(s=>{ s.classList.remove('lit'); s.classList.toggle('win', s.dataset.k===target); s.classList.toggle('lose', s.dataset.k!==target); });
    play('levelup',{volume:.8});
    await sleep(850);
    enterSection(target);
  }
  function enterSection(k){
    const t=cur(), tagsKey = k==='q'?'tagsQ': k==='c'?'tagsC':'tagsT', sec=SECTIONS[k];
    const climax = k==='q' && inClimax(t);
    const npc = !!t.fx.npc; if(npc) delete t.fx.npc;
    const hayat = !!t.fx.hayat; if(hayat) delete t.fx.hayat;
    const wasta = !!t.fx.wasta; if(wasta) delete t.fx.wasta;
    const minD = hayat ? 3 : (climax||npc) ? 2 : 1;
    stage(`<span class="pill">${ic(sec.icon)} ${sec.name}</span><div class="big">اختر الصعوبة</div>
      <div class="diff-btns">${[1,2,3].map(d=>`<button class="diff d${d}" data-d="${d}" ${d<minD?'disabled':''}><span class="dn">${DIFF[d]}</span><span class="dp">${pts(d)}</span><span class="dc">${countFresh(k,d,tagsKey)} متاح</span></button>`).join('')}</div>
      ${t.fx.harder ? '<span class="fx-tag bad">قاعد تتوهم: الصعوبة بترتفع درجة بنفس السعر</span>':''}
      ${t.fx.lag ? '<span class="fx-tag bad">لاق: وقتك بالنص هالدور</span>':''}
      ${climax ? '<span class="banner">الجولة الحاسمة: قربت تفوز، ما فيه سهل</span>':''}${npc?'<span class="fx-tag bad">قم تحرك: متوسط أو أعلى</span>':''}${hayat?'<span class="fx-tag">هياط: صعب بس — تنجح +50 تفشل −25</span>':''}${wasta?'<span class="fx-tag">الواسطة: نقاطك بسعر الصعوبة اللي فوق</span>':''}`);
    renderHand(t,false);
    if(wasta) $$('#stage .diff').forEach(b=>{ const d=+b.dataset.d; b.querySelector('.dp').textContent = d<3 ? pts(d+1) : pts(3)+'+50'; });
    $$('#stage [data-d]').forEach(b=>{ if(b.disabled) return; b.onclick=()=>{ let d=Number(b.dataset.d); let priceD=d;
      if(hayat){ t.fx.flatBonus=50; t.fx.hayatFail=true; }
      if(wasta){ if(d<3) priceD=d+1; else t.fx.flatBonus=50; }
      if(t.fx.harder){ delete t.fx.harder; if(d<3){ d++; toast(`قاعد تتوهم: صارت ${DIFF[d]} بسعر ${DIFF[priceD]}`); } else toast('الصعب يبقى صعب'); }
      const lag = !!t.fx.lag; delete t.fx.lag;
      play('pop'); if(k==='q') runQuestion(t,d,null,{priceD,lag}); else if(k==='c') runCharade(t,d,null,{priceD,lag}); else runChallenge(t,d,null,{priceD,lag}); }; });
  }
  const rerollBtn = t => t.fx.reroll ? `<button class="btn small" id="btn-reroll">${ic('next')} تخطي الإعلان</button>` : '';
  function useReroll(t){ t.fx.reroll--; if(!t.fx.reroll) delete t.fx.reroll; clearTimer(); play('meme:skibidi',{volume:.6}); }
  const head = (t, item, sec, d, p, priceD) => `<div class="row center"><span class="pill">${ic(SECTIONS[sec].icon)} ${esc(item.tag)}</span><span class="pill dim">${DIFF[d]} · ${p} نقطة</span>${lowerThird(t,'يلعب')}${priceD&&priceD!==d?`<span class="fx-tag bad">${DIFF[d]} بسعر ${DIFF[priceD]}</span>`:''}</div>`;

  // ---------- الأسئلة ----------
  function runQuestion(t, d, item, {priceD, lag}={}){
    item = item || pickContent('q', d, 'tagsQ');
    const p = pts(priceD||d), hard = d===3;
    const time = Math.max(3, lag ? Math.ceil(S.answerTime/2) : S.answerTime);
    stage(`${head(t,item,'q',d,p,priceD)}
      <div class="qtext">${esc(item.q)}</div>
      ${timerHTML(time)}${timeupHTML}
      <div class="row center"><button class="btn small" id="btn-reveal">${ic('eye')} إظهار الإجابة</button>${t.fx.spoiler?`<button class="btn small btn-sky" id="btn-hint">${ic('eye')} سبويلر</button>`:''}${rerollBtn(t)}<button class="btn small ghost" id="btn-restart">${ic('stopwatch')} أعد الوقت</button></div>
      <div class="answer hidden" id="answer">${esc(item.a)}</div>
      <div class="row center"><button class="btn btn-mint big" id="btn-ok">${ic('check')} صح</button><button class="btn btn-bad big" id="btn-no">${ic('cancel')} غلط / ما جاوب</button></div>
      <p class="muted small">${S.stealEnabled?(t.fx.lock?'قفل الشات: ما فيه سرقة على هالسؤال.':'إذا خلص الوقت تفتح السرقة. "غلط" يفتحها على طول.'):'المؤقت للتنبيه — انت تقرر.'}</p>`);
    reaction('think',2300);
    let ended=false;
    const finish=(ok, timedOut)=>{
      if(ended) return; ended=true; clearTimer(); delete t.fx.spoiler;
      if(ok){ const {net,note}=resolveSuccess(t,p,{hard,section:'q'}); play('correct'); memeSound('correct',{volume:.5}); flash('good'); reaction('correct'); confetti(60,1500);
        return afterTurn(`<span style="color:var(--mint)">صح!</span> +${net} لـ ${esc(t.name)}${note}`); }
      const notes=resolveFail(t,p); const nt=notes.length?` <span class="muted">(${notes.join(' · ')})</span>`:'';
      if(!timedOut){ play('wrong'); flash('bad'); reaction('wrong'); memeSound('wrong',{volume:.6}); }
      if(t.fx.lock){ delete t.fx.lock; return afterTurn(`ضاع السؤال${nt}. قفل الشات: ما أحد يسرق. الجواب: ${esc(item.a)}`); }
      if(S.stealEnabled) stealPhase(t, item, p, {ownerCanAnswer:!!timedOut, note:nt});
      else afterTurn(`ولا نقطة${nt}. الجواب: ${esc(item.a)}`);
    };
    startTimer(time, ()=>{ if(S.stealEnabled) finish(false,true); });
    $('#btn-reveal').onclick=()=>{ $('#answer').classList.toggle('hidden'); play('pop'); };
    $('#btn-restart').onclick=()=>restartTimer(time, ()=>{ if(S.stealEnabled) finish(false,true); });
    $('#btn-ok').onclick=()=>finish(true);
    $('#btn-no').onclick=()=>finish(false);
    const hb=$('#btn-hint'); if(hb) hb.onclick=()=>{ const a=item.a.trim(); delete t.fx.spoiler; hb.outerHTML=`<span class="hint-box">أول حرف: "${esc(a[0])}" · ${a.split(/\s+/).length} كلمة</span>`; play('meme:sus',{volume:.5}); };
    const rb=$('#btn-reroll'); if(rb) rb.onclick=()=>{ useReroll(t); runQuestion(t,d,null,{priceD,lag}); };
  }
  function stealPhase(t, item, p, {ownerCanAnswer=true, note=''}={}){
    const cands = others(t).filter(x=>x.fx.noSteal==null);
    const stTime = inFinalStretch() ? Math.max(2, Math.round(S.stealTime/2)) : S.stealTime;
    stage(`<div class="big" style="color:var(--steal)">وقت السرقة!</div>${inFinalStretch()?'<span class="banner">الشوط الأخير: وقت السرقة بالنص</span>':''}
      <div class="qtext">${esc(item.q)}</div>${timerHTML(stTime,'steal')}${timeupHTML}
      <p class="muted">أي فريق يجاوب صح ياخذ ${stealPts(p)}. ${ownerCanAnswer? `${esc(t.name)} خلص وقته بدون ما يغلط — لو قالها صح ياخذ ${p} كاملة.` : `${esc(t.name)} غلط وراحت عليه.`}</p>
      <div class="row center">${ownerCanAnswer? `<button class="btn team" style="--c:${t.color}" data-owner>${ic('check')} ${esc(t.name)} (${p})</button>`:''}${cands.map(x=>`<button class="btn team" style="--c:${x.color}" data-steal="${x.id}">${ic('ninja')} ${esc(x.name)} (${x.fx.fullsteal!=null?p:stealPts(p)})</button>`).join('')}</div>
      ${cands.length?'':'<span class="fx-tag bad">ما فيه فريق يقدر يسرق</span>'}
      <div class="row center"><button class="btn ghost" id="btn-nosteal">ما أحد جاوب — أنهِ الدور</button><button class="btn small" id="btn-reveal2">${ic('eye')} الإجابة</button><button class="btn small ghost" id="btn-restart">${ic('stopwatch')} أعد الوقت</button></div>
      <div class="answer hidden" id="answer">${esc(item.a)}</div><div id="buzzbox"></div>`);
    play('steal',{volume:.8}); reaction('steal',2300);
    let ended=false;
    const end=(sid, owner)=>{ if(ended) return; ended=true; clearTimer();
      if(owner){ const {net,note:n2}=resolveSuccess(t,p,{hard:p>=pts(3)}); play('correct'); flash('good'); reaction('correct'); confetti(60,1500); return afterTurn(`${esc(t.name)} لحقها! +${net}${n2}`); }
      if(sid){ const s=G.teams.find(x=>x.id===sid); let gain=stealPts(p); const notes=[];
        if(s.fx.fullsteal!=null){ gain=p; delete s.fx.fullsteal; notes.push('ببلاش: كاملة'); }
        const {net,note:n2}=payout(s,gain,notes);
        play('correct'); memeSound('steal',{volume:.6}); flash('steal'); reaction('steal');
        afterTurn(`<span style="color:var(--steal)">${esc(s.name)} سرقها</span> +${net}${n2}${note}`);
      } else { play('fail',{volume:.6}); afterTurn(`ما أحد جاوب${note}. الجواب: ${esc(item.a)}`); }
    };
    startTimer(stTime);
    openBuzz([...cands.map(x=>x.id), ...(ownerCanAnswer?[t.id]:[])], x=>{ clearTimer(); buzzBox(x, y=> y===t ? end(null,true) : end(y.id,false)); });
    $$('#stage [data-steal]').forEach(b=>b.onclick=()=>end(b.dataset.steal,false));
    const ob=$('#stage [data-owner]'); if(ob) ob.onclick=()=>end(null,true);
    $('#btn-nosteal').onclick=()=>end(null,false);
    $('#btn-restart').onclick=()=>restartTimer(stTime);
    $('#btn-reveal2').onclick=()=>$('#answer').classList.toggle('hidden');
  }

  // ---------- بدون كلام ----------
  function runCharade(t, d, item, {priceD, lag}={}){
    item = item || pickContent('c', d, 'tagsC');
    const p=pts(priceD||d), half=Math.round(p/2);
    const time = lag ? Math.ceil(S.charadeTime/2) : S.charadeTime;
    stage(`${head(t,item,'c',d,p,priceD)}
      <div class="big">ممثل ${esc(t.name)}: تعال شوف العبارة لحالك</div>
      <div class="covered" id="cov"><div class="qtext" style="padding:22px 34px">${esc(item.t)}</div><div class="cover">${ic('eye')} اضغط عشان تشوف</div></div>
      <p class="muted small">اضغط تظهر واضغط مرة ثانية تختفي. بدون كلام، بدون تهجئة، بدون إشارة لأشياء بالغرفة.</p>
      <div class="row center"><button class="btn btn-mint big" id="btn-ready">${ic('stopwatch')} جاهز — ابدأ الوقت</button>${rerollBtn(t)}</div>`);
    $('#cov').onclick=()=>{ const c=$('#cov .cover'); c.style.display = c.style.display==='none' ? 'flex' : 'none'; play('pop'); };
    const rb=$('#btn-reroll'); if(rb) rb.onclick=()=>{ useReroll(t); runCharade(t,d,null,{priceD,lag}); };
    $('#btn-ready').onclick=()=>{
      stage(`<div class="row center"><span class="pill">${ic('masks')} ${esc(item.tag)}</span><span class="pill dim">${p} نقطة · نص للممثل ونص للي يخمّن</span></div>
        <div class="big">مثّل… والباقين يخمّنون</div>${t.fx.sawalif!=null?'<span class="fx-tag">سواليف: مسموح للممثل يقول كلمة وحدة</span>':''}${timerHTML(time)}${timeupHTML}
        <p class="muted small">أول فريق يقولها صح: اضغط اسمه (حتى فريق الممثل).</p>
        <div class="row center">${G.teams.map(x=>`<button class="btn team" style="--c:${x.color}" data-g="${x.id}">${esc(x.name)}${x.fx.rizz!=null&&x!==t?' (فنّان)':''}</button>`).join('')}</div>
        <div class="row center"><button class="btn ghost" id="btn-nobody">ما أحد خمّن — أنهِ الدور</button><button class="btn small" id="btn-reveal">${ic('eye')} العبارة</button><button class="btn small ghost" id="btn-restart">${ic('stopwatch')} أعد الوقت</button></div>
        <div class="answer hidden" id="answer">${esc(item.t)}</div><div id="buzzbox"></div>`);
      let ended=false;
      const end=(gid)=>{ if(ended) return; ended=true; clearTimer();
        if(gid){ const g=G.teams.find(x=>x.id===gid);
          let a=half; const an=[];
          if(t.fx.rizz!=null){ a=p; delete t.fx.rizz; an.push('فنّان: نصيب كامل'); }
          if(t.fx.sawalif!=null){ a+=25; delete t.fx.sawalif; an.push('سواليف +25'); }
          const ra=resolveSuccess(t,a,{hard:d===3,section:'c'});
          let msg;
          if(g===t){ const rb2=payout(t,half,[]); msg=`فريق الممثل نفسه خمّنها! +${ra.net+rb2.net} لـ ${esc(t.name)}${ra.note}`; }
          else { let b=half; const bn=[]; if(g.fx.rizz!=null){ b=p; delete g.fx.rizz; bn.push('فنّان: نصيب كامل'); }
            const rb2=payout(g,b,bn); msg=`${esc(g.name)} خمّنها! +${rb2.net} لهم${rb2.note} و+${ra.net} لـ ${esc(t.name)}${ra.note}`; }
          if(an.length) msg+=` <span class="muted">(${an.join('')})</span>`;
          play('correct'); flash('good'); reaction('correct'); confetti(60,1500); afterTurn(msg);
        } else {
          delete t.fx.sawalif; const notes=resolveFail(t,p); play('fail',{volume:.6}); flash('bad'); reaction('wrong');
          afterTurn(`ما أحد خمّن "${esc(item.t)}"${notes.length?` <span class="muted">(${notes.join(' · ')})</span>`:''}`);
        }
      };
      startTimer(time);
      openBuzz(G.teams.map(x=>x.id), x=>buzzBox(x, y=>end(y.id)), {retry:true});
      $$('#stage [data-g]').forEach(b=>b.onclick=()=>end(b.dataset.g));
      $('#btn-nobody').onclick=()=>end(null);
      $('#btn-restart').onclick=()=>restartTimer(time);
      $('#btn-reveal').onclick=()=>$('#answer').classList.toggle('hidden');
    };
  }

  // ---------- التحديات ----------
  function runChallenge(t, d, item, {priceD, lag}={}){
    item = item || pickContent('t', d, 'tagsT');
    const p=pts(priceD||d); const {t:text, a}=splitAnswer(item.t);
    const time = lag ? Math.max(5,Math.ceil(item.s/2)) : item.s;
    stage(`${head(t,item,'t',d,p,priceD)}
      <div class="qtext">${esc(text)}</div>
      <div class="row center"><button class="btn btn-gold big" id="btn-go">${ic('stopwatch')} ابدأ الوقت (${time} ث)</button>${rerollBtn(t)}</div>`);
    const rb=$('#btn-reroll'); if(rb) rb.onclick=()=>{ useReroll(t); runChallenge(t,d,null,{priceD,lag}); };
    $('#btn-go').onclick=()=>{
      stage(`<div class="row center"><span class="pill">${ic('flame')} ${esc(item.tag)}</span><span class="pill dim">${p} نقطة</span></div>
        <div class="qtext">${esc(text)}</div>${timerHTML(time)}${timeupHTML}
        <div class="row center">${a?`<button class="btn small" id="btn-reveal">${ic('eye')} الإجابة</button>`:''}<button class="btn small ghost" id="btn-restart">${ic('stopwatch')} أعد الوقت</button></div>
        ${a?`<div class="answer hidden" id="answer">${esc(a)}</div>`:''}
        <div class="row center"><button class="btn btn-mint big" id="btn-ok">${ic('check')} نجح</button><button class="btn btn-bad big" id="btn-no">${ic('cancel')} فشل</button></div>`);
      let ended=false;
      const end=(ok)=>{ if(ended) return; ended=true; clearTimer();
        if(ok){ const {net,note}=resolveSuccess(t,p,{hard:d===3,section:'t'}); play('cheer',{volume:.6}); flash('good'); reaction('correct'); confetti(80,1800); afterTurn(`<span style="color:var(--mint)">نجح!</span> +${net}${note}`); }
        else { const notes=resolveFail(t,p); play('fail'); flash('bad'); reaction('wrong'); memeSound('wrong',{volume:.6}); afterTurn(`ما نجح${notes.length?` <span class="muted">(${notes.join(' · ')})</span>`:''}`); }
      };
      startTimer(time);
      $('#btn-ok').onclick=()=>end(true); $('#btn-no').onclick=()=>end(false);
      $('#btn-restart').onclick=()=>restartTimer(time);
      if(a) $('#btn-reveal').onclick=()=>$('#answer').classList.toggle('hidden');
    };
  }

  // ---------- بعد الدور ----------
  function afterTurn(msg){
    stopAll();
    const t=cur();
    t.lastGain = Math.max(0, t.score - t.turnStart);
    delete t.fx.noCard;
    const ok = t.lastGain>0, extra=[];
    (G.bets||[]).filter(b=>b.on===t.id).forEach(b=>{ const by=G.teams.find(x=>x.id===b.by); if(!by) return;
      const right = (b.pred==='win')===ok; addScore(by, right?50:-25, {silent:!right});
      extra.push(`أراهنك: ${esc(by.name)} ${right?'صدق +50':'خربت −25'}`); });
    G.bets=(G.bets||[]).filter(b=>b.on!==t.id);
    if(t.fx.coal){ delete t.fx.coal;
      if(ok){ const n=G.order.length, i=G.order.indexOf(G.teams.indexOf(t)); const nx=G.teams[G.order[(i+1)%n]]; if(nx&&nx!==t){ nx.fx.coal=true; extra.push(`الجمرة انتقلت لـ ${esc(nx.name)}`); play('game:c_ticking',{volume:.5,max:1500}); } }
      else { addScore(t,-75,{silent:true}); extra.push(`الجمرة انفجرت على ${esc(t.name)} −75`); play('meme:boom',{volume:.9}); flash('bad'); }
    }
    if(extra.length) msg += `<div class="fx-tags mt-s">${extra.map(x=>`<span class="fx-tag">${x}</span>`).join('')}</div>`;
    const reached = G.teams.find(x=>x.score>=S.target);
    let banner='';
    if(reached && !G.finalRound){
      G.finalRound = true; play('game:g_finishhim',{volume:.9}); confetti(120,2000); reaction('finalRound',3000);
      banner = `<div class="banner">${esc(reached.name)} وصل الهدف! نكمل اللفة عشان الكل ياخذ نفس عدد الأدوار</div>`;
    } else if(G.finalRound) banner = `<span class="banner dim">اللفة الأخيرة — الحسم بنهايتها</span>`;
    stage(`<div class="big" style="font-size:clamp(1.5rem,3.6vw,2.6rem)">${msg}</div>${banner}<div class="row center mt-s"><button class="btn btn-sky big" id="btn-next">الدور الجاي ${ic('next')}</button></div>`);
    renderBoard(); renderHand(t,false);
    $('#btn-next').onclick=nextTurn;
  }
  function concludeMatch(){
    stopAll();
    const top = Math.max(...G.teams.map(x=>x.score));
    const tied = G.teams.filter(x=>x.score===top);
    if(tied.length>1 && top>=S.target){
      G.order = tied.map(x=>G.teams.indexOf(x)); G.turn=0; G.round++;
      G.teams.forEach(x=>{ x.drew=false; });
      play('drumroll',{volume:.8}); memeSound('tie'); reaction('tie',3000);
      stage(`<div class="big">تعادل على القمة بـ${top}!</div><p class="muted">لفة حسم بين المتعادلين بس</p>
        <div class="roller">${tied.map((x,i)=>`<div class="slot" style="--c:${x.color}"><span class="ord">${i+1}</span><span>${esc(x.name)}</span></div>`).join('')}</div>
        <div class="row center mt-s"><button class="btn btn-hype big pulse" id="btn-go-round">نحسمها</button></div>`);
      $('#btn-go-round').onclick=startTurn; return;
    }
    endGame(tied[0]);
  }
  function nextTurn(){
    const t=cur();
    if(t.fx.extraTurn){ delete t.fx.extraTurn; t.playedCard=false; t.turnStart=t.score; toast('طقها والحقها: دور ثاني!'); play('bonus'); turnIntro(); return; }
    G.turn++;
    if(G.turn>=G.order.length){ if(G.finalRound){ concludeMatch(); return; } newRound(); }
    else startTurn();
  }
  function newRound(){
    G.round++; G.turn=0;
    const prev=G.order;
    G.order=[...prev].sort((a,b)=> G.teams[b].score-G.teams[a].score || prev.indexOf(a)-prev.indexOf(b));
    G.teams.forEach(t=>{ t.drew=false;
      ['immune','fullsteal','yasalam'].forEach(k=>{ if(t.fx[k]!=null && t.fx[k]<G.round) delete t.fx[k]; });
      if(t.fx.noSteal!=null && t.fx.noSteal<G.round) delete t.fx.noSteal;
    });
    renderBoard(); renderHand(null);
    stage(`<div class="eyebrow">لفة جديدة</div><div class="big">اللفة ${G.round}</div><p class="muted">الترتيب حسب النقاط:</p>
      <div class="roller">${G.order.map((idx,i)=>`<div class="slot" style="--c:${G.teams[idx].color}"><span class="ord">${i+1}</span><span>${esc(G.teams[idx].name)}</span></div>`).join('')}</div>
      ${S.cardsEnabled && G.round===S.noCardRounds+1 ? `<span class="banner">${ic('cards')} من هذي اللفة تبدأ البطاقات</span>`:''}
      <div class="row center mt-s"><button class="btn btn-hype big" id="btn-go-round">يلا ${ic('next')}</button></div>`);
    play('levelup');
    $('#btn-go-round').onclick=startTurn;
  }

  // ---------- البطاقات ----------
  function weightedTier(){
    const w={legendary:S.wLegendary,medium:S.wMedium,normal:S.wNormal,black:S.wBlack}; const tot=Object.values(w).reduce((a,b)=>a+b,0)||1;
    let r=Math.random()*tot; for(const [k,v] of Object.entries(w)){ if(r<v) return k; r-=v; } return 'normal';
  }
  function randomCard(tier){
    let pool = DATA.cards.filter(c=>c.tier===(tier||weightedTier()));
    if(!S.reactionsEnabled) pool = pool.filter(c=>c.kind!=='reaction');
    return rnd(pool.length?pool:DATA.cards.filter(c=>c.tier==='normal'&&c.kind!=='reaction'));
  }
  const FX = () => window.DahoomFX;
  // كشف بطاقة مسحوبة
  function revealCard(card, title, {secret=false}={}){
    return new Promise(res=>{
      const fx=FX();
      const m=document.createElement('div'); m.className='card-overlay';
      const front = secret
        ? `<div class="tcg big ${card.tier} secret-card"><div class="tcg-in"><span class="tcg-gem"></span><div class="sc-t">بطاقة ${D.TIER_AR[card.tier]}</div><div class="sc-s">${ic('phone')} راحت لجوالكم — سرّية</div></div></div>`
        : cardHTML(card,{size:'big',anim:true});
      m.innerHTML=`<div class="co-wrap"><div class="co-title">${title}</div>
        <div class="flip" id="flip"><div class="inner"><div class="face back"><span>دحوم</span></div><div class="face front">${front}</div></div></div>
        <div class="row center mt"><button class="btn btn-hype big" id="btn-card-ok">خذها</button></div></div>`;
      $('#overlay-root').appendChild(m);
      const fl=m.querySelector('#flip'); fl.querySelector('.back').style.width=getComputedStyle(fl.querySelector('.tcg')).width;
      play('card',{volume:.7});
      const wait = fx ? fx.suspense(fl) : 600;
      setTimeout(()=>{ fl.classList.add('flipped');
        if(fx){ fx.aura(fl.querySelector('.tcg'),card.tier); if(secret){ fx.tierSound(card.tier); fx.visual({tier:card.tier, fx:'_secret'}); } else { fx.sound(card); fx.visual(card); } } }, wait);
      m.querySelector('#btn-card-ok').onclick=()=>{ m.remove(); res(); };
    });
  }
  async function drawCard(t){
    const c=randomCard(), secret=phoneOf(t);
    if(secret) NET().notify(t.id,{t:'drawn', card:c.id});
    await revealCard(c, `${esc(t.name)} يسحب بطاقة`, {secret});
    await addToHand(t,c);
  }
  // يضيف لليد ويتعامل مع الامتلاء
  async function addToHand(t, c){
    if(t.hand.length<S.handMax){ t.hand.push(c); renderBoard(); return; }
    const v = await decide(t,{ title:`يدكم مليانة (${S.handMax}) — اختاروا بطاقة ترمونها`, options:[...t.hand.map((h,i)=>({v:i,card:h})), {v:'new',card:c,flag:'الجديدة'}] });
    if(v!=='new' && v!=null){ t.hand.splice(v,1); t.hand.push(c); }
    play('fx_whoosh',{volume:.5}); renderBoard();
  }
  // اختيار بطاقة من مجموعة (قاتشا / دفعة الرجعة)
  async function pickFrom(t, opts, title){
    play('meme:chest',{volume:.5});
    const i = await decide(t,{ title, big:true, options:opts.map((c,k)=>({v:k,card:c})) });
    const c = opts[i==null?0:i];
    if(!phoneOf(t)){ const fx=FX(); if(fx) fx.sound(c); toast('أخذت '+c.name); } else FX() && FX().tierSound(c.tier);
    await addToHand(t,c);
  }
  function fuseBlack(t){
    let n=0; t.hand=t.hand.filter(c=>{ if(c.tier==='black' && n<2){ n++; return false; } return true; });
    const c=randomCard('normal'); t.hand.push(c);
    play('meme:villager',{volume:.6}); toast('دمجنا سودتين وطلعت: '+c.name);
    renderBoard(); renderHand(t, canPlayCard(t));
  }
  function targetOf(t, card){
    if(card.target==='leader'){ const L=leader(); return (L===t || L.score===t.score) ? null : L; }
    const n=G.order.length; if(n<2) return null;
    const i=G.order.indexOf(G.teams.indexOf(t)); if(i<0) return null;
    const x = G.teams[G.order[card.target==='prev' ? (i-1+n)%n : (i+1)%n]];
    return x===t? null : x;
  }

  // نافذة اختيار فريق (ترجع الفريق أو null)
  async function pickTeam(t, title, list){
    const id = await decide(t,{ title, options:list.map(x=>({v:x.id,label:`${x.name} · ${x.score}`,color:x.color})), cancel:'تراجع' });
    return id ? G.teams.find(x=>x.id===id) : null;
  }
  const notPlayedYet = t => G.order.slice(G.turn+1).map(i=>G.teams[i]).filter(x=>x!==t);
  function chooseTarget(t, c){
    if(c.fx==='swapTurn'){ const l=notPlayedYet(t); if(!l.length){ toast('ما فيه فريق باقي له دور هاللفة'); return Promise.resolve(null); } return pickTeam(t,'روح انت أول — مين يلعب بدالك الحين؟', l); }
    if(c.fx==='bet') return pickTeam(t,'أراهنك — على أي فريق تراهن؟', others(t));
    return pickTeam(t,`${esc(c.name)} — اختار الفريق`, others(t));
  }
  async function playCard(t, idx){
    if(!canPlayCard(t)){ toast(t.fx.noCard?'ولا كلمة: ممنوع بطاقات هالدور':'بطاقة وحدة بس كل دور'); return; }
    const c=t.hand[idx];
    let real=c, target=null;
    if(c.fx==='copy'){ real=G.lastCard; if(!real){ toast('ما انلعبت بطاقة قبل — ما فيه شي تنسخه'); return; } }
    if(real.target){
      if(real.target==='choose'){ target=await chooseTarget(t,real); if(!target) return; }
      else {
        target=targetOf(t,real);
        if(!target){ toast(real.target==='leader'?'انت المتصدر — ما تقدر تلعبها على نفسك':'ما فيه فريق تنزل عليه'); return; }
        const ok = await decide(t,{ title:`${esc(c.name)}${real!==c?` ← ${esc(real.name)}`:''} — بتنزل على <span class="who" style="--c:${target.color}">${esc(target.name)}</span>`, text:esc(real.desc), options:[{v:true,label:'نزّلها'}], cancel:'تراجع' });
        if(!ok) return;
      }
    }
    t.playedCard=true; t.hand.splice(idx,1);
    if(c.fx!=='copy') G.lastCard=c;
    showPlayed(c, t);
    const fx=FX(); if(fx){ fx.sound(c); fx.visual(c); } else play('bling');
    if(real.fx==='swapTurn'){ swapTurn(t,target); return; }
    let msg;
    if(real.fx==='bet') msg = await placeBet(t,target);
    else if(real.kind==='attack' || real.fx==='trade') msg = await attack(t, target, real);
    else msg = await applySelf(t, real);
    if(real!==c) msg = 'نسخ لصق → '+real.name+(msg?': '+msg:'');
    if(msg) toast(msg.replace(/<[^>]+>/g,''), 3600);
    renderBoard(); turnIntro();
  }
  // روح انت أول: الفريق المختار يلعب الحين، وانت تاخذ مكانه بالترتيب
  function swapTurn(t, x){
    const i=G.turn, j=G.order.indexOf(G.teams.indexOf(x));
    [G.order[i],G.order[j]]=[G.order[j],G.order[i]];
    toast(`${t.name} قال لـ ${x.name}: روح انت أول`, 3200);
    startTurn();
  }
  async function placeBet(t, x){
    const pred = await decide(t,{ title:`أراهنك: ${esc(x.name)} بدوره الجاي…`, options:[{v:'win',label:'بينجح',cls:'btn-mint big'},{v:'lose',label:'بيفشل',cls:'btn-bad big'}] }) || 'win';
    (G.bets=G.bets||[]).push({by:t.id,on:x.id,pred});
    return `${t.name} راهن على ${x.name}${phoneOf(t)?' (التوقع سرّي)':` — ${pred==='win'?'بينجح':'بيفشل'}`}`;
  }

  // هجوم مع فرصة رد الفعل
  async function attack(src, tgt, c){
    if(tgt.fx.immune!=null && c.fx!=='factcheck'){ play('meme:pipe',{volume:.6}); return `محد قدّ ${tgt.name} — ${c.name} ما أثرت`; }
    if(S.reactionsEnabled){
      const reacts = tgt.hand.filter(x=>x.kind==='reaction');
      if(reacts.length){
        const choice = await decide(tgt,{ title:`${esc(src.name)} رمى "${esc(c.name)}" عليكم — تردون؟`, options:reacts.map(r=>({v:r.id,card:r})), cancel:'خلها تمر' });
        if(choice){
          const ri=tgt.hand.findIndex(x=>x.id===choice); const r=tgt.hand.splice(ri,1)[0]; showPlayed(r, tgt);
          const fx=FX(); if(fx){ fx.sound(r); fx.visual(r); }
          reaction('reverse',2600);
          if(r.fx==='seen') return `${tgt.name} طنّش — ${c.name} انلغت`;
          if(r.fx==='reverse'){
            if(c.fx==='snap' && src.score<=0) return 'العب غيرها! بس ما عنده نقاط تنشلط';
            const m2 = await applyAttack(tgt, src, c);
            return `العب غيرها! ${c.name} ارتدت على ${src.name}: ${m2}`;
          }
        }
      }
    }
    return applyAttack(src, tgt, c);
  }
  async function applyAttack(src, tgt, c){
    const f=tgt.fx;
    switch(c.fx){
      case 'harder': f.harder=true; return `${tgt.name}: الصعوبة الجاية أعلى بدرجة`;
      case 'lag': f.lag=true; return `${tgt.name}: وقته الجاي بالنص`;
      case 'ratio': f.ratioTo=src.id; return `${tgt.name}: نص أول كسب له يروح لـ ${src.name}`;
      case 'npc': f.npc=true; return `${tgt.name}: دوره الجاي تحديات بالغصب`;
      case 'skipDraw': f.skipDraw=true; return `${tgt.name}: ما يسحب بطاقة دوره الجاي`;
      case 'shadowban': f.noSteal=G.round; f.noCard=true; return `${tgt.name}: ممنوع يسرق هاللفة وممنوع بطاقات دوره الجاي`;
      case 'factcheck': { const found=Object.keys(BUFFS).filter(k=>f[k]!=null); found.forEach(k=>delete f[k]);
        let burned=''; if(tgt.hand.length){ const i=Math.floor(Math.random()*tgt.hand.length); burned=tgt.hand.splice(i,1)[0].name; }
        return `فاكت تشيك على ${tgt.name}: ${found.length?`انلغت ${found.length} طاقة`:'ما عنده طاقات'}${burned?` وانحرقت "${burned}"`:''}`; }
      case 'coal': f.coal=true; return `الجمرة بيد ${tgt.name}: ينجح تنتقل، يفشل تنفجر −75`;
      case 'roast': { const a=Math.min(40,Math.max(0,tgt.score)); addScore(tgt,-a,{silent:true}); return `طقطقة على ${tgt.name}: −${a}`; }
      case 'hamour': { const amt=Math.min(75, Math.max(0,tgt.score)); if(!amt) return `${tgt.name} ما عنده شي ينوخذ`; addScore(tgt,-amt,{silent:true}); addScore(src,amt); return `الهامور: ${src.name} أخذ ${amt} من ${tgt.name}`; }
      case 'evilEye': f.evilEye=true; return `عين وصابت ${tgt.name}: نص نجاحه الجاي يطير`;
      case 'prank': { const b=randomCard('black'); if(tgt.hand.length>=S.handMax) tgt.hand.splice(Math.floor(Math.random()*tgt.hand.length),1); tgt.hand.push(b); return `مقلب! ${tgt.name} لقى "${b.name}" بيده`; }
      case 'snap': { const loss=Math.max(Math.min(150, r25(tgt.score*.2)), tgt.score>0?25:0); addScore(tgt,-loss,{silent:true}); play('meme:inevitable',{volume:.4});
        return `طقة ثانوس: ${tgt.name} خسر ${loss}`; }
      case 'undo': { const g=tgt.lastGain||0; tgt.lastGain=0; if(!g) return `${tgt.name} ما كسب شي بدوره الأخير… الكنترول زد ضاع`; addScore(tgt,-g,{silent:true}); return `كنترول زد: انمسحت ${g} نقطة من ${tgt.name}`; }
      case 'trade': {
        if(!tgt.hand.length) return `يد ${tgt.name} فاضية — ما فيه شي ينتبادل`;
        const take = tgt.hand.splice(Math.floor(Math.random()*tgt.hand.length),1)[0];
        let give=null;
        if(src.hand.length){
          const gi = await decide(src,{ title:`خذ وهات: أخذتوا "${esc(take.name)}" — اختاروا بطاقة تعطونها لـ ${esc(tgt.name)}`, options:src.hand.map((h,i)=>({v:i,card:h})) });
          give = src.hand.splice(gi==null?0:gi,1)[0];
          tgt.hand.push(give);
        }
        await addToHand(src, take);
        return `عرض تجاري: ${src.name} أخذ "${take.name}"${give?` وعطى "${give.name}"`:''}`;
      }
    }
    return 'تم';
  }
  async function applySelf(t, c){
    const f=t.fx;
    switch(c.fx){
      case 'x2next': f.x2next=true; return 'أول نجاح لك بهالدور ×2';
      case 'jackpot': f.jackpot=true; return 'ALL IN: تنجح ×2، تفشل تخسر نفس النقاط';
      case 'extraTurn': f.extraTurn=true; return 'بعد هالدور لك دور ثاني';
      case 'reroll': f.reroll=(f.reroll||0)+1; return 'تقدر تتخطى السؤال/العبارة/التحدي مرة';
      case 'spoiler': f.spoiler=true; return 'سؤالك الجاي فيه سبويلر';
      case 'immune': f.immune=G.round+1; return 'أورا: محصّن لين نهاية اللفة الجاية';
      case 'streak': f.streak=true; addScore(t,20); return 'ستريك: +20 وكل نجاح +20 لين تفشل';
      case 'nocap': f.nocap=true; return 'نو كاب: أول نجاح +25 (+50 لو صعب)';
      case 'copium': f.copium=true; return 'كوبيوم: لو فشلت تاخذ 40';
      case 'speedrun': f.speedrun=true; return 'سبيد رن: جاوب صح بنص الوقت الأول وخذ +50%';
      case 'choose': f.choose=true; return 'ديلولو: اختر خانتك بنفسك';
      case 'lock': f.lock=true; return 'قفل الشات: سؤالك الجاي ما ينسرق';
      case 'rizz': f.rizz=true; return 'رز: أول بدون كلام تشارك فيه نصيبك كامل';
      case 'fullsteal': f.fullsteal=G.round+1; return 'ببلاش: أول سرقة لك كاملة';
      case 'cleanse': { const n=Object.keys(DEBUFFS).filter(k=>f[k]!=null); n.forEach(k=>delete f[k]); addScore(t,25); return `تشل قاي: +25${n.length?` ومسحنا ${n.length} ضربة`:''}`; }
      case 'gacha': await pickFrom(t,[randomCard(),randomCard()],'ضربة حظ — اختر وحدة'); return '';
      case 'yasalam': f.yasalam=G.round+1; return 'يا سلام: كل نجاح لغيرك لين نهاية اللفة الجاية يعطيك +15';
      case 'wasta': f.wasta=true; f.choose=true; return 'الواسطة: اختر خانتك، ونقاطك بسعر الصعوبة اللي فوق';
      case 'hayat': f.hayat=true; return 'هياط: لازم صعب — تنجح +50 تفشل −25';
      case 'sawalif': f.sawalif=true; return 'سواليف: أول بدون كلام تمثله مسموح لك كلمة';
      case 'pot': { let sum=0; G.teams.forEach(x=>{ const a=Math.min(50,Math.max(0,x.score)); addScore(x,-a,{silent:true}); sum+=a; }); G.pot=(G.pot||0)+sum; return `القطة فيها ${G.pot} — أول واحد ينجح ياخذها`; }
    }
    return '';
  }

  // ---------- النهاية ----------
  function endGame(winner){
    stopAll(); go('results'); play('win'); setTimeout(()=>memeSound('win'),700); setTimeout(()=>play('applause',{volume:.6}),1500); confetti(400,6000); reaction('win',4000);
    const sorted=[...G.teams].sort((a,b)=>b.score-a.score);
    $('#winner-title').innerHTML=`<span class="who" style="--c:${winner.color}">${esc(winner.name)}</span> فاز`;
    const pod=$('#podium'); pod.innerHTML='';
    const cls=['first','second','third'];
    sorted.slice(0,3).forEach((t,i)=>{ const d=document.createElement('div'); d.className='p '+cls[i]; d.style.setProperty('--c',t.color); d.style.animationDelay=(i*.25)+'s';
      d.innerHTML=`${i===0?ic('crown','crown'):''}<div class="rank">${i+1}</div><div class="pn">${esc(t.name)}</div><div class="muted small">${t.players.map(p=>esc(p.name)).join('، ')}</div><div class="ps">${t.score}</div>`; pod.appendChild(d); });
    if(sorted.length>3){ const rest=document.createElement('div'); rest.className='row center'; rest.style.width='100%'; rest.innerHTML=sorted.slice(3).map((t,i)=>`<span class="pill">${i+4}. ${esc(t.name)} — ${t.score}</span>`).join(''); pod.appendChild(rest); }
    $('#btn-again').onclick=()=>newGame();
  }

  // ---------- أدوات المضيف ----------
  function adjustModal(){
    modal(`<h3>تعديل النقاط يدويًا</h3><div class="stack mt-s">${G.teams.map(t=>`<div class="row between"><span class="tchip" style="--c:${t.color}"><span class="sw"></span><span class="nm">${esc(t.name)}</span><span class="sc" data-sc="${t.id}">${t.score}</span></span><span class="row">${[-50,-25,25,50].map(n=>`<button class="btn small ${n<0?'btn-bad':'btn-mint'}" data-a="${t.id}" data-n="${n}">${n>0?'+':''}${n}</button>`).join('')}</span></div>`).join('')}</div><div class="row mt-s"><button class="btn" id="close">تم</button></div>`,{onMount(m){
      $$('[data-a]',m).forEach(b=>b.onclick=()=>{ const t=G.teams.find(x=>x.id===b.dataset.a); addScore(t,Number(b.dataset.n),{silent:true}); m.querySelector(`[data-sc="${t.id}"]`).textContent=t.score; play('tick'); });
      m.querySelector('#close').onclick=()=>m.remove(); }});
  }
  function rulesHTML(){
    return `<p><b>الهدف ${S.target} نقطة.</b> أول ما فريق يوصلها تكمل اللفة لين آخرها عشان الكل ياخذ نفس عدد الأدوار، وبعدها الأعلى يفوز. التعادل على القمة = لفة حسم.</p>
      <p>كل دور تنسحب الخانة عشوائي: <b>أسئلة عامة</b> / <b>بدون كلام</b> / <b>تحديات</b>.</p>
      <p><b>الأسئلة:</b> تختار الصعوبة (${S.pts1}/${S.pts2}/${S.pts3})، عندك ${S.answerTime} ثواني. غلطت أو خلص الوقت؟ تفتح السرقة ${S.stealTime} ثواني بنص النقاط. لو خلص وقتك بدون ما تغلط تقدر تلحقها وقت السرقة وتاخذها كاملة.</p>
      <p><b>بدون كلام:</b> واحد من الفريق يمثّل والباقين يخمّنون. نص للممثل ونص للي خمّن. ما أحد خمّن؟ ولا نقطة.</p>
      <p><b>التحديات:</b> نفّذ بالوقت المحدد. ما فيه سرقة.</p>
      <p>كل لفة الترتيب يتغير: الأعلى نقاط يبدأ.</p>
      <p><b>البطاقات:</b> من اللفة ${S.noCardRounds+1} كل فريق يسحب بطاقة بداية دوره ويحتفظ لين ${S.handMax}. بطاقة وحدة بس كل دور. ${S.reactionsEnabled?'بطاقات رد الفعل تنلعب برا دورك لحظة ما أحد يهاجمك.':''}</p>
      ${S.comebackEnabled?'<p><b>دفعة الرجعة:</b> لو متأخر 300 نقطة أو أكثر عن المتصدر، تسحب بطاقتين وتختار وحدة.</p>':''}
      ${S.climaxEnabled?`<p><b>الجولة الحاسمة:</b> من ${S.climaxThreshold} نقطة أسئلتك ما فيها سهل.</p>`:''}
      ${S.finalStretchEnabled?`<p><b>الشوط الأخير:</b> أول ما أي فريق يوصل ${S.finalStretchThreshold}، وقت السرقة للكل بالنص.</p>`:''}
      <p>المضيف هو الحكم: يقرر صح/غلط ويعدل النقاط يدويًا.</p>`;
  }
  function helpModal(){
    modal(`<h3>قوانين ألف نقطة</h3><div class="help-list mt-s">${rulesHTML()}</div>
      <h3 class="mt-s">عقوبات مقترحة (القرار للمضيف)</h3>
      <div class="help-list"><p>همس أو تلميح لفريقك وقت دور غيرك: <b>−25</b></p><p>جوال أو مصدر خارجي: <b>−50</b> أو صفر السؤال</p><p>كسر قوانين بدون كلام: إلغاء الدور</p><p>اعتراض متكرر بعد الحكم: <b>−10</b> كل مرة</p></div>
      <div class="row mt-s"><button class="btn" id="close">تمام</button></div>`,{onMount(m){ m.querySelector('#close').onclick=()=>m.remove(); }});
  }

  // ---------- صفحة الشرح + المعرض ----------
  let guideTier='all';
  function renderGuide(){
    $('#guide-rules').innerHTML = rulesHTML();
    const tiers=[['all','الكل'],['legendary','حمراء'],['medium','ذهبية'],['normal','زرقاء'],['black','سودا']];
    const draw=()=>{
      const cards = guideTier==='all' ? DATA.cards : DATA.cards.filter(c=>c.tier===guideTier);
      $('#guide-count').textContent=cards.length;
      $('#guide-cards').innerHTML=cards.map(c=>cardHTML(c,{size:'mini'})).join('');
      $$('#guide-cards .tcg').forEach(el=>el.onclick=()=>{ const c=DATA.cards.find(x=>x.id===el.dataset.id);
        modal(`<div class="co-wrap">${cardHTML(c,{size:'big',anim:true})}<div class="row center mt-s"><button class="btn" data-fx>${ic('sparkles')} شغّل المؤثر</button><button class="btn ghost" data-x>إغلاق</button></div></div>`,{onMount(m){
          m.querySelector('.panel').style.cssText='background:transparent;border:0;box-shadow:none;max-width:420px';
          const fx=FX(); if(fx){ fx.aura(m.querySelector('.tcg'),c.tier); fx.sound(c,{volume:.7}); }
          m.querySelector('[data-x]').onclick=()=>m.remove();
          m.querySelector('[data-fx]').onclick=()=>{ const f=FX(); if(f){ f.setEnabled(true); f.sound(c); f.visual(c); } };
        }}); });
    };
    $('#guide-filters').innerHTML=tiers.map(([k,l])=>`<span class="pill ${k===guideTier?'hot':''}" style="cursor:pointer" data-k="${k}">${l}</span>`).join('');
    $$('#guide-filters .pill').forEach(b=>b.onclick=()=>{ guideTier=b.dataset.k; $$('#guide-filters .pill').forEach(x=>x.classList.toggle('hot',x.dataset.k===guideTier)); draw(); play('tick',{volume:.4}); });
    draw();
  }

  // واجهة اختبار للتطوير
  window.DAHOOM_DEBUG = { reveal:id=>revealCard(DATA.cards.find(c=>c.id===id),'test'), state:()=>G, settings:()=>S, cur:()=>cur(), give:(i,id)=>{ G.teams[i].hand.push(DATA.cards.find(c=>c.id===id)); renderBoard(); turnIntro(); }, turnIntro:()=>turnIntro(), addScore:(i,n)=>addScore(G.teams[i],n), afterTurn:m=>afterTurn(m), nextTurn:()=>nextTurn() };

  // ---------- ربط ----------
  document.addEventListener('DOMContentLoaded',()=>{
    renderSettings();
    $('#btn-defaults').onclick=()=>{ S=JSON.parse(JSON.stringify(DEFAULTS)); saveS(); renderSettings(); toast('رجعت الإعدادات الافتراضية'); };
    $('#btn-start').onclick=()=>{ if(D.competitors().length<2){ toast('نحتاج فريقين على الأقل'); go('lobby'); return; } play('cheer',{volume:.5}); newGame(); };
    $('#btn-again').onclick=()=>newGame();
    $('#btn-adjust').onclick=adjustModal;
    $('#btn-help').onclick=helpModal;
    $('#btn-guide-alf').onclick=e=>{ e.stopPropagation(); renderGuide(); go('guide-alf'); };
    $('#btn-guide-play').onclick=()=>$('#card-alf').click();
    $('#btn-skip').onclick=async ()=>{ if(!G) return; if(await confirmBox(`<h3>تخطي دور ${esc(cur().name)}؟</h3>`,'تخطي','لا')){ clearTimer(); stopAll(); nextTurn(); } };
    $('#btn-quit').onclick=async ()=>{ if(await confirmBox('<h3>تنهي المباراة؟</h3><p class="muted">بتروح النقاط الحالية.</p>','أنهِ','كمّل','btn-bad')){ clearTimer(); stopAll(); go('home'); } };
  });
})();
