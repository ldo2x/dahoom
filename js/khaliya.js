/* ===== خلية الحروف — محرك اللعبة (فريقين، بز من الجوالات، حكم تلقائي أو بشري) =====
   الشاشة (التلفزيون) عرض بس: اللوحة + الحرف والسؤال + ترتيب البز بالملي ثانية + المؤقت. ما فيها أزرار تحكيم.
   الجوال: اللوحة + السؤال + الجرس + ترتيب البز + (بالتلقائي) خانة الجواب.

   نظام التحكيم (إعداد «judge»):
   - تلقائي: الفريق اللي عليه الدور يختار حرف من جواله ← عد تنازلي ٣ ثواني ← السؤال يطلع بالشاشة والجوالات ←
     الجوال يقيس وقت ضغطة الجرس من لحظة ما طلع السؤال عنده (عشان النت البطيء ما يظلم أحد) ← الأسرع يكتب الجواب ←
     النظام يقارنه بالجواب (يسامح بالهمزات والتاء المربوطة و«ال» وغلطة حرف) ← صح: الخلية لهم ويختارون الجاي.
     غلط أو خلص الوقت: للفريق الثاني ← غلط بعد: مفتوح للفريقين ٢٠ ثانية ← ما أحد: نكشف الجواب ونرجع للوحة.
   - بشري: لاعب ياخذ خانة «الحكم» بالانتظار. الفريق يختار الحرف والحكم يأكده (أو يغيّره) ← البز تلقائي بنفس الطريقة ←
     الفريق يقول الجواب بصوته والحكم يضغط صح/غلط من جواله. الحكم يقدر يغيّر السؤال ويرجع للوحة ويصحّح لون أي خلية.
*/
(function(){
  const D = window.Dahoom, DATA = window.DAHOOM_DATA;
  const { $, $$, rnd, shuffle, esc, ic, store, play, stop, stopAll, memeSound, go, toast, modal, confirmBox, confetti, reaction, flash } = D;

  const DEFAULTS = { size:5, rounds:1, noRepeat:true, hardLetters:true, difficulty:'mixed', buzzTime:5, judge:'auto', ansTime:15 };
  let S = Object.assign({}, DEFAULTS, store.get('khaliya_settings', {}));
  const ALL_LETTERS = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];
  const HARD = ['ث','ذ','ظ','ض','غ'];
  const READY_MS = 3000;      // العد التنازلي قبل ما يطلع السؤال
  const OPEN_MS = 20000;      // التلقائي: السؤال المفتوح للفريقين
  const REVEAL_MS = 3200;     // كشف الجواب قبل ما نرجع للوحة
  const BUZZ_WIN = 180;       // ننتظر شوي بعد أول ضغطة عشان نجمع الضغطات المتقاربة ونختار الأسرع فعلاً
  const human = () => S.judge==='human';

  // الانتظار يسأل: هل فيه خانة حكم؟
  window.DahoomKH = { judge:()=>S.judge };

  function renderSettings(){
    $$('#khaliya-form [data-k]').forEach(el=>{
      const k=el.dataset.k;
      if(el.type==='checkbox') el.checked=!!S[k]; else el.value=S[k];
      el.onchange=()=>{ const v=el.type==='checkbox'? el.checked : (isNaN(Number(el.value)) ? el.value : Number(el.value)); S[k]=v; store.set('khaliya_settings',S);
        if(k==='judge'){ syncJudgeUI(); D.session.save(); if(D.refreshLobby) D.refreshLobby(); } };
    });
    syncJudgeUI();
    const comps=D.competitors().slice(0,2);
    $('#khaliya-teams-preview').innerHTML = comps.length<2 ? '<span class="fx-tag bad">تحتاج فريقين</span>' :
      comps.map((t,i)=>`<span class="kh-teamtag" style="--c:${t.color}">${esc(t.name)} <span class="kh-dir">${i===0?'من فوق لتحت':'من اليمين لليسار'}</span></span>`).join('')
      + (human() ? `<span class="kh-teamtag" style="--c:${D.REF_COLOR}">${ic('whistle')} الحكم: ${esc(((D.session.players.find(p=>p.id===(D.refPid&&D.refPid()))||{}).name)||'ما انختار')}</span>` : '');
  }
  // حقول كل وضع: وقت الكتابة للتلقائي، ووقت الجواب بالصوت للبشري
  function syncJudgeUI(){
    const a=$('#kh-f-ans'), b=$('#kh-f-buzz'), n=$('#kh-judge-note');
    if(a) a.classList.toggle('hidden', human());
    if(b) b.classList.toggle('hidden', !human());
    if(n) n.textContent = human()
      ? 'لاعب ياخذ خانة «الحكم» بشاشة اللاعبين. يأكد الحرف، ويحكم صح وغلط من جواله. البز يتحدد تلقائي.'
      : 'كل شي تلقائي: الدور، الجرس، والتحقق من الجواب اللي يكتبه الفريق بجواله. كل فريق يحتاج جوال واحد على الأقل.';
  }

  // ---------- مطابقة الجواب (التلقائي) ----------
  function norm(s){
    return String(s||'').toLowerCase()
      .replace(/[ً-ٰٟـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
      .replace(/[^a-z0-9ء-ي\s]/g,' ').split(/\s+/).filter(Boolean)
      .map(w=>w.length>3 && w.startsWith('ال') ? w.slice(2) : w).join(' ');
  }
  function lev(a,b){ const m=Array.from({length:b.length+1},(_,j)=>j);
    for(let i=1;i<=a.length;i++){ let prev=m[0]; m[0]=i; for(let j=1;j<=b.length;j++){ const t=m[j]; m[j]=Math.min(m[j]+1, m[j-1]+1, prev+(a[i-1]===b[j-1]?0:1)); prev=t; } }
    return m[b.length]; }
  function check(answer, text){
    const a=norm(answer), g=norm(text); if(!g || !a) return false;
    const a0=a.replace(/ /g,''), g0=g.replace(/ /g,'');
    if(a0===g0) return true;
    if(a0.length>=4 && g0.includes(a0) && g0.length<=a0.length+10) return true;     // «ايرين ييغر» = «ايرين»
    if(g0.length>=4 && a.split(' ').some(w=>w.length>=4 && w===g0)) return true;      // كلمة من الجواب الطويل
    const tol = a0.length>=8 ? 2 : a0.length>=5 ? 1 : 0;
    return tol>0 && lev(a0,g0)<=tol;
  }

  // ---------- الحالة ----------
  let G=null;
  const T = { main:0, tick:0, win:0, auto:0 };
  const clearAll = () => { clearTimeout(T.main); clearInterval(T.tick); clearTimeout(T.win); clearTimeout(T.auto); T.main=T.tick=T.win=T.auto=0; stop('clockloop'); };
  const usedL = { load(){ return new Set(store.get('used_letters',[])); }, save(u){ store.set('used_letters',[...u]); } };
  const net = () => window.DahoomNet;
  const pushAll = () => { const n=net(); if(n) n.pushAll(); };
  const pname = pid => ((D.session.players.find(p=>p.id===pid))||{}).name || '';

  function newMatch(){
    const comps=D.competitors().slice(0,2);
    if(comps.length<2){ toast('نحتاج فريقين'); go('lobby'); return; }
    clearAll();
    G={ teams: comps.map((c,i)=>({...c, wins:0, dir:i===0?'v':'h'})), round:1, used: usedL.load(), edit:false, judge:S.judge, ref: human() && D.refPid ? D.refPid() : null };
    G.stats = G.teams.map(()=>({cells:0, ok:0, wrong:0, buzz:[]}));
    G.log = { t0:Date.now(), items:[] }; window.DAHOOM_ITEM=null;
    const n=net();
    if(n) n.use({ teams:()=>G.teams, state:khState, report:onReport,
      buzz:(id,pid,d)=>{ const i=G.teams.findIndex(t=>t.id===id); if(i>=0) buzz(i, pid, d && typeof d.dt==='number' ? d.dt : null, d && d.qid); },
      khans:(id,text,pid)=>{ const i=G.teams.findIndex(t=>t.id===id); if(i>=0) typed(i, text, pid); },
      ref:refAct, onPhones:()=>{},
      // الفريق اللي عليه الدور يختار الحرف من جواله (والحكم كمان)
      pick:(id,idx)=>{ if(id==='ref'){ refAct({ a:'cell', i:idx }); return; }
        const i=G.teams.findIndex(t=>t.id===id); if(G.over || i!==G.turn || G.phase!=='pick') return; const k=G.cells[idx]; if(k && k.owner==null) choose(k); } });
    $('#kh-edit').classList.toggle('hidden', G.judge==='human');   // بالبشري التصحيح عند الحكم
    go('khaliya');
    newRound(true);
  }
  function newRound(first){
    clearAll();
    const N=S.size; const pool = S.hardLetters ? ALL_LETTERS : ALL_LETTERS.filter(l=>!HARD.includes(l));
    let letters=[]; while(letters.length<N*N) letters=letters.concat(shuffle(pool));
    G.cells=[]; for(let r=0;r<N;r++){ for(let c=0;c<N;c++) G.cells.push({r,c,l:letters[r*N+c],owner:null}); }
    G.turn = first ? Math.floor(Math.random()*2) : G.lastLoser;
    G.sel=null; G.over=false; G.q=null; resetQ(); G.phase='pick';
    $('#kh-round').textContent=`الجولة ${G.round}`;
    renderScore(); renderBoard(); renderPanel();
    play('levelup',{volume:.7});
  }
  function resetQ(){ G.answering=null; G.tried=[]; G.blog=[]; G.tries=[]; G.deadline=0; G.dur=0; G.timeUp=false; G.result=null; G.qid=null; }
  const cur=()=>G.teams[G.turn];
  const cell=(r,c)=>G.cells.find(x=>x.r===r&&x.c===c);

  // ---------- المؤقت (بالموعد النهائي — نفسه بالشاشة والجوالات) ----------
  function deadline(ms, onEnd, clock){
    clearTimeout(T.main); clearInterval(T.tick);
    G.deadline=Date.now()+ms; G.dur=ms; G.timeUp=false;
    if(clock) play('clockloop',{volume:.25,loop:true});
    let lastSec=-1;
    T.tick=setInterval(()=>{
      const left=Math.max(0, G.deadline-Date.now()), el=$('#kh-timer'); if(!el) return;
      const sec=Math.ceil(left/1000);
      el.querySelector('.num').textContent=sec; el.querySelector('.fg').style.strokeDashoffset=(326.7*(1-left/G.dur)).toFixed(1);
      el.classList.toggle('danger', sec<=2 && left>0);
      if(sec!==lastSec){ lastSec=sec; if(sec<=2 && sec>0) play('countdown'); }
    }, 100);
    T.main=setTimeout(()=>{ clearInterval(T.tick); stop('clockloop'); G.deadline=0; onEnd && onEnd(); }, ms);
  }
  const stopClock = () => { clearTimeout(T.main); clearInterval(T.tick); T.main=T.tick=0; stop('clockloop'); G.deadline=0; };
  const timerHTML = () => G.deadline ? `<div class="timer kh-timer" id="kh-timer"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="0"/></svg><div class="num">${Math.ceil(Math.max(0,G.deadline-Date.now())/1000)}</div></div>` : '';

  // ---------- العرض ----------
  function renderScore(){
    pushAll();
    const refN = G.ref ? pname(G.ref) : '';
    $('#kh-score').innerHTML=G.teams.map((t,i)=>`<span class="kh-teamtag ${i===G.turn&&!G.over?'turn':''}" style="--c:${t.color}">${esc(t.name)} <span class="kh-dir">${t.dir==='v'?'فوق ↕ تحت':'يمين ↔ يسار'}</span> <span class="w">${t.wins}</span></span>`).join('')
      + (S.rounds>1?`<span class="pill dim">أول من يفوز بـ${S.rounds}</span>`:'')
      + `<span class="pill dim kh-judge">${G.judge==='human' ? `${ic('whistle')} الحكم: ${esc(refN||'—')}` : `${ic('gears')} حكم تلقائي`}</span>`;
  }
  // لوحة مستطيلة: صفوف سداسية متعرجة (odd-r offset)
  function center(k){ const R=40, w=Math.sqrt(3)*R, h=2*R; return { cx: 24 + w/2 + k.c*w + (k.r%2 ? w/2 : 0), cy: 24 + R + k.r*h*.75 }; }
  function renderBoard(){
    const N=S.size, R=40, w=Math.sqrt(3)*R, h=2*R;
    const W = w*N + w/2 + 48, H = h*.75*(N-1)+h+48;
    const A=G.teams[0].color, B=G.teams[1].color;
    const hexPts=(cx,cy,r)=>[0,1,2,3,4,5].map(i=>{ const a=Math.PI/180*(60*i-30); return `${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`; }).join(' ');
    const x0=4, y0=4, x1=W-4, y1=H-4, mx=W/2, my=H/2;
    const frame=`<defs><clipPath id="kh-frame"><rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" rx="26"/></clipPath></defs>`
      + `<g clip-path="url(#kh-frame)">`
      + `<polygon points="${x0},${y0} ${x1},${y0} ${mx},${my}" fill="${A}"/><polygon points="${x0},${y1} ${x1},${y1} ${mx},${my}" fill="${A}"/>`
      + `<polygon points="${x0},${y0} ${x0},${y1} ${mx},${my}" fill="${B}"/><polygon points="${x1},${y0} ${x1},${y1} ${mx},${my}" fill="${B}"/></g>`
      + `<rect class="kh-edge" x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" rx="26"/>`;
    let backing='', cells='';
    G.cells.forEach(k=>{
      const {cx,cy}=center(k);
      backing+=`<polygon class="kh-gap" points="${hexPts(cx,cy,R*1.06)}"/>`;
      const pts=hexPts(cx,cy,R*.95);
      const cls=['hex', k.owner!=null?'owned':'', G.sel===k?'sel':'', k.win?'winpath':''].join(' ');
      const fill = k.owner!=null ? `style="fill:${G.teams[k.owner].color}"` : '';
      cells+=`<g class="${cls}" data-r="${k.r}" data-c="${k.c}" style="transform-origin:${cx}px ${cy}px"><polygon points="${pts}" ${fill}/><text x="${cx}" y="${cy+2}">${k.l}</text></g>`;
    });
    $('#kh-board').innerHTML=`<svg viewBox="-6 -6 ${W+12} ${H+12}" xmlns="http://www.w3.org/2000/svg">${frame}${backing}${cells}</svg>`;
    // الضغط على الشاشة: بديل للفريق اللي ما عنده جوال (بالتلقائي)، أو تصحيح الخلايا
    $$('#kh-board .hex').forEach(g=>g.onclick=()=>{ const k=cell(+g.dataset.r,+g.dataset.c);
      if(G.edit){ cycleCell(k); return; }
      if(G.judge==='auto' && G.phase==='pick' && k.owner==null) choose(k); });
  }
  function onReport(id, pid, d){
    const L=window.DahoomLog, it=window.DAHOOM_ITEM, t=G && G.teams.find(x=>x.id===id);
    if(!L || !t || d.what!=='item' || !it || !(L.REASONS.l||[]).includes(d.reason)) return false;
    L.report(it, d.reason, d.note, `${((t.players||[]).find(p=>p.id===pid)||{}).name||'جوال'} (${t.name})`); return true;
  }

  // ترتيب البز: الأسرع فوق، وكل واحد كم متأخر عن الأول بالملي ثانية
  const order = () => [...(G.blog||[])].sort((a,b)=>a.dt-b.dt);
  const msGap = (o, first) => `+${Math.max(0, Math.round(o.dt-first.dt))}ms`;
  function queueHTML(){
    const l=order(); if(!l.length) return '';
    return `<div class="bz-order kh-queue">${l.map((o,k)=>{ const x=G.teams[o.i], out=G.tried.includes(o.i) && G.answering!==o.i, now=G.answering===o.i;
      return `<span class="bz-row ${k===0?'first':''} ${now?'now':''} ${out?'out':''}" style="--c:${x.color}"><b>${k+1}</b><span class="bz-n">${esc(o.name||x.name)}<small>${esc(x.name)}</small></span><i><bdi dir="ltr">${k===0?(o.dt/1000).toFixed(2)+'s':msGap(o,l[0])}</bdi></i></span>`; }).join('')}</div>`;
  }
  function triesHTML(){
    if(!G.tries.length) return '';
    return `<div class="kh-tries">${G.tries.slice(-4).map(t=>{ const x=G.teams[t.i]; return `<span class="kh-try ${t.ok?'ok':'no'}" style="--c:${x.color}">${ic(t.ok?'check':'cancel')}<b>${esc(t.name||x.name)}</b> ${t.text?`«${esc(t.text)}»`:t.ok?"— صح بحكم الحكم":"— غلط بحكم الحكم"}</span>`; }).join('')}</div>`;
  }

  // اللوحة الجانبية بالشاشة — عرض بس
  function renderPanel(){
    const t=cur(), k=G.sel, q=G.q, ph=G.phase, a=G.answering!=null ? G.teams[G.answering] : null;
    let h='';
    if(ph==='pick'){
      h=`<div class="lower-third" style="--c:${t.color}"><span class="lt-k">الدور</span><span class="lt-v">${esc(t.name)}</span></div>
        <div class="kh-status">${G.judge==='human'?'اختاروا حرف من جوالاتكم':'اختاروا حرف من جوالاتكم'}</div>
        <p class="muted">${t.dir==='v'?'هدفكم: مسار متصل من فوق لتحت':'هدفكم: مسار متصل من اليمين لليسار'}</p>
        ${G.edit?'<span class="banner">وضع التصحيح: كل ضغطة تغيّر لون الخلية</span>':''}`;
    } else if(ph==='selected'){
      h=`<div class="lower-third" style="--c:${t.color}"><span class="lt-k">اختاروا</span><span class="lt-v">${esc(t.name)}</span></div><div class="kh-letter">${k.l}</div>
        <div class="kh-status kh-wait">${ic('whistle')} ننتظر الحكم يأكد الحرف</div>`;
    } else if(ph==='ready'){
      h=`<div class="kh-letter">${k.l}</div><div class="kh-status">استعدوا…</div><p class="muted">الجواب يبدأ بحرف «${k.l}» — جهّزوا أصابعكم على الجرس</p>
        <div class="kh-count" id="kh-count"></div>`;
    } else if(q){
      const head = ph==='buzz' ? `<div class="kh-status kh-hot">${ic('whistle')} مين يضغط الجرس أول؟</div>`
        : ph==='answer' ? `<div class="lower-third" style="--c:${a.color}"><span class="lt-k">${G.judge==='human'?'يجاوب':'يكتب الجواب'}</span><span class="lt-v">${esc(a.name)}</span></div>`
        : ph==='open' ? `<span class="banner dim">السؤال مفتوح للفريقين${G.judge==='human'?' — الحكم يحدد':''}</span>`
        : ph==='reveal' ? (G.result && G.result.i!=null
            ? `<div class="lower-third" style="--c:${G.teams[G.result.i].color}"><span class="lt-k">${ic('check')}</span><span class="lt-v">${esc(G.teams[G.result.i].name)}</span></div>`
            : `<div class="kh-status">ما أحد جابها</div>`) : '';
      h=`<div class="row center"><div class="kh-letter sm">${k.l}</div><span class="pill dim">${q.d===3?'صعب':'سهل'}</span></div>
        <div class="kh-q">${esc(q.q)}</div>
        ${head}
        ${G.timeUp && G.judge==='human' && ph==='answer' ? '<span class="banner">خلص الوقت — الحكم يقرر</span>' : ''}
        ${timerHTML()}
        ${queueHTML()}
        ${triesHTML()}
        ${ph==='reveal' ? `<div class="answer">${esc(q.a)}</div>` : ''}`;
    }
    $('#kh-panel').innerHTML=h;
    pushAll();
  }

  // ---------- حالة الجوال ----------
  const PH_AR = { pick:'اختيار الحرف', selected:'الحكم يأكد الحرف', ready:'استعدوا', buzz:'اضغط الجرس!', answer:'الجواب', open:'مفتوح للفريقين', reveal:'الجواب' };
  function khView(i, pid, isRef){
    const q=G.q, l=order(), first=l[0], showQ = q && ['buzz','answer','open','reveal'].includes(G.phase);
    const canType = !isRef && G.judge==='auto' && i>=0 && ((G.phase==='answer' && G.answering===i && !G.tries.some(t=>t.i===i && t.ph==='answer' && t.q===G.qid)) || (G.phase==='open' && openTries(i)<OPEN_TRIES));
    return { judge:G.judge, phase:G.phase, ref:!!isRef, qid:G.qid,
      letter: G.sel ? G.sel.l : null, q: showQ ? q.q : null,
      answer: q && (isRef || G.phase==='reveal') ? q.a : null,
      turn: { name:cur().name, color:cur().color, mine: i===G.turn },
      answering: G.answering!=null ? { name:G.teams[G.answering].name, color:G.teams[G.answering].color, mine:G.answering===i } : null,
      queue: l.map((o,k)=>({ name:o.name||G.teams[o.i].name, team:G.teams[o.i].name, color:G.teams[o.i].color, me:!!pid && o.pid===pid, gap:k===0 ? null : Math.max(0,Math.round(o.dt-first.dt)), dt:Math.round(o.dt) })),
      tries: G.tries.slice(-4).map(t=>({ name:t.name, color:G.teams[t.i].color, text:t.text, ok:t.ok })),
      canType, timeUp:G.timeUp,
      result: G.phase==='reveal' && G.result ? (G.result.i!=null ? { name:G.teams[G.result.i].name, color:G.teams[G.result.i].color, mine:G.result.i===i } : { none:true }) : null,
      // أزرار الحكم حسب المرحلة
      acts: isRef ? refActs() : null, edit: !!G.edit, over:!!G.over, roundOver: !!G.over && !G.matchOver, matchOver: !!G.matchOver };
  }
  function refActs(){
    const ph=G.phase, A=[];
    if(G.over) return G.matchOver ? [{ a:'results', t:'النتائج', k:'hype' }] : [{ a:'next', t:'الجولة الجاية', k:'hype' }];
    if(ph==='pick') A.push({ a:'hint', t:'الفريق يختار حرف — أو اضغط أنت خلية من اللوحة' });
    if(ph==='selected') A.push({ a:'start', t:`ابدأ سؤال حرف «${G.sel.l}»`, k:'hype' }, { a:'back', t:'غيّر الحرف', k:'ghost' });
    if(ph==='answer') A.push({ a:'ok', t:`${G.teams[G.answering].name} جاوب صح`, k:'ok', c:G.teams[G.answering].color }, { a:'wrong', t:'غلط / ما جاوب', k:'bad' });
    if(ph==='open') G.teams.forEach((x,i)=>A.push({ a:'win', i, t:`${x.name} جاوب صح`, k:'ok', c:x.color })), A.push({ a:'none', t:'ما أحد — اكشف الجواب', k:'ghost' });
    if(['buzz','answer','open'].includes(ph)) A.push({ a:'change', t:'غيّر السؤال', k:'ghost' }, { a:'cancel', t:'رجوع للوحة', k:'ghost' });
    A.push({ a:'edit', t:G.edit?'خلّصت التصحيح':'صحّح لون خلية', k:G.edit?'hype':'ghost' });
    return A;
  }
  function khState(id, cid, pid){
    const isRef = id==='ref' && G.judge==='human';
    const i=G.teams.findIndex(t=>t.id===id), t=G.teams[i];
    if(!t && !isRef) return { game:'khaliya', waiting:true };
    const me = isRef ? { id:'ref', name:'الحكم', color:D.REF_COLOR, score:'' } : { id:t.id, name:t.name, color:t.color, score:t.wins };
    const mineBz = (G.blog||[]).find(o=>o.pid && o.pid===pid), teamBz = (G.blog||[]).find(o=>o.i===i);
    const l=order(), rank = mineBz ? l.indexOf(mineBz)+1 : 0;
    const bzOpen = !isRef && ['buzz','answer','open'].includes(G.phase);
    const buzzObj = !bzOpen ? { open:false }
      : { open:true, can:!mineBz && !(pid==null && teamBz) && G.phase==='buzz' && !G.tried.includes(i),
          first: G.answering!=null ? G.teams[G.answering].name : null, mine: G.answering===i, rank, gap: rank>1 ? (mineBz.dt-l[0].dt)/1000 : 0 };
    const kbCan = !G.over && (isRef ? (['pick','selected'].includes(G.phase) || G.edit) : (G.phase==='pick' && i===G.turn));
    return { game:'khaliya', team:me,
      scores:G.teams.map((x,k)=>({id:x.id,name:x.name,color:x.color,score:x.wins,turn:k===G.turn&&!G.over})),
      hand:[], canPlay:false, myTurn: !isRef && i===G.turn && G.phase==='pick',
      buzz: buzzObj,
      letter: G.sel ? G.sel.l : null,
      timer: G.deadline ? { ms:Math.max(0,G.deadline-Date.now()), total:G.dur } : null,
      kb: G.over && !isRef ? null : { n:S.size, can:kbCan, edit:isRef && G.edit, sel: G.sel ? G.cells.indexOf(G.sel) : -1,
        cells: G.cells.map(k=>[k.l, k.owner==null ? -1 : k.owner]), colors: G.teams.map(x=>x.color) },
      kh: khView(i, pid, isRef),
      item: !isRef && window.DAHOOM_ITEM ? { kind:'l', id:window.DAHOOM_ITEM.id, label:window.DAHOOM_ITEM.text } : null,
      phase: G.over ? '' : G.phase==='pick' ? `دور ${cur().name} يختار حرف` : (PH_AR[G.phase]||'') };
  }

  // ---------- اللعب ----------
  // الفريق اختار حرف
  function choose(k){
    if(G.over || k.owner!=null) return;
    if(G.phase!=='pick' && !(G.phase==='selected')) return;
    G.sel=k; renderBoard(); play('pop');
    if(G.judge==='human'){ G.phase='selected'; renderPanel(); return; }   // الحكم يأكد
    ready(k);
  }
  // عد تنازلي ثم السؤال
  function ready(k){
    G.phase='ready'; renderPanel();
    let n=Math.round(READY_MS/1000);
    const tick=()=>{ const el=$('#kh-count'); if(el) el.textContent=n; if(n>0) play('tick',{volume:.6}); };
    tick(); clearInterval(T.tick);
    T.tick=setInterval(()=>{ n--; if(n<=0){ clearInterval(T.tick); T.tick=0; startQuestion(k); return; } tick(); }, 1000);
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
    clearAll();
    q = q || pickQ(k.l); G.q=q;
    { const L=G.log.items, last=L[L.length-1]; if(last && last.r==='?') last.r='skip';
      L.push({ k:'l', id:q.id, d:q.d||1, tag:q.l, r:'?', x:String(q.q).slice(0,50) });
      window.DAHOOM_ITEM = { kind:'l', id:q.id, d:q.d||1, tag:q.l, text:q.q, answer:q.a }; }
    resetQ(); G.qid='q'+Date.now().toString(36); G.phase='buzz'; G.qStart=performance.now();
    play('whoosh',{volume:.5}); 
    renderPanel();
  }
  // ضغطة جرس: dt = الوقت من لحظة ما طلع السؤال بجوال اللاعب (أو بالشاشة لو من الكيبورد)
  function buzz(i, pid, dt, qid){
    if(!['buzz','answer','open'].includes(G.phase) || !G.q) return;
    if(qid && qid!==G.qid) return;                                   // ضغطة من سؤال قبل
    const key = pid || ('team'+i);
    if(G.blog.some(o=>o.key===key)) return;
    const hostDt = performance.now()-G.qStart;
    if(typeof dt!=='number' || !isFinite(dt) || dt<0 || dt>hostDt+3000) dt=hostDt;   // قيمة غريبة: نعتمد وقت الشاشة
    G.blog.push({ i, pid, key, name: pid ? pname(pid) : '', dt });
    if(G.stats) G.stats[i].buzz.push(dt);
    play('tick',{volume:.6});
    if(G.phase==='buzz' && !T.win){ T.win=setTimeout(resolveBuzz, BUZZ_WIN); }
    renderPanel();
  }
  function resolveBuzz(){
    T.win=0; if(G.phase!=='buzz') return;
    const first = order().find(o=>!G.tried.includes(o.i)); if(!first) return;
    G.answering=first.i; G.phase='answer'; play('bling',{volume:.9}); flash('good');
    answerClock();
    renderPanel();
  }
  // مؤقت الجواب: التلقائي = وقت الكتابة، البشري = وقت الجواب بالصوت (ولما يخلص الحكم يقرر)
  function answerClock(){
    if(G.judge==='auto') deadline(S.ansTime*1000, ()=>{ addTry(G.answering, null, '(خلص الوقت)', false); passOn(); }, true);
    else deadline(S.buzzTime*1000, ()=>{ G.timeUp=true; play('buzzer',{volume:.6}); renderPanel(); }, true);
  }
  function addTry(i, pid, text, ok){ G.tries.push({ i, pid, name: pid ? pname(pid) : G.teams[i].name, text:String(text).slice(0,40), ok, q:G.qid, ph:G.phase }); }
  const OPEN_TRIES = 3;    // بالمفتوح: كل فريق له ٣ محاولات كتابة
  const openTries = i => G.tries.filter(t=>t.i===i && t.ph==='open' && t.q===G.qid).length;
  // التلقائي: جواب مكتوب من جوال
  function typed(i, text, pid){
    if(G.judge!=='auto' || !G.q) return;
    text=String(text||'').trim().slice(0,60); if(!text) return;
    if(window.DahoomBad && window.DahoomBad.has(text)) text=window.DahoomBad.clean(text);
    if(G.phase==='answer'){
      if(i!==G.answering || G.tries.some(t=>t.i===i && t.ph==='answer' && t.q===G.qid)) return;
      const ok=check(G.q.a, text); addTry(i, pid, text, ok);
      if(ok) claim(i); else { play('wrong',{volume:.6}); passOn(); }
      return;
    }
    if(G.phase==='open'){
      if(openTries(i) >= OPEN_TRIES) return;
      const ok=check(G.q.a, text); addTry(i, pid, text, ok);
      if(ok) claim(i); else { play('wrong',{volume:.5}); renderPanel(); }
    }
  }
  function passOn(){
    stopClock();
    const a=G.answering; if(a!=null){ G.tried.push(a); if(G.stats) G.stats[a].wrong++; const l=G.log.items[G.log.items.length-1]; if(l) l.miss=(l.miss||0)+1; }
    const other = a==null ? null : 1-a;
    if(other!=null && !G.tried.includes(other)){ G.answering=other; G.phase='answer'; toast(`السؤال راح لـ ${G.teams[other].name}`); answerClock(); }
    else { G.answering=null; G.phase='open'; toast('السؤال مفتوح للفريقين');
      if(G.judge==='auto') deadline(OPEN_MS, ()=>reveal(null), true); }
    renderPanel();
  }
  // نكشف الجواب ونرجع للوحة (ما أحد جابها)
  function reveal(i){
    stopClock(); G.answering=null; G.result={ i }; G.phase='reveal'; play('wrong',{volume:.4});
    { const l=G.log.items[G.log.items.length-1]; if(l && l.r==='?') l.r='fail'; }
    renderPanel();
    T.auto=setTimeout(()=>{ G.sel=null; G.phase='pick'; resetQ(); renderBoard(); renderPanel(); }, REVEAL_MS);
  }
  function claim(teamIdx){
    stopClock(); clearTimeout(T.win); T.win=0;
    const k=G.sel; if(!k) return;
    { const l=G.log.items[G.log.items.length-1]; if(l && l.r==='?') l.r='ok'; }
    k.owner=teamIdx; if(G.stats){ G.stats[teamIdx].ok++; G.stats[teamIdx].cells++; }
    G.result={ i:teamIdx }; G.answering=null; play('correct'); flash('good'); reaction('correct',2500);
    renderBoard(); $$(`#kh-board .hex[data-r="${k.r}"][data-c="${k.c}"]`).forEach(g=>g.classList.add('pop'));
    if(checkWinAll()) return;
    G.turn=teamIdx; // اللي يجاوب صح يختار الحرف الجاي
    G.phase='reveal'; renderScore(); renderPanel();
    T.auto=setTimeout(()=>{ G.sel=null; G.phase='pick'; resetQ(); renderBoard(); renderPanel(); }, REVEAL_MS);
  }
  function cycleCell(k){
    if(!k || G.over) return;
    if(k.owner==null) k.owner=0; else if(k.owner===0) k.owner=1; else k.owner=null;
    play('tick'); renderBoard(); if(!checkWinAll()) renderPanel();
  }
  // ---------- أوامر الحكم (من جواله) ----------
  function refAct(d){
    if(!G || G.judge!=='human' || !d) return;
    const a=d.a;
    if(a==='next'){ if(G.over && !G.matchOver){ G.round++; newRound(false); } return; }
    if(a==='results'){ if(G.matchOver) endMatch(G.winner); return; }
    if(a==='edit'){ G.edit=!G.edit; toast(G.edit?'الحكم يصحّح الخلايا':'رجعنا للعب'); renderPanel(); return; }
    if(a==='cell'){ const k=G.cells[d.i]; if(!k) return;
      if(G.edit){ cycleCell(k); return; }
      if((G.phase==='pick' || G.phase==='selected') && k.owner==null){ G.phase='pick'; choose(k); } return; }
    if(G.over) return;
    if(a==='start' && G.phase==='selected'){ ready(G.sel); return; }
    if(a==='back' && G.phase==='selected'){ G.sel=null; G.phase='pick'; renderBoard(); renderPanel(); return; }
    if(a==='ok' && G.phase==='answer'){ addTry(G.answering, null, '', true); claim(G.answering); return; }
    if(a==='wrong' && G.phase==='answer'){ addTry(G.answering, null, '', false); play('wrong',{volume:.6}); passOn(); return; }
    if(a==='win' && G.phase==='open' && (d.i===0 || d.i===1)){ addTry(d.i, null, '', true); claim(d.i); return; }
    if(a==='none' && G.phase==='open'){ reveal(null); return; }
    if(a==='change' && ['buzz','answer','open'].includes(G.phase)){ play('card'); startQuestion(G.sel); return; }
    if(a==='cancel' && ['buzz','answer','open'].includes(G.phase)){ clearAll(); G.sel=null; G.phase='pick'; resetQ(); renderBoard(); renderPanel(); return; }
  }
  // كيبورد الشاشة: 1 و 2 للبزّ (بديل لو فريق ما عنده جوال)
  document.addEventListener('keydown',e=>{ if(!G || !$('#khaliya').classList.contains('active') || /INPUT|TEXTAREA/.test((e.target||{}).tagName||'')) return; if(e.key==='1') buzz(0); else if(e.key==='2') buzz(1); });

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
    if(G.cells.every(k=>k.owner!=null)){
      clearAll(); G.over=true; G.matchOver=false; G.lastLoser=G.turn;
      $('#kh-panel').innerHTML=`<div class="kh-status">انقفلت اللوحة بدون مسار!</div><div class="row center mt"><button class="btn btn-hype big" id="kh-again">جولة جديدة</button></div>`;
      $('#kh-again').onclick=()=>newRound(false); pushAll();
      if(G.judge==='auto') T.auto=setTimeout(()=>newRound(false), 6000);
      return true; }
    return false;
  }
  function winRound(i, path){
    clearAll(); G.over=true; G.edit=false; const t=G.teams[i]; t.wins++; G.lastLoser=1-i;
    path.forEach(k=>k.win=true); renderBoard(); renderScore();
    play('win'); memeSound('win'); confetti(250,4000); reaction('win',3500);
    const matchOver = t.wins>=S.rounds; G.matchOver=matchOver; G.winner=t;
    $('#kh-panel').innerHTML=`<div class="lower-third" style="--c:${t.color}"><span class="lt-k">${ic('trophy')}</span><span class="lt-v">${esc(t.name)}</span></div><div class="kh-status">وصلوا الطرف الثاني!</div>
      <p class="muted">${matchOver?'فازوا بالمباراة':'فازوا بالجولة '+G.round}</p>
      <div class="row center mt">${matchOver?`<button class="btn btn-hype big" id="kh-results">${ic('podium')} النتائج</button>`:`<button class="btn btn-sky big" id="kh-next">الجولة الجاية ${ic('next')}</button>`}</div>
      ${G.judge==='auto'?'<p class="muted small">نكمل تلقائي بعد ثواني</p>':'<p class="muted small">الحكم يكمل من جواله</p>'}`;
    const next=()=>{ clearTimeout(T.auto); if(matchOver) endMatch(t); else { G.round++; newRound(false); } };
    if(matchOver) $('#kh-results').onclick=next; else $('#kh-next').onclick=next;
    if(G.judge==='auto') T.auto=setTimeout(()=>{ if(G && G.over && $('#khaliya').classList.contains('active')) next(); }, 7000);
    pushAll();
  }
  function endMatch(winner){
    clearAll();
    $('#overlay-root').innerHTML='';
    stopAll(); go('results'); play('applause',{volume:.7}); confetti(400,6000);
    const sorted=[...G.teams].sort((a,b)=>b.wins-a.wins);
    $('#winner-title').innerHTML=`<span class="who" style="--c:${winner.color}">${esc(winner.name)}</span> فاز بخلية الحروف`;
    const pod=$('#podium'); pod.innerHTML='';
    sorted.forEach((t,i)=>{ const d=document.createElement('div'); d.className='p '+(i===0?'first':'second'); d.style.setProperty('--c',t.color); d.style.animationDelay=(i*.25)+'s'; d.innerHTML=`${i===0?ic('crown','crown'):''}<div class="rank">${i+1}</div><div class="pn">${esc(t.name)}</div><div class="muted small">${t.players.map(p=>esc(p.name)).join('، ')}</div><div class="ps">${t.wins} ${t.wins===1?'جولة':'جولات'}</div>`; pod.appendChild(d); });
    $('#btn-again').onclick=()=>newMatch();
    try{ const L=window.DahoomLog; if(L && !G.logged){ G.logged=true;
      L.match({ game:'khaliya', rounds:G.round, mins:Math.round((Date.now()-G.log.t0)/60000), mode:D.session.mode, opts:{ size:S.size, difficulty:S.difficulty||'', judge:G.judge },
        teams: sorted.map((t,i)=>{ const o=G.stats[G.teams.indexOf(t)]||{}; return { id:t.id, name:t.name, score:t.wins, rank:i+1, win:t===winner,
          players:t.players.map(p=>({ name:p.name, av:p.avatar||'' })), st:{ cells:o.cells||0, ok:o.ok||0, wrong:o.wrong||0, buzz:(o.buzz||[]).map(Math.round) } }; }),
        items:G.log.items }); } }catch(e){ console.error(e); }
    const el=$('#match-stats'); if(el && window.DahoomStats){ try{ window.DahoomStats.renderKhaliya(el, G); }catch(e){ console.error(e); el.innerHTML=''; } }
    try{ const DS=window.DahoomStats; DS.autoShow(()=>({ items:(G.awards||[]).map(DS.ofTeam), pool:G.teams.map(t=>t.name) })); }catch(e){ console.error(e); }
  }

  // ---------- ربط ----------
  document.addEventListener('DOMContentLoaded',()=>{
    renderSettings();
    $('#btn-to-settings').addEventListener('click',()=>setTimeout(renderSettings,0));
    document.addEventListener('dahoom:screen', e=>{ if(e && e.detail==='khaliya-settings') renderSettings(); });
    $('#btn-khaliya-start').onclick=()=>{
      if(human() && !(D.refPid && D.refPid())){ toast('وضع الحكم البشري: اختاروا حكم من شاشة اللاعبين أول'); return; }
      play('cheer',{volume:.5}); newMatch(); };
    $('#kh-quit').onclick=async ()=>{ if(await confirmBox('<h3>تنهي المباراة؟</h3>','أنهِ','كمّل','btn-bad')){ clearAll(); stopAll(); go('home'); } };
    $('#kh-edit').onclick=()=>{ if(!G || G.judge==='human') return; G.edit=!G.edit; $('#kh-edit').classList.toggle('btn-hype',G.edit); toast(G.edit?'وضع التصحيح: اضغط أي خلية لتغيير لونها':'رجعنا للعب'); if(!G.over) renderPanel(); };
    $('#kh-help').onclick=()=>modal(`<h3>قوانين خلية الحروف</h3><div class="help-list mt">
      <p>لوحة خلايا سداسية، كل خلية فيها حرف. فريقين بالضبط.</p>
      <p>الفريق الأول يبغى مسار متصل من فوق لتحت، والثاني من اليمين لليسار.</p>
      <p>الفريق اللي عليه الدور يختار حرف من جواله${human()?'، والحكم يأكده':''}. بعد عد تنازلي يطلع السؤال بالشاشة والجوالات، والجواب يبدأ بهالحرف (نتجاهل "ال").</p>
      <p>الكل يضغط الجرس بجواله. اللي يضغط أسرع يجاوب — والترتيب يطلع بالملي ثانية.</p>
      <p>${human()?`الفريق يقول الجواب والحكم يحكم صح أو غلط. عندهم ${S.buzzTime} ثواني.`:`الفريق يكتب الجواب بجواله خلال ${S.ansTime} ثانية، والنظام يتحقق منه لحاله.`} غلط؟ يروح للفريق الثاني. غلط بعد؟ يصير مفتوح للفريقين.</p>
      <p>اللي يجاوب صح يلوّن الخلية بلونه ويختار الحرف الجاي. أول فريق يكمل مساره يفوز بالجولة.</p></div><div class="row mt-s"><button class="btn" id="c">تمام</button></div>`,{onMount(m){ m.querySelector('#c').onclick=()=>m.remove(); }});
  });
  window.DAHOOM_DEBUG_KH = { state:()=>G, settings:()=>S, check };
})();
