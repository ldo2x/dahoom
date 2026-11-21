/* ===== شرح الألعاب وقواعدها — وحدة مستقلة تشتغل بشاشة المضيف وبالجوال =====
   window.DahoomRules = { open(gameId), close(), html(gameId), GAMES }
   - open: نافذة شرح (ورقة كاملة بالجوال، لوحة بالنص بالكمبيوتر). Escape وزر الإغلاق يقفلونها.
   - html: نفس المحتوى كنص HTML لو تبي تحطه بمكان ثاني (التبويبات تشتغل لحالها).
   - GAMES: معلومات كل لعبة (الاسم، الجملة التعريفية، الأيقونة).
   ما تعتمد على core.js ولا remote.js — لو بيانات البطاقات موجودة بالصفحة تطلع قائمة «كل البطاقات».
*/
window.DahoomRules = (function(){
  'use strict';

  // ---------- أدوات صغيرة ----------
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ic = n => `<i class="ic" style="--i:url(../assets/icons/${n}.svg)" aria-hidden="true"></i>`;
  const n0 = n => Number(n).toLocaleString('en-US');
  let uid = 0;

  // أيقونة الشاشة (ما فيه وحدة جاهزة بالمجلد)
  const tvIcon = `<svg class="rl-svgic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 20h6M12 16v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

  // ---------- قطع المحتوى ----------
  const sec = (title, icon, body, cls='') => `<section class="rl-sec ${cls}"><h3 class="rl-h">${icon?`<span class="rl-hic">${ic(icon)}</span>`:''}<span>${title}</span></h3>${body}</section>`;
  const p = t => `<p>${t}</p>`;
  const steps = list => `<ol class="rl-steps">${list.map(s=>`<li>${s}</li>`).join('')}</ol>`;
  const notes = list => `<ul class="rl-notes">${list.map(([icn, t, d])=>`<li><span class="rl-nic">${icn.startsWith('<')?icn:ic(icn)}</span><span><b>${t}</b>${d?` ${d}`:''}</span></li>`).join('')}</ul>`;
  const tip = t => `<aside class="rl-tip"><span class="rl-tip-k">${ic('bulb')} نصيحة سريعة</span><p>${t}</p></aside>`;
  const goal = t => `<div class="rl-goal">${ic('flag')}<p>${t}</p></div>`;
  const where = (tv, phone) => `<div class="rl-where"><div class="rl-wcol"><h4>${tvIcon} على الشاشة</h4><ul>${tv.map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="rl-wcol"><h4>${ic('phone')} على جوالك</h4><ul>${phone.map(x=>`<li>${x}</li>`).join('')}</ul></div></div>`;
  const figure = (svg, cap) => `<figure class="rl-fig">${svg}${cap?`<figcaption>${cap}</figcaption>`:''}</figure>`;

  // ================== ألف نقطة ==================
  const ALF_KINDS = {
    attack:   { name:'هجوم',   icon:'attack',   d:'تنزل على فريق ثاني: تاخذ من نقاطه، أو تصعّب دوره، أو تسرق من يده.' },
    defense:  { name:'دفاع',   icon:'defense',  d:'تحميك من الهجوم أو تخفف عنك الخسارة. «الفار» يكسر أغلبها.' },
    buff:     { name:'دعم',    icon:'buff',     d:'تكبّر نقاطك أو تسهّل دورك.' },
    chaos:    { name:'فوضى',   icon:'chaos',    d:'حظ ومراهنات وتبديل — ممكن تنفعك وممكن تقلب عليك.' },
    reaction: { name:'رد فعل', icon:'reaction', d:'ما تلعبها بدورك: تطلع لحالها لحظة شرطها، مثل لما أحد يهاجمك.' },
    duel:     { name:'تحدي',   icon:'whistle',  d:'فريقك ضد فريق تختاره على رهان، والفايز ياخذ من الخاسر.' },
    dud:      { name:'ولا شي', icon:'dud',      d:'سودا ما تسوي شي. كل ثنتين منها تدمجهم بزرقا.' },
  };
  const ALF_TIERS = [
    { k:'legendary', name:'حمراء', d:'نادرة وتقلب المباراة.', f:'تقريبًا وحدة من كل 10 سحبات' },
    { k:'medium',    name:'ذهبية', d:'قوية وتبي توقيت صح.', f:'تقريبًا 3 من كل 10' },
    { k:'normal',    name:'زرقاء', d:'الأكثر، صغيرة بس تفرق.', f:'تقريبًا 5 من كل 10' },
    { k:'black',     name:'سودا',  d:'مقلب: ما تسوي شي أو شي تافه.', f:'تقريبًا وحدة من كل 10' },
  ];
  const cardsData = () => { const d=window.DAHOOM_DATA; return d && Array.isArray(d.cards) && d.cards.length ? d.cards : null; };

  function alfBasics(){
    const loop = `<ol class="rl-loop">
      <li><span class="rl-lic">${ic('dice')}</span><b>تسحب الخانة</b><small>تضغط «اسحب الخانة» والشاشة تختار عشوائي: أسئلة عامة، أو بدون كلام، أو تحديات.</small></li>
      <li><span class="rl-lic">${ic('up')}</span><b>تختار الصعوبة</b><small>سهل أو متوسط أو صعب. كل ما صعبت زادت النقاط.</small></li>
      <li><span class="rl-lic">${ic('stopwatch')}</span><b>تلعب قبل الوقت</b><small>تجاوب أو تمثّل أو تنفّذ، والمضيف يضغط صح أو غلط.</small></li>
      <li><span class="rl-lic">${ic('coins')}</span><b>تاخذ النقاط</b><small>وبعدها الدور ينتقل للفريق اللي بعدك.</small></li>
    </ol>`;
    const slots = `<div class="rl-slots">
      <div class="rl-slot"><span class="rl-sic q">${ic('brain')}</span><b>أسئلة عامة</b><p>عندك 10 ثواني تجاوب. غلطت أو خلص الوقت؟ تنفتح <b>السرقة</b>: الفرق الثانية تبز من جوالاتها، وأول واحد يجاوب صح ياخذ نص النقاط تقريبًا.</p></div>
      <div class="rl-slot"><span class="rl-sic c">${ic('masks')}</span><b>بدون كلام</b><p>واحد منكم يمثّل عبارة تطلع له بس، والكل يخمّن حتى الفرق الثانية. خمّنها فريقك؟ النقاط كاملة لكم. خمّنها فريق ثاني؟ النص لكم والنص لهم.</p></div>
      <div class="rl-slot"><span class="rl-sic t">${ic('flame')}</span><b>تحديات</b><p>تنفّذ التحدي بالوقت المكتوب فيه. نجحت؟ النقاط كاملة. هنا ما فيه سرقة.</p></div>
    </div>`;
    const table = `<div class="rl-table" role="table" aria-label="نقاط كل صعوبة">
      <div class="rl-tr rl-th" role="row"><span role="columnheader">الصعوبة</span><span role="columnheader">سهل</span><span role="columnheader">متوسط</span><span role="columnheader">صعب</span></div>
      <div class="rl-tr" role="row"><span role="rowheader">لو جاوبت</span><span role="cell">100</span><span role="cell">150</span><span role="cell">250</span></div>
      <div class="rl-tr" role="row"><span role="rowheader">لو سرقوها</span><span role="cell">50</span><span role="cell">100</span><span role="cell">150</span></div>
    </div>`;
    return goal('أول فريق يوصل <b>1000 نقطة</b>. الرقم تقدر تغيّره من الإعدادات.')
      + sec('كيف يمشي الدور', 'play', loop)
      + sec('الخانات الثلاث', 'cards', slots)
      + sec('النقاط والفوز', 'trophy', table + notes([
          ['trophy', 'أول ما فريق يوصل الهدف', 'تكمل اللفة لين آخرها عشان الكل ياخذ نفس عدد الأدوار، وبعدها الأعلى نقاط يفوز.'],
          ['podium', 'تعادل على القمة؟', 'لفة حسم بين المتعادلين بس.'],
          ['next', 'ترتيب الأدوار:', 'أول لفة بالقرعة، وبعدها كل لفة يبدأ الأعلى نقاط.'],
          ['ninja', 'خلص وقتك وانت ما غلطت؟', 'تقدر تلحقها وقت السرقة وتاخذ نقاطك كاملة.'],
        ]))
      + sec('مين يسوي وش', 'phone', where(
          ['السؤال والوقت ونقاط الكل', 'المضيف يحكم: صح أو غلط', 'ترتيب البز بأجزاء الثانية'],
          ['زر البز وقت السرقة والتخمين', 'يدك من البطاقات سرّية وتلعبها منه', 'الممثل يضغط «أنا بمثّل» وتطلع له العبارة'],
        ) + p('<span class="rl-mute">الجوال اختياري: بدونه كل شي يصير من الشاشة، والمضيف يضغط اسم الفريق اللي جاوب.</span>'));
  }
  function alfMore(){
    return sec('أشياء لازم تعرفها', 'help', notes([
        ['flame', 'الحسم:', 'أول ما فريق يوصل 750 (ثلاث أرباع الهدف) ما يقدر يختار سهل بالأسئلة، ووقت السرقة للكل ينقص للنص.'],
        ['up', 'دفعة الرجعة:', 'لو فريقك متأخر 400 نقطة أو أكثر عن المتصدر، بداية دورك تختار من بطاقتين بدل ما تسحب وحدة.'],
        ['next', 'اصرمني وغيره:', 'بعض البطاقات تخليك تغيّر سؤالك أو تختار خانتك بنفسك.'],
        ['flag', 'المضيف هو الحكم:', 'يقرر صح وغلط، ويقدر يعيد الوقت أو يعدّل النقاط بيده.'],
        ['eye', 'عقوبات مقترحة:', 'همس لفريقك وقت دور غيرك ينقص 25، والجوال أو أي مصدر برا ينقص 50 أو يصفّر السؤال.'],
      ]))
      + tip('لا تتصدر بدري وانت مرتاح: فيه بطاقات تنزل على المتصدر بس. وخلك ماسك بطاقة رد فعل، تحميك وانت مو بدورك.');
  }
  function alfCards(){
    const C = cardsData();
    const count = k => C ? C.filter(c=>c.kind===k).length : 0;
    const tiers = `<ul class="rl-tiers">${ALF_TIERS.map(t=>`<li class="rl-tier ${t.k}"><span class="rl-gem" aria-hidden="true"></span><b>${t.name}</b><span>${t.d} <span class="rl-mute">${t.f}.</span></span></li>`).join('')}</ul>`;
    const kinds = `<ul class="rl-kinds">${Object.entries(ALF_KINDS).map(([k,v])=>`<li><span class="rl-kic">${ic(v.icon)}</span><span><b>${v.name}</b>${C&&count(k)?` <span class="rl-count">${count(k)}</span>`:''}<small>${v.d}</small></span></li>`).join('')}</ul>`;
    const all = C ? cardGallery(C) : '';
    return sec('متى تشتغل البطاقات', 'cards', steps([
        'من <b>اللفة الثانية</b>، كل فريق يسحب بطاقة بداية دوره. تقدر تمسك لين 3 بطاقات، ولو جتك وحدة زيادة ترمي وحدة.',
        'تلعب <b>بطاقة وحدة بس</b> كل دور، وتلعبها قبل ما تسحب الخانة.',
        'بطاقات <b>رد الفعل</b> ما تلعبها بدورك: تطلع لحالها لحظة شرطها.',
      ]) + notes([
        ['skull', 'بطاقة لها شرط وشرطها مو متحقق؟', 'تنحرق وتروح عليك بطاقة الدور، وتخسر: حمراء 100، ذهبية 50، زرقاء 25.'],
        ['recycle', 'معك سودتين؟', 'تدمجهم وتطلع لك بطاقة زرقا.'],
        ['hourglass', 'بعض البطاقات لها وقت:', 'تطلع أكثر ببداية المباراة أو وسطها أو نهايتها، وبعضها أقوى بوقتها.'],
      ]))
      + all
      + sec('ألوان البطاقات', 'star', tiers)
      + sec('أنواع البطاقات', 'attack', kinds);
  }

  // ---------- معرض البطاقات: كل بطاقة بشكلها الحقيقي وتأثيرها كامل ----------
  const TARGET_TXT = { next:'تنزل على الفريق اللي بعدك', prev:'تنزل على الفريق اللي قبلك', leader:'تنزل على الفريق المتصدر', choose:'انت تختار الفريق' };
  const PHASE_TXT = { early:'تطلع أكثر ببداية المباراة', mid:'تطلع أكثر بوسط المباراة', late:'تطلع أكثر بنهاية المباراة' };
  const BURN = { legendary:100, medium:50, normal:25 };
  const TIER_NAME = { legendary:'حمراء', medium:'ذهبية', normal:'زرقاء', black:'سودا' };
  // نفس رسم البطاقة اللي باللعبة: الشاشة (Dahoom.cardHTML) أو الجوال (DahoomCardHTML)
  const cardFace = (c, o) => { const f=(window.Dahoom && window.Dahoom.cardHTML) || window.DahoomCardHTML;
    return f ? f(c, o||{}) : `<div class="rl-cfb ${c.tier}"><b>${esc(c.name)}</b><p>${esc(c.desc)}</p></div>`; };
  function cardMeta(c){
    const kn=(ALF_KINDS[c.kind]||{}).name||'', W=(window.DAHOOM_DATA||{}).cardWeights||{}, C=cardsData()||[];
    const sameTier=C.filter(x=>x.tier===c.tier).length, tot=Object.values(W).reduce((a,b)=>a+b,0);
    const pct = W[c.tier] && sameTier && tot ? (100*W[c.tier]/tot/sameTier) : 0;
    const rows=[
      ['cards', 'النوع', `${kn} · ${TIER_NAME[c.tier]||''}`],
      c.target ? ['next', 'على مين', TARGET_TXT[c.target]||''] : (c.kind==='attack'||c.kind==='duel') ? null : ['person', 'على مين', c.kind==='reaction' ? 'تشتغل لحالها لما يصير شرطها' : 'على فريقك'],
      c.phase ? ['hourglass', 'وقتها', PHASE_TXT[c.phase]||''] : null,
      BURN[c.tier] ? ['skull', 'لو انحرقت', `تخسر ${BURN[c.tier]} نقطة (لو شرطها مو متحقق)`] : null,
      pct ? ['dice', 'فرصة تسحبها', pct<1 ? 'أقل من 1٪ بكل سحبة' : `تقريبًا ${pct.toFixed(pct<10?1:0)}٪ بكل سحبة`] : null,
    ].filter(Boolean);
    return `<dl class="rl-cmeta">${rows.map(([i,k,v])=>`<div><dt>${ic(i)}${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  }
  function cardGallery(C){
    const tiers=ALF_TIERS.filter(t=>C.some(c=>c.tier===t.k)), kinds=Object.keys(ALF_KINDS).filter(k=>C.some(c=>c.kind===k));
    const order={legendary:0,medium:1,normal:2,black:3}, list=C.slice().sort((a,b)=>(order[a.tier]-order[b.tier]) || a.kind.localeCompare(b.kind));
    const chip=(attr,v,l,n,on)=>`<button type="button" class="rl-chip ${on?'on':''} ${attr==='cf'&&v!=='all'?'t-'+v:''}" data-${attr}="${v}" aria-pressed="${!!on}">${l}${n!=null?` <span>${n}</span>`:''}</button>`;
    return sec('معرض البطاقات', 'cards', `<p class="rl-mute">كل بطاقات اللعبة (${C.length}) بشكلها وتأثيرها. اضغط أي بطاقة تكبر وتتحرك صورتها، وتشوف على مين تنزل ومتى تطلع وكم فرصة تسحبها.</p>
      <div class="rl-cfs"><div class="rl-cf" role="group" aria-label="اللون">${chip('cf','all','الكل',C.length,true)}${tiers.map(t=>chip('cf',t.k,t.name,C.filter(c=>c.tier===t.k).length)).join('')}</div>
        <div class="rl-cf" role="group" aria-label="النوع">${chip('ck','all','كل الأنواع',null,true)}${kinds.map(k=>chip('ck',k,ALF_KINDS[k].name,C.filter(c=>c.kind===k).length)).join('')}</div></div>
      <ul class="rl-cg">${list.map(c=>`<li data-tier="${c.tier}" data-kind="${c.kind}"><button type="button" class="rl-cbtn" data-card="${esc(c.id)}" aria-label="${esc(c.name)} — كبّرها">${cardFace(c)}</button></li>`).join('')}</ul>
      <p class="rl-cnone rl-mute" hidden>ما فيه بطاقات بهالفلتر.</p>`);
  }
  // الفلاتر والتكبير (نفس النافذة، بدون إعادة رسم)
  function filterCards(g){
    const sheet=g.closest('.rl-sec') || document, tf=(sheet.querySelector('[data-cf].on')||{}).dataset, kf=(sheet.querySelector('[data-ck].on')||{}).dataset;
    const t=tf?tf.cf:'all', k=kf?kf.ck:'all'; let n=0;
    sheet.querySelectorAll('.rl-cg > li').forEach(li=>{ const ok=(t==='all'||li.dataset.tier===t)&&(k==='all'||li.dataset.kind===k); li.hidden=!ok; if(ok) n++; });
    const none=sheet.querySelector('.rl-cnone'); if(none) none.hidden=n>0;
  }
  // صوت البطاقة: بالشاشة نمر على نظام الصوت (يحترم كتم الصوت واختيارات صاحب المنصة)، وبالجوال نشغّل الملف مباشرة
  let cardAudio=null;
  function stopCardSound(){ try{ if(cardAudio && cardAudio.pause) cardAudio.pause(); }catch(e){} cardAudio=null; }
  function cardSound(c){
    stopCardSound();
    const D=window.Dahoom, snd=((D && D.picks && D.picks.csnd)||{})[c.id] || c.snd;
    if(!snd || snd==='none') return;
    if(D && D.play){ cardAudio=D.play(snd, { raw:true, volume:.9 }); return; }
    const src = snd.startsWith('meme:') ? 'assets/sfx/meme/'+snd.slice(5)+'.mp3' : snd.startsWith('game:') ? 'assets/sfx/game/'+snd.slice(5)+'.mp3' : 'assets/sfx/'+snd.replace(/^file:/,'')+'.mp3';
    try{ const a=new Audio(src); a.volume=.8; cardAudio=a; a.play().catch(()=>{}); }catch(e){}
  }
  function zoomCard(id, from){
    const c=(cardsData()||[]).find(x=>x.id===id); if(!c) return;
    const sh=from.closest('.rl-sheet'), host=(sh && sh.parentElement) || document.body;   // فوق النافذة كلها (مو داخل التمرير)
    const z=document.createElement('div'); z.className='rl-zoom'; z.setAttribute('role','dialog'); z.setAttribute('aria-label', c.name);
    z.innerHTML=`<div class="rl-zin">${cardFace(c, { size:'big', anim:true })}${cardMeta(c)}<div class="rl-zacts">${c.snd && c.snd!=='none' ? `<button type="button" class="rl-zx rl-zs">${ic('sound')} اسمع صوتها</button>` : ''}<button type="button" class="rl-zx">${ic('cancel')} رجوع للمعرض</button></div></div>`;
    const done=()=>{ stopCardSound(); z.remove(); try{ from.focus(); }catch(e){} };
    z.addEventListener('click', e=>{ if(e.target.closest('.rl-zs')){ cardSound(c); return; } if(e.target===z || e.target.closest('.rl-zx')) done(); });
    cardSound(c);
    host.appendChild(z); const x=z.querySelector('.rl-zx'); if(x) x.focus();
  }
  document.addEventListener('click', e=>{
    const f=e.target.closest && e.target.closest('[data-cf],[data-ck]');
    if(f && f.closest('.rl-cfs')){ const attr=f.hasAttribute('data-cf')?'data-cf':'data-ck';
      f.parentElement.querySelectorAll('['+attr+']').forEach(b=>{ b.classList.toggle('on', b===f); b.setAttribute('aria-pressed', b===f); }); filterCards(f); return; }
    const cb=e.target.closest && e.target.closest('.rl-cbtn[data-card]'); if(cb) zoomCard(cb.dataset.card, cb);
  });

  // ================== خلية الحروف ==================
  function hexBoardSVG(){
    const N=5, R=19, w=Math.sqrt(3)*R, pad=20;
    const W = w*N + w/2 + pad*2, H = R*1.5*(N-1) + R*2 + pad*2;
    const cxy = (r,c) => [pad + w/2 + c*w + (r%2 ? w/2 : 0), pad + R + r*R*1.5];
    const pts = (cx,cy,rr) => [0,1,2,3,4,5].map(i=>{ const a=Math.PI/180*(60*i-30); return `${(cx+rr*Math.cos(a)).toFixed(1)},${(cy+rr*Math.sin(a)).toFixed(1)}`; }).join(' ');
    const L = 'مبعرسكنلدقحطجفهتوزخشيصأغرمب';
    const A = new Set(['0,2','1,1','2,2','3,1','4,2']);          // مسار الفريق الأول: من فوق لتحت
    const B = new Set(['2,0','2,1','1,3','3,3','3,4','0,4']);    // خلايا الفريق الثاني — المسار انقطع
    let cells='', k=0;
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      const [cx,cy]=cxy(r,c), key=r+','+c, own=A.has(key)?'a':B.has(key)?'b':'';
      cells += `<g class="rl-hx ${own}"><polygon points="${pts(cx,cy,R*.93)}"/><text x="${cx.toFixed(1)}" y="${(cy+1).toFixed(1)}">${L[k++%L.length]}</text></g>`;
    }
    const t=6;
    const frame = `<rect class="rl-fa" x="${pad}" y="${pad-t-5}" width="${W-pad*2}" height="${t}" rx="3"/><rect class="rl-fa" x="${pad}" y="${H-pad+5}" width="${W-pad*2}" height="${t}" rx="3"/>`
      + `<rect class="rl-fb" x="${pad-t-6}" y="${pad}" width="${t}" height="${H-pad*2}" rx="3"/><rect class="rl-fb" x="${W-pad+6}" y="${pad}" width="${t}" height="${H-pad*2}" rx="3"/>`;
    return `<svg class="rl-hexsvg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="لوحة خلايا: الفريق الأول يوصل من فوق لتحت، والثاني من اليمين لليسار">${frame}${cells}</svg>`;
  }
  function khBasics(){
    const fig = figure(hexBoardSVG(), `<span class="rl-key a"></span> الفريق الأول: يوصل من فوق لتحت &nbsp; <span class="rl-key b"></span> الفريق الثاني: من اليمين لليسار`);
    return goal('توصّل مسار خلايا بلونك من طرف اللوحة لطرفها الثاني قبل الفريق الثاني.')
      + sec('مين يوصل وين', 'hive', fig + p('<span class="rl-mute">بالرسمة: الفريق الأول كمّل مساره وفاز، والثاني انقطع طريقه بالنص. الخلايا تتصل من ست جهات، فالمسار يقدر يتعرّج.</span>'))
      + sec('كيف يمشي الدور', 'play', steps([
          'الفريق اللي عليه الدور يختار حرف من اللوحة بجواله.',
          'بعد عد تنازلي يطلع سؤال جوابه يبدأ بهالحرف (ما نحسب «ال») — بالشاشة وبالجوالات.',
          'الكل يضغط <b>الجرس بجواله</b>. الأسرع يجاوب، والترتيب يطلع بالملي ثانية (+120ms، +350ms…).',
          '<b>حكم تلقائي:</b> الفريق يكتب الجواب بجواله والنظام يتحقق منه. <b>حكم بشري:</b> الفريق يقول الجواب والحكم يحكم من جواله.',
          'غلط أو خلص الوقت؟ السؤال يروح للفريق الثاني. غلط بعد؟ يصير مفتوح للفريقين.',
          'اللي يجاوب صح تتلوّن الخلية بلونه، <b>وهو يختار الحرف الجاي</b>.',
        ]))
      + sec('الفوز', 'trophy', notes([
          ['trophy', 'أول فريق يكمّل مساره', 'يفوز بالجولة.'],
          ['podium', 'المباراة:', 'جولة وحدة، أو أول من يفوز بجولتين أو ثلاث — حسب الإعدادات.'],
          ['next', 'الجولة الجاية', 'يبدأها الفريق اللي خسر.'],
        ]));
  }
  function khMore(){
    return sec('أشياء لازم تعرفها', 'help', notes([
        ['team', 'فريقين بالضبط.', 'لو فيه أكثر، أول فريقين بالقائمة يلعبون.'],
        ['hive', 'حجم اللوحة', 'من 4 × 4 لين 7 × 7، والأسئلة سهلة أو صعبة أو مخلوطة.'],
        ['skull', 'الحروف الصعبة', '(ث ذ ظ ض غ) تقدر تشيلها من الإعدادات.'],
        ['whistle', 'الحكم البشري', 'لاعب ياخذ خانة «الحكم» بشاشة اللاعبين — يأكد الحرف، ويحكم صح وغلط، ويغيّر السؤال، ويصحح أي خلية. ما يلعب مع أحد.'],
        ['check', 'الحكم التلقائي', 'يسامح بالهمزات والتاء المربوطة و«ال» وغلطة حرف. كل فريق يحتاج جوال واحد على الأقل.'],
        ['stopwatch', 'الجرس عادل', 'كل جوال يحسب ضغطتك من لحظة ما طلع السؤال عنده، فالنت البطيء ما يظلمك.'],
      ]))
      + sec('مين يسوي وش', 'phone', where(['اللوحة والسؤال والوقت وترتيب الجرس — عرض بس', 'ما أحد يضغط فيها شي'], ['اللوحة والسؤال والجرس وخانة الجواب', 'والحكم: أزرار التحكيم والجواب الصحيح']))
      + tip('سكّر طريق خصمك: أحيانًا خلية تقطع مساره أهم من خلية تكمّل مسارك.');
  }

  // ================== ارسم وخمّن ==================
  function rampSVG(){
    return `<svg class="rl-ramp" viewBox="0 0 300 120" role="img" aria-label="نقاط التخمين تنزل من كاملة لين النص مع الوقت">
      <line class="rl-ax" x1="24" y1="96" x2="286" y2="96"/>
      <line class="rl-grid" x1="24" y1="22" x2="286" y2="22"/><line class="rl-grid" x1="24" y1="59" x2="286" y2="59"/>
      <path class="rl-area" d="M276 22 L34 59 L34 96 L276 96 Z"/>
      <path class="rl-line" d="M276 22 L34 59"/>
      <circle class="rl-dot" cx="276" cy="22" r="5"/><circle class="rl-dot" cx="34" cy="59" r="5"/>
      <text x="276" y="14" text-anchor="end">قيمة الكلمة كاملة</text>
      <text x="34" y="51" text-anchor="start">النص</text>
      <text x="276" y="114" text-anchor="end">أول الوقت</text>
      <text x="34" y="114" text-anchor="start">آخره</text>
    </svg>`;
  }
  function rsBasics(){
    return goal('تجمع أكثر نقاط بعد ما كل فريق يرسم مرتين (العدد من الإعدادات).')
      + sec('كيف يمشي الدور', 'play', steps([
          'الدور على فريق: واحد منهم يضغط <b>«أنا برسم»</b> من جواله.',
          'تطلع له ثلاث كلمات: سهلة 100، متوسطة 150، صعبة 200. يختار وحدة، ولو طوّل تنختار المتوسطة.',
          'يرسمها بجواله وتطلع على الشاشة على طول. عنده <b>80 ثانية</b>.',
          'الكل يكتب تخميناته من جواله. التخمين القريب يطلع له «قريب جدًا».',
          'الدور يخلص لما الكل يعرفها أو يخلص الوقت، وبعدها الكل يقيّم الرسمة.',
        ]))
      + sec('النقاط', 'coins', figure(rampSVG(), 'كل ما خمّنت أسرع أخذت أكثر') + notes([
          ['check', 'اللي يخمّن صح:', 'ياخذ من نص قيمة الكلمة لين كاملة، حسب سرعته.'],
          ['pencil', 'فريق الرسام:', 'نص قيمة الكلمة على أول تخمين صح، وخُمسها على كل تخمين صح بعده.'],
          ['cancel', 'ما أحد عرفها؟', 'ولا نقطة لأحد.'],
          ['trophy', 'بالنهاية', 'الأعلى نقاط يفوز.'],
        ]));
  }
  function rsMore(){
    return sec('أشياء لازم تعرفها', 'help', notes([
        ['team', 'كل فريق يخمّن لحاله،', 'حتى فريق الرسام لو فيه أكثر من لاعب. والدور يكمل لين الكل يعرفها.'],
        ['eye', 'تلميحات:', 'حرف من الكلمة يطلع عند نص الوقت، وحرف ثاني بالربع الأخير للكلمات الطويلة. تقدر تطفيها.'],
        ['cancel', 'ممنوع', 'تكتب حروف أو أرقام بالرسمة.'],
        ['check', 'التخمين مرن:', 'الهمزات و«ال» ما تفرق، وغلطة حرف وحدة بالكلمات الطويلة تنقبل.'],
        ['star', 'التقييم:', 'بعد كل رسمة الكل يقيّمها من 1 لين 5، وأحلى رسمة بالمباراة تاخذ جائزة.'],
      ]))
      + sec('مين يسوي وش', 'phone', where(
          ['الرسمة مباشرة والوقت والتلميح', 'التخمينات ومين عرفها'],
          ['ترسم إذا دورك، بقلم وألوان وممحاة وتعبئة', 'تكتب تخميناتك وتقيّم الرسمة'],
        ) + p('<span class="rl-mute">بدون جوال؟ الرسام يرسم على الشاشة بالماوس أو اللمس، واللي يخمّن بصوت المضيف يضغط اسم فريقه.</span>'))
      + tip('ارسم الفكرة الكبيرة أول والتفاصيل بعدين: أول الثواني هي اللي تجيب النقاط لكم وللي يخمّن.');
  }

  // ================== هوامير ==================
  // نفس ترتيب اللوحة بكل الخرائط (data/hawamir.js) — منسوخ هنا عشان الرسمة تطلع بالجوال كمان
  const HM_LAYOUT = 's c0 l c0 c0 a c1 x c1 c1 o j c2 c2 a c3 c3 c3 p c4 x c4 c4 a c5 x c5 c5 o x c6 c6 a c7 c7 c7'.split(' ');
  const HM_COLORS = ['#1FA39A','#F0685A','#E0A526','#7B5BD6','#3A97E8','#D5489A','#2E9E5B','#15161F'];
  function hmBoardSVG(){
    const S=22, g=2;
    const cell = i => i<12 ? [1,12-i] : i<18 ? [i-10,1] : i<30 ? [8,i-17] : [8-(i-29),12];
    const W=12*S, H=8*S;
    const tiles = HM_LAYOUT.map((t,i)=>{
      const [r,c]=cell(i), x=(c-1)*S+g/2, y=(r-1)*S+g/2, s=S-g;
      const corner = i===0||i===11||i===18||i===29;
      const cls = t[0]==='c' ? 'city' : t==='a' ? 'air' : t==='o' ? 'co' : corner ? 'corner' : 'sp';
      const fill = t[0]==='c' ? ` style="fill:${HM_COLORS[+t[1]]}"` : '';
      return `<rect class="rl-ht ${cls}" x="${x}" y="${y}" width="${s}" height="${s}" rx="3"${fill}/>`;
    }).join('');
    const lab = (x,y,t,a) => `<text class="rl-hl" x="${x}" y="${y}" text-anchor="${a}">${t}</text>`;
    return `<svg class="rl-hmsvg" viewBox="-4 -4 ${W+8} ${H+8}" role="img" aria-label="لوحة هوامير: 36 خانة تلف حول اللوحة">
      <defs><marker id="rl-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="rl-arrh"/></marker></defs>
      ${tiles}
      <path class="rl-hpath" d="M${W-S*1.6} ${S*1.55} H${S*1.55} V${H-S*1.55} H${W-S*1.55} V${S*2.3}" marker-end="url(#rl-arr)"/>
      ${lab(W-S*1.9, S*2.45, 'البداية', 'end')}${lab(S*1.9, S*2.45, 'السجن', 'start')}
      ${lab(S*1.9, H-S*1.95, 'الصندوق', 'start')}${lab(W-S*1.9, H-S*1.95, 'سوق الأسهم', 'end')}
      <text class="rl-hc" x="${W/2}" y="${H/2+5}" text-anchor="middle" direction="rtl">36 خانة</text>
    </svg>`;
  }
  function hmBasics(){
    const legend = `<span class="rl-key city"></span> مدن (كل لون دولة) &nbsp; <span class="rl-key air"></span> مطارات وشركات &nbsp; <span class="rl-key sp"></span> خانات خاصة`;
    return goal('تكون <b>أغنى لاعب</b> لما يخلص الوقت. ثروتك = كاشك + قيمة عقاراتك ومبانيها، ناقص أي رهن عليها.')
      + sec('اللوحة', 'ui-map', figure(hmBoardSVG(), legend))
      + sec('كيف يمشي الدور', 'play', steps([
          'قبل ما ترمي تقدر تبني، أو تدير أملاكك، أو ترسل صفقة.',
          'ترمي نردين وتمشي. كل ما تمر على البداية تاخذ راتبك <b>20,000</b>.',
          'وقفت على عقار ما له مالك؟ تشتريه بسعره، أو تخليه للمزاد والكل يزايد عليه (يبدأ من نص سعره).',
          'وقفت على عقار له مالك؟ تدفع له الإيجار.',
          'طلع لك دبل؟ ترمي مرة ثانية، مرة وحدة بس.',
        ]))
      + sec('الفوز', 'trophy', notes([
          ['hourglass', 'لما يخلص الوقت', '(45 دقيقة إذا ما غيرته) تكمل اللفة، وبعدها الأغنى يفوز.'],
          ['skull', 'تفلس = تطلع.', 'وبدون وقت، اللعب يكمل لين يبقى لاعب واحد.'],
          ['team', 'من 2 لين 6 لاعبين.', 'اللي ترتيبه متأخر بالدور ياخذ كاش زيادة بسيط بالبداية.'],
        ]));
  }
  function hmMore(){
    return sec('العقار والإيجار', 'hm-building', notes([
        ['hm-building', 'البناء:', 'لازم تملك كل مدن الدولة. تبني بيت ثم عمارة ثم فندق ثم برج، وكل مستوى يرفع الإيجار.'],
        ['hm-home', 'دولة كاملة بدون بناء:', 'الإيجار دبل.'],
        ['hm-plane', 'المطارات:', `إيجارها يكبر كل ما ملكت أكثر: ${[5000,10000,20000,40000].map(n0).join(' ثم ')}.`],
        ['hm-building-factory-2', 'الشركات:', 'الإيجار مجموع النرد × 1,000، ولو ملكت الثنتين × 2,500.'],
        ['flame', 'الاستحواذ:', 'وقفت على عقار غيرك ما فيه بناء وعندك مدينة من نفس الدولة (أو مطار أو شركة لو كان منها)؟ تاخذه بضعف سعره وما يقدر يرفض. البناء يحمي عقارك.'],
        ['hm-cash', 'فلوس البداية:', `كل واحد يبدأ بـ ${n0(150000)}، واللي دوره متأخر ياخذ زيادة ${n0(6000)} عن اللي قبله — تعويض لأن غيره يتحرك ويشتري قبله.`],
        ['hm-exchange', 'الصفقات:', 'بأي وقت، حتى مو بدورك: تعرض عقار أو كاش أو الاثنين، والثاني يوافق أو يرفض أو يرد بعرض.'],
      ]))
      + sec('الخانات الخاصة', 'hm-clover', notes([
          ['hm-clover', 'حظك:', 'بطاقة عشوائية: فلوس لك أو عليك، أو تنقلك لمكان.'],
          ['hm-camera', 'ساهر:', 'مخالفة 10,000 تروح للصندوق.'],
          ['hm-building-bank', 'الصندوق:', 'كل الغرامات تتجمع فيه، واللي يوقف عليه ياخذه كله.'],
          ['hm-plane-departure', 'رحلة مجانية:', 'تطير لمطار أو للبداية أو لسوق الأسهم.'],
          ['hm-trending-up', 'سوق الأسهم:', 'تستثمر وترمي نرد: 1 أو 2 تخسرها، 3 أو 4 ترجع لك، 5 تتضاعف، 6 ثلاث أضعاف.'],
          ['hm-siren', 'الدورية:', 'توديك السجن على طول بدون راتب.'],
        ]))
      + sec('السجن والديون', 'hm-jail', notes([
          ['hm-jail', 'بالسجن:', 'عندك محاولتين تطلع دبل وتطلع ببلاش، أو تدفع كفالة 10,000. وانت بالسجن ما تستلم إيجار ولا فلوس.'],
          ['hm-receipt-tax', 'ما معك تدفع؟', 'اللعب يوقف لين تدبّرها: تهدم مبنى، أو ترهن عقار، أو تبيعه للبنك بـ 60٪ من قيمته، أو تسوي صفقة. ما قدرت؟ تعلن إفلاسك.'],
          ['hm-lock', 'الرهن:', 'تاخذ نص قيمة العقار وتبقى مالكه، بس ما يجيب إيجار لين تفكه بزيادة 10٪.'],
        ]))
      + sec('مين يسوي وش', 'phone', where(['اللوحة والقطع وسجل كل الفلوس', 'المزاد والعروض المعلّقة'], ['تقرر بدورك: ترمي، تشتري، تبني', 'تزايد بالمزاد وتجهّز صفقاتك']) + p('<span class="rl-mute">الجوال اختياري: كل قرار يقدر ينضغط من الشاشة بعد.</span>'))
      + tip('كمّل دولة وابنِ فيها بدري: الإيجار يتضاعف، والبناء يحميها من الاستحواذ.');
  }

  // ================== ما أصدقك ==================
  const SQ_ROLES = [
    { k:'tajer',  n:'التاجر',  c:'#D9961A', m:'تجارة', a:'تاخذ 3 من البنك', b:'' },
    { k:'wasta',  n:'الواسطة', c:'#2E9E5B', m:'واسطة', a:'تاخذ اللي بالصندوق (لين 5)', b:'المخالفة' },
    { k:'muhami', n:'المحامي', c:'#8A5A2B', m:'استشارة', a:'تسحب ورقتين وتبدّل وحدة من أوراقك', b:'البلاغ' },
    { k:'harami', n:'الحرامي', c:'#5E6680', m:'نشل', a:'تاخذ 2 من لاعب', b:'المبادلة' },
    { k:'shurti', n:'الشرطي',  c:'#2478C8', m:'مخالفة', a:'لاعب يدفع 2 للصندوق', b:'النشل' },
    { k:'faddah', n:'المخبر', c:'#D5489A', m:'بلاغ', a:'تدفع 3 ولاعب يخسر ورقة', b:'' },
    { k:'dallal', n:'الدلّال', c:'#E2563F', m:'مبادلة', a:'تاخذ ورقة عشوائية من لاعب وتعطيه وحدة', b:'' },
  ];
  // بطاقات الشخصيات برسماتها (نفس اللي باللعبة)
  const sqArt = r => (window.DahoomSqArt ? window.DahoomSqArt.card(r.k, r.n, r.c) : `<b>${r.n}</b>`);
  const sqCards = () => `<ul class="rl-sqcards">${SQ_ROLES.map(r=>`<li style="--rc:${r.c}"><span class="rl-sqa">${sqArt(r)}</span>
      <span class="rl-sqt"><span><i>حركته</i><b>${r.m}</b> ${r.a}</span>${r.b?`<span class="blk"><i>يصد</i><b>${r.b}</b></span>`:'<span class="none">ما يصد شي</span>'}</span></li>`).join('')}</ul>`;
  function sqFlow(){
    return `<div class="rl-flow" role="img" aria-label="تدّعي شخصية، أحد يقول ما أصدقك، تنكشف الورقة">
      <div class="rl-fstep"><span>${ic('masks')}</span><b>تدّعي</b><small>«أنا التاجر»</small></div>
      <i class="rl-farr" aria-hidden="true"></i>
      <div class="rl-fstep"><span>${ic('search')}</span><b>ما أصدقك!</b><small>أي لاعب يقولها</small></div>
      <i class="rl-farr" aria-hidden="true"></i>
      <div class="rl-fstep"><span>${ic('eye')}</span><b>تنكشف</b><small>الورقة قدام الكل</small></div>
    </div>
    <div class="rl-fout">
      <div class="bad"><b>${ic('cancel')} طلع كذّاب</b><span>هو يخسر ورقة، وحركته تنلغي.</span></div>
      <div class="good"><b>${ic('check')} طلع صادق</b><span>اللي كشفه يخسر ورقة، والصادق يبدّل ورقته من الكومة.</span></div>
    </div>`;
  }
  function sqBasics(){
    return goal('آخر واحد يبقى معه ورقة <b>يفوز</b>. معك ورقتين سرية — كل ورقة حياة.')
      + sec('الشخصيات', 'masks', sqCards() + p('<span class="rl-mute">من كل شخصية 3 نسخ بالكومة.</span>'))
      + sec('دورك', 'play', steps([
          'تختار حركة من جوالك.',
          'حركة شخصية؟ تقدر تسويها <b>حتى لو ما عندك ورقتها</b>.',
          'الحركة على لاعب؟ يقدر يصدها لو قال إنه الشخصية اللي تصدها.',
        ]))
      + sec('«ما أصدقك»', 'search', sqFlow())
      + sec('حركات لأي أحد', 'hm-briefcase', notes([
          ['hm-briefcase', 'دوام:', 'تاخذ 1.'],
          ['hm-cash', 'سلفة:', 'تاخذ 3، ودورك الجاي ترجّع 4. ما معك؟ تخسر ورقة.'],
          ['exit', 'طرد:', 'تدفع 7 ولاعب يخسر ورقة، وما ينصد. معك 10؟ لازم تطرد.'],
        ]));
  }
  function sqMore(){
    return sec('تفاصيل', 'help', notes([
        ['team', 'الشهود:', 'لما أحد يكشف أحد، الباقين يقدرون يشهدون. صح = +1، غلط = −1.'],
        ['hm-building-bank', 'صندوق المجلس:', 'الغرامات والتكاليف تروح له، والواسطة تاخذ منه.'],
        ['coins', 'البلاغ والطرد:', 'تدفع أول. لو انكشفت أو انصدت ما ترجع فلوسك.'],
        ['star', 'أحداث المجلس:', 'كل لفة (من الثانية) حدث يغيّر قاعدة صغيرة.'],
        ['hourglass', 'الوقت:', 'ما رديت على قرار؟ كأنك صدّقت.'],
      ]))
      + tip('كل شخصية لها 3 نسخ بس. انكشف منها ثنتين؟ اللي يدّعيها الحين غالبًا يكذب.');
  }

  // ================== الألعاب ==================
  const GAMES = {
    alf: { id:'alf', name:'ألف نقطة', icon:'ui-cards', ac:'brand',
      pitch:'فرق تتسابق على ألف نقطة: أسئلة، وتمثيل بدون كلام، وتحديات — والبطاقات تقلب اللعب.',
      facts:[['hm-home','للجمعات الحضورية'],['team','فريقين أو أكثر'],['phone','الجوال اختياري'],['trophy','الهدف 1000 نقطة']],
      tabs:[['basics','كيف تلعب',alfBasics],['cards','البطاقات',alfCards],['more','تفاصيل',alfMore]] },
    khaliya: { id:'khaliya', name:'خلية الحروف', icon:'ui-hexagon', ac:'gold',
      pitch:'فريقين على لوحة حروف: جاوب صح وخذ الخلية، وأول من يوصل طرف اللوحة بالطرف الثاني يفوز.',
      facts:[['team','فريقين بالضبط'],['whistle','الجرس من الجوال'],['hive','حكم تلقائي أو بشري']],
      tabs:[['basics','كيف تلعب',khBasics],['more','تفاصيل',khMore]] },
    rasm: { id:'rasm', name:'ارسم وخمّن', icon:'ui-brush', ac:'info',
      pitch:'واحد يرسم من جواله والباقين يخمّنون — أسرع تخمين ياخذ نقاط أكثر.',
      facts:[['team','فريقين أو أكثر'],['phone','الرسم والتخمين بالجوال'],['stopwatch','80 ثانية للرسمة']],
      tabs:[['basics','كيف تلعب',rsBasics],['more','تفاصيل',rsMore]] },
    hawamir: { id:'hawamir', name:'هوامير', icon:'hm-building-skyscraper', ac:'ok',
      pitch:'اشترِ مدن وابنِ فيها واجمع إيجارات — أغنى واحد لما يخلص الوقت هو الهامور.',
      facts:[['users','من 2 لين 6 لاعبين'],['phone','الجوال اختياري'],['hourglass','45 دقيقة']],
      tabs:[['basics','كيف تلعب',hmBasics],['more','تفاصيل',hmMore]] },
    sadq: { id:'sadq', name:'ما أصدقك', icon:'masks', ac:'steal',
      pitch:'ادّعِ أي شخصية حتى لو ما هي معك. لو أحد قال «ما أصدقك» وطلعت كذّاب، تخسر ورقة.',
      facts:[['users','من 2 لين 6 لاعبين'],['phone','كل لاعب لازم جواله'],['crown','آخر واحد يفوز']],
      tabs:[['basics','كيف تلعب',sqBasics],['more','تفاصيل',sqMore]] },
  };

  // ---------- بناء المحتوى ----------
  function build(gameId, {withClose=false}={}){
    const g = GAMES[gameId]; if(!g) return '';
    const id = 'rl'+(++uid);
    const head = `<header class="rl-head">
        <span class="rl-gic" aria-hidden="true">${ic(g.icon)}</span>
        <div class="rl-ht"><p class="rl-eyebrow">${ic('ui-book')} شرح اللعبة</p><h2 id="${id}-t">${esc(g.name)}</h2></div>
        ${withClose?`<button type="button" class="rl-x" data-rl-close aria-label="إغلاق الشرح"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>`:''}
      </header>`;
    const intro = `<div class="rl-intro"><p class="rl-pitch">${esc(g.pitch)}</p><ul class="rl-facts">${g.facts.map(([i,t])=>`<li>${ic(i)}<span>${t}</span></li>`).join('')}</ul></div>`;
    const tabs = `<div class="rl-tabs" role="tablist" aria-label="أقسام الشرح">${g.tabs.map(([k,l],i)=>`<button type="button" role="tab" class="rl-tab" id="${id}-tab-${k}" aria-controls="${id}-p-${k}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${l}</button>`).join('')}</div>`;
    const panels = g.tabs.map(([k,,fn],i)=>`<div class="rl-panel" role="tabpanel" id="${id}-p-${k}" aria-labelledby="${id}-tab-${k}" tabindex="0"${i===0?'':' hidden'}>${i===0?intro:''}${fn()}</div>`).join('');
    return `<div class="rl-doc ac-${g.ac}" data-game="${g.id}" aria-labelledby="${id}-t">${head}${tabs}<div class="rl-body">${panels}</div></div>`;
  }

  // التبويبات: مستمع واحد على الصفحة كلها — يشتغل للنافذة وللمحتوى المضمّن بأي مكان
  function selectTab(tab, focus){
    const doc = tab.closest('.rl-doc'); if(!doc) return;
    doc.querySelectorAll('.rl-tab').forEach(t=>{ const on=t===tab; t.setAttribute('aria-selected', on); t.tabIndex = on?0:-1;
      const pn=document.getElementById(t.getAttribute('aria-controls')); if(pn) pn.hidden=!on; });
    const body = doc.querySelector('.rl-body'); if(body) body.scrollTop=0;
    if(focus) tab.focus();
  }
  document.addEventListener('click', e=>{ const t=e.target.closest && e.target.closest('.rl-tab'); if(t) selectTab(t, false); });
  document.addEventListener('keydown', e=>{
    const t=e.target.closest && e.target.closest('.rl-tab'); if(!t) return;
    const list=[...t.closest('.rl-tabs').querySelectorAll('.rl-tab')], i=list.indexOf(t);
    // الصفحة من اليمين لليسار: السهم اليسار = التبويب اللي بعده
    let j=-1;
    if(e.key==='ArrowLeft') j=(i+1)%list.length; else if(e.key==='ArrowRight') j=(i-1+list.length)%list.length;
    else if(e.key==='Home') j=0; else if(e.key==='End') j=list.length-1;
    if(j>=0){ e.preventDefault(); selectTab(list[j], true); }
  });

  // ---------- النافذة ----------
  let root=null, lastFocus=null, saved=null;
  const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,summary,[tabindex]:not([tabindex="-1"])';
  function onKey(e){
    if(!root) return;
    if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation();
      const z=root.querySelector('.rl-zoom'); if(z){ z.querySelector('.rl-zx:not(.rl-zs)').click(); return; }   // بطاقة مكبّرة: نرجع للمعرض بس
      close(); return; }
    if(e.key==='Tab' && root.querySelector('.rl-zoom')){ e.preventDefault(); const x=root.querySelector('.rl-zx'); if(x) x.focus(); return; }
    if(e.key==='Tab'){
      const sheet=root.querySelector('.rl-sheet');
      const f=[...sheet.querySelectorAll(FOCUSABLE)].filter(x=>!x.closest('[hidden]') && x.offsetParent!==null);
      if(!f.length){ e.preventDefault(); sheet.focus(); return; }
      const first=f[0], last=f[f.length-1], a=document.activeElement;
      if(e.shiftKey && (a===first || a===sheet || !sheet.contains(a))){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && (a===last || !sheet.contains(a))){ e.preventDefault(); first.focus(); }
    }
  }
  function open(gameId){
    const content = build(gameId, {withClose:true});
    if(!content){ console.warn('DahoomRules: لعبة غير معروفة', gameId); return null; }
    if(!root){
      lastFocus = document.activeElement;
      saved = { html:document.documentElement.style.overflow, body:document.body.style.overflow };
      document.documentElement.style.overflow='hidden'; document.body.style.overflow='hidden';
      root = document.createElement('div'); root.className='rl-overlay';
      root.addEventListener('click', e=>{ if(e.target===root || (e.target.closest && e.target.closest('[data-rl-close]'))) close(); });
      document.body.appendChild(root);
      window.addEventListener('keydown', onKey, true);
    }
    const g=GAMES[gameId];
    root.innerHTML = `<div class="rl-sheet" role="dialog" aria-modal="true" tabindex="-1">${content}</div>`;
    const sheet=root.querySelector('.rl-sheet'), t=sheet.querySelector('h2');
    if(t) sheet.setAttribute('aria-labelledby', t.id);
    sheet.setAttribute('aria-label', 'شرح '+g.name);
    requestAnimationFrame(()=>{ if(root) root.classList.add('in'); });
    sheet.focus({preventScroll:true});
    return sheet;
  }
  function close(){
    if(!root) return;
    stopCardSound();
    window.removeEventListener('keydown', onKey, true);
    root.remove(); root=null;
    if(saved){ document.documentElement.style.overflow=saved.html; document.body.style.overflow=saved.body; saved=null; }
    if(lastFocus && lastFocus.focus && document.contains(lastFocus)){ try{ lastFocus.focus({preventScroll:true}); }catch(e){} }
    lastFocus=null;
  }

  const pub = {};
  Object.keys(GAMES).forEach(k=>{ const g=GAMES[k]; pub[k]=Object.freeze({ id:g.id, name:g.name, pitch:g.pitch, icon:g.icon }); });
  return { open, close, html:id=>build(id), GAMES:Object.freeze(pub), get isOpen(){ return !!root; } };
})();
