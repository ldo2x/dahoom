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
    pts1:100, pts2:150, pts3:250, cardsEnabled:true, noCardRounds:1, handMax:3,
    wLegendary:10, wMedium:32, wNormal:48, wBlack:10,
    cardFxEnabled:true, reactionsEnabled:true, fuseBlack:true, comebackEnabled:true,
    endgameEnabled:true,
    tagsQ:Object.fromEntries(DATA.questionTags.map(t=>[t,true])),
    tagsC:Object.fromEntries(DATA.charadeTags.map(t=>[t,true])),
    tagsT:Object.fromEntries(DATA.challengeTags.map(t=>[t,true])),
  };
  let S = Object.assign({}, DEFAULTS, store.get('settings4', {}));
  ['tagsQ','tagsC','tagsT'].forEach(k=> S[k]=Object.assign({}, DEFAULTS[k], S[k]||{}));
  const saveS = () => store.set('settings4', S);

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
  // كل ضغطة بز تنسجل بوقت وصولها للشاشة — الترتيب والفرق بأجزاء الثانية يطلعون على الشاشة
  function openBuzz(ids, onFirst, {retry=false}={}){ G.buzz={open:true, eligible:ids, tried:[], first:null, onFirst, onRight:null, retry, order:[], t0:performance.now()}; pushAll(); }
  function closeBuzz(){ if(G && G.buzz) G.buzz.open=false; }
  function onBuzz(id, pid){
    { const tm=G && G.teams.find(x=>x.id===id); if(tm && tm.fx.benched && pid && tm.fx.benched.pid===pid) return; }
    const b=G && G.buzz; if(!b || !b.open || !b.eligible.includes(id) || b.tried.includes(id) || b.order.some(o=>o.id===id)) return;
    b.order.push({id, t:performance.now()}); (b.pids=b.pids||{})[id]=pid||null;
    { const o=ST(G.teams.find(x=>x.id===id)); if(o) o.buzz.push(performance.now()-b.t0); }
    if(!b.first){ b.first=id; const t=G.teams.find(x=>x.id===id); G.log.buzz.push({ team:id, by:nameOf(t,pid), ms:Math.round(performance.now()-b.t0) }); play('game:g_mgs',{volume:.9}); flash('steal'); b.onFirst(t); }
    else play('tick',{volume:.6});
    renderBuzzOrder(); pushAll();
  }
  const fmtGap = ms => (ms/1000).toFixed(3).replace(/^0/,'0');
  function renderBuzzOrder(){
    const el=$('#buzz-order'), b=G && G.buzz; if(!el || !b) return;
    const t0 = b.order.length ? b.order[0].t : 0;
    el.innerHTML = b.order.length ? `<div class="bz-order">${b.order.map((o,i)=>{ const x=G.teams.find(t=>t.id===o.id); const out=b.tried.includes(o.id);
      return `<span class="bz-row ${i===0?'first':''} ${out?'out':''} ${b.first===o.id?'now':''}" style="--c:${x.color}"><b>${i+1}</b>${esc(x.name)}<i>${i===0?'الأول':'<bdi dir="ltr">+'+fmtGap(o.t-t0)+'</bdi> ث'}</i></span>`; }).join('')}</div>` : '';
  }
  function buzzBox(t, onRight){
    const box=$('#buzzbox'); if(!box) return;
    if(onRight) G.buzz.onRight=onRight;
    box.innerHTML=`<div id="buzz-order"></div><div class="buzzbox" style="--c:${t.color}"><span class="bz-t">${ic('whistle')} ${esc(t.name)} ${G.buzz.order.length>1&&G.buzz.order[0].id!==t.id?'دوره يجاوب':'بزّ أول!'}</span><button class="btn btn-mint" data-bz="1">${ic('check')} صح</button><button class="btn btn-bad" data-bz="0">${ic('cancel')} غلط</button></div>`;
    renderBuzzOrder();
    box.querySelector('[data-bz="1"]').onclick=()=>{ box.innerHTML=''; G.buzz.onRight(t); };
    box.querySelector('[data-bz="0"]').onclick=()=>{
      const b=G.buzz; play('wrong',{volume:.6});
      if(b.retry) b.order=b.order.filter(o=>o.id!==b.first); else b.tried.push(b.first);
      // اللي بعده بالترتيب ياخذ فرصته على طول
      const next=b.order.find(o=>!b.tried.includes(o.id) && o.id!==b.first);
      b.first=null;
      if(next){ b.first=next.id; buzzBox(G.teams.find(x=>x.id===next.id)); }
      else { box.innerHTML=`<div id="buzz-order"></div>`; renderBuzzOrder(); }
      pushAll(); };
  }

  // ---------- حالة الجوال ----------
  function phoneState(id, cid, pid){
    const t=G && G.teams.find(x=>x.id===id);
    if(!t) return { game:'alf', waiting:true };
    if(G.ended){ const sorted=[...G.teams].sort((a,b)=>b.score-a.score), o=G.stats.T[id];
      return { game:'alf', team:{id:t.id,name:t.name,color:t.color,score:t.score}, scores:sorted.map(x=>({id:x.id,name:x.name,color:x.color,score:x.score})),
        final:{ rank:sorted.indexOf(t)+1, of:sorted.length, awards:(G.stats.awards||[]).filter(a=>a.team.id===id).map(a=>({title:a.title,value:a.value})),
          rows:[['أسئلة صح',`${o.ok.q}/${o.tries.q}`],['بدون كلام',`${o.ok.c}/${o.tries.c}`],['تحديات',`${o.ok.t}/${o.tries.t}`],['سرقات',o.steals],['بطاقات لعبتوها',o.cards],['ضربات جتكم',o.hits],['أفضل دور','+'+o.bestTurn],['أطول سلسلة',o.maxCombo]] } }; }
    const mine = cur()===t, can = !!(G.canPlayNow && mine && canPlayCard(t));
    const b=G.buzz && G.buzz.open ? G.buzz : null;
    const first = b && b.first ? G.teams.find(x=>x.id===b.first) : null;
    return { game:'alf', round:G.round, target:S.target,
      team:{id:t.id,name:t.name,color:t.color,score:t.score},
      scores:G.teams.map(x=>({id:x.id,name:x.name,color:x.color,score:x.score,hand:x.hand.length,turn:x===cur()})),
      hand:t.hand.map(c=>c.id), canPlay:can, myTurn:mine,
      fuse: can && S.fuseBlack && t.hand.filter(c=>c.tier==='black').length>=2,
      fx: fxList(t).map(([n,bad])=>({n,bad})),
      buzz: b ? (()=>{ const k=b.order.findIndex(o=>o.id===id);
        return { open:true, can: b.eligible.includes(id) && !b.tried.includes(id) && k<0 && !(G.charade && G.charade.actor===cid),
          first: first?first.name:null, mine: b.first===id, rank: k>=0?k+1:0, gap: k>0?+((b.order[k].t-b.order[0].t)/1000).toFixed(3):0 }; })() : { open:false },
      benched: !!(t.fx.benched && pid && t.fx.benched.pid===pid), phaseKey: gamePhase(),
      item: G.item ? { kind:G.item.kind, id:G.item.id, label: G.item.kind==='c' ? (G.charade ? 'عبارة التمثيل الحالية' : 'آخر عبارة تمثيل: '+G.item.text) : G.item.text } : null,
      lastCard: G.lastCard ? G.lastCard.id : null,
      charade: G.charade && G.charade.team===id ? { taken:!!G.charade.actor, mine:G.charade.actor===cid, acting:!!G.charade.acting, text: G.charade.actor===cid ? G.charade.text : null } : null,
      phase: strip(($('#stage .big')||{}).innerText||'').slice(0,90) };
  }
  async function onPhonePlay(id, idx){
    const t=cur(); if(!G || !G.canPlayNow || !t || t.id!==id || !canPlayCard(t) || !t.hand[idx]) return;
    G.canPlayNow=false; pushAll();
    await playCard(t, idx);
    if(cur()===t && !t.playedCard){ G.canPlayNow=true; pushAll(); }
  }
  function onPhoneFuse(id){ const t=cur(); if(G && G.canPlayNow && t && t.id===id && canPlayCard(t)) fuseBlack(t); }
  // واحد من الفريق يضغط "أنا بمثّل" من جواله — أول واحد ياخذها
  function onClaim(teamId, cid, pid){
    const ch=G && G.charade; if(!ch || ch.team!==teamId || ch.actor) return;
    { const tm=G.teams.find(x=>x.id===teamId); if(tm && tm.fx.benched && pid && tm.fx.benched.pid===pid) return; }
    ch.actor=cid; ch.pid=pid; play('game:g_zelda',{volume:.7}); pushAll();
    const st=$('#ch-status'); if(st){ st.classList.add('ok'); st.innerHTML=`${ic('check')} الممثل جاهز — العبارة على جواله`; }
  }
  function syncRoster(){
    if(!G) return; const ss=D.session;
    G.teams.forEach(t=>{ const tm=ss.teams.find(x=>x.id===t.id); if(tm) t.players=tm.members.map(id=>ss.players.find(p=>p.id===id)).filter(Boolean); });
    if($('#game').classList.contains('active') && G.canPlayNow) turnIntro();
  }
  const cardRef = c => ({ kind:'card', id:c.id, d:0, tag:c.tier, text:`${c.name} — ${c.desc}` });
  // بلاغ من جوال: الشاشة تكمّل النص والجواب من البنك
  function onReport(id, pid, d){
    const t=G && G.teams.find(x=>x.id===id); if(!t || !LOG()) return false;
    let item=null;
    if(d.what==='item' && G.item) item=G.item;
    else if(d.what==='card'){ const c=DATA.cards.find(x=>x.id===d.id); if(c) item=cardRef(c); }
    if(!item || !(LOG().REASONS[item.kind]||[]).includes(d.reason)) return false;
    LOG().report(item, d.reason, d.note, `${nameOf(t,pid)||'جوال'} (${t.name})`); return true;
  }
  function registerNet(){ const n=NET(); if(n) n.use({ roster:syncRoster, report:onReport, teams:()=>G?G.teams:D.competitors(), state:phoneState, buzz:onBuzz, play:onPhonePlay, fuse:onPhoneFuse, claim:onClaim,
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
    G.log = { t0:Date.now(), items:[], cards:[], drawn:[], buzz:[] }; window.DAHOOM_ITEM=null;
    G.stats = { P:{}, T:{}, series:[{label:'البداية', round:0, scores:Object.fromEntries(G.teams.map(t=>[t.id,0]))}], moments:[] };
    G.teams.forEach(t=>G.stats.T[t.id]={ pts:{q:0,c:0,t:0,steal:0}, tries:{q:0,c:0,t:0}, ok:{q:0,c:0,t:0}, steals:0, stolenFrom:0, cards:0, attacks:0, hits:0, reactions:0, bestTurn:0, maxCombo:0, fails:0, buzz:[] });
    $('#target-label').textContent='الهدف '+S.target;
    const fx=window.DahoomFX; if(fx) fx.setEnabled(S.cardFxEnabled!==false);
    D.setReactions(S.cardFxEnabled!==false);
    registerNet();
    go('game'); introDraw();
  }
  const cur = () => G.teams[G.order[G.turn]];
  const ST = t => (G && G.stats && t && G.stats.T[t.id]) || null;
  const moment = (text, t) => { if(G && G.stats) G.stats.moments.push({ round:G.round, text, color:t?t.color:null }); };
  const others = t => G.teams.filter(x=>x!==t);
  // ---------- سجل الموازنة: كل سؤال/تحدي ونتيجته، وكل بطاقة انلعبت ----------
  const LOG = () => window.DahoomLog;
  function itemRef(k, item, d){ const sp = k==='t' ? splitAnswer(item.t) : null;
    return { kind:k, id:item.id, d, tag:item.tag, text: k==='q'?item.q : k==='t'?sp.t : item.t, answer: k==='q'?item.a : k==='t'?(sp.a||'') : '' }; }
  function logItem(k, item, d){
    const L=G.log.items, last=L[L.length-1]; if(last && last.r==='?') last.r='skip';
    G.item = window.DAHOOM_ITEM = itemRef(k,item,d);
    L.push({ k, id:item.id, d, tag:item.tag, r:'?', ph:gamePhase(), x:String(G.item.text).slice(0,50) });
  }
  function logResult(r, extra){ const l=G.log.items[G.log.items.length-1]; if(l && l.r==='?'){ l.r=r; l.left=+Math.max(0,fracLeft()).toFixed(2); if(extra) Object.assign(l, extra); } }
  // مين اللي جاوب؟ المضيف يضغط اسم اللاعب قبل صح/غلط (اختياري) — والفريق اللي فيه لاعب واحد ينحسب له على طول
  const whoRow = t => t.players.length>=2 ? `<div class="who-row" id="who-row"><span class="lbl">مين جاوب؟</span>${t.players.map(p=>`<button class="pmini who" data-who="${p.id}" style="--c:${p.color}"><img src="${D.avatarSrc(p.avatar)}" alt=""> ${esc(p.name)}</button>`).join('')}</div>` : '';
  function bindWho(){ G.answerer=null; $$('#who-row [data-who]').forEach(b=>b.onclick=()=>{ G.answerer = G.answerer===b.dataset.who ? null : b.dataset.who; play('tick',{volume:.4});
    $$('#who-row [data-who]').forEach(x=>x.classList.toggle('sel', x.dataset.who===G.answerer)); }); }
  const answererOf = t => G.answerer || (t.players.length===1 ? t.players[0].id : null);
  function credit(pid, k){ if(!pid || !G.stats) return; const p=G.teams.flatMap(t=>t.players).find(x=>x.id===pid); if(!p) return;
    const o = G.stats.P[pid] = G.stats.P[pid] || { name:p.name, ok:0, wrong:0, steals:0, acted:0, actedOk:0 }; o[k]++; }
  const nameOf = (t, pid) => ((t && t.players.find(p=>p.id===pid)) || {}).name || null;
  const stealPts = p => Math.max(50, Math.ceil((p/2)/50)*50);
  // الحسم: قاعدة وحدة من 75% من الهدف — اللي وصلها ما له أسئلة سهلة، ووقت السرقة للكل بالنص
  const endgameAt = () => Math.round(S.target*0.75);
  const inFinalStretch = () => S.endgameEnabled && G.teams.some(x=>x.score>=endgameAt());
  const inClimax = t => S.endgameEnabled && t.score>=endgameAt();
  const leader = () => [...G.teams].sort((a,b)=>b.score-a.score)[0];
  // مرحلة المباراة حسب قرب المتصدر من الهدف: بداية < 35% ≤ وسط < 75% ≤ نهاية
  const PHASE_AR = { early:'البداية', mid:'الوسط', late:'النهاية' };
  function gamePhase(){ if(!G) return null; const r=Math.max(0,...G.teams.map(t=>t.score))/S.target; return r<0.35?'early': r<0.75?'mid':'late'; }

  // مفاتيح الطاقات (تنمسح بفاكت تشيك) والضربات (تنمسح بتشل قاي)
  const BUFFS = { x2next:'خلك ذيب ×2', jackpot:'جاك بوت', wolf:'خلك ذيب', extraTurn:'طقها والحقها', reroll:'اصرمني', spoiler:'وش السالفة', immune:'وضع الطيران', streak:'مولّعة',
    nocap:'من جد', copium:'بسيطة', speedrun:'تفحيط', choose:'على كيفي', lock:'خلها بيننا', rizz:'فنّان', fullsteal:'ببلاش', wasta:'الواسطة', hayat:'هياط', sawalif:'سواليف', yasalam:'يا سلام', capital:'ستونكس', finisher:'فاتاليتي', mc:'خيارات', insure:'تأمين ضد الغير', ambush:'إنه فخ' };
  const DEBUFFS = { harder:'زيدوها ملح', lag:'النت فاصل', ratioTo:'شريك مخالف', noSteal:'ممنوع يسرق', noCard:'ممنوع بطاقات', npc:'قم تحرك', skipDraw:'رح نام', evilEye:'عين وصابتك', coal:'الجمرة بيده', benched:'خلك برا', brake:'على وين؟' };

  // ---------- العرض ----------
  function renderBoard(bumpId){
    const sb=$('#scoreboard'); sb.innerHTML='';
    const top=Math.max(S.target, ...G.teams.map(t=>t.score));
    G.teams.forEach(t=>{
      const d=document.createElement('div'); d.className='tchip'+(t===cur()?' turn':'')+(t.id===bumpId?' bump':'')+(t.score<0?' debt':'');
      d.style.setProperty('--c',t.color);
      const sw = t.players.length===1 ? `<span class="sw"><img src="${D.avatarSrc(t.players[0].avatar)}" alt=""></span>` : `<span class="sw"></span>`;
      const nb=Object.keys(BUFFS).filter(k=>t.fx[k]!=null).length, nd=Object.keys(DEBUFFS).filter(k=>t.fx[k]!=null).length;
      d.innerHTML=`${sw}<span><div class="nm">${esc(t.name)}${phoneOf(t)?ic('phone','tphone'):''}</div><div class="sub">${S.cardsEnabled?`<span class="hbacks" title="${t.hand.length} بطاقات">${t.hand.length?'<i></i>'.repeat(t.hand.length):'ما معه بطايق'}</span>`:''}<span class="fxdots">${'<i></i>'.repeat(nb)}${'<i class="bad"></i>'.repeat(nd)}</span></div></span><span class="sc">${t.score}</span><span class="bar"><i style="transform:scaleX(${Math.max(0,Math.min(1,t.score/top)).toFixed(3)})"></i></span>`;
      d.title=fxList(t).map(x=>x[0]).join('، ');
      sb.appendChild(d);
    });
    $('#round-label').textContent='اللفة '+G.round;
    window.DAHOOM_PHASE = gamePhase();
    pushAll();
  }
  function stage(html){ if(G){ G.canPlayNow=false; closeBuzz(); } const s=$('#stage'); s.innerHTML=html; pushAll(); return s; }
  function addScore(team, n, {silent, allowNegative, noInsure}={}){
    if(n<0 && team.fx && team.fx.insure && !noInsure){ delete team.fx.insure; const half=Math.min(-25, -(r25(-n/2)||25)); toast(`تأمين ضد الغير: ${team.name} خسر ${-half} بدل ${-n}`, 3200); play('meme:phew',{volume:.5,max:1500}); n=half; }
    team.score = allowNegative ? team.score + n : Math.max(team.score<0?team.score:0, team.score + n);
    renderBoard(team.id);
    if(!silent && n>0) play('coin',{volume:.8});
  }
  function fxList(t){
    const out=[];
    Object.entries(BUFFS).forEach(([k,v])=>{ if(t.fx[k]!=null) out.push([v+(k==='reroll'&&t.fx.reroll>1?' ×'+t.fx.reroll:''),false]); });
    Object.entries(DEBUFFS).forEach(([k,v])=>{ if(t.fx[k]!=null) out.push([k==='benched'?`${v}: ${t.fx.benched.name}`:v,true]); });
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
    const why = c.kind==='reaction' ? (c.fx==='envy' ? 'هذي رد فعل: تطلع لحالها لما خصمك يلعب بطاقة دعم' : c.fx==='wow' ? 'هذي رد فعل: تطلع لحالها لما فريق يكسب 200 أو أكثر بدور واحد' : 'هذي رد فعل: تطلع لحالها لما أحد يهاجمك') : c.fx==='none' ? 'سودا… ما تنلعب. ادمجها أو ارمها بعرض تجاري' : '';
    const m=modal(`<div class="co-wrap">${cardHTML(c,{size:'big',anim:true})}
      ${why?`<p class="muted mt-s">${why}</p>`:''}
      <div class="row center mt-s">${canPlay?`<button class="btn btn-hype big" data-play>العبها</button>`:''}<button class="btn ghost" data-x>${canPlay?'تراجع':'إغلاق'}</button><button class="btn ghost small" data-rep-card>${ic('flag')} بلّغ</button></div></div>`,{onMount(m){
        m.querySelector('[data-rep-card]').onclick=()=>{ m.remove(); LOG() && LOG().openReport(cardRef(c)); };
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
  function pickContent(kind, diff, tagsKey, only){
    const list = kind==='q'?DATA.questions: kind==='c'?DATA.charades: DATA.challenges;
    const solo = cur().players.length===1;
    const ok = x => x.d===diff && !(solo && x.tag==='تحديات جماعية');
    let pool = list.filter(x=>ok(x) && S[tagsKey][x.tag]!==false);
    if(!pool.length) pool = list.filter(ok);
    if(!pool.length) pool = list.filter(x=>x.d===diff);
    if(only){ const p2=pool.filter(only); if(p2.length) pool=p2; }
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
    if(f.x2next){ gain*=2; delete f.x2next; delete f.x2back; notes.push('خلك ذيب ×2'); }
    if(f.finisher){ const m = t.score>=S.target*0.75 ? 3 : 1.5; gain=r25(gain*m)||gain; delete f.finisher; notes.push(`فاتاليتي ×${m}`); }
    if(f.jackpot){ gain*=2; delete f.jackpot; notes.push('جاك بوت ×2'); reaction('jackpotWin',3000); memeSound('correct'); }
    if(f.nocap){ const b=hard?50:25; gain+=b; delete f.nocap; notes.push('من جد +'+b); }
    if(f.speedrun){ if(section==='q' && fracLeft()>=.5){ const b=r25(base*.5)||25; gain+=b; notes.push('تفحيط +'+b); } delete f.speedrun; }
    if(f.streak){ gain+=50; notes.push('مولّعة +50'); }
    if(f.capital){ gain+=25; notes.push('ستونكس +25'); }
    if(f.wolf){ const v=G.teams.find(x=>x.id===f.wolf); delete f.wolf; if(v && v!==t){ const a=Math.min(gain, Math.max(0,v.score)); if(a){ addScore(v,-a,{silent:true}); notes.push(`خلك ذيب: ${esc(v.name)} −${a}`); } } }
    if(f.flatBonus){ gain+=f.flatBonus; notes.push((f.hayatFail?'هياط':'واسطة')+' +'+f.flatBonus); delete f.flatBonus; }
    delete f.hayatFail; delete f.copium;
    announce(t, true);
    const res = payout(t, gain, notes), o=ST(t);
    if(o){ const k=section||'q'; o.pts[k]+=res.net; o.ok[k]++; if(section) o.tries[k]++; else if(o.fails) o.fails--; }
    return res;
  }
  function resolveFail(t, base, section){
    { const o=ST(t); if(o && section){ o.tries[section]++; o.fails++; } }
    const f=t.fx; const notes=[];
    if(f.x2back){ const c=f.x2back; delete f.x2back; if(f.x2next && t.hand.length<S.handMax){ t.hand.push(c); notes.push('خلك ذيب رجعت ليدك'); } }
    delete f.x2next; delete f.nocap; delete f.speedrun; delete f.flatBonus;
    if(f.jackpot){ delete f.jackpot; notes.push(`جاك بوت: راحت الـ${JACKPOT_COST}`); reaction('jackpotLose',2800); }
    delete f.wolf;
    if(f.hayatFail){ delete f.hayatFail; const s0=t.score; addScore(t,-50,{silent:true}); notes.push('هياط −'+(s0-t.score)); }
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
    { const o=ST(t); if(o) o.maxCombo=Math.max(o.maxCombo,t.combo); if(t.combo===3) moment(`${esc(t.name)} ولّعت: 3 نجاحات ورا بعض`, t); }
    const s = t.combo>=6 ? 'g_godlike' : ANN[t.combo];
    if(s){ setTimeout(()=>play('game:'+s,{volume:1}),500); toast(`${t.name}: ${t.combo} نجاحات ورا بعض`); }
  }
  // يطبق الريشيو ويضيف النقاط — يرجع النص
  function payout(t, gain, notes=[]){
    if(t.fx.brake!=null && gain>0 && t.score+gain >= S.target){ const cap=Math.max(0, S.target-25-t.score); notes.push(`على وين؟ توقف عند ${S.target-25}`); gain=cap; }
    if(t.fx.evilEye && gain>0){ delete t.fx.evilEye; const lost=r25(gain/2)||25; gain-=lost; notes.push(`عين وصابتك −${lost}`); play('meme:sa_yasatr',{volume:.6}); }
    if(G.pot>0 && gain>0){ notes.push(`أخذ القطة +${G.pot}`); gain+=G.pot; G.pot=0; play('game:g_mariocoin'); }
    if(t.fx.ratioTo && gain>0){
      const to=G.teams.find(x=>x.id===t.fx.ratioTo); delete t.fx.ratioTo;
      if(to && to!==t){ const cut=Math.min(150, r25(gain/2)||25); gain-=cut; addScore(to,cut,{silent:true}); notes.push(`ريشيو: ${esc(to.name)} أخذ ${cut}`); }
    }
    addScore(t,gain);
    // يا سلام: أول فريق ماسكها ياخذ ربع أي دور فيه 200 أو أكثر
    if(gain>=200 && S.reactionsEnabled){ const x=others(t).find(y=>y.hand.some(h=>h.fx==='wow'));
      if(x){ const card=x.hand.find(h=>h.fx==='wow'); x.hand.splice(x.hand.indexOf(card),1); showPlayed(card, x); { const fx=FX(); if(fx){ fx.sound(card); fx.visual(card); } }
        const cut=r25(gain/4)||25, s0=t.score; addScore(t,-cut,{silent:true}); const got=s0-t.score; addScore(x,got); gain-=got;
        notes.push(`يا سلام! ${esc(x.name)} أخذ ${got}`); moment(`${esc(x.name)} قال يا سلام وأخذ ${got} من ${esc(t.name)}`, x); } }
    if(gain>0) G.teams.forEach(y=>{ if(y!==t && y.fx.yasalam!=null){ addScore(y,30,{silent:true}); notes.push(`يا سلام: ${esc(y.name)} +30`); } });
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
      if(t.fx.skipDraw){ delete t.fx.skipDraw; toast('ما فيه سحب هالدور'); }
      else if(S.comebackEnabled && leader().score - t.score >= 400 && G.teams.length>1){ toast('دفعة الرجعة: اختر من بطاقتين'); await pickFrom(t, [randomCard(), randomCard()], 'دفعة الرجعة — اختر وحدة'); }
      else await drawCard(t);
    }
    turnIntro();
  }
  function turnIntro(){
    const t=cur(); G.charade=null;
    const npc = t.fx.npc, choose = t.fx.choose;
    stage(`<div class="row center">${G.finalRound?'<span class="banner">اللفة الأخيرة — الحسم بنهايتها</span>':''}${inFinalStretch()?`<span class="banner">الحسم: وقت السرقة بالنص${inClimax(t)?' · وما لكم أسئلة سهلة':''}</span>`:''}${G.pot?`<span class="banner dim">${ic('coins')} القطة: ${G.pot} لأول واحد ينجح</span>`:''}</div>
      <div class="eyebrow">اللفة ${G.round} · مرحلة ${PHASE_AR[gamePhase()]}</div>
      ${t.fx.benched?`<span class="banner">${ic('cancel')} ${esc(t.fx.benched.name)} برا السالفة هالدور — ما يجاوب ولا يمثّل ولا يخمّن</span>`:''}
      <div class="big">دور <span class="who" style="--c:${t.color}">${esc(t.name)}</span></div>
      <div class="row center">${t.players.map(p=>`<span class="pmini" style="--c:${p.color}"><img src="${D.avatarSrc(p.avatar)}" alt=""> ${esc(p.name)}</span>`).join('')}</div>
      ${fxTags(t)}
      <div class="row center mt-s">
        ${npc? `<button class="btn btn-bad big" id="btn-roll">${ic('person')} تحديات بالغصب</button>` : choose ? `<button class="btn btn-mint big" id="btn-roll">${ic('dice')} اختر خانتك</button>` : `<button class="btn btn-hype big pulse" id="btn-roll">${ic('dice')} اسحب الخانة</button>`}
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
      ${t.fx.harder ? '<span class="fx-tag bad">زيدوها ملح: الصعوبة بترتفع درجة بنفس السعر</span>':''}
      ${t.fx.lag ? '<span class="fx-tag bad">النت فاصل: وقتك بالنص هالدور</span>':''}
      ${climax ? '<span class="banner">الحسم: قربتوا تفوزون، ما فيه سهل</span>':''}${npc?'<span class="fx-tag bad">قم تحرك: متوسط أو أعلى</span>':''}${hayat?'<span class="fx-tag">هياط: صعب بس — تنجح +150 تفشل −75</span>':''}${wasta?'<span class="fx-tag">الواسطة: نقاطك بسعر الصعوبة اللي فوق</span>':''}`);
    renderHand(t,false);
    if(wasta) $$('#stage .diff').forEach(b=>{ const d=+b.dataset.d; b.querySelector('.dp').textContent = d<3 ? pts(d+1) : pts(3)+'+100'; });
    $$('#stage [data-d]').forEach(b=>{ if(b.disabled) return; b.onclick=()=>{ let d=Number(b.dataset.d); let priceD=d;
      if(hayat){ t.fx.flatBonus=200; t.fx.hayatFail=true; }
      if(wasta){ if(d<3) priceD=d+1; else t.fx.flatBonus=100; }
      if(t.fx.harder){ delete t.fx.harder; if(d<3){ d++; toast(`زيدوها ملح: صارت ${DIFF[d]} بسعر ${DIFF[priceD]}`); } else toast('الصعب يبقى صعب'); }
      const lag = !!t.fx.lag; delete t.fx.lag;
      play('pop'); if(k==='q') runQuestion(t,d,null,{priceD,lag}); else if(k==='c') runCharade(t,d,null,{priceD,lag}); else runChallenge(t,d,null,{priceD,lag}); }; });
  }
  const rerollBtn = t => t.fx.reroll ? `<button class="btn small" id="btn-reroll">${ic('next')} اصرمني</button>` : '';
  function useReroll(t){ t.fx.reroll--; if(!t.fx.reroll) delete t.fx.reroll; clearTimer(); play('meme:skibidi',{volume:.6}); }
  const head = (t, item, sec, d, p, priceD) => `${t.fx.benched?`<span class="fx-tag bad">${esc(t.fx.benched.name)} برا السالفة هالدور</span>`:''}<div class="row center"><span class="pill">${ic(SECTIONS[sec].icon)} ${esc(item.tag)}</span><span class="pill dim">${DIFF[d]} · ${p} نقطة</span>${lowerThird(t,'يلعب')}${priceD&&priceD!==d?`<span class="fx-tag bad">${DIFF[d]} بسعر ${DIFF[priceD]}</span>`:''}</div>`;

  // ---------- الأسئلة ----------
  function runQuestion(t, d, item, {priceD, lag, mc}={}){
    const CH = DATA.choices||{};
    if(mc==null){ mc = t.fx.mc||0; if(mc){ if((t.fx.mcN||1)>1) t.fx.mcN--; else { delete t.fx.mc; delete t.fx.mcN; } } }
    item = item || pickContent('q', d, 'tagsQ', mc ? (x=>!!CH[x.id]) : null); logItem('q', item, d);
    const ch = mc && CH[item.id];
    const mcHTML = ch ? `<div class="mc-opts n${mc}">${shuffle(mc===2 ? ch.slice(0,2) : ch.slice(0,4)).map((o,i)=>`<span class="mc-opt"><b>${'أبجد'[i]}</b>${esc(o)}</span>`).join('')}</div>` : '';
    const p = pts(priceD||d), hard = d===3;
    const time = Math.max(3, lag ? Math.ceil(S.answerTime/2) : S.answerTime);
    stage(`${head(t,item,'q',d,p,priceD)}
      <div class="qtext">${esc(item.q)}</div>${mcHTML}
      ${timerHTML(time)}${timeupHTML}
      <div class="row center"><button class="btn small" id="btn-reveal">${ic('eye')} إظهار الإجابة</button>${t.fx.spoiler?`<button class="btn small btn-sky" id="btn-hint">${ic('eye')} سبويلر</button>`:''}${rerollBtn(t)}<button class="btn small ghost" id="btn-restart">${ic('stopwatch')} أعد الوقت</button></div>
      <div class="answer hidden" id="answer">${esc(item.a)}</div>
      ${whoRow(t)}
      <div class="row center"><button class="btn btn-mint big" id="btn-ok">${ic('check')} صح</button><button class="btn btn-bad big" id="btn-no">${ic('cancel')} غلط / ما جاوب</button></div>
      <p class="muted small">${S.stealEnabled?(t.fx.lock?'قفل الشات: ما فيه سرقة على هالسؤال.':'إذا خلص الوقت تفتح السرقة. "غلط" يفتحها على طول.'):'المؤقت للتنبيه — انت تقرر.'}</p>`);
    reaction('think',2300);
    let ended=false;
    const finish=(ok, timedOut)=>{
      if(ended) return; ended=true; clearTimer(); delete t.fx.spoiler;
      if(ok || !timedOut) credit(answererOf(t), ok?'ok':'wrong');
      logResult(ok?'ok': (t.fx.lock||!S.stealEnabled) ? 'fail' : '?');
      if(ok){ const {net,note}=resolveSuccess(t,p,{hard,section:'q'}); play('correct'); memeSound('correct',{volume:.5}); flash('good'); reaction('correct'); confetti(60,1500);
        return afterTurn(`<span style="color:var(--mint)">صح!</span> +${net} لـ ${esc(t.name)}${note}`); }
      const notes=resolveFail(t,p,'q'); const nt=notes.length?` <span class="muted">(${notes.join(' · ')})</span>`:'';
      if(!timedOut){ play('wrong'); flash('bad'); reaction('wrong'); memeSound('wrong',{volume:.6}); }
      if(t.fx.lock){ delete t.fx.lock; return afterTurn(`ضاع السؤال${nt}. قفل الشات: ما أحد يسرق. الجواب: ${esc(item.a)}`); }
      if(S.stealEnabled) stealPhase(t, item, p, {ownerCanAnswer:!!timedOut, note:nt, mcHTML});
      else afterTurn(`ولا نقطة${nt}. الجواب: ${esc(item.a)}`);
    };
    startTimer(time, ()=>{ if(S.stealEnabled) finish(false,true); });
    bindWho();
    $('#btn-reveal').onclick=()=>{ $('#answer').classList.toggle('hidden'); play('pop'); };
    $('#btn-restart').onclick=()=>restartTimer(time, ()=>{ if(S.stealEnabled) finish(false,true); });
    $('#btn-ok').onclick=()=>finish(true);
    $('#btn-no').onclick=()=>finish(false);
    const hb=$('#btn-hint'); if(hb) hb.onclick=()=>{ const a=item.a.trim(); delete t.fx.spoiler; hb.outerHTML=`<span class="hint-box">أول حرف: "${esc(a[0])}" · ${a.split(/\s+/).length} كلمة</span>`; play('meme:sus',{volume:.5}); };
    const rb=$('#btn-reroll'); if(rb) rb.onclick=()=>{ useReroll(t); runQuestion(t,d,null,{priceD,lag,mc}); };
  }
  function stealPhase(t, item, p, {ownerCanAnswer=true, note='', mcHTML=''}={}){
    const cands = others(t).filter(x=>x.fx.noSteal==null);
    const stTime = inFinalStretch() ? Math.max(2, Math.round(S.stealTime/2)) : S.stealTime;
    stage(`<div class="big" style="color:var(--steal-ink)">وقت السرقة!</div>${inFinalStretch()?'<span class="banner">الحسم: وقت السرقة بالنص</span>':''}
      <div class="qtext">${esc(item.q)}</div>${mcHTML}${timerHTML(stTime,'steal')}${timeupHTML}
      <p class="muted">أي فريق يجاوب صح ياخذ ${stealPts(p)}. ${ownerCanAnswer? `${esc(t.name)} خلص وقته بدون ما يغلط — لو قالها صح ياخذ ${p} كاملة.` : `${esc(t.name)} غلط وراحت عليه.`}</p>
      <div class="row center">${ownerCanAnswer? `<button class="btn team" style="--c:${t.color}" data-owner>${ic('check')} ${esc(t.name)} (${p})</button>`:''}${cands.map(x=>`<button class="btn team" style="--c:${x.color}" data-steal="${x.id}">${ic('ninja')} ${esc(x.name)} (${x.fx.fullsteal!=null?p:stealPts(p)})</button>`).join('')}</div>
      ${cands.length?'':'<span class="fx-tag bad">ما فيه فريق يقدر يسرق</span>'}
      <div class="row center"><button class="btn ghost" id="btn-nosteal">ما أحد جاوب — أنهِ الدور</button><button class="btn small" id="btn-reveal2">${ic('eye')} الإجابة</button><button class="btn small ghost" id="btn-restart">${ic('stopwatch')} أعد الوقت</button></div>
      <div class="answer hidden" id="answer">${esc(item.a)}</div><div id="buzzbox"></div>`);
    play('steal',{volume:.8}); reaction('steal',2300);
    let ended=false;
    const end=(sid, owner)=>{ if(ended) return; ended=true; clearTimer();
      logResult(owner?'late': sid?'steal':'fail');
      if(owner){ const {net,note:n2}=resolveSuccess(t,p,{hard:p>=pts(3)}); play('correct'); flash('good'); reaction('correct'); confetti(60,1500); return afterTurn(`${esc(t.name)} لحقها! +${net}${n2}`); }
      if(sid){ const s=G.teams.find(x=>x.id===sid); let gain=stealPts(p); const notes=[];
        credit((G.buzz && G.buzz.pids && G.buzz.pids[sid]) || (s.players.length===1 ? s.players[0].id : null), 'steals');
        if(s.fx.fullsteal!=null){ gain=p; delete s.fx.fullsteal; notes.push('ببلاش: كاملة'); }
        const {net,note:n2}=payout(s,gain,notes);
        { const o=ST(s); if(o){ o.pts.steal+=net; o.steals++; } const v=ST(t); if(v) v.stolenFrom++; moment(`${esc(s.name)} سرق سؤال ${esc(t.name)} (+${net})`, s); }
        play('correct'); memeSound('steal',{volume:.6}); flash('steal'); reaction('steal');
        afterTurn(`<span style="color:var(--steal-ink)">${esc(s.name)} سرقها</span> +${net}${n2}${note}`);
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
    item = item || pickContent('c', d, 'tagsC'); logItem('c', item, d);
    const p=pts(priceD||d), half=Math.round(p/2);
    const time = lag ? Math.ceil(S.charadeTime/2) : S.charadeTime;
    const viaPhone = phoneOf(t);
    G.charade = { team:t.id, text:item.t, actor: G.charade && G.charade.team===t.id && NET() && NET().cidOpen(G.charade.actor) ? G.charade.actor : null, acting:false };
    stage(`${head(t,item,'c',d,p,priceD)}
      <div class="big">${viaPhone?`مين بيمثّل من ${esc(t.name)}؟`:`ممثل ${esc(t.name)}: تعال شوف العبارة لحالك`}</div>
      ${viaPhone?`<div id="ch-status" class="ch-status ${G.charade.actor?'ok':''}">${G.charade.actor?`${ic('check')} الممثل جاهز — العبارة على جواله`:`${ic('phone')} واحد منكم يضغط «أنا بمثّل» من جواله — العبارة تطلع له بس`}</div>`:''}
      <div class="covered ${viaPhone?'hidden':''}" id="cov"><div class="qtext" style="padding:22px 34px">${esc(item.t)}</div><div class="cover"><span>${ic('eye')} اضغط عشان تشوف</span></div></div>
      ${viaPhone?`<button class="btn small ghost" id="btn-tvshow">${ic('eye')} عرض العبارة على الشاشة بدل الجوال</button>`:''}
      <p class="muted small">${viaPhone?'':'اضغط تظهر واضغط مرة ثانية تختفي. '}بدون كلام، بدون تهجئة، بدون إشارة لأشياء بالغرفة.</p>
      <div class="row center"><button class="btn btn-mint big" id="btn-ready">${ic('stopwatch')} جاهز — ابدأ الوقت</button>${rerollBtn(t)}</div>`);
    $('#cov').onclick=()=>{ const c=$('#cov .cover'); c.style.display = c.style.display==='none' ? 'flex' : 'none'; play('pop'); };
    const tvs=$('#btn-tvshow'); if(tvs) tvs.onclick=()=>{ $('#cov').classList.remove('hidden'); tvs.remove(); };
    const rb=$('#btn-reroll'); if(rb) rb.onclick=()=>{ useReroll(t); runCharade(t,d,null,{priceD,lag}); };
    $('#btn-ready').onclick=()=>{
      if(G.charade) G.charade.acting=true;
      stage(`<div class="row center"><span class="pill">${ic('masks')} ${esc(item.tag)}</span><span class="pill dim">${p} نقطة · نص للممثل ونص للي يخمّن</span></div>
        <div class="big">مثّل… والباقين يخمّنون</div>${t.fx.sawalif!=null?'<span class="fx-tag">سواليف: مسموح للممثل يقول كلمة وحدة</span>':''}${timerHTML(time)}${timeupHTML}
        <p class="muted small">أول فريق يقولها صح: اضغط اسمه (حتى فريق الممثل).</p>
        <div class="row center">${G.teams.map(x=>`<button class="btn team" style="--c:${x.color}" data-g="${x.id}">${esc(x.name)}${x.fx.rizz!=null&&x!==t?' (فنّان)':''}</button>`).join('')}</div>
        <div class="row center"><button class="btn ghost" id="btn-nobody">ما أحد خمّن — أنهِ الدور</button><button class="btn small" id="btn-reveal">${ic('eye')} العبارة</button><button class="btn small ghost" id="btn-restart">${ic('stopwatch')} أعد الوقت</button></div>
        <div class="answer hidden" id="answer">${esc(item.t)}</div><div id="buzzbox"></div>`);
      let ended=false;
      const end=(gid)=>{ if(ended) return; ended=true; clearTimer();
        if(G.charade && G.charade.pid){ credit(G.charade.pid,'acted'); if(gid) credit(G.charade.pid,'actedOk'); }
        logResult(!gid?'fail': gid===t.id?'own':'other', { by: G.charade && G.charade.pid ? nameOf(t, G.charade.pid) : null });
        if(gid){ const g=G.teams.find(x=>x.id===gid);
          let a=half; const an=[];
          if(t.fx.rizz!=null){ a=p; delete t.fx.rizz; an.push('فنّان: نصيب كامل'); }
          if(t.fx.sawalif!=null){ a+=25; delete t.fx.sawalif; an.push('سواليف +25'); }
          const ra=resolveSuccess(t,a,{hard:d===3,section:'c'});
          let msg;
          if(g===t){ const rb2=payout(t,half,[]); { const o=ST(t); if(o) o.pts.c+=rb2.net; } msg=`فريق الممثل نفسه خمّنها! +${ra.net+rb2.net} لـ ${esc(t.name)}${ra.note}`; }
          else { let b=half; const bn=[]; if(g.fx.rizz!=null){ b=p; delete g.fx.rizz; bn.push('فنّان: نصيب كامل'); }
            const rb2=payout(g,b,bn); { const o=ST(g); if(o) o.pts.c+=rb2.net; } msg=`${esc(g.name)} خمّنها! +${rb2.net} لهم${rb2.note} و+${ra.net} لـ ${esc(t.name)}${ra.note}`; }
          if(an.length) msg+=` <span class="muted">(${an.join('')})</span>`;
          play('correct'); flash('good'); reaction('correct'); confetti(60,1500); afterTurn(msg);
        } else {
          delete t.fx.sawalif; const notes=resolveFail(t,p,'c'); play('fail',{volume:.6}); flash('bad'); reaction('wrong');
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
    item = item || pickContent('t', d, 'tagsT'); logItem('t', item, d);
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
        ${whoRow(t).replace('مين جاوب؟','مين نفّذ؟')}
        <div class="row center"><button class="btn btn-mint big" id="btn-ok">${ic('check')} نجح</button><button class="btn btn-bad big" id="btn-no">${ic('cancel')} فشل</button></div>`);
      let ended=false;
      const end=(ok)=>{ if(ended) return; ended=true; clearTimer(); logResult(ok?'ok':'fail'); credit(answererOf(t), ok?'ok':'wrong');
        if(ok){ const {net,note}=resolveSuccess(t,p,{hard:d===3,section:'t'}); play('cheer',{volume:.6}); flash('good'); reaction('correct'); confetti(80,1800); afterTurn(`<span style="color:var(--mint)">نجح!</span> +${net}${note}`); }
        else { const notes=resolveFail(t,p,'t'); play('fail'); flash('bad'); reaction('wrong'); memeSound('wrong',{volume:.6}); afterTurn(`ما نجح${notes.length?` <span class="muted">(${notes.join(' · ')})</span>`:''}`); }
      };
      startTimer(time); bindWho();
      $('#btn-ok').onclick=()=>end(true); $('#btn-no').onclick=()=>end(false);
      $('#btn-restart').onclick=()=>restartTimer(time);
      if(a) $('#btn-reveal').onclick=()=>$('#answer').classList.toggle('hidden');
    };
  }

  // ---------- بعد الدور ----------
  function afterTurn(msg){
    stopAll();
    const t=cur();
    G.charade=null; logResult('fail');
    if(t.fx.benched) delete t.fx.benched;
    t.lastGain = Math.max(0, t.score - t.turnStart); t.lastFail = t.lastGain<=0;
    { const o=ST(t); if(o){ o.bestTurn=Math.max(o.bestTurn,t.lastGain); if(t.lastGain>=200) moment(`${esc(t.name)} كسب ${t.lastGain} بدور واحد`, t); }
      if(G.stats) G.stats.series.push({ label:`اللفة ${G.round} — دور ${t.name}`, round:G.round, scores:Object.fromEntries(G.teams.map(x=>[x.id,x.score])) }); }
    delete t.fx.noCard;
    const ok = t.lastGain>0, extra=[];
    (G.bets||[]).filter(b=>b.on===t.id).forEach(b=>{ const by=G.teams.find(x=>x.id===b.by); if(!by) return;
      const right = (b.pred==='win')===ok; addScore(by, right?100:-50, {silent:!right});
      extra.push(`أراهنك: ${esc(by.name)} ${right?'صدق +100':'خربت −50'}`); });
    G.bets=(G.bets||[]).filter(b=>b.on!==t.id);
    if(t.fx.coal){ delete t.fx.coal;
      if(ok){ const n=G.order.length, i=G.order.indexOf(G.teams.indexOf(t)); const nx=G.teams[G.order[(i+1)%n]]; if(nx&&nx!==t){ nx.fx.coal=true; extra.push(`الجمرة انتقلت لـ ${esc(nx.name)}`); play('game:c_ticking',{volume:.5,max:1500}); } }
      else { const s0=t.score; addScore(t,-150,{silent:true}); extra.push(`الجمرة انفجرت على ${esc(t.name)} −${s0-t.score}`); moment(`الجمرة انفجرت على ${esc(t.name)} (−150)`, t); play('meme:boom',{volume:.9}); flash('bad'); }
    }
    if(extra.length) msg += `<div class="fx-tags mt-s">${extra.map(x=>`<span class="fx-tag">${x}</span>`).join('')}</div>`;
    const reached = G.teams.find(x=>x.score>=S.target);
    let banner='';
    if(reached && !G.finalRound){
      G.finalRound = true; moment(`${esc(reached.name)} وصل الهدف`, reached); play('game:g_finishhim',{volume:.9}); confetti(120,2000); reaction('finalRound',3000);
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
      if(t.fx.brake!=null && t.fx.brake<G.round) delete t.fx.brake;
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
    const tr = tier||weightedTier();                 // الفئة تنختار مرة وحدة لكل سحبة
    let pool = DATA.cards.filter(c=>c.tier===tr);
    if(!S.reactionsEnabled) pool = pool.filter(c=>c.kind!=='reaction');
    if(!pool.length) pool = DATA.cards.filter(c=>c.tier==='normal'&&c.kind!=='reaction');
    const ph=gamePhase(), w=c=> !c.phase ? 1 : c.phase===ph ? 2.2 : 0.7;
    let r=Math.random()*pool.reduce((a,c)=>a+w(c),0);
    for(const c of pool){ r-=w(c); if(r<=0) return c; }
    return pool[pool.length-1];
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
    G.log.drawn.push(c.id);
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
    if(c.fx==='swapTurn'){ const l=notPlayedYet(t); if(!l.length) return Promise.resolve('none:ما فيه فريق باقي له دور هاللفة'); return pickTeam(t,'روح انت أول — مين يلعب بدالك الحين؟', l); }
    if(c.fx==='bet') return pickTeam(t,'أراهنك — على أي فريق تراهن؟', others(t));
    if(c.fx==='bench'){ const l=others(t).filter(x=>x.players.length>=2); if(!l.length) return Promise.resolve('none:ما فيه فريق فيه لاعبين أو أكثر'); return pickTeam(t,'خلك برا السالفة — أي فريق؟', l); }
    if(c.fx==='fatality'){ const l=others(t).filter(x=>x.hand.length); if(!l.length) return Promise.resolve('none:ما فيه فريق معه بطايق'); return pickTeam(t,'فاتاليتي — مين تخلص عليه؟', l); }
    if(c.kind==='duel') return pickTeam(t,`${esc(c.name)} — مين تتحدى؟`, others(t));
    return pickTeam(t,`${esc(c.name)} — اختار الفريق`, others(t));
  }
  // بطاقة انلعبت وشرطها مو متحقق: تنحرق على صاحبها وتنحسب بطاقة الدور
  function burnCard(t, idx, why){
    const c=t.hand[idx]; if(!c) return;
    t.playedCard=true; t.hand.splice(idx,1);
    G.log.cards.push({ id:c.id, as:null, team:t.id, r:G.round, ph:gamePhase(), s:t.score, lead:leader().score, tgt:null, burned:1 });
    const pen={legendary:100, medium:50, normal:25}[c.tier]||0; if(pen) addScore(t,-pen,{silent:true,noInsure:true});
    play('fx_deny',{volume:.6}); toast(`انحرقت "${c.name}": ${why}${pen?` — خسرتوا ${pen}`:''}`, 4000);
    renderBoard(); turnIntro();
  }
  async function playCard(t, idx){
    if(!canPlayCard(t)){ toast(t.fx.noCard?'ولا كلمة: ممنوع بطاقات هالدور':'بطاقة وحدة بس كل دور'); return; }
    const c=t.hand[idx];
    let real=c, target=null;
    if(c.fx==='copy'){ real=G.lastCard; if(!real) return burnCard(t, idx, 'ما انلعبت بطاقة قبل'); }
    if(real.fx==='jackpot' && t.score<JACKPOT_COST){ toast(`جاك بوت تحتاج ${JACKPOT_COST} نقطة معك عشان تلعبها`); return; }
    if(real.target){
      if(real.target==='choose'){ target=await chooseTarget(t,real); if(!target) return;
        if(typeof target==='string') return burnCard(t, idx, target.slice(5));
        if(real.fx==='bench'){ const pid=await decide(t,{ title:`مين من ${esc(target.name)} يطلع برا السالفة؟`, options:target.players.map(p=>({v:p.id,label:p.name})), cancel:'تراجع' }); if(!pid) return; G.benchPick={teamId:target.id, pid}; } }
      else {
        target=targetOf(t,real);
        if(!target){ if(real.target==='leader') return burnCard(t, idx, 'انت المتصدر'); toast('ما فيه فريق تنزل عليه'); return; }
        const ok = await decide(t,{ title:`${esc(c.name)}${real!==c?` ← ${esc(real.name)}`:''} — بتنزل على <span class="who" style="--c:${target.color}">${esc(target.name)}</span>`, text:esc(real.desc), options:[{v:true,label:'نزّلها'}], cancel:'تراجع' });
        if(!ok) return;
      }
    }
    t.playedCard=true; t.hand.splice(idx,1);
    if(c.fx!=='copy') G.lastCard=c;
    showPlayed(c, t);
    G.log.cards.push({ id:c.id, as:real!==c?real.id:null, team:t.id, r:G.round, ph:gamePhase(), s:t.score, lead:leader().score, tgt:target?target.id:null });
    { const o=ST(t); if(o){ o.cards++; if(real.kind==='attack') o.attacks++; } if(c.tier==='legendary') moment(`${esc(t.name)} لعب "${esc(c.name)}"${target?` على ${esc(target.name)}`:''}`, t); }
    const fx=FX(); if(fx){ fx.sound(c); fx.visual(c); } else play('bling');
    if(real.fx==='swapTurn'){ swapTurn(t,target); return; }
    let msg;
    if(real.kind==='duel') msg = await duel(t,target,real);
    else if(real.fx==='bet') msg = await placeBet(t,target);
    else if(real.kind==='attack' || real.fx==='trade') msg = await attack(t, target, real);
    else {
      if(real.fx==='jackpot'){ addScore(t,-JACKPOT_COST,{silent:true,noInsure:true}); }
      const env = real.kind==='buff' ? await envyCheck(t, real) : null;
      msg = env ? env : await applySelf(t, real);
    }
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


  // ---------- بطاقات التحدي: فريق ضد فريق، الفايز ياخذ الرهان من الخاسر ----------
  function duelPay(w, l, stake){
    const take=Math.min(stake, Math.max(0,l.score)); addScore(l,-take,{silent:true}); addScore(w,stake);
    moment(`${esc(w.name)} فاز بالتحدي على ${esc(l.name)} (+${stake})`, w);
    play('correct'); flash('good'); confetti(60,1400);
    return `${w.name} فاز بالتحدي: +${stake}، و${l.name} −${take}`;
  }
  const duelItem = (kind, d) => { const k=kind==='q'?'tagsQ':'tagsC'; return pickContent(kind, d, k); };
  // مؤقت بسيط داخل نافذة التحدي
  function duelTimer(m, sec, onEnd){
    const el=m.querySelector('.du-time'); let left=sec; clearInterval(m._tm);
    const show=()=>{ if(el){ el.textContent=left; el.classList.toggle('low', left<=3); } };
    show(); m._tm=setInterval(()=>{ left--; show(); if(left<=0){ clearInterval(m._tm); if(onEnd) onEnd(); } },1000);
    return ()=>sec-left;
  }
  const duelHead = (title, a, b, stake) => `<div class="eyebrow">${ic('whistle')} ${title} · الرهان ${stake}</div>
    <div class="du-vs"><span class="who" style="--c:${a.color}">${esc(a.label)}</span><i>ضد</i><span class="who" style="--c:${b.color}">${esc(b.label)}</span></div>`;
  function duelModal(){ return modal('<div class="du" id="du"></div>',{closable:false}); }
  async function pickPlayer(asker, team, title){
    if(team.players.length<2) return team.players[0]||null;
    const pid=await decide(asker,{ title, options:team.players.map(p=>({v:p.id,label:p.name})) });
    return team.players.find(p=>p.id===pid)||team.players[0];
  }
  // انزلي: لاعب ضد لاعب، سؤال لكل واحد بالتناوب، أول واحد يغلط يخسر
  async function duelQ(t, x){
    const STAKE=200, ROUNDS=5;
    const pb=await pickPlayer(t, x, `انزلي — مين تتحدى من ${esc(x.name)}؟`);
    const pa=await pickPlayer(t, t, 'مين ينزل منكم؟');
    const A={team:t, color:t.color, label:pa&&t.players.length>1?pa.name:t.name}, B={team:x, color:x.color, label:pb&&x.players.length>1?pb.name:x.name};
    const m=duelModal(), box=m.querySelector('#du');
    const res = await new Promise(done=>{
      let n=0;
      const ask=()=>{
        if(n>=ROUNDS*2) return done(null);
        const who = n%2===0 ? A : B, other = who===A ? B : A, d = Math.min(3, 1+Math.floor(n/4)), item=duelItem('q', d);
        box.innerHTML=`${duelHead('انزلي', A, B, STAKE)}
          <div class="du-turn">سؤال ${Math.floor(n/2)+1} · ${DIFF[d]} — يجاوب <span class="who" style="--c:${who.color}">${esc(who.label)}</span> <b class="du-time"></b></div>
          <div class="qtext">${esc(item.q)}</div>
          <div class="answer hidden" id="du-ans">${esc(item.a)}</div>
          <div class="row center"><button class="btn small" id="du-show">${ic('eye')} الإجابة</button></div>
          <div class="row center"><button class="btn btn-mint big" data-dq="ok">${ic('check')} صح</button><button class="btn btn-bad big" data-dq="no">${ic('cancel')} غلط — خسر</button></div>
          <p class="muted small">أول واحد يغلط أو يخلص وقته يخسر. ${ROUNDS} أسئلة لكل واحد، ولو ما أحد غلط تعادل.</p>`;
        duelTimer(m, Math.max(5,S.answerTime), ()=>{ const b=box.querySelector('.du-time'); if(b) b.textContent='خلص الوقت'; });
        box.querySelector('#du-show').onclick=()=>box.querySelector('#du-ans').classList.toggle('hidden');
        box.querySelector('[data-dq="ok"]').onclick=()=>{ play('tick',{volume:.6}); n++; ask(); };
        box.querySelector('[data-dq="no"]').onclick=()=>done({w:other.team, l:who.team});
      };
      ask();
    });
    clearInterval(m._tm); m.remove();
    return res ? duelPay(res.w, res.l, STAKE) : 'انزلي: تعادل — ما أحد غلط';
  }
  // الكلاسيكو: سؤال واحد بالبز، الرهان يحدده صاحب البطاقة
  async function duelBuzz(t, x){
    const stake = await decide(t,{ title:`الكلاسيكو مع ${esc(x.name)} — كم الرهان؟`, options:[{v:100,label:'100 · سهل'},{v:150,label:'150 · متوسط'},{v:200,label:'200 · صعب'}] }) || 100;
    const d=({100:1,150:2,200:3})[stake]||1, item=duelItem('q', d);
    const A={team:t, color:t.color, label:t.name}, B={team:x, color:x.color, label:x.name};
    const m=duelModal(), box=m.querySelector('#du');
    const res = await new Promise(done=>{
      const tried=[];
      const judge=(who)=>{
        const other = who===A ? B : A; closeBuzz(); pushAll();
        box.querySelector('#du-act').innerHTML=`<div class="du-turn">يجاوب <span class="who" style="--c:${who.color}">${esc(who.label)}</span> <b class="du-time"></b></div>
          <div class="row center"><button class="btn btn-mint big" data-dq="ok">${ic('check')} صح</button><button class="btn btn-bad big" data-dq="no">${ic('cancel')} غلط</button></div>`;
        duelTimer(m, Math.max(5,S.answerTime));
        box.querySelector('[data-dq="ok"]').onclick=()=>done({w:who.team, l:other.team});
        box.querySelector('[data-dq="no"]').onclick=()=>{ tried.push(who); play('wrong',{volume:.5}); if(tried.includes(other)) done(null); else judge(other); };
      };
      box.innerHTML=`${duelHead('الكلاسيكو', A, B, stake)}
        <div class="qtext">${esc(item.q)}</div>
        <div class="answer hidden" id="du-ans">${esc(item.a)}</div>
        <div class="row center"><button class="btn small" id="du-show">${ic('eye')} الإجابة</button></div>
        <div id="du-act"><div class="du-turn">مين يبز أول؟</div>
          <div class="row center"><button class="btn team big" style="--c:${A.color}" data-dq="a">${ic('whistle')} ${esc(A.label)}</button><button class="btn team big" style="--c:${B.color}" data-dq="b">${ic('whistle')} ${esc(B.label)}</button></div></div>
        <p class="muted small">اللي يبز أول يجاوب. غلط؟ الفرصة تروح للثاني. الاثنين غلطوا؟ ما أحد ياخذ شي.</p>`;
      box.querySelector('#du-show').onclick=()=>box.querySelector('#du-ans').classList.toggle('hidden');
      box.querySelector('[data-dq="a"]').onclick=()=>judge(A);
      box.querySelector('[data-dq="b"]').onclick=()=>judge(B);
      openBuzz([t.id, x.id], team=>judge(team===t?A:B));
    });
    closeBuzz(); clearInterval(m._tm); m.remove(); pushAll();
    return res ? duelPay(res.w, res.l, stake) : `الكلاسيكو: ما أحد جاوب. الجواب: ${item.a}`;
  }
  // فيلم صامت: كل فريق يمثّل عبارة، والأسرع يفوز
  async function duelAct(t, x){
    const STAKE=150, TIME=Math.max(20, Math.round(S.charadeTime/2));
    const A={team:t, color:t.color, label:t.name}, B={team:x, color:x.color, label:x.name};
    const m=duelModal(), box=m.querySelector('#du');
    const run = who => new Promise(done=>{
      const item=duelItem('c', 2);
      box.innerHTML=`${duelHead('فيلم صامت', A, B, STAKE)}
        <div class="du-turn">يمثّل <span class="who" style="--c:${who.color}">${esc(who.label)}</span> — ${TIME} ثانية</div>
        <div class="covered" id="du-cov"><div class="qtext" style="padding:20px 30px">${esc(item.t)}</div><div class="cover"><span>${ic('eye')} الممثل بس يشوف العبارة</span></div></div>
        <div class="row center"><button class="btn btn-gold big" data-dq="go">${ic('stopwatch')} ابدأ الوقت</button></div>
        <p class="muted small">فريق الممثل يخمّن. الأسرع بين الفريقين يفوز.</p>`;
      const cov=box.querySelector('#du-cov'); cov.onclick=()=>{ const c=cov.querySelector('.cover'); c.style.display = c.style.display==='none' ? 'flex' : 'none'; };
      box.querySelector('[data-dq="go"]').onclick=()=>{
        box.innerHTML=`${duelHead('فيلم صامت', A, B, STAKE)}
          <div class="du-turn"><span class="who" style="--c:${who.color}">${esc(who.label)}</span> يمثّلون <b class="du-time big"></b></div>
          <div class="row center"><button class="btn btn-mint big" data-dq="ok">${ic('check')} خمّنوها</button><button class="btn btn-bad big" data-dq="no">${ic('cancel')} ما عرفوها</button></div>`;
        const elapsed=duelTimer(m, TIME, ()=>{ play('fail',{volume:.5}); done(Infinity); });
        const t0=performance.now();
        box.querySelector('[data-dq="ok"]').onclick=()=>{ clearInterval(m._tm); play('tick'); done((performance.now()-t0)/1000); };
        box.querySelector('[data-dq="no"]').onclick=()=>{ clearInterval(m._tm); done(Infinity); };
      };
    });
    const ta=await run(A), tb=await run(B);
    clearInterval(m._tm); m.remove();
    if(ta===Infinity && tb===Infinity) return 'فيلم صامت: ما أحد خمّن — تعادل';
    const fmt=v=>v===Infinity?'ما خمّنوا':v.toFixed(1)+' ث';
    return duelPay(ta<tb?t:x, ta<tb?x:t, STAKE)+` (${t.name}: ${fmt(ta)} · ${x.name}: ${fmt(tb)})`;
  }
  async function duel(t, x, c){
    G.canPlayNow=false; stopAll();
    { const o=ST(t); if(o) o.duels=(o.duels||0)+1; }
    const msg = c.fx==='duelQ' ? await duelQ(t,x) : c.fx==='duelBuzz' ? await duelBuzz(t,x) : await duelAct(t,x);
    return msg;
  }

  const JACKPOT_COST = 150;
  // ما تهنى: أي فريق معه البطاقة يقدر يلغي تقوية خصمه لحظة ما تنلعب
  async function envyCheck(t, real){
    if(!S.reactionsEnabled) return null;
    for(const x of others(t)){
      const card = x.hand.find(h=>h.fx==='envy'); if(!card) continue;
      const yes = await decide(x,{ title:`${esc(t.name)} لعب "${esc(real.name)}" — تخربونها عليه؟`, text:real.fx==='jackpot'?`لو خربتوها الـ${JACKPOT_COST} اللي دفعها تجيكم`:'', options:[{v:true,card}], cancel:'خلوه يتهنى' });
      if(!yes) continue;
      x.hand.splice(x.hand.indexOf(card),1); showPlayed(card, x);
      { const fx=FX(); if(fx){ fx.sound(card); fx.visual(card); } const o=ST(x); if(o) o.reactions++; moment(`${esc(x.name)} خرب "${esc(real.name)}" على ${esc(t.name)}`, x); }
      if(real.fx==='jackpot') addScore(x, JACKPOT_COST);
      return `ما تهنى! ${x.name} خرب "${real.name}" على ${t.name}${real.fx==='jackpot'?` وأخذ ${JACKPOT_COST}`:''}`;
    }
    return null;
  }
  // البطايق اللي تخترق الحصانة
  const PIERCE = { factcheck:true, steal:true };
  // هجوم مع فرصة رد الفعل
  async function attack(src, tgt, c){
    let pre='';
    if(tgt.fx.ambush && tgt!==src && c.fx!=='factcheck'){ delete tgt.fx.ambush; const a=Math.min(100,Math.max(0,src.score)); addScore(src,-a,{silent:true}); play('meme:trap',{volume:.7}); pre=`إنه فخ! ${src.name} خسر ${a}. `; }
    return pre + await attack0(src, tgt, c);
  }
  async function attack0(src, tgt, c){
    if(c.fx==='roast' && !tgt.lastFail){ play('fx_deny',{volume:.6}); return `انحرقت طقطقة: ${tgt.name} ما فشل بدوره الأخير`; }
    if(tgt.fx.immune!=null && !PIERCE[c.fx]){ play('meme:pipe',{volume:.6}); return `${tgt.name} على وضع الطيران — ${c.name} ما وصلت`; }
    if(S.reactionsEnabled && c.fx!=='factcheck'){
      const reacts = tgt.hand.filter(x=>x.kind==='reaction' && x.fx!=='envy' && x.fx!=='wow');
      if(reacts.length){
        const choice = await decide(tgt,{ title:`${esc(src.name)} رمى "${esc(c.name)}" عليكم — تردون؟`, options:reacts.map(r=>({v:r.id,card:r})), cancel:'خلها تمر' });
        if(choice){
          const ri=tgt.hand.findIndex(x=>x.id===choice); const r=tgt.hand.splice(ri,1)[0]; showPlayed(r, tgt);
          { const o=ST(tgt); if(o) o.reactions++; moment(`${esc(tgt.name)} ردّ "${esc(c.name)}" بـ"${esc(r.name)}"`, tgt); }
          const fx=FX(); if(fx){ fx.sound(r); fx.visual(r); }
          reaction('reverse',2600);
          if(r.fx==='seen') return `${tgt.name} سوّى بلوك — ${c.name} انلغت`;
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
    const f=tgt.fx; { const o=ST(tgt); if(o) o.hits++; }
    switch(c.fx){
      case 'harder': f.harder=true; return `${tgt.name}: الصعوبة الجاية أعلى بدرجة`;
      case 'lag': f.lag=true; return `${tgt.name}: وقته الجاي بالنص`;
      case 'ratio': f.ratioTo=src.id; return `${tgt.name}: نص أول كسب له يروح لـ ${src.name}`;
      case 'npc': f.npc=true; return `${tgt.name}: دوره الجاي تحديات بالغصب`;
      case 'skipDraw': f.skipDraw=true; return `${tgt.name}: ما يسحب بطاقة دوره الجاي`;
      case 'shadowban': f.noSteal=G.round; f.noCard=true; return `${tgt.name}: ممنوع يسرق هاللفة وممنوع بطاقات دوره الجاي`;
      case 'factcheck': { const DEF={immune:'وضع الطيران', ambush:'إنه فخ', insure:'تأمين ضد الغير'}; const had=Object.keys(DEF).filter(k=>f[k]!=null); had.forEach(k=>delete f[k]);
        const burned=tgt.hand.filter(x=>x.kind==='reaction'); tgt.hand=tgt.hand.filter(x=>x.kind!=='reaction');
        if(!had.length && !burned.length){ addScore(src,-50,{silent:true,noInsure:true}); play('fx_deny',{volume:.6}); return `الفار على الفاضي: ${tgt.name} ما عنده دفاع — ${src.name} خسر 50`; }
        return `الفار كسر دفاع ${tgt.name}: ${[...had.map(k=>DEF[k]), ...burned.map(x=>x.name)].join('، ')}`; }
      case 'wolf': src.fx.wolf=tgt.id; return `خلك ذيب: لو ${src.name} نجح بهالدور، نقاطه تنخصم من ${tgt.name}`;
      case 'steal': { const ks=Object.keys(BUFFS).filter(k=>f[k]!=null);
        if(!ks.length){ addScore(src,-50,{silent:true,noInsure:true}); play('fx_deny',{volume:.6}); return `اللي لك لي على الفاضي: ${tgt.name} ما عنده طاقة — ${src.name} خسر 50`; }
        const k = ks.length>1 ? (await decide(src,{ title:`اللي لك لي — وش تاخذ من ${esc(tgt.name)}؟`, options:ks.map(k=>({v:k,label:BUFFS[k]})) }) || ks[0]) : ks[0];
        src.fx[k]=f[k]; delete f[k]; if(k==='immune' || k==='fullsteal' || k==='yasalam') src.fx[k]=Math.max(src.fx[k], G.round);
        return `اللي لك لي: ${src.name} أخذ "${BUFFS[k]}" من ${tgt.name}`; }
      case 'fatality': { const n=tgt.hand.length; if(!n) return `${tgt.name} ما معه بطايق — راحت فاتاليتي`; tgt.hand=[]; return `فاتاليتي! انحرقت كل بطايق ${tgt.name} (${n})`; }
      case 'pick': case 'hawk': {
        if(!tgt.hand.length){ addScore(src,-50,{silent:true,noInsure:true}); play('fx_deny',{volume:.6}); return `يد ${tgt.name} فاضية — ${src.name} خسر 50`; }
        const open = c.fx==='hawk';
        const i = await decide(src,{ title: open ? `عين الصقر: هذي يد ${esc(tgt.name)} — اختاروا وحدة` : `نشّال: يد ${esc(tgt.name)} مقلوبة — اختاروا وحدة على عماكم`,
          options: tgt.hand.map((h,k)=> open ? {v:k,card:h} : {v:k,label:'البطاقة '+(k+1)}) });
        const take = tgt.hand.splice(i==null?0:i,1)[0];
        await addToHand(src, take);
        return open ? `عين الصقر: ${src.name} أخذ "${take.name}" من ${tgt.name}` : `نشّال: ${src.name} سحب بطاقة من يد ${tgt.name}`; }
      case 'bench': { const pl=tgt.players||[]; if(pl.length<2) return `${tgt.name} لاعب واحد — ما فيه أحد يطلع`;
        const pid = G.benchPick && G.benchPick.teamId===tgt.id ? G.benchPick.pid : rnd(pl).id; G.benchPick=null;
        const pp=pl.find(x=>x.id===pid)||rnd(pl); f.benched={pid:pp.id, name:pp.name}; return `${pp.name} من ${tgt.name} برا السالفة بدورهم الجاي`; }
      case 'brake': f.brake=G.round; return `على وين؟ ${tgt.name} ما يعدّي الهدف هاللفة`;
      case 'coal': f.coal=true; return `الجمرة بيد ${tgt.name}: ينجح تنتقل، يفشل تنفجر −150`;
      case 'roast': { const a=Math.min(100,Math.max(0,tgt.score)); addScore(tgt,-a,{silent:true}); tgt.lastFail=false; return `طقطقة على ${tgt.name}: −${a}`; }
      case 'hamour': { const amt=Math.min(150, Math.max(0,tgt.score)); if(!amt) return `${tgt.name} ما عنده شي ينوخذ`; addScore(tgt,-amt,{silent:true}); addScore(src,amt); return `الهامور: ${src.name} أخذ ${amt} من ${tgt.name}`; }
      case 'evilEye': f.evilEye=true; return `عين وصابت ${tgt.name}: نص نجاحه الجاي يطير`;
      case 'prank': { const b=randomCard('black'); if(tgt.hand.length>=S.handMax) tgt.hand.splice(Math.floor(Math.random()*tgt.hand.length),1); tgt.hand.push(b); return `مقلب! ${tgt.name} لقى "${b.name}" بيده`; }
      case 'snap': { const loss=Math.max(Math.min(250, r25(tgt.score*.25)), tgt.score>0?25:0); addScore(tgt,-loss,{silent:true});
        return `فرقعة ثانوس: ${tgt.name} خسر ${loss}`; }
      case 'undo': { const g=tgt.lastGain||0; tgt.lastGain=0; if(!g) return `${tgt.name} ما كسب شي بدوره الأخير — راحت البطاقة`; addScore(tgt,-g,{silent:true}); return `ما غزيت: انمسحت ${g} نقطة من ${tgt.name}`; }
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
        return `خذ وهات: ${src.name} أخذ "${take.name}"${give?` وعطى "${give.name}"`:''}`;
      }
    }
    return 'تم';
  }
  async function applySelf(t, c){
    const f=t.fx;
    switch(c.fx){
      case 'fakka': addScore(t,10); return 'فكّة: +10';
      case 'coin': { const win=Math.random()<.5; addScore(t, win?50:-50, {silent:!win}); play(win?'coin':'fail',{volume:.6}); return win?'يا نصيب: طلعت لك +50':'يا نصيب: راحت عليك −50'; }
      case 'stick': { const n=G.order.length, i=G.order.indexOf(G.teams.indexOf(t)); const nx=G.teams[G.order[(i+1)%n]];
        if(!nx || nx===t) return 'لزقة: ما فيه أحد تلزق فيه';
        if(nx.hand.length>=S.handMax) return `لزقة: يد ${nx.name} مليانة، طاحت بالأرض`;
        nx.hand.push(c); return `لزقة: لزقت بيد ${nx.name}`; }
      case 'x2next': f.x2next=true; return 'خلك ذيب: نجاحك بهالدور دبل، ولو فشلت ترجع لك';
      case 'jackpot': f.jackpot=true; return `جاك بوت: دفعتوا ${JACKPOT_COST} — تنجحون تاخذون النقاط ×2`;
      case 'extraTurn': f.extraTurn=true; return 'طقها والحقها: لك دور ثاني بعد هذا';
      case 'reroll': f.reroll=(f.reroll||0)+1; return 'اصرمني: تقدر تبدّل السؤال أو العبارة أو التحدي مرة';
      case 'spoiler': f.spoiler=true; return 'سؤالك الجاي فيه سبويلر';
      case 'immune': f.immune=G.round+1; return 'وضع الطيران: محصّن لين نهاية اللفة الجاية';
      case 'streak': f.streak=true; addScore(t,50); return 'مولّعة: +50 وكل نجاح ورا بعض +50 لين تفشل';
      case 'nocap': f.nocap=true; return 'نو كاب: أول نجاح +25 (+50 لو صعب)';
      case 'copium': f.copium=true; return 'كوبيوم: لو فشلت تاخذ 40';
      case 'speedrun': f.speedrun=true; return 'سبيد رن: جاوب صح بنص الوقت الأول وخذ +50%';
      case 'choose': f.choose=true; return 'على كيفي: اختر خانتك';
      case 'mc4': if(f.mc!==2){ f.mc=4; f.mcN=1; } return 'من سيربح المليون: أول سؤال عام يجيكم بأربع خيارات';
      case 'mc2': f.mc=2; f.mcN=2; return 'حذف إجابتين: أول سؤالين عامين يجونكم بخيارين بس';
      case 'insure': f.insure=true; return 'تأمين ضد الغير: أول خسارة نقاط تجيكم تنزل للنص';
      case 'ambush': f.ambush=true; return 'إنه فخ: أول فريق يهاجمكم يخسر 100';
      case 'lock': f.lock=true; return 'قفل الشات: سؤالك الجاي ما ينسرق';
      case 'rizz': f.rizz=true; return 'رز: أول بدون كلام تشارك فيه نصيبك كامل';
      case 'fullsteal': f.fullsteal=G.round+1; return 'ببلاش: أول سرقة لك كاملة';
      case 'cleanse': { const n=Object.keys(DEBUFFS).filter(k=>f[k]!=null); n.forEach(k=>delete f[k]); addScore(t,50); return `رايق: +50${n.length?` ومسحنا ${n.length} ضربة`:''}`; }
      case 'gacha': await pickFrom(t,[randomCard(),randomCard()],'باكج فيفا — اختر وحدة'); return '';
      case 'capital': f.capital=true; return 'ستونكس: كل نجاح لكم لين آخر المباراة +25';
      case 'finisher': f.finisher=true; return `فاتاليتي: نجاحكم الجاي ×${t.score>=S.target*0.75?3:1.5}`;
      case 'haul': { await drawCard(t); await drawCard(t); return 'مقاضي الشهر: سحبتوا بطاقتين'; }
      case 'comeback': { const L=leader(), last=[...G.teams].sort((a,b)=>a.score-b.score)[0];
        const amt = last===t && L!==t ? Math.min(250, Math.max(50, r25((L.score-t.score)/3))) : 50; addScore(t,amt); return `ريمونتادا: +${amt}`; }
      case 'yasalam': f.yasalam=G.round+1; return 'يا سلام: كل نجاح لغيرك لين نهاية اللفة الجاية يعطيك +30';
      case 'wasta': f.wasta=true; f.choose=true; return 'الواسطة: اختر خانتك، ونقاطك بسعر الصعوبة اللي فوق';
      case 'hayat': f.hayat=true; return 'هياط: لازم صعب — تنجح +200 تفشل −50';
      case 'sawalif': f.sawalif=true; return 'سواليف: أول بدون كلام تمثله مسموح لك كلمة';
      case 'snap': { const parts=G.teams.map(x=>{ const s0=x.score; const loss=s0>0?(r25(s0/2)||25):0; if(loss) addScore(x,-loss,{silent:true}); return `${x.name} −${s0-x.score}`; });
        return `فرقعة ثانوس: الكل انقص للنص — ${parts.join('، ')}`; }
      case 'pot': { let sum=0; G.teams.forEach(x=>{ const a=Math.min(100,Math.max(0,x.score)); addScore(x,-a,{silent:true,noInsure:true}); sum+=a; }); G.pot=(G.pot||0)+sum; return `القطة فيها ${G.pot} — أول واحد ينجح ياخذها`; }
    }
    return '';
  }

  // ---------- النهاية ----------
  function endGame(winner){
    $('#overlay-root').innerHTML='';
    stopAll(); go('results'); play('win'); setTimeout(()=>memeSound('win'),700); setTimeout(()=>play('applause',{volume:.6}),1500); confetti(400,6000); reaction('win',4000);
    const sorted=[...G.teams].sort((a,b)=>b.score-a.score);
    $('#winner-title').innerHTML=`<span class="who" style="--c:${winner.color}">${esc(winner.name)}</span> فاز`;
    const pod=$('#podium'); pod.innerHTML='';
    const cls=['first','second','third'];
    sorted.slice(0,3).forEach((t,i)=>{ const d=document.createElement('div'); d.className='p '+cls[i]; d.style.setProperty('--c',t.color); d.style.animationDelay=(i*.25)+'s';
      d.innerHTML=`${i===0?ic('crown','crown'):''}<div class="rank">${i+1}</div><div class="pn">${esc(t.name)}</div><div class="muted small">${t.players.map(p=>esc(p.name)).join('، ')}</div><div class="ps">${t.score}</div>`; pod.appendChild(d); });
    if(sorted.length>3){ const rest=document.createElement('div'); rest.className='row center'; rest.style.width='100%'; rest.innerHTML=sorted.slice(3).map((t,i)=>`<span class="pill">${i+4}. ${esc(t.name)} — ${t.score}</span>`).join(''); pod.appendChild(rest); }
    $('#btn-again').onclick=()=>newGame();
    G.ended=true;
    try{ sendMatchLog(winner, sorted); }catch(e){ console.error(e); }
    const el=$('#match-stats'); if(el && window.DahoomStats){ try{ window.DahoomStats.renderAlf(el, G, S.target); }catch(e){ console.error(e); el.innerHTML=''; } }
    let pAw=[]; try{ pAw=playerStats(el)||[]; }catch(e){ console.error(e); }
    pushAll();
    // عرض التتويج: المضحك أول، والأقوى آخر شي (أقصى شي 8 ألقاب)
    try{ const DS=window.DahoomStats; DS.autoShow(()=>{
      const tAw=(G.stats.awards||[]).filter(a=>!(a.key==='thief' && pAw.some(x=>x.title==='الحرامي')) && !(a.key==='actor' && pAw.some(x=>x.title==='نجم المسرح')));
      const order=['unlucky','robbed','bag','مسوي فاهم','cards','saboteur','thief','الحرامي','finger','actor','نجم المسرح','fire','wolf','عقل الجلسة'];
      const all=[ ...tAw.map(a=>({k:a.key, a:DS.ofTeam(a)})),
        ...pAw.map(a=>({k:a.title, a:{ title:a.title, desc:a.desc, icon:a.icon, name:a.p.name, sub:a.p.team.name, color:a.p.team.color, value:a.value(a.p),
          avatars:[D.avatarSrc((a.p.team.players.find(x=>x.id===a.p.id)||{}).avatar)] }})) ];
      all.sort((x,y)=>order.indexOf(x.k)-order.indexOf(y.k));
      const items=all.slice(-8).map(x=>x.a);
      const solo=G.teams.every(t=>t.players.length<=1);
      return { items, pool: solo ? G.teams.map(t=>t.name) : [...new Set([...G.teams.map(t=>t.name), ...G.teams.flatMap(t=>t.players.map(p=>p.name))])] };
    }); }catch(e){ console.error(e); }
  }
  // إنجازات اللاعبين: مين جاوب أكثر، مين غلط أكثر، مين سرق، مين مثّل
  function playerStats(el){
    const P=Object.entries(G.stats.P||{}).map(([id,o])=>({ id, ...o, team:G.teams.find(t=>t.players.some(p=>p.id===id)) })).filter(p=>p.team);
    if(!el || !P.length) return [];
    const top=(k,min=1)=>{ const l=[...P].sort((a,b)=>b[k]-a[k]); return l[0] && l[0][k]>=min && (l.length===1 || l[0][k]>l[1][k]) ? l[0] : null; };
    const aw=[]; const add=(p,title,icon,value,desc)=>{ if(p) aw.push({p,title,icon,value,desc}); };
    add(top('ok'),'عقل الجلسة','brain',o=>`${o.ok} إجابات صح`,'أكثر واحد جاوب صح');
    add(top('wrong',2),'مسوي فاهم','cancel',o=>`${o.wrong} إجابات غلط`,'أكثر واحد جاوب غلط');
    add(top('steals'),'الحرامي','ninja',o=>`${o.steals} سرقات`,'أكثر واحد سرق من جواله');
    add(top('acted'),'نجم المسرح','masks',o=>`مثّل ${o.acted} مرات`,'أكثر واحد مثّل');
    const sec=document.createElement('div'); sec.className='ms';
    sec.innerHTML=`<div class="ms-head"><h2>إنجازات اللاعبين</h2></div>
      ${aw.length?`<div class="aw-grid">${aw.map(a=>`<div class="aw" style="--c:${a.p.team.color}"><span class="aw-ic">${ic(a.icon)}</span><div class="aw-t">${a.title}</div><div class="aw-team">${esc(a.p.name)} · ${esc(a.p.team.name)}</div><div class="aw-v">${a.value(a.p)}</div><div class="aw-d">${a.desc}</div></div>`).join('')}</div>`:''}
      <section class="ms-card"><h3>كل لاعب</h3><div class="viz-table-wrap"><table class="viz-table"><thead><tr><th>اللاعب</th><th>صح</th><th>غلط</th><th>سرقات</th><th>مثّل (انعرفت)</th></tr></thead><tbody>
        ${P.sort((a,b)=>b.ok-a.ok).map(p=>`<tr><td><span class="vt-team"><i style="--c:${p.team.color}"></i>${esc(p.name)}</span></td><td class="num"><bdi>${p.ok}</bdi></td><td class="num"><bdi>${p.wrong}</bdi></td><td class="num"><bdi>${p.steals}</bdi></td><td class="num"><bdi>${p.acted}</bdi> (<bdi>${p.actedOk}</bdi>)</td></tr>`).join('')}</tbody></table></div>
        <p class="muted small">تنحسب لما المضيف يضغط اسم اللاعب قبل «صح» أو «غلط»، ولما اللاعب يبز أو يمثّل من جواله.</p></section>`;
    el.appendChild(sec);
    return aw;
  }

  function sendMatchLog(winner, sorted){
    const L=LOG(); if(!L || G.logged) return; G.logged=true;
    const r1 = n => Math.round(n);
    L.match({ game:'alf', target:S.target, rounds:G.round, mins:Math.round((Date.now()-G.log.t0)/60000), mode:D.session.mode,
      opts:{ cards:!!S.cardsEnabled, steal:!!S.stealEnabled, reactions:!!S.reactionsEnabled, comeback:!!S.comebackEnabled, hand:S.handMax||0 },
      teams: sorted.map((t,i)=>{ const o=G.stats.T[t.id]||{};
        return { id:t.id, name:t.name, score:t.score, rank:i+1, win:t===winner, players:t.players.map(p=>{ const q=(G.stats.P||{})[p.id]; return q ? { name:p.name, av:p.avatar||'', ok:q.ok, wrong:q.wrong, steals:q.steals, acted:q.acted } : { name:p.name, av:p.avatar||'' }; }),
          st:{ pts:o.pts, tries:o.tries, ok:o.ok, steals:o.steals||0, stolen:o.stolenFrom||0, cards:o.cards||0, attacks:o.attacks||0, hits:o.hits||0, best:o.bestTurn||0, combo:o.maxCombo||0, buzz:(o.buzz||[]).map(r1) } }; }),
      items:G.log.items, cards:G.log.cards, drawn:G.log.drawn, buzz:G.log.buzz });
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
      <p><b>البطاقات:</b> من اللفة ${S.noCardRounds+1} كل فريق يسحب بطاقة بداية دوره ويحتفظ لين ${S.handMax}. بطاقة وحدة بس كل دور. البطاقة اللي لها شرط وتلعبها وشرطها مو متحقق تنحرق وتنحسب بطاقة دورك. ${S.reactionsEnabled?'بطاقات رد الفعل تنلعب برا دورك لحظة ما أحد يهاجمك.':''}</p>
      <p><b>مراحل المباراة:</b> البداية (المتصدر تحت 35% من الهدف)، الوسط (لين 75%)، والنهاية. بطاقات كل مرحلة تنسحب أكثر بوقتها، وبعضها أقوى فيه — مثل "ستونكس" بالبداية و"فاتاليتي" بالنهاية.</p>
      ${S.comebackEnabled?'<p><b>دفعة الرجعة:</b> لو متأخر 400 نقطة أو أكثر عن المتصدر، تسحب بطاقتين وتختار وحدة.</p>':''}
      ${S.endgameEnabled?`<p><b>الحسم:</b> أول ما فريق يوصل ${endgameAt()} نقطة: هو ما له أسئلة سهلة، ووقت السرقة للكل ينقص للنص.</p>`:''}
      <p><b>بطاقات التحدي:</b> الكلاسيكو وفيلم صامت — تتحدى فيها فريق ثاني، والفايز ياخذ الرهان من الخاسر.</p>
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
  window.DAHOOM_DEBUG = { phase:()=>gamePhase(), draw:()=>randomCard(), reveal:id=>revealCard(DATA.cards.find(c=>c.id===id),'test'), state:()=>G, settings:()=>S, cur:()=>cur(), give:(i,id)=>{ G.teams[i].hand.push(DATA.cards.find(c=>c.id===id)); renderBoard(); turnIntro(); }, turnIntro:()=>turnIntro(), addScore:(i,n)=>addScore(G.teams[i],n), afterTurn:m=>afterTurn(m), nextTurn:()=>nextTurn() };

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
