/* ===== خلية الحروف — محرك اللعبة (شاشة واحدة، فريقين، نظام البزّ) =====
   الدور: الفريق اللي عليه الدور يختار حرف → المضيف يضغط "ابدأ السؤال" ويقرأه →
   اللي يبزّ أول (زر على الشاشة أو كيبورد 1/2) عنده وقت يجاوب → غلط/خلص الوقت → ينتقل للفريق الثاني →
   ما أحد؟ السؤال مفتوح للفريقين بدون وقت. اللي يجاوب صح يلوّن الخلية ويختار الحرف الجاي.
*/
(function(){
  const D = window.Dahoom, DATA = window.DAHOOM_DATA;
  const { $, $$, rnd, shuffle, esc, ic, store, play, stop, stopAll, memeSound, go, toast, modal, confirmBox, confetti, reaction, flash } = D;

  const DEFAULTS = { size:5, rounds:1, noRepeat:true, hardLetters:true, difficulty:'mixed', buzzTime:5 };
  let S = Object.assign({}, DEFAULTS, store.get('khaliya_settings', {}));
  const ALL_LETTERS = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];
  const HARD = ['ث','ذ','ظ','ض','غ'];

  function renderSettings(){
    $$('#khaliya-form [data-k]').forEach(el=>{
      const k=el.dataset.k;
      if(el.type==='checkbox') el.checked=!!S[k]; else el.value=S[k];
      el.onchange=()=>{ const v=el.type==='checkbox'? el.checked : (isNaN(Number(el.value)) ? el.value : Number(el.value)); S[k]=v; store.set('khaliya_settings',S); };
    });
    const comps=D.competitors().slice(0,2);
    $('#khaliya-teams-preview').innerHTML = comps.length<2 ? '<span class="fx-tag bad">تحتاج فريقين</span>' :
      comps.map((t,i)=>`<span class="kh-teamtag" style="--c:${t.color}">${esc(t.name)} <span class="kh-dir">${i===0?'من فوق لتحت':'من اليمين لليسار'}</span></span>`).join('');
  }

  // ---------- الحالة ----------
  let G=null, timerH=null;
  const usedL = { load(){ return new Set(store.get('used_letters',[])); }, save(u){ store.set('used_letters',[...u]); } };

  function newMatch(){
    const comps=D.competitors().slice(0,2);
    if(comps.length<2){ toast('نحتاج فريقين'); go('lobby'); return; }
    G={ teams: comps.map((c,i)=>({...c, wins:0, dir:i===0?'v':'h'})), round:1, used: usedL.load(), edit:false };
    G.stats = G.teams.map(()=>({cells:0, ok:0, wrong:0, buzz:[]}));
    G.log = { t0:Date.now(), items:[] }; window.DAHOOM_ITEM=null;
    const net=window.DahoomNet;
    if(net) net.use({ teams:()=>G.teams, state:khState, report:onReport, buzz:id=>{ const i=G.teams.findIndex(t=>t.id===id); if(i>=0) buzz(i); }, onPhones:()=>{} });
    go('khaliya');
    newRound(true);
  }
  function newRound(first){
    const N=S.size; const pool = S.hardLetters ? ALL_LETTERS : ALL_LETTERS.filter(l=>!HARD.includes(l));
    let letters=[]; while(letters.length<N*N) letters=letters.concat(shuffle(pool));
    G.cells=[]; for(let r=0;r<N;r++){ for(let c=0;c<N;c++) G.cells.push({r,c,l:letters[r*N+c],owner:null}); }
    G.turn = first ? Math.floor(Math.random()*2) : G.lastLoser;
    G.sel=null; G.over=false; G.phase='pick'; clearT();
    $('#kh-round').textContent=`الجولة ${G.round}`;
    renderScore(); renderBoard(); panelIdle();
    play('levelup',{volume:.7});
  }
  const cur=()=>G.teams[G.turn];
  const cell=(r,c)=>G.cells.find(x=>x.r===r&&x.c===c);

  // ---------- العرض ----------
  function renderScore(){
    { const n=window.DahoomNet; if(n) n.pushAll(); }
    $('#kh-score').innerHTML=G.teams.map((t,i)=>`<span class="kh-teamtag ${i===G.turn&&!G.over?'turn':''}" style="--c:${t.color}">${esc(t.name)} <span class="kh-dir">${t.dir==='v'?'فوق ↕ تحت':'يمين ↔ يسار'}</span> <span class="w">${t.wins}</span></span>`).join('') + (S.rounds>1?`<span class="pill dim">أول من يفوز بـ${S.rounds}</span>`:'');
  }
  // لوحة مستطيلة: صفوف سداسية متعرجة (odd-r offset)
  function center(k){ const R=40, w=Math.sqrt(3)*R, h=2*R; return { cx: 24 + w/2 + k.c*w + (k.r%2 ? w/2 : 0), cy: 24 + R + k.r*h*.75 }; }
  function renderBoard(){
    const N=S.size, R=40, w=Math.sqrt(3)*R, h=2*R;
    const W = w*N + w/2 + 48, H = h*.75*(N-1)+h+48;
    const A=G.teams[0].color, B=G.teams[1].color;
    const hexPts=(cx,cy,r)=>[0,1,2,3,4,5].map(i=>{ const a=Math.PI/180*(60*i-30); return `${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`; }).join(' ');
    // إطار الجهات: مستطيل حول اللوحة مقسوم 4 أقسام من المركز — فوق/تحت بلون الفريق الأول، يمين/يسار بلون الثاني
    const x0=4, y0=4, x1=W-4, y1=H-4, mx=W/2, my=H/2;
    const frame=`<defs><clipPath id="kh-frame"><rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" rx="26"/></clipPath></defs>`
      + `<g clip-path="url(#kh-frame)">`
      + `<polygon points="${x0},${y0} ${x1},${y0} ${mx},${my}" fill="${A}"/><polygon points="${x0},${y1} ${x1},${y1} ${mx},${my}" fill="${A}"/>`
      + `<polygon points="${x0},${y0} ${x0},${y1} ${mx},${my}" fill="${B}"/><polygon points="${x1},${y0} ${x1},${y1} ${mx},${my}" fill="${B}"/></g>`
      + `<rect class="kh-edge" x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" rx="26"/>`;
    let backing='', cells='';
    G.cells.forEach(k=>{
      const {cx,cy}=center(k);
      // خلفية غامقة تحت الخلايا عشان الإطار ما يبان بين الخلايا
      backing+=`<polygon class="kh-gap" points="${hexPts(cx,cy,R*1.06)}"/>`;
      const pts=hexPts(cx,cy,R*.95);
      const cls=['hex', k.owner!=null?'owned':'', G.sel===k?'sel':'', k.win?'winpath':''].join(' ');
      const fill = k.owner!=null ? `style="fill:${G.teams[k.owner].color}"` : '';
      cells+=`<g class="${cls}" data-r="${k.r}" data-c="${k.c}" style="transform-origin:${cx}px ${cy}px"><polygon points="${pts}" ${fill}/><text x="${cx}" y="${cy+2}">${k.l}</text></g>`;
    });
    $('#kh-board').innerHTML=`<svg viewBox="-6 -6 ${W+12} ${H+12}" xmlns="http://www.w3.org/2000/svg">${frame}${backing}${cells}</svg>`;
    $$('#kh-board .hex').forEach(g=>g.onclick=()=>onCell(cell(+g.dataset.r,+g.dataset.c)));
  }
  function onReport(id, pid, d){
    const L=window.DahoomLog, it=window.DAHOOM_ITEM, t=G && G.teams.find(x=>x.id===id);
    if(!L || !t || d.what!=='item' || !it || !(L.REASONS.l||[]).includes(d.reason)) return false;
    L.report(it, d.reason, d.note, `${((t.players||[]).find(p=>p.id===pid)||{}).name||'جوال'} (${t.name})`); return true;
  }
  function panel(html){ $('#kh-panel').innerHTML=html; const n=window.DahoomNet; if(n) n.pushAll(); }
  // حالة جوال الفريق في خلية الحروف
  function khState(id){
    const i=G.teams.findIndex(t=>t.id===id), t=G.teams[i];
    if(!t) return { game:'khaliya', waiting:true };
    const ans = G.phase==='answer' && G.answering!=null ? G.teams[G.answering] : null;
    return { game:'khaliya', team:{id:t.id,name:t.name,color:t.color,score:t.wins},
      scores:G.teams.map((x,k)=>({id:x.id,name:x.name,color:x.color,score:x.wins,turn:k===G.turn&&!G.over})),
      hand:[], canPlay:false, myTurn:i===G.turn,
      buzz: (()=>{ const l=G.blog||[], k=l.findIndex(o=>o.i===i); const r={ rank:k>=0?k+1:0, gap:k>0?+((l[k].t-l[0].t)/1000).toFixed(3):0 };
        return G.phase==='buzz' ? { open:true, can:!G.tried.includes(i)&&k<0, first:null, mine:false, ...r }
          : ans ? { open:true, can:k<0, first:ans.name, mine:ans===t, ...r } : { open:false }; })(),
      letter: G.sel ? G.sel.l : null,
      item: window.DAHOOM_ITEM ? { kind:'l', id:window.DAHOOM_ITEM.id, label:window.DAHOOM_ITEM.text } : null,
      phase: G.phase==='buzz' ? 'السؤال مقروء — بز!' : G.phase==='pick' ? `دور ${G.teams[G.turn].name} يختار حرف` : G.phase==='open' ? 'السؤال مفتوح للفريقين' : '' };
  }
  function panelIdle(){
    const t=cur(); G.phase='pick';
    panel(`<div class="lower-third" style="--c:${t.color}"><span class="lt-k">الدور</span><span class="lt-v">${esc(t.name)}</span></div><div class="kh-status">اختاروا حرف من اللوحة</div><p class="muted">${t.dir==='v'?'هدفكم: مسار متصل من فوق لتحت':'هدفكم: مسار متصل من اليمين لليسار'}</p>${G.edit?'<span class="banner">وضع التعديل: كل ضغطة تغيّر لون الخلية</span>':''}`);
  }

  // ---------- المؤقت الصغير ----------
  function timerHTML(sec){ return `<div class="timer" id="kh-timer" style="width:90px;height:90px"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="0"/></svg><div class="num" style="font-size:2rem">${sec}</div></div>`; }
  function startT(sec,onEnd){ clearT(); const el=$('#kh-timer'); if(!el) return; const num=el.querySelector('.num'), fg=el.querySelector('.fg'); let left=sec; play('clockloop',{volume:.3,loop:true});
    const step=()=>{ num.textContent=left; fg.style.strokeDashoffset=326.7*(1-left/sec); el.classList.toggle('danger',left<=2&&left>0); if(left<=2&&left>0) play('tick'); if(left<=0){ clearT(); play('buzzer',{volume:.6}); onEnd&&onEnd(); return; } left--; timerH=setTimeout(step,1000); }; step(); }
  function clearT(){ clearTimeout(timerH); timerH=null; stop('clockloop'); }

  // ---------- اللعب ----------
  function onCell(k){
    if(G.over) return;
    if(G.edit){ if(k.owner==null) k.owner=0; else if(k.owner===0) k.owner=1; else k.owner=null; play('tick'); renderBoard(); checkWinAll(); return; }
    if(G.phase!=='pick' && G.phase!=='selected') return;
    if(k.owner!=null){ toast('الخلية مأخوذة'); return; }
    G.sel=k; G.phase='selected'; renderBoard(); play('pop');
    const t=cur();
    panel(`<div class="lower-third" style="--c:${t.color}"><span class="lt-k">اختار</span><span class="lt-v">${esc(t.name)}</span></div><div class="kh-letter">${k.l}</div>
      <p class="muted">الجواب يبدأ بحرف "${k.l}" (نتجاهل "ال"). لما تكون جاهز تقرأ السؤال اضغط ابدأ.</p>
      <div class="row center"><button class="btn btn-hype big pulse" id="kh-start">${ic('whistle')} ابدأ السؤال</button><button class="btn small ghost" id="kh-back">${ic('back')} غيّر الحرف</button></div>`);
    $('#kh-start').onclick=()=>startQuestion(k);
    $('#kh-back').onclick=()=>{ G.sel=null; renderBoard(); panelIdle(); };
  }
  function pickQ(letter){
    let pool=DATA.letters.filter(x=>x.l===letter);
    const d = S.difficulty;
    let byD = d==='hard' ? pool.filter(x=>x.d===3) : d==='easy' ? pool.filter(x=>x.d!==3) : pool;
    if(!byD.length) byD=pool;
    let fresh = S.noRepeat ? byD.filter(x=>!G.used.has(x.id)) : byD;
    if(!fresh.length){ toast(`خلصت أسئلة حرف ${letter} الجديدة، بنعيد`); byD.forEach(x=>G.used.delete(x.id)); fresh=byD; }
    const q=rnd(fresh); G.used.add(q.id); usedL.save(G.used); return q;
  }
  function startQuestion(k, q){
    q = q || pickQ(k.l); G.q=q;
    { const L=G.log.items, last=L[L.length-1]; if(last && last.r==='?') last.r='skip';
      L.push({ k:'l', id:q.id, d:q.d||1, tag:q.l, r:'?', x:String(q.q).slice(0,50) });
      window.DAHOOM_ITEM = { kind:'l', id:q.id, d:q.d||1, tag:q.l, text:q.q, answer:q.a }; } G.phase='buzz'; G.answering=null; G.tried=[]; G.blog=[]; G.qStart=performance.now();
    renderQuestion(k);
  }
  function renderQuestion(k){
    const q=G.q; const ph=G.phase; const a=G.answering;
    const status = ph==='buzz' ? `<div class="kh-status" style="color:var(--steal-ink)">مين يبز أول؟</div>`
      : ph==='answer' ? `<div class="lower-third" style="--c:${G.teams[a].color}"><span class="lt-k">يجاوب</span><span class="lt-v">${esc(G.teams[a].name)}</span></div>${timerHTML(S.buzzTime)}`
      : `<span class="banner dim">السؤال مفتوح للفريقين — بدون وقت</span>`;
    panel(`<div class="row center"><div class="kh-letter sm">${k.l}</div><span class="pill dim">${q.d===3?'صعب':'سهل'}</span></div>
      <div class="kh-q">${esc(q.q)}</div>
      <div id="kh-order">${orderHTML()}</div>
      <div class="answer hidden" id="kh-answer">${esc(q.a)}</div>
      ${status}
      ${ph==='buzz' ? `<div class="row center">${G.teams.map((x,i)=>`<button class="btn big team" style="--c:${x.color}" data-buzz="${i}" ${G.tried.includes(i)?'disabled':''}>${ic('whistle')} ${esc(x.name)} <kbd>${i+1}</kbd></button>`).join('')}</div>` : ''}
      ${ph!=='buzz' ? `<div class="row center">${G.teams.map((x,i)=>`<button class="btn team" style="--c:${x.color};${ph==='answer'&&i!==a?'opacity:.45':''}" data-win="${i}">${ic('check')} ${esc(x.name)} جاوب صح</button>`).join('')}</div>` : ''}
      ${ph==='answer' ? `<div class="row center"><button class="btn btn-bad" id="kh-wrong">${ic('cancel')} غلط / ما جاوب — للفريق الثاني</button></div>` : ''}
      <div class="row center">
        <button class="btn small" id="kh-reveal">${ic('eye')} الإجابة</button>
        <button class="btn small ghost" id="kh-change">${ic('recycle')} غيّر السؤال</button>
        <button class="btn small ghost" id="kh-cancel">${ic('back')} رجوع للوحة</button>
      </div>`);
    $$('#kh-panel [data-buzz]').forEach(b=>b.onclick=()=>buzz(+b.dataset.buzz));
    $$('#kh-panel [data-win]').forEach(b=>b.onclick=()=>claim(k,+b.dataset.win));
    if(ph==='answer'){ $('#kh-wrong').onclick=()=>passOn(k); startT(S.buzzTime, ()=>passOn(k)); }
    $('#kh-reveal').onclick=()=>{ $('#kh-answer').classList.toggle('hidden'); play('pop'); };
    $('#kh-change').onclick=()=>{ clearT(); play('card'); startQuestion(k); };
    $('#kh-cancel').onclick=()=>{ clearT(); G.sel=null; G.phase='pick'; renderBoard(); panelIdle(); };
  }
  // ترتيب البز بأجزاء الثانية (يتسجل حتى لو الثاني ضغط بعد الأول)
  function orderHTML(){
    const l=G.blog||[]; if(!l.length) return '';
    return `<div class="bz-order">${l.map((o,k)=>{ const x=G.teams[o.i]; return `<span class="bz-row ${k===0?'first':''}" style="--c:${x.color}"><b>${k+1}</b>${esc(x.name)}<i>${k===0?'الأول':'<bdi dir="ltr">+'+((o.t-l[0].t)/1000).toFixed(3)+'</bdi> ث'}</i></span>`; }).join('')}</div>`;
  }
  function buzz(i){
    if((G.phase==='buzz'||G.phase==='answer') && G.blog && !G.blog.some(o=>o.i===i)){
      G.blog.push({i, t:performance.now()}); if(G.stats) G.stats[i].buzz.push(performance.now()-G.qStart);
      if(G.phase!=='buzz'){ const el=$('#kh-order'); if(el) el.innerHTML=orderHTML(); play('tick',{volume:.6}); const n=window.DahoomNet; if(n) n.pushAll(); }
    }
    if(G.phase!=='buzz' || G.tried.includes(i)) return;
    G.answering=i; G.phase='answer'; play('bling',{volume:.9}); flash('good');
    renderQuestion(G.sel);
  }
  function passOn(k){
    clearT();
    const a=G.answering; if(a!=null){ G.tried.push(a); if(G.stats) G.stats[a].wrong++; const l=G.log.items[G.log.items.length-1]; if(l) l.miss=(l.miss||0)+1; }
    play('wrong',{volume:.6});
    const other = a==null ? null : 1-a;
    if(other!=null && !G.tried.includes(other)){ G.answering=other; G.phase='answer'; toast(`السؤال راح لـ ${G.teams[other].name}`); }
    else { G.answering=null; G.phase='open'; toast('السؤال مفتوح للفريقين'); }
    renderQuestion(k);
  }
  function claim(k, teamIdx){
    clearT();
    { const l=G.log.items[G.log.items.length-1]; if(l && l.r==='?') l.r='ok'; }
    k.owner=teamIdx; if(G.stats){ G.stats[teamIdx].ok++; G.stats[teamIdx].cells++; } G.sel=null; G.phase='pick'; play('correct'); flash('good'); reaction('correct',2500);
    renderBoard(); $$(`#kh-board .hex[data-r="${k.r}"][data-c="${k.c}"]`).forEach(g=>g.classList.add('pop'));
    if(checkWinAll()) return;
    G.turn=teamIdx; // اللي يجاوب صح يختار الحرف الجاي
    renderScore(); panelIdle();
  }
  // كيبورد: 1 و 2 للبزّ
  document.addEventListener('keydown',e=>{ if(!G || !$('#khaliya').classList.contains('active')) return; if(e.key==='1') buzz(0); else if(e.key==='2') buzz(1); });

  // ---------- الفوز ----------
  function neighbors(k){
    const N=S.size; const odd=k.r%2===1;
    const d = odd ? [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]] : [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]];
    return d.map(([dr,dc])=>cell(k.r+dr,k.c+dc)).filter(x=>x && x.r>=0&&x.r<N&&x.c>=0&&x.c<N);
  }
  function pathFor(teamIdx){
    const N=S.size; const t=G.teams[teamIdx];
    const starts=G.cells.filter(k=>k.owner===teamIdx && (t.dir==='v'? k.r===0 : k.c===0));
    const isEnd=k=> t.dir==='v' ? k.r===N-1 : k.c===N-1;
    const prev=new Map(); const q=[...starts]; starts.forEach(s=>prev.set(s,null));
    while(q.length){ const k=q.shift(); if(isEnd(k)){ const path=[]; let x=k; while(x){ path.push(x); x=prev.get(x);} return path; }
      neighbors(k).forEach(nb=>{ if(nb.owner===teamIdx && !prev.has(nb)){ prev.set(nb,k); q.push(nb); } }); }
    return null;
  }
  function checkWinAll(){
    for(let i=0;i<2;i++){ const p=pathFor(i); if(p){ winRound(i,p); return true; } }
    if(G.cells.every(k=>k.owner!=null)){ panel(`<div class="kh-status">انقفلت اللوحة بدون مسار!</div><div class="row center mt"><button class="btn btn-hype big" id="kh-again">جولة جديدة</button></div>`); $('#kh-again').onclick=()=>{ G.lastLoser=G.turn; newRound(false); }; return true; }
    return false;
  }
  function winRound(i, path){
    G.over=true; clearT(); const t=G.teams[i]; t.wins++; G.lastLoser=1-i;
    path.forEach(k=>k.win=true); renderBoard(); renderScore();
    play('win'); memeSound('win'); confetti(250,4000); reaction('win',3500);
    const matchOver = t.wins>=S.rounds;
    panel(`<div class="lower-third" style="--c:${t.color}"><span class="lt-k">${ic('trophy')}</span><span class="lt-v">${esc(t.name)}</span></div><div class="kh-status">وصلوا الطرف الثاني!</div>
      <p class="muted">${matchOver?'فازوا بالمباراة':'فازوا بالجولة '+G.round}</p>
      <div class="row center mt">${matchOver?`<button class="btn btn-hype big" id="kh-results">${ic('podium')} النتائج</button>`:`<button class="btn btn-sky big" id="kh-next">الجولة الجاية ${ic('next')}</button>`}</div>`);
    if(matchOver) $('#kh-results').onclick=()=>endMatch(t); else $('#kh-next').onclick=()=>{ G.round++; newRound(false); };
  }
  function endMatch(winner){
    stopAll(); go('results'); play('applause',{volume:.7}); confetti(400,6000);
    const sorted=[...G.teams].sort((a,b)=>b.wins-a.wins);
    $('#winner-title').innerHTML=`<span class="who" style="--c:${winner.color}">${esc(winner.name)}</span> فاز بخلية الحروف`;
    const pod=$('#podium'); pod.innerHTML='';
    sorted.forEach((t,i)=>{ const d=document.createElement('div'); d.className='p '+(i===0?'first':'second'); d.style.setProperty('--c',t.color); d.style.animationDelay=(i*.25)+'s'; d.innerHTML=`${i===0?ic('crown','crown'):''}<div class="rank">${i+1}</div><div class="pn">${esc(t.name)}</div><div class="muted small">${t.players.map(p=>esc(p.name)).join('، ')}</div><div class="ps">${t.wins} ${t.wins===1?'جولة':'جولات'}</div>`; pod.appendChild(d); });
    $('#btn-again').onclick=()=>newMatch();
    try{ const L=window.DahoomLog; if(L && !G.logged){ G.logged=true;
      L.match({ game:'khaliya', rounds:G.round, mins:Math.round((Date.now()-G.log.t0)/60000), mode:D.session.mode, opts:{ size:S.size, difficulty:S.difficulty||'' },
        teams: sorted.map((t,i)=>{ const o=G.stats[G.teams.indexOf(t)]||{}; return { id:t.id, name:t.name, score:t.wins, rank:i+1, win:t===winner,
          players:t.players.map(p=>({ name:p.name, av:p.avatar||'' })), st:{ cells:o.cells||0, ok:o.ok||0, wrong:o.wrong||0, buzz:(o.buzz||[]).map(Math.round) } }; }),
        items:G.log.items }); } }catch(e){ console.error(e); }
    const el=$('#match-stats'); if(el && window.DahoomStats){ try{ window.DahoomStats.renderKhaliya(el, G); }catch(e){ console.error(e); el.innerHTML=''; } }
  }

  // ---------- ربط ----------
  document.addEventListener('DOMContentLoaded',()=>{
    renderSettings();
    $('#btn-to-settings').addEventListener('click',()=>setTimeout(renderSettings,0));
    $('#btn-khaliya-start').onclick=()=>{ play('cheer',{volume:.5}); newMatch(); };
    $('#kh-quit').onclick=async ()=>{ if(await confirmBox('<h3>تنهي المباراة؟</h3>','أنهِ','كمّل','btn-bad')){ clearT(); stopAll(); go('home'); } };
    $('#kh-edit').onclick=()=>{ G.edit=!G.edit; $('#kh-edit').classList.toggle('btn-hype',G.edit); toast(G.edit?'وضع التعديل: اضغط أي خلية لتغيير لونها':'رجعنا للعب'); if(!G.over && G.phase==='pick') panelIdle(); };
    $('#kh-help').onclick=()=>modal(`<h3>قوانين خلية الحروف</h3><div class="help-list mt">
      <p>لوحة خلايا سداسية، كل خلية فيها حرف. فريقين بالضبط.</p>
      <p>الفريق الأول يبغى مسار متصل من فوق لتحت، والثاني من اليمين لليسار.</p>
      <p>الفريق اللي عليه الدور يختار حرف، والمضيف يضغط "ابدأ السؤال" ويقرأه. الجواب يبدأ بهذا الحرف (نتجاهل "ال").</p>
      <p>اللي يبز أول (زر على الشاشة أو <kbd>1</kbd>/<kbd>2</kbd>) عنده ${S.buzzTime} ثواني يجاوب. غلط أو خلص الوقت؟ السؤال يروح للفريق الثاني ${S.buzzTime} ثواني. ما أحد؟ يصير مفتوح للفريقين بدون وقت.</p>
      <p>اللي يجاوب صح يلوّن الخلية بلونه ويختار الحرف الجاي. ما فيه خلايا سوداء.</p>
      <p>أول فريق يكمل مساره يفوز بالجولة.</p>
      <p>"تعديل الخلايا" يخلي المضيف يصحح أي خلية بالضغط عليها.</p></div><div class="row mt-s"><button class="btn" id="c">تمام</button></div>`,{onMount(m){ m.querySelector('#c').onclick=()=>m.remove(); }});
  });
  window.DAHOOM_DEBUG_KH = { state:()=>G, settings:()=>S };
})();
