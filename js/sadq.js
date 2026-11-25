/* ===== لعبة «ما أصدقك» — خداع وكشف =====
   كل لاعب: ورقتين شخصيات مقلوبة (حياتين) + ريالات. بدورك تسوي حركة، وأغلب الحركات تحتاج تدّعي شخصية
   (تقدر تكذب). أي أحد يقدر يقول «ما أصدقك»: الكذّاب يخسر ورقة، واللي كشف غلط يخسر ورقة.
   الحركات اللي على لاعب يقدر يصدها بشخصية ثانية، والصد نفسه ينكشف. آخر واحد عنده ورقة يفوز.
   الأوراق سرية: كل لاعب يلعب من جواله، والشاشة تعرض الطاولة.
*/
window.DahoomSadq = (function(){
  const D = window.Dahoom, DATA = window.DAHOOM_DATA.sadq;
  const { $, $$, rnd, shuffle, esc, ic, store, play, stopAll, go, toast, modal, confirmBox, confetti } = D;
  const NET = () => window.DahoomNet;
  const FAST = () => !!window.DAHOOM_SQ_FAST;
  const sleep = ms => D.sleep(FAST() ? 0 : ms);
  const DEFAULTS = { events:true, startCoins:2, speed:10 };
  let S = Object.assign({}, DEFAULTS, store.get('sadq_settings', {}));
  let G = null;
  const RL = k => DATA.roles[k], AC = k => DATA.actions[k];
  const alive = () => G.players.filter(p=>!p.out);
  const cur = () => G.players[G.turn];
  const byId = id => G.players.find(p=>p.id===id);
  const hidden = p => p.cards.filter(c=>!c.up);
  const phoneOf = p => { const n=NET(); return !!(n && n.hasPhone && n.hasPhone(p.id)); };
  const onlineOf = p => { const n=NET(); return !!(n && (n.isOnline ? n.isOnline(p.id) : n.hasPhone && n.hasPhone(p.id))); };
  // اللاعب اللي فصل نته أو طلع: ننتظره شوي، ولو ما رجع نمشّي دوره بدل ما الكل ينتظر الوقت كامل
  const ABSENT_MS = 15000;
  const pushAll = () => { const n=NET(); if(n) n.pushAll(); };
  const ev = id => !!(G && G.event && G.event.id===id);
  const tardCost = () => ev('takhfid') ? DATA.tardSale : DATA.tardCost;
  const winMs = () => (FAST() ? 30 : (S.speed||10)*1000);
  const roleChip = k => `<span class="sq-rchip" style="--rc:${RL(k).color}">${ic(RL(k).icon)}${esc(RL(k).name)}</span>`;
  const who = p => `<b class="sq-who" style="--c:${p.color}">${esc(p.name)}</b>`;
  const ART = k => (window.DahoomSqArt ? window.DahoomSqArt.portrait(k) : '');
  const CARD = k => { const r=RL(k), A=AC(r.act); return window.DahoomSqArt ? window.DahoomSqArt.card(k, { name:r.name, color:r.color, icon:r.icon, move:A.name, desc:A.desc, block:r.block?AC(r.block).name:'' }) : `<b>${esc(r.name)}</b>`; };
  const BACK = () => (window.DahoomSqArt ? window.DahoomSqArt.back() : '');
  // الورقة الكبيرة بوسط السجادة
  const big = (k, cls='') => `<div class="sq-big lux ${cls}" style="--rc:${RL(k).color}">${CARD(k)}</div>`;
  function claimHTML(p, role, note){
    return `<div class="sq-claim">${big(role)}<div class="sq-claim-t"><span>${who(p)} يقول إنه</span><strong style="--rc:${RL(role).color}">${esc(RL(role).name)}</strong><em>${note||''}</em></div></div>`;
  }
  function suspenseHTML(claimer, role, ch, note, roll){
    return `<div class="sq-claim sus ${roll?'roll':''}"><div class="sq-big lux">${BACK()}</div><div class="sq-claim-t"><span>${who(ch)} قال لـ ${who(claimer)}</span><strong class="sq-callout">ما أصدقك!</strong><em>${note}</em></div></div>`;
  }
  function revealHTML(claimer, role, truth){
    return `<div class="sq-claim rev ${truth?'truth':'lie'}"><div class="sq-big flip" style="--rc:${RL(role).color}"><span class="sq-fb">${BACK()}</span><span class="sq-ff">${CARD(role)}</span><span class="sq-stamp">${truth?'صادق':'كذّاب'}</span></div>
      <div class="sq-claim-t"><span>${who(claimer)}</span><strong>${truth?'طلع صادق!':'انكشف!'}</strong><em>${truth?`عنده ${roleChip(role)} فعلاً`:`ما عنده ${roleChip(role)}`}</em></div></div>`;
  }
  // صندوق المجلس: كومة ريالات تكبر فوق الصندوق
  const COINS=[[44,40],[64,41],[80,39],[54,35],[72,34],[60,29],[32,41],[90,41],[46,30],[78,29],[62,24],[54,19]];
  function chestHTML(pot){
    const n=Math.min(pot, COINS.length);
    return `<svg class="sq-chest-svg" viewBox="0 0 120 90" aria-hidden="true"><path d="M20 47L27 20H93L100 47Z" fill="#4A2814"/><path d="M27 20H93" stroke="#E3A43A" stroke-width="3"/>
      ${COINS.slice(0,n).map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="9" ry="3.6" fill="#F2C14E" stroke="#B9831F" stroke-width="1.3"/>`).join('')}
      <rect x="16" y="46" width="88" height="38" rx="5" fill="#7A4626"/><rect x="16" y="46" width="88" height="7" rx="2" fill="#5A3119"/><rect x="30" y="46" width="6" height="38" fill="#E3A43A"/><rect x="84" y="46" width="6" height="38" fill="#E3A43A"/><rect x="53" y="58" width="14" height="13" rx="2" fill="#E3A43A"/><circle cx="60" cy="63.5" r="2.2" fill="#4A2814"/></svg>
      <span class="sq-chest-n"><small>صندوق المجلس</small><b id="sq-pot">${pot}</b></span>`;
  }
  // أماكن الجلسة حول السجادة: أول لاعب تحت، وبعدين مع عقارب الساعة
  const seatPos = (i, n) => { const a=Math.PI/2 + i*2*Math.PI/n; return [50+38*Math.cos(a), 50+39*Math.sin(a)]; };
  function layoutSeats(){
    const M=$('#sq-majlis'); if(!M || !G) return;
    if(matchMedia('(max-width:1000px)').matches){ M.querySelectorAll('.sq-seat').forEach(s=>{ s.style.left=s.style.top=''; }); return; }
    const W=M.clientWidth, H=M.clientHeight, seats=[...M.querySelectorAll('.sq-seat')], n=seats.length; if(!n || !W) return;
    const gap=18, w=Math.max(...seats.map(s=>s.offsetWidth)), h=Math.max(...seats.map(s=>s.offsetHeight));
    const R=Math.max(document.body.classList.contains('own-split')?115:150, Math.min(W/2-w-gap-8, H/2-h-gap-8, 330));
    M.style.setProperty('--rr', R+'px');
    seats.forEach((s,i)=>{ const a=Math.PI/2 + i*2*Math.PI/n, c=Math.cos(a), sn=Math.sin(a);
      const d=R+gap+(s.offsetWidth/2)*Math.abs(c)+(s.offsetHeight/2)*Math.abs(sn);
      s.style.left=(W/2+d*c).toFixed(1)+'px'; s.style.top=(H/2+d*sn).toFixed(1)+'px'; });
  }
  window.addEventListener('resize', ()=>{ if(G) layoutSeats(); });

  // ---------- السجل ----------
  function log(p, x, k, ic2){
    const e={ n:p?p.name:'', c:p?p.color:'', av:p?p.avatar:'', x, k:k||'', ic:ic2||'', ts:Date.now() };
    G.log.push(e); if(G.log.length>80) G.log.shift();
    D.feed(e); renderLog(); pushAll();
  }
  function renderLog(){
    const el=$('#sq-log'); if(!el||!G) return;
    el.innerHTML = G.log.slice(-26).reverse().map(e=>`<div class="sq-lg ${e.k}" style="--c:${e.c||'transparent'}">${e.ic?`<i>${ic(e.ic)}</i>`:''}<span>${e.n?`<b>${esc(e.n)}</b> `:''}${esc(e.x)}</span></div>`).join('')
      || '<div class="sq-lg"><span>هنا يطلع كل شي: وش صار بالمجلس، ومين كشف مين</span></div>';
  }

  // ---------- الكومة ----------
  function newDeck(){ const d=[]; DATA.order.forEach(k=>{ for(let i=0;i<DATA.copies;i++) d.push(k); }); return shuffle(d); }
  function draw(){ if(!G.deck.length) G.deck=newDeck(); return G.deck.pop(); }
  function toDeck(r){ G.deck.push(r); G.deck=shuffle(G.deck); }

  // ---------- العرض على الشاشة ----------
  function stage(html){ G.stageHtml=html; const s=$('#sq-stage'); if(s) s.innerHTML=html; pushAll(); }
  function wait(label, ms){ G.wait = ms ? { label, until:Date.now()+ms, ms } : null; renderWait(); pushAll(); }
  let waitRaf=0;
  function renderWait(){
    const el=$('#sq-wait'); if(!el) return; cancelAnimationFrame(waitRaf);
    if(!G || !G.wait){ el.innerHTML=''; el.classList.remove('on'); return; }
    el.classList.add('on'); el.innerHTML=`<span>${esc(G.wait.label)}</span><i class="sq-incense"><b id="sq-wbar"></b></i>`;
    const f=()=>{ if(!G || !G.wait) return; const left=Math.max(0, G.wait.until-Date.now()); const b=$('#sq-wbar'); if(b) b.style.width=(left/G.wait.ms*100).toFixed(2)+'%'; if(left>0) waitRaf=requestAnimationFrame(f); };
    waitRaf=requestAnimationFrame(f);
  }
  function cardHTML(c, opts={}){
    if(!c.up && !opts.show) return `<span class="sq-card lux" aria-label="ورقة مقلوبة">${BACK()}</span>`;
    const r=RL(c.r);
    return `<span class="sq-card lux ${c.up?'dead':''}" style="--rc:${r.color}" aria-label="${esc(r.name)}">${CARD(c.r)}</span>`;
  }
  function render(){
    if(!G) return;
    const el=$('#sq-seats'); if(el){
      el.innerHTML=G.players.map((p,i)=>{ const [x,y]=seatPos(i, G.players.length); return `<div class="sq-seat ${p===cur()&&!G.over?'turn':''} ${p.out?'out':''} ${G.act&&G.act.target===p.id?'aim':''}" style="--c:${p.color};--x:${x.toFixed(1)};--y:${y.toFixed(1)}">
        <div class="sq-sh">${p.avatar?`<img src="${D.avatarSrc(p.avatar)}" alt="">`:''}<b>${esc(p.name)}</b>${phoneOf(p)?'':`<em class="sq-nophone">${ic('phone')} ما اتصل</em>`}</div>
        <div class="sq-cards">${p.cards.map(c=>cardHTML(c)).join('')}</div>
        <div class="sq-sf"><span class="sq-coins">${ic('coins')}<b>${p.coins}</b></span>${p.loan?`<span class="sq-tag bad">${ic('hm-cash')} عليه سلفة</span>`:''}${p.out?`<span class="sq-tag">${ic('skull')} طلع</span>`:''}</div></div>`; }).join('');
      layoutSeats();
    }
    const chest=$('#sq-chest'); if(chest && chest.dataset.n!==String(G.pot)){ chest.dataset.n=G.pot; chest.innerHTML=chestHTML(G.pot); }
    const dk=$('#sq-deckpile'); if(dk) dk.innerHTML=`<span class="sq-pile">${'<i></i>'.repeat(Math.max(1, Math.min(4, Math.ceil(G.deck.length/4))))}</span><span class="sq-chest-n"><small>الكومة</small><b>${G.deck.length}</b></span>`;
    const rd=$('#sq-round'); if(rd) rd.textContent='اللفة '+G.round;
    const evb=$('#sq-event'); if(evb){ const E=G.event; evb.innerHTML = E ? `<span class="sq-evi">${ic(E.icon)}</span><span><small>حدث المجلس</small><b>${esc(E.name)}</b><em>${esc(E.desc)}</em></span>` : `<span class="sq-evi">${ic('star')}</span><span><small>حدث المجلس</small><b>اللفة الأولى</b><em>الأحداث تبدأ من اللفة الثانية</em></span>`; evb.classList.toggle('off', !S.events); }
    renderLog(); pushAll();
  }

  // ---------- أسئلة الجوالات ----------
  // سؤال لاعب واحد. لو ما رد قبل الوقت ناخذ def
  function askOne(p, spec, ms, def){
    return new Promise(res=>{
      const n=NET(); let done=false, rid=null, tm=null;
      let iv=null, gone=0, saved=null;
      const finish=v=>{ if(done) return; done=true; clearTimeout(tm); clearInterval(iv); if(rid && n) n.cancel(rid); res(v); };
      if(!G || G.over || p.out){ return finish(def); }
      if(n && phoneOf(p)) rid=n.ask(p.id, Object.assign({ sq:true, ms:ms||0 }, spec), v=>finish(v==null||v<0 ? def : (spec.options[v]||{}).v));
      if(ms) tm=setTimeout(()=>finish(def), FAST()?5:ms);
      if(ms && n && !FAST()) iv=setInterval(()=>{
        if(done || !G || G.over) return;
        if(onlineOf(p)){ if(gone){ gone=0; if(G.wait===saved.now) wait(saved.old && saved.old.label, saved.old ? Math.max(1000, saved.old.until-Date.now()) : 0); } return; }
        gone+=1000;
        if(gone===1000){ saved={ old:G.wait }; wait(`${p.name} مو متصل — ننتظره شوي`, ABSENT_MS); saved.now=G.wait; }
        if(gone>=ABSENT_MS){ log(p, 'ما رجع اتصاله — مشّينا دوره تلقائي', 'ev', 'phone'); finish(def); }
      }, 1000);
      G.finishers.push(()=>finish(def));
    });
  }
  // نافذة للكل: أول واحد يختار شي غير «مرّها» ياخذها. لو الكل مرّرها أو خلص الوقت = null
  function askAll(list, specOf, ms){
    return new Promise(res=>{
      const n=NET(); let done=false, left=new Set(list.map(p=>p.id)); const rids=[]; let tm=null;
      const finish=v=>{ if(done) return; done=true; clearTimeout(tm); if(n) rids.forEach(r=>n.cancel(r)); res(v); };
      if(!list.length) return finish(null);
      list.forEach(p=>{ const sp=specOf(p);
        if(n && phoneOf(p)) rids.push(n.ask(p.id, Object.assign({ sq:true, ms }, sp), v=>{ const o=sp.options[v]; if(o && o.v!=null && o.v!=='pass') finish({ p, v:o.v }); else { left.delete(p.id); if(!left.size) finish(null); } }));
        else left.delete(p.id); });
      if(!left.size) return finish(null);
      tm=setTimeout(()=>finish(null), FAST()?5:ms);
      G.finishers.push(()=>finish(null));
    });
  }
  // نجمع ردود الكل لين يخلص الوقت (للشهود)
  function askCollect(list, specOf, ms){
    return new Promise(res=>{
      const n=NET(); const out=new Map(); const rids=[]; let done=false, tm=null, left=new Set(list.map(p=>p.id));
      const finish=()=>{ if(done) return; done=true; clearTimeout(tm); if(n) rids.forEach(r=>n.cancel(r)); res(out); };
      list.forEach(p=>{ const sp=specOf(p);
        if(n && phoneOf(p)) rids.push(n.ask(p.id, Object.assign({ sq:true, ms }, sp), v=>{ const o=sp.options[v]; if(o && o.v!=='pass') out.set(p.id, o.v); left.delete(p.id); if(!left.size) finish(); }));
        else left.delete(p.id); });
      if(!left.size) return finish();
      tm=setTimeout(finish, FAST()?5:ms);
      G.finishers.push(finish);
    });
  }
  const tell = (p, msg) => { const n=NET(); if(n) n.send(p.id, { t:'notice', msg }); };

  // ---------- خسارة ورقة ----------
  async function loseCard(p, why){
    const h=hidden(p); if(!h.length || p.out) return;
    let c=h[0];
    if(h.length>1){
      wait(`${p.name} يختار أي ورقة يكشف`, 20000);
      const i=await askOne(p, { title:'تخسر ورقة', text:`${why}. اختار أي ورقة تنكشف وتطلع منك:`, options:h.map((x,k)=>({ v:k, label:RL(x.r).name, icon:RL(x.r).icon, color:RL(x.r).color, cls:'plain' })) }, 20000, Math.floor(Math.random()*h.length));
      c=h[i] || h[0];
    }
    c.up=true; p.stats.lost++; play('fail',{volume:.55});
    log(p, `خسر ورقة: ${RL(c.r).name} — ${why}`, 'bad', RL(c.r).icon);
    stage(`<div class="sq-claim lost">${big(c.r, 'dead')}<div class="sq-claim-t"><span>${who(p)}</span><strong>خسر ورقة</strong><em>${esc(why)}</em></div></div>`);
    if(!hidden(p).length){ p.out=true; G.outOrder.push(p.id); log(p, 'طلع من المجلس — ما بقى له أوراق', 'bad', 'skull'); play('out',{volume:.6}); tell(p, 'طلعت من المجلس — تابع الباقين'); }
    wait(null); render(); await sleep(1300);
  }

  // ---------- الكشف «ما أصدقك» ----------
  // يرجّع 'truth' (صادق) أو 'lie' (كذّاب) أو null (ما أحد كشفه)
  async function challengeWindow(claimer, role, isBlock){
    const others=alive().filter(x=>x!==claimer);
    G.act.stage = isBlock ? 'block-ch' : 'ch'; render();
    wait(`أحد يقول «ما أصدقك» على ${claimer.name}؟`, winMs());
    { const A0=AC(G.act.k), t0=G.act.target?byId(G.act.target):null;
      stage(claimHTML(claimer, role, isBlock ? `يصد ${esc(A0.name)} — أحد ما يصدقه؟` : `${esc(A0.name)}${t0?` على ${who(t0)}`:''} — أحد ما يصدقه؟`)); }
    const r=await askAll(others, p=>({ title:`${claimer.name} يقول إنه ${RL(role).name}`, text: isBlock ? `يبي يصد الحركة. تصدقه؟` : `${AC(G.act.k).name}${G.act.target?` على ${byId(G.act.target).name}`:''}. تصدقه؟`, claim:role,
      options:[{ v:'ch', label:'ما أصدقك', icon:'search', cls:'btn-bad' },{ v:'pass', label:'أصدقه', cls:'plain' }] }), winMs());
    wait(null);
    if(!r || !G || G.over) return null;
    const ch=r.p; G.act.challenger=ch.id; render(); play('challenge',{volume:.7});
    log(ch, `قال لـ ${claimer.name}: ما أصدقك (${RL(role).name})`, 'info', 'search');
    // الشهود: الباقين يقدرون يراهنون بريال
    const wit=alive().filter(x=>x!==claimer && x!==ch);
    let votes=new Map();
    if(wit.length){
      stage(suspenseHTML(claimer, role, ch, 'الشهود يقررون: صادق ولا كذّاب؟'));
      wait('الشهود: صادق ولا كذّاب؟', Math.round(winMs()*0.7));
      votes=await askCollect(wit, p=>({ title:`${ch.name} كشف ${claimer.name}`, text:`${claimer.name} يقول إنه ${RL(role).name}. تشهد؟ اللي يشهد صح ياخذ 1، واللي يشهد غلط يدفع 1 للصندوق.`, claim:role,
        options:[{ v:'t', label:'صادق', icon:'check', cls:'btn-mint' },{ v:'f', label:'كذّاب', icon:'cancel', cls:'btn-bad' },{ v:'pass', label:'ما أشهد', cls:'plain' }] }), Math.round(winMs()*0.7));
      wait(null);
    }
    if(!G || G.over) return null;
    const card=hidden(claimer).find(c=>c.r===role), truth=!!card;
    // لحظة الحقيقة: طبل، والورقة ترجف، وبعدين تنقلب
    stage(suspenseHTML(claimer, role, ch, `يقول إنه ${roleChip(role)}… نشوف`, true)); play('drumroll',{volume:.6}); await sleep(1400);
    if(!G || G.over) return null;
    // الشهود
    votes.forEach((v,id)=>{ const w=byId(id); if(!w) return; const right=(v==='t')===truth;
      if(right){ w.coins+=1; w.stats.witRight++; } else { const pay=Math.min(1,w.coins); w.coins-=pay; G.pot+=pay; w.stats.witWrong++; } });
    if(votes.size){ const R=[...votes].filter(([id,v])=>(v==='t')===truth).map(([id])=>byId(id).name), W=[...votes].filter(([id,v])=>(v==='t')!==truth).map(([id])=>byId(id).name);
      log(null, `الشهود: ${R.length?R.join('، ')+(R.length>1?' شهدوا':' شهد')+' صح (+1)':''}${R.length&&W.length?' · ':''}${W.length?W.join('، ')+(W.length>1?' شهدوا':' شهد')+' غلط (−1)':''}`, 'info', 'team'); }
    if(truth){
      G.act.reveal=role; claimer.stats.truthCaught++; ch.stats.chLost++;
      stage(revealHTML(claimer, role, true)); play('correct',{volume:.6});
      log(claimer, `كان صادق — عنده ${RL(role).name}`, 'good', RL(role).icon);
      // الورقة ترجع للكومة ويسحب بدالها
      claimer.cards.splice(claimer.cards.indexOf(card),1); toDeck(role); claimer.cards.push({ r:draw(), up:false });
      tell(claimer, 'ورقتك رجعت للكومة وسحبت ورقة جديدة');
      render(); await sleep(1600); G.act.reveal=null;
      if(ev('taftish') && ch.coins>=2){ ch.coins-=2; G.pot+=2; log(ch, 'حملة تفتيش: دفع 2 للصندوق بدل ما يخسر ورقة', 'bad', 'search'); render(); await sleep(900); }
      else { claimer.stats.taken++; await loseCard(ch, `كشف ${claimer.name} وطلع صادق`); }
      return 'truth';
    }
    ch.stats.chWon++; claimer.stats.liesCaught++;
    stage(revealHTML(claimer, role, false)); play('wrong',{volume:.6});
    log(claimer, `انفضح — ما عنده ${RL(role).name}`, 'bad', 'cancel');
    ch.stats.taken++; await sleep(1800);
    await loseCard(claimer, `انكشف كذبه`);
    return 'lie';
  }

  // ---------- الحركة ----------
  function actionOptions(p){
    const force = p.coins>=DATA.forceAt;
    return DATA.actionOrder.map(k=>{ const A=AC(k);
      let dis = false, why='';
      if(force && k!=='tard'){ dis=true; why=`معك ${DATA.forceAt} أو أكثر — لازم تطرد`; }
      if(k==='tard' && p.coins<tardCost()){ dis=true; why=`تحتاج ${tardCost()}`; }
      if(A.cost && k!=='tard' && p.coins<A.cost){ dis=true; why=`تحتاج ${A.cost}`; }
      if(k==='salfa' && p.loan){ dis=true; why='عليك سلفة'; }
      if((k==='nashl' || k==='mukhalafa') && ev('hazr')){ dis=true; why='حظر تجوّل'; }
      if(k==='wasta' && G.pot<=0){ dis=true; why='الصندوق فاضي'; }
      const desc = k==='tard' ? `ادفع ${tardCost()} للصندوق ولاعب يخسر ورقة. ما ينصد` : k==='dawam' && ev('rawatib') ? 'خذ 2 من البنك (يوم رواتب)' : A.desc;
      return { v:k, label:A.name, icon:A.icon, role:A.role||'', sub: dis ? why : desc, dis, color:A.role?RL(A.role).color:'#5E6472' };
    });
  }
  async function chooseAction(p){
    for(;;){
      wait(`${p.name} يختار حركته`, 60000);
      const opts=actionOptions(p);
      const def = p.coins>=DATA.forceAt ? 'tard' : 'dawam';
      const k=await askOne(p, { title:'دورك — وش تسوي؟', text:'الحركات اللي عليها شخصية تقدر تسويها حتى لو ما هي عندك… بس انتبه لا ينكشف كذبك.', grid:true, options:opts }, 60000, def);
      wait(null);
      if(!G || G.over) return null;
      const A=AC(k); if(!A) continue;
      const o=opts.find(x=>x.v===k); if(o && o.dis && k!==def) continue;
      if(!A.target) return { k };
      const targets=alive().filter(x=>x!==p && (k!=='mubadala' || hidden(x).length));
      if(!targets.length) return { k:'dawam' };
      wait(`${p.name} يختار على مين`, 30000);
      const t=await askOne(p, { title:`${A.name} — على مين؟`, cancel:'رجوع', options:targets.map(x=>({ v:x.id, label:x.name, sub:`${x.coins} ريال · ${hidden(x).length} ${hidden(x).length===1?'ورقة':'ورقتين'}`, color:x.color, cls:'plain' })) }, 30000, rnd(targets).id);
      wait(null);
      if(!G || G.over) return null;
      if(t==null) continue;
      return { k, target:byId(t) };
    }
  }
  async function perform(p, a){
    const A=AC(a.k), t=a.target||null;
    G.act={ by:p.id, k:a.k, target:t?t.id:null, claim:A.role, stage:'declare' };
    const cost = a.k==='tard' ? tardCost() : (A.cost||0);
    if(cost){ p.coins-=cost; G.pot+=cost; }
    if(A.role){ if(!hidden(p).some(c=>c.r===A.role)) p.stats.lies++; else p.stats.truths++; }
    play('card',{volume:.6});
    if(A.role || t || cost) log(p, `${A.role?`يقول إنه ${RL(A.role).name} ويسوي `:''}${A.name}${t?` على ${t.name}`:''}${cost?` (دفع ${cost} للصندوق)`:''}`, 'act', A.icon);
    stage(A.role ? claimHTML(p, A.role, `${esc(A.name)}${t?` على ${who(t)}`:''}`) : `<div class="sq-msg">${who(p)} <b>${esc(A.name)}</b>${t?` على ${who(t)}`:''}</div>`);
    render(); await sleep(900);
    if(A.role){ const r=await challengeWindow(p, A.role, false); if(r==='lie' || p.out || !G || G.over) return; }
    if(A.blockedBy && t && !t.out){
      G.act.stage='block'; render();
      wait(`${t.name}: يصد ولا لا؟`, winMs());
      stage(`<div class="sq-msg">${who(t)} يقدر يصد بـ ${roleChip(A.blockedBy)}</div>`);
      const b=await askOne(t, { title:`${p.name} يسوي عليك ${A.name}`, text:`${A.desc}. تقدر تصدها لو تقول إنك ${RL(A.blockedBy).name} (حتى لو مو عندك).`, claim:A.blockedBy,
        options:[{ v:true, label:`أصد — أنا ${RL(A.blockedBy).name}`, icon:RL(A.blockedBy).icon, cls:'btn-hype' },{ v:false, label:'خلّها تمشي', cls:'plain' }] }, winMs(), false);
      wait(null);
      if(!G || G.over) return;
      if(b){
        G.act.blocker=t.id; G.act.stage='blocked';
        if(!hidden(t).some(c=>c.r===A.blockedBy)) t.stats.lies++; else t.stats.truths++;
        log(t, `صد الحركة — يقول إنه ${RL(A.blockedBy).name}`, 'act', RL(A.blockedBy).icon);
        stage(claimHTML(t, A.blockedBy, `يصد ${esc(A.name)}`)); play('fx_deny',{volume:.5}); render(); await sleep(800);
        const r=await challengeWindow(t, A.blockedBy, true);
        if(!G || G.over) return;
        if(r!=='lie'){ log(null, `${A.name} انصدّت`, 'info', 'defense'); stage(`<div class="sq-msg">${esc(A.name)} انصدّت</div>`); await sleep(900); return; }
        if(p.out) return;
      }
    }
    if(t && t.out) { log(null, `${t.name} طلع قبل ما تمشي الحركة`, 'info'); return; }
    await effect(p, a.k, t);
  }
  async function effect(p, k, t){
    G.act.stage='done';
    if(k==='dawam'){ const v=ev('rawatib')?2:1; p.coins+=v; p.stats.earned+=v; log(p, `دوام: +${v}`, 'good', 'hm-briefcase'); play('coin',{volume:.4}); }
    else if(k==='salfa'){ p.coins+=DATA.loanTake; p.loan=true; p.stats.earned+=DATA.loanTake; log(p, `أخذ سلفة: +${DATA.loanTake} (يرجّع ${DATA.loanPay} دوره الجاي)`, 'info', 'hm-cash'); play('coin',{volume:.4}); }
    else if(k==='tijara'){ p.coins+=3; p.stats.earned+=3; log(p, 'تجارة: +3', 'good', 'coins'); play('coin',{volume:.5}); }
    else if(k==='wasta'){ const v=Math.min(G.pot, DATA.wastaMax); G.pot-=v; p.coins+=v; p.stats.earned+=v; log(p, `واسطة: أخذ ${v} من الصندوق`, 'good', 'phone'); play('bonus',{volume:.5}); }
    else if(k==='nashl'){ const v=Math.min(2, t.coins); t.coins-=v; p.coins+=v; p.stats.earned+=v; log(p, `نشل ${v} من ${t.name}`, 'bad', 'ninja'); play('snatch',{volume:.5}); tell(t, `${p.name} نشل منك ${v}`); }
    else if(k==='mukhalafa'){ const v=Math.min(2, t.coins); t.coins-=v; G.pot+=v; log(t, `دفع مخالفة ${v} للصندوق`, 'bad', 'hm-siren'); play('pay',{volume:.5}); }
    else if(k==='tard' || k==='fadiha'){ p.stats.taken++; render(); await loseCard(t, k==='tard' ? `${p.name} طرده` : `${p.name} بلّغ عليه`); }
    else if(k==='istishara'){
      const drawn=[draw(), draw()], h=hidden(p);
      const opts=[{ v:-1, label:'خلّ أوراقي', cls:'plain' }];
      h.forEach((c,i)=>drawn.forEach((d,j)=>opts.push({ v:i*10+j, label:`بدّل ${RL(c.r).name} بـ ${RL(d).name}`, icon:RL(d).icon, color:RL(d).color, cls:'plain' })));
      wait(`${p.name} يستشير…`, 30000);
      const v=await askOne(p, { title:'استشارة', text:`سحبت: ${drawn.map(d=>RL(d).name).join(' و ')}. تبدّل وحدة من أوراقك؟`, options:opts }, 30000, -1);
      wait(null);
      if(v!=null && v>=0){ const c=h[Math.floor(v/10)], d=drawn[v%10]; const old=c.r; c.r=d; drawn[v%10]=old; log(p, 'بدّل ورقة من الكومة', 'info', 'hm-gavel'); }
      else log(p, 'ما بدّل شي', 'info', 'hm-gavel');
      drawn.forEach(toDeck);
    }
    else if(k==='mubadala'){
      const th=hidden(t); if(!th.length || !hidden(p).length) return;
      const got=rnd(th); t.cards.splice(t.cards.indexOf(got),1); p.cards.push({ r:got.r, up:false });
      const mine=hidden(p);
      wait(`${p.name} يختار وش يعطي ${t.name}`, 25000);
      const i=await askOne(p, { title:`أخذت من ${t.name}: ${RL(got.r).name}`, text:`اختار وش تعطيه من أوراقك:`, options:mine.map((c,k2)=>({ v:k2, label:RL(c.r).name, icon:RL(c.r).icon, color:RL(c.r).color, cls:'plain' })) }, 25000, 0);
      wait(null);
      const give=mine[i]||mine[0]; p.cards.splice(p.cards.indexOf(give),1); t.cards.push({ r:give.r, up:false });
      log(p, `بادل ورقة مع ${t.name}`, 'info', 'hm-exchange'); play('game:g_swoosh',{volume:.5});
      tell(t, `${p.name} أخذ منك ${RL(got.r).name} وعطاك ${RL(give.r).name}`);
    }
    render(); await sleep(700);
  }

  // ---------- الدور ----------
  async function turn(){
    if(!G || G.over) return;
    const p=cur(); if(p.out) return next();
    G.act=null; render();
    stage(`<div class="sq-msg">دور ${who(p)}</div>`); play('turn',{volume:.5});
    if(p.loan){ p.loan=false;
      if(p.coins>=DATA.loanPay){ p.coins-=DATA.loanPay; G.pot+=DATA.loanPay; log(p, `سدد السلفة: ${DATA.loanPay} للصندوق`, 'info', 'hm-cash'); render(); await sleep(700); }
      else { const v=p.coins; p.coins=0; G.pot+=v; log(p, 'ما قدر يسدد السلفة', 'bad', 'hm-cash'); await loseCard(p, 'ما سدد السلفة'); if(p.out) return next(); }
    }
    const a=await chooseAction(p); if(!G || G.over || !a) return;
    await perform(p, a);
    if(!G || G.over) return;
    G.act=null; render(); await sleep(400);
    next();
  }
  function next(){
    if(!G || G.over) return;
    if(alive().length<=1) return endMatch();
    let n=G.turn;
    do{ n=(n+1)%G.players.length; if(n===0) newRound(); }while(G.players[n].out);
    G.turn=n; turn();
  }
  function newRound(){
    G.round++;
    if(!S.events){ G.event=null; return; }
    let E=rnd(DATA.events); if(G.event && E.id===G.event.id) E=rnd(DATA.events);
    G.event=E; play('game:g_gong',{volume:.4,max:1500});
    log(null, `حدث المجلس: ${E.name} — ${E.desc}`, 'ev', E.icon);
    if(E.id==='zakat') alive().forEach(x=>{ if(x.coins>=7){ x.coins-=2; G.pot+=2; log(x, 'دفع زكاة 2 للصندوق', 'info', 'coins'); } });
    if(E.id==='malyan'){ G.pot+=3; }
    toast(`حدث المجلس: ${E.name}`, 3000);
  }

  // ---------- البداية والنهاية ----------
  function startMatch(){
    // اللي جوالاتهم متصلة الحين أول — لاعبين قدامى من جلسة قبل (مو متصلين) كانوا ياخذون مكان ويوقفون البداية
    const n0=NET(), all=D.competitors(), live=n0 ? all.filter(c=>n0.hasPhone(c.id)) : [];
    const comps=(live.length>=2 ? live : all).slice(0,6);
    if(comps.length<2){ toast('نحتاج لاعبين اثنين على الأقل'); go('lobby'); return; }
    const n=NET(); const noPhone=comps.filter(c=>!(n && n.hasPhone(c.id)));
    if(noPhone.length && !window.DAHOOM_SQ_FAST){ toast(`الأوراق سرية — لازم كل لاعب يدخل من جواله: ${noPhone.map(c=>c.name).join('، ')}`, 5000); return; }
    $('#overlay-root').innerHTML='';
    G={ players:shuffle(comps.map(c=>({ id:c.id, name:c.name, color:c.color, avatar:c.avatar||((c.players||[])[0]||{}).avatar||'', players:c.players||[], coins:S.startCoins, cards:[], out:false, loan:false,
          stats:{ lies:0, truths:0, liesCaught:0, truthCaught:0, chWon:0, chLost:0, witRight:0, witWrong:0, taken:0, lost:0, earned:0 } }))),
        deck:newDeck(), pot:DATA.potStart, turn:0, round:1, event:null, act:null, log:[], outOrder:[], finishers:[], stageHtml:'', wait:null, over:false, t0:Date.now() };
    G.players.forEach(p=>{ p.cards=[{ r:draw(), up:false }, { r:draw(), up:false }]; });
    if(n) n.use({ teams:()=>G.players, state:phoneState, onPhones:()=>render(), roster:()=>{} });
    go('sadq'); render();
    log(null, 'بدأ المجلس — كل واحد معه ورقتين و'+S.startCoins+' ريال', 'ev', 'star');
    play('game:g_mkcount',{volume:.5,max:2500});
    setTimeout(turn, FAST()?0:900);
  }
  function stopGame(){ if(!G) return; G.over=true; const f=G.finishers.splice(0); f.forEach(x=>{ try{ x(); }catch(e){} }); G.wait=null; stopAll(); }
  function rankList(){
    const out=G.outOrder.map(byId).filter(Boolean).reverse();
    const living=alive().sort((a,b)=>hidden(b).length-hidden(a).length || b.coins-a.coins);
    return [...living, ...out];
  }
  function endMatch(){
    if(!G || G.over) return; stopGame();
    const rank=rankList(), w=rank[0]; G.final=rank.map(p=>p.id);
    go('results'); play('win'); setTimeout(()=>play('applause',{volume:.6}),1200); confetti(300,5000);
    $('#winner-title').innerHTML=`<span class="who" style="--c:${w.color}">${esc(w.name)}</span> شيخ المجلس`;
    const pod=$('#podium'); pod.innerHTML='';
    rank.forEach((p,i)=>{ const d=document.createElement('div'); d.className='p '+(i===0?'first':i===1?'second':'third'); d.style.setProperty('--c',p.color); d.style.animationDelay=(i*.2)+'s';
      d.innerHTML=`${i===0?ic('crown','crown'):''}<div class="rank">${i+1}</div><div class="pn">${esc(p.name)}</div><div class="muted small">${p.out?'طلع':`${hidden(p).length} ${hidden(p).length===1?'ورقة':'ورقتين'}`}</div><div class="ps">${p.stats.lies} كذبة</div>`; pod.appendChild(d); });
    $('#btn-again').onclick=()=>startMatch();
    const el=$('#match-stats');
    if(el) el.innerHTML=`<div class="panel mt"><h3>أرقام المجلس</h3><div class="sq-table"><div class="sq-tr sq-th"><span>اللاعب</span><span>كذبات</span><span>انفضح</span><span>كشف صح</span><span>كشف غلط</span><span>شهادة صح</span><span>طيّح أوراق</span></div>
      ${rank.map(p=>`<div class="sq-tr"><span style="color:${p.color}"><b>${esc(p.name)}</b></span><span>${p.stats.lies}</span><span>${p.stats.liesCaught}</span><span>${p.stats.chWon}</span><span>${p.stats.chLost}</span><span>${p.stats.witRight}</span><span>${p.stats.taken}</span></div>`).join('')}</div></div>`;
    try{ const DS=window.DahoomStats; if(DS && DS.autoShow) DS.autoShow(()=>({ items:awards(rank), pool:G.players.map(p=>p.name) })); }catch(e){ console.error(e); }
    try{ const L=window.DahoomLog; if(L && L.match) L.match({ game:'sadq', rounds:G.round, mins:Math.round((Date.now()-G.t0)/60000), mode:'solo', opts:{ events:S.events, speed:S.speed },
      teams:rank.map((p,i)=>({ id:p.id, name:p.name, score:hidden(p).length, rank:i+1, win:i===0, players:(p.players||[]).map(x=>({name:x.name, av:x.avatar||''})), st:p.stats })), items:[] }); }catch(e){ console.error(e); }
    pushAll();
  }
  function awards(rank){
    const out=[], av=p=>p.avatar?[D.avatarSrc(p.avatar)]:[];
    const top=(f,min)=>{ const p=[...G.players].sort((a,b)=>f(b)-f(a))[0]; return p && f(p)>=min ? p : null; };
    const add=(p,title,desc,icon,value)=>{ if(p) out.push({ title, desc, icon, name:p.name, color:p.color, value, avatars:av(p) }); };
    let p=top(x=>x.stats.lies-x.stats.liesCaught,2); add(p,'أكبر كذّاب','أكثر واحد كذب وما انكشف','masks',p&&`${p.stats.lies-p.stats.liesCaught} كذبة مرت`);
    p=top(x=>x.stats.chWon,2); add(p,'ما ينضحك عليه','أكثر واحد كشف كذب الناس','eye',p&&`${p.stats.chWon} كشف صح`);
    p=top(x=>x.stats.liesCaught,2); add(p,'مكشوف','أكثر واحد انفضح كذبه','cancel',p&&`${p.stats.liesCaught} مرات`);
    p=top(x=>x.stats.truthCaught,2); add(p,'الصادق المظلوم','أكثر واحد اتهموه وهو صادق','defense',p&&`${p.stats.truthCaught} مرات`);
    p=top(x=>x.stats.witRight,2); add(p,'الشاهد الأمين','أكثر واحد شهد صح','team',p&&`${p.stats.witRight} شهادات`);
    p=top(x=>x.stats.taken,2); add(p,'المطرّش','أكثر واحد طيّح أوراق الناس','flame',p&&`${p.stats.taken} أوراق`);
    add(rank[0],'شيخ المجلس','آخر واحد بقى بالمجلس','crown',`${hidden(rank[0]).length} ${hidden(rank[0]).length===1?'ورقة':'ورقتين'}`);
    return out;
  }
  function finalAll(me){
    const rank=G.final.map(byId).filter(Boolean);
    const aw=awards(rank).map(a=>{ const p=G.players.find(x=>x.name===a.name); return { title:a.title, desc:a.desc, icon:a.icon, who:a.name, team:'', color:a.color, value:a.value, av:p?p.avatar:'', mine:p===me }; });
    return { awards:aw,
      tables:[{ title:'أرقام المجلس', icon:'podium', head:['#','اللاعب','كذبات','انفضح','كشف صح','كشف غلط','شهادة صح','طيّح أوراق'],
        rows:rank.map((p,i)=>({ rank:i+1, name:p.name, color:p.color, me:p===me, cells:[p.stats.lies, p.stats.liesCaught, p.stats.chWon, p.stats.chLost, p.stats.witRight, p.stats.taken] })) }],
      lists:[{ title:'أوراق كل لاعب بالنهاية', icon:'cards', items:rank.map(p=>({ b:p.name, c:p.color, s:p.cards.map(c=>RL(c.r).name+(c.up?' (انكشفت)':'')).join('، ') })) }] };
  }

  // ---------- حالة الجوال ----------
  const ROLES_STATIC = () => DATA.order.map(k=>{ const r=RL(k); return { k, name:r.name, icon:r.icon, color:r.color, line:r.line, act:AC(r.act).name, actDesc:AC(r.act).desc, block:r.block?AC(r.block).name:'' }; });
  function actView(){
    const a=G.act; if(!a) return null; const A=AC(a.k), by=byId(a.by), t=a.target?byId(a.target):null;
    return { k:a.k, claimK:a.claim||'', name:A.name, icon:A.icon, by:by.name, byC:by.color, t:t?t.name:'', tC:t?t.color:'', claim:a.claim?RL(a.claim).name:'', claimC:a.claim?RL(a.claim).color:'', stage:a.stage,
      ch:a.challenger?byId(a.challenger).name:'', blk:a.blocker?byId(a.blocker).name:'', blkRole:a.blocker&&A.blockedBy?RL(A.blockedBy).name:'', reveal:a.reveal?RL(a.reveal).name:'' };
  }
  function phoneState(id){
    if(!G) return { waiting:true };
    const p=byId(id); if(!p) return { waiting:true };
    const st={ game:'sadq', team:{ id:p.id, name:p.name, color:p.color, score:p.coins }, myTurn:!G.over && cur()===p,
      phase: G.over ? '' : p.out ? 'طلعت من المجلس — تابع الباقين' : cur()===p ? 'دورك' : `دور ${cur().name}`,
      scores:G.players.map(x=>({ id:x.id, name:x.name, color:x.color, score:x.coins, turn:!G.over && x===cur() })),
      sq:{ me:p.id, cards:p.cards.map(c=>({ r:c.r, up:c.up })), coins:p.coins, loan:p.loan, out:p.out, pot:G.pot, deck:G.deck.length, round:G.round,
        event:G.event?{ name:G.event.name, desc:G.event.desc, icon:G.event.icon }:null, events:S.events,
        pl:G.players.map(x=>({ id:x.id, name:x.name, color:x.color, av:x.avatar||'', coins:x.coins, hid:hidden(x).length, up:x.cards.filter(c=>c.up).map(c=>c.r), out:x.out, turn:!G.over && x===cur(), loan:x.loan })),
        act:actView(), wait:G.wait?{ label:G.wait.label, left:Math.max(0,G.wait.until-Date.now()), ms:G.wait.ms }:null,
        log:G.log.slice(-30), roles:ROLES_STATIC(), forceAt:DATA.forceAt } };
    if(G.over && G.final){ const r=G.final.indexOf(p.id)+1; st.final={ rank:r, of:G.players.length, mid:G.t0, stats:{ caught:p.stats.chWon|0, lies:p.stats.lies|0, wit:p.stats.witRight|0 }, awards:[], all:finalAll(p), rows:[['كذبات',String(p.stats.lies)],['انفضح',String(p.stats.liesCaught)],['كشف صح',String(p.stats.chWon)],['شهادات صح',String(p.stats.witRight)]] }; }
    return st;
  }

  // ---------- الإعدادات والقوانين ----------
  function renderSettings(){
    $$('#sadq-form [data-k]').forEach(el=>{ const k=el.dataset.k; if(el.type==='checkbox') el.checked=!!S[k]; else el.value=String(S[k]);
      el.onchange=()=>{ S[k] = el.type==='checkbox' ? el.checked : Number(el.value); store.set('sadq_settings', S); }; });
    const comps=D.competitors(), n=NET();
    $('#sadq-preview').innerHTML = comps.length<2 ? '<span class="fx-tag bad">تحتاج لاعبين اثنين على الأقل</span>' :
      comps.slice(0,6).map(c=>`<span class="kh-teamtag" style="--c:${c.color}">${esc(c.name)}${n && n.hasPhone(c.id)?'':' — ما اتصل'}</span>`).join('') + (comps.length>6?'<p class="muted small">أقصى عدد 6.</p>':'');
    const rl=$('#sadq-roles'); if(rl) rl.innerHTML=rolesHTML();
  }
  function rolesHTML(){
    return `<div class="sq-ref">${DATA.order.map(k=>{ const r=RL(k), A=AC(r.act); return `<div class="sq-rcard" style="--rc:${r.color}"><div class="sq-rart">${ART(k)}</div><div class="sq-rh">${ic(r.icon)}<b>${esc(r.name)}</b></div><small>${esc(r.line)}</small>
      <div class="sq-rl"><span>حركته</span><b>${esc(A.name)}</b><em>${esc(A.desc)}</em></div>${r.block?`<div class="sq-rl blk"><span>يصد</span><b>${esc(AC(r.block).name)}</b></div>`:''}</div>`; }).join('')}</div>`;
  }
  function helpModal(){
    modal(`<h3>قوانين «ما أصدقك»</h3><div class="help-list mt-s">
      <p><b>الفكرة:</b> كل واحد معه ورقتين شخصيات مقلوبة — هي حياته. تخسر الثنتين تطلع. آخر واحد يبقى معه ورقة هو شيخ المجلس.</p>
      <p><b>الدور:</b> تسوي حركة وحدة. فيه حركات لأي أحد (دوام، سلفة، طرد)، وحركات تحتاج تقول إنك شخصية معيّنة — وتقدر تكذب.</p>
      <p><b>الكشف:</b> أي أحد يقدر يقول «ما أصدقك». لو طلعت صادق: تقلب ورقتك وترجع للكومة وتسحب بدالها، واللي كشفك يخسر ورقة. لو طلعت كذّاب: تخسر ورقة وحركتك تنلغي (واللي دفعته للصندوق ما يرجع).</p>
      <p><b>الشهود:</b> لما أحد يكشف أحد، الباقين يقدرون يشهدون «صادق» أو «كذّاب». اللي يشهد صح ياخذ 1، واللي يشهد غلط يدفع 1 للصندوق.</p>
      <p><b>الصد:</b> الحركة اللي عليك تقدر تصدها لو قلت إنك الشخصية اللي تصدها — والصد بعد ينكشف. النشل يصده الشرطي، والمخالفة تصدها الواسطة، والبلاغ يصده المحامي، والمبادلة يصدها الحرامي.</p>
      <p><b>المال:</b> تبدأ بـ ${S.startCoins} ريال. الدوام 1، السلفة 3 الحين وترجّع 4 دورك الجاي (لو ما معك تخسر ورقة). الطرد بـ ${DATA.tardCost} وما ينصد، ولو معك ${DATA.forceAt} أو أكثر لازم تطرد. الغرامات والتكاليف تروح لصندوق المجلس، والواسطة تاخذ منه.</p>
      <p><b>أحداث المجلس:</b> بداية كل لفة يطلع حدث يغيّر شي بسيط هاللفة (رواتب، تفتيش، زكاة، حظر تجوّل…).</p></div>
      <h3 class="mt">الشخصيات</h3>${rolesHTML()}
      <div class="row center mt"><button class="btn" data-x>تمام</button></div>`,{onMount(m){ m.querySelector('[data-x]').onclick=()=>m.remove(); m.querySelector('.panel')&&m.querySelector('.panel').classList.add('sq-helpp'); }});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const st=$('#btn-sadq-start'); if(st) st.onclick=()=>startMatch();
    const q=$('#sq-quit'); if(q) q.onclick=async ()=>{ if(await confirmBox('<h3>تنهي المجلس؟</h3><p class="muted">ينحسب الترتيب الحين: اللي معه أوراق أكثر ثم ريالات أكثر.</p>','أنهِ','كمّل','btn-hype')){ endMatch(); } };
    const h=$('#sq-help'); if(h) h.onclick=()=>{ if(window.DahoomRules) window.DahoomRules.open('sadq'); else helpModal(); };
    const sh=$('#sadq-settings'); if(sh) new MutationObserver(()=>{ if(sh.classList.contains('active')) renderSettings(); }).observe(sh,{attributes:true,attributeFilter:['class']});
  });
  window.DAHOOM_DEBUG_SQ = { state:()=>G, settings:()=>S, end:()=>endMatch(), render:()=>render() };
  return { start:startMatch };
})();
