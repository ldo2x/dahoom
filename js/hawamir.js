/* ===== لعبة هوامير — عقار وتجارة =====
   الشاشة = لوحة اللعب. كل لاعب يقرر من الشاشة أو من جواله (نفس نافذة "مطلوب منكم" حقت باقي الألعاب).
   اللوحة 36 خانة ثابتة، والخريطة (data/hawamir.js) تحدد الدول والمدن.
   تجمع مدن الدولة كلها = تقدر تبني فيها (بيت ← عمارة ← فندق ← برج).
   المباراة بالوقت: لما يخلص الوقت نكمل اللفة، وأغنى لاعب (كاش + عقار + بناء) يفوز.
*/
window.DahoomHawamir = (function(){
  const D = window.Dahoom, DATA = window.DAHOOM_DATA.hawamir;
  const { $, $$, rnd, shuffle, esc, ic, store, play, stopAll, go, toast, modal, confirmBox, confetti } = D;
  const sleep = ms => D.sleep(window.DAHOOM_HM_FAST ? 0 : ms);
  const NET = () => window.DahoomNet;
  const N = DATA.layout.length, LV = DATA.levels;
  const DEFAULTS = { map:'arab', minutes:45, startCash:150000, salary:20000 };
  let S = Object.assign({}, DEFAULTS, store.get('hawamir_settings2', {}));
  let G = null, clock = null, T = [], MAP = DATA.maps[0];
  const money = n => Math.round(n).toLocaleString('en-US');
  const plus = n => '\u200e+'+money(n)+'\u200e';      // علامة الزائد تبقى قبل الرقم حتى داخل نص عربي
  const strip = s => String(s||'').replace(/<[^>]+>/g,'');
  const phoneOf = p => { const n=NET(); return !!(n && n.hasPhone && n.hasPhone(p.id)); };
  const pushAll = () => { const n=NET(); if(n) n.pushAll(); };
  const cur = () => G.players[G.turn];
  const alive = () => G.players.filter(p=>!p.out);
  const byId = id => G.players.find(p=>p.id===id);
  const d6 = () => 1+Math.floor(Math.random()*6);

  // ---------- الخريطة ----------
  function buildTiles(map){
    return DATA.layout.map(l=>{
      if(l.t==='city'){ const g=map.groups[l.g]; return { t:'city', g:l.g, name:g.cities[l.k], country:g.name, flag:g.flag, color:DATA.colors[l.g], price:DATA.prices[l.g][l.k] }; }
      if(l.t==='air') return { t:'air', name:map.airports[l.k], price:DATA.airPrice, color:'#5B6470' };
      if(l.t==='co') return { t:'co', name:map.companies[l.k], price:DATA.coPrice, color:'#7A4E2B' };
      return { t:l.t, name:DATA.names[l.t] };
    });
  }
  const SA_FLAG = '<svg class="hm-flag" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#0B6B3A"/><path d="M12 20v-9M12 11c-1-3-4-4-6-3M12 11c1-3 4-4 6-3M12 11c-2-1-5 0-6 2M12 11c2-1 5 0 6 2M12 11c0-2 0-4-1-5" stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>';
  const flagOf = (flag, name, color) => flag==='sa' ? SA_FLAG : flag ? `<img class="hm-flag" src="assets/hawamir/flags/${flag}.png" alt="">` : `<span class="hm-flag ltr" style="background:${color}">${esc((name||'').replace(/^ال/,'')[0]||'')}</span>`;
  const kindOf = t => t.t==='air' ? 'مطار' : t.t==='co' ? 'شركة' : t.country;
  const tileFlag = t => t.t==='air' ? `<span class="hm-flag air">${ic('hm-plane')}</span>` : t.t==='co' ? `<span class="hm-flag air">${ic('hm-building-factory-2')}</span>` : flagOf(t.flag, t.country, t.color);

  // ---------- سجل الأحداث (مثل الشات): كل فلوس دخلت أو طلعت وكل حركة ----------
  // a: المبلغ (+ دخل، − طلع) · k: good / bad / roll / info
  const LOG_IC = [[/رمى النرد/,'dice'],[/أفلس|إفلاس/,'skull'],[/السجن|الدورية|الكفالة|يفحط/,'hm-jail'],[/فك الرهن|رهن/,'hm-lock'],[/هدم/,'hm-hammer'],[/باع/,'hm-cash'],
    [/صفقة|صفقته/,'hm-exchange'],[/إيجار/,'coins'],[/مزاد/,'hm-gavel'],[/بنى/,'hm-building'],[/اشترى|ورث/,'hm-home'],[/حظك/,'hm-clover'],[/ساهر/,'hm-camera'],
    [/الصندوق/,'hm-building-bank'],[/الأسهم/,'hm-trending-up'],[/البداية|راتب/,'star'],[/استحوذ|انسحب منه/,'flame'],[/طار/,'hm-plane'],[/كمّل/,'trophy'],[/الوقت/,'hourglass'],[/دين|عليه/,'hm-receipt-tax']];
  const logIcon = x => (LOG_IC.find(([r])=>r.test(x))||[])[1] || '';
  function logE(p, x, a, k){
    if(!G) return;
    const e={ n:p?p.name:'', c:p?p.color:'', av:p?p.avatar:'', x, a:a||0, k:k||(a>0?'good':a<0?'bad':''), ic:logIcon(x), r:G.round, ts:Date.now() };
    G.feed.push(e); if(G.feed.length>120) G.feed.shift();
    D.feed(e); renderLog(); pushAll();
  }
  const amtHTML = a => a ? `<span class="hm-amt ${a>0?'up':'dn'}">${a>0?'+':'−'}${money(Math.abs(a))}</span>` : '';
  function renderLog(){
    const el=$('#hm-log'); if(!el||!G) return;
    el.innerHTML = G.feed.length ? G.feed.slice(-30).reverse().map(e=>`<div class="hm-lg ${e.k}" style="--c:${e.c||'transparent'}">${e.ic?`<i class="hm-lgi">${ic(e.ic)}</i>`:''}${e.n?`<b>${esc(e.n)}</b> `:''}<span>${esc(e.x)}</span>${amtHTML(e.a)}</div>`).join('') : '<div class="hm-lg info"><span>هنا يطلع كل شي يصير: إيجارات، شراء، مزادات، حظك…</span></div>';
  }

  // ---------- حسابات ----------
  const ownerOf = i => G.owner[i] ? byId(G.owner[i]) : null;
  const owned = p => T.map((_,i)=>i).filter(i=>G.owner[i]===p.id);
  const groupTiles = g => T.map((t,i)=>t.t==='city'&&t.g===g?i:-1).filter(i=>i>=0);
  const groupFull = (p, g) => groupTiles(g).every(i=>G.owner[i]===p.id);
  const baseRent = i => Math.round(T[i].price*DATA.rentPct/100)*100;
  const upCost = i => Math.round(T[i].price*DATA.upCostPct/500)*500;
  function rentAt(i, lv, full){ const b=baseRent(i); return lv ? b*DATA.upMult[lv-1] : full ? b*DATA.setMult : b; }
  function rentOf(i){
    const t=T[i], o=ownerOf(i); if(!o) return 0;
    if(t.t==='air'){ const n=owned(o).filter(k=>T[k].t==='air').length; return DATA.airRent[n-1]; }
    if(isMort(i)) return 0;
    if(t.t==='co') return (G.lastRoll||7)*coMult(o);
    return rentAt(i, G.level[i]||0, groupFull(o,t.g));
  }
  const coMult = o => DATA.coRent[Math.max(0, owned(o).filter(k=>T[k].t==='co').length-1)];
  // الرهن: تاخذ نص قيمة العقار (مع مبانيه) من البنك وتبقى مالكه، بس ما يجيب إيجار وما تبني ولا تهدم فيه لين تفكه بفايدة
  const MORT_INT = 0.1;
  const isMort = i => !!(G && G.mort && G.mort[i]);
  const tileVal = i => T[i].price + (G.level[i]||0)*upCost(i);
  const mortVal = i => Math.round(tileVal(i)*0.5/500)*500;
  const unmortCost = i => Math.round((G.mort[i]||0)*(1+MORT_INT)/500)*500;
  const demoBack = i => Math.round(upCost(i)/2/100)*100;
  const sellBack = i => Math.max(0, Math.round(tileVal(i)*0.6/500)*500 - (G.mort[i]||0));   // البنك يشتري بـ 60٪ وينخصم الرهن لو مرهون
  const worth = p => p.cash + owned(p).reduce((a,i)=>a+tileVal(i)-(G.mort[i]||0),0);
  const groupMort = g => groupTiles(g).some(isMort);
  const canBuild = p => owned(p).filter(i=>T[i].t==='city' && groupFull(p,T[i].g) && !groupMort(T[i].g) && (G.level[i]||0)<LV.length && p.cash>=upCost(i));
  const demolishable = p => owned(p).filter(i=>(G.level[i]||0)>0 && !isMort(i));
  const mortgageable = p => owned(p).filter(i=>!isMort(i));
  const sellable = p => owned(p);
  const unmortgageable = p => owned(p).filter(i=>isMort(i));

  // ---------- الرسم ----------
  // الطريق يبدأ من الزاوية اليمين فوق ويمشي يسار، وبعدها ينزل ويلف
  const cell = i => i<12 ? [1,12-i] : i<18 ? [i-10,1] : i<30 ? [8,i-17] : [8-(i-29),12];   // [صف, عمود]
  const sideOf = i => (i===0||i===11||i===18||i===29) ? 'corner' : i<12 ? 'top' : i<18 ? 'left' : i<30 ? 'bottom' : 'right';
  const tokInner = p => p.avatar ? `<img src="${D.avatarSrc(p.avatar)}" alt="${esc(p.name)}">` : `<b>${esc(p.name[0]||'')}</b>`;
  const tok = p => `<span class="hm-tok" style="--c:${p.color}">${tokInner(p)}</span>`;
  function buildBoard(){
    const b=$('#hm-tiles'); if(!b) return;
    $$('.hm-tile',b).forEach(e=>e.remove());
    b.insertAdjacentHTML('afterbegin', T.map((t,i)=>{
      const [r,c]=cell(i), sd=sideOf(i), pos=`grid-row:${r};grid-column:${c};`;
      if(t.price) return `<div class="hm-tile ${t.t} s-${sd}" data-i="${i}" style="${pos}--g:${t.color}">
        <span class="hm-band">${tileFlag(t)}<em>${esc(kindOf(t))}</em></span>
        <span class="hm-body"><b class="hm-name">${esc(t.name.replace(/^(مطار|شركة) /,'').replace(/ الدولي$/,''))}</b><span class="hm-sub"></span></span>
        <span class="hm-bld"></span><i class="hm-own"></i><span class="hm-ownav"></span></div>`;
      return `<div class="hm-tile sp ${t.t} s-${sd}" data-i="${i}" style="${pos}"><span class="hm-spic">${ic(DATA.icons[t.t])}</span><b class="hm-name">${esc(t.name)}</b><span class="hm-sub"></span></div>`;
    }).join(''));
    const tl=$('#hm-toks'); if(tl) tl.innerHTML=G.players.map(p=>`<span class="hm-tok" data-p="${p.id}" style="--c:${p.color}">${tokInner(p)}</span>`).join('');
  }
  function renderBoard(){
    const b=$('#hm-tiles'); if(!b||!G) return;
    $$('.hm-tile',b).forEach(el=>{
      const i=+el.dataset.i, t=T[i], o=t.price?ownerOf(i):null, sub=el.querySelector('.hm-sub');
      el.classList.toggle('focus', G.focus===i);
      if(t.price){
        el.classList.toggle('owned', !!o); el.classList.toggle('mort', isMort(i)); el.style.setProperty('--own', o?o.color:'transparent');
        sub.innerHTML = tileSub(i);
        const oa=el.querySelector('.hm-ownav'); if(oa){ const k=o?o.id:''; if(oa.dataset.k!==k){ oa.dataset.k=k; oa.innerHTML=o?tokInner(o):''; oa.title=o?'ملك '+o.name:''; } }
        const lv=G.level[i]||0, bl=el.querySelector('.hm-bld'); bl.innerHTML = lv ? ic(LV[lv-1].icon)+(lv<4?`<b>${lv}</b>`:'') : ''; bl.className='hm-bld'+(lv?' on l'+lv:'');
      } else if(t.t==='pot' || t.t==='start' || t.t==='jail') sub.innerHTML=tileSub(i);
    });
    placeTokens();
    const pe=$('#hm-pot'); if(pe) pe.textContent=money(G.pot);
  }
  // القطع فوق اللوحة: تتحرك بين الخانات بـ transform
  function placeTokens(){
    const b=$('#hm-tiles'), tl=$('#hm-toks'); if(!b||!tl||!G) return;
    const by={}; G.players.forEach(p=>{ if(!p.out) (by[p.pos]=by[p.pos]||[]).push(p); });
    G.players.forEach(p=>{
      const el=tl.querySelector(`[data-p="${p.id}"]`); if(!el) return;
      if(p.out){ el.style.display='none'; return; }
      const tile=b.querySelector(`[data-i="${p.pos}"]`); if(!tile) return;
      const grp=by[p.pos], k=grp.indexOf(p), n=grp.length, w=el.offsetWidth||30;
      const spread=Math.min(w*0.7, (tile.offsetWidth-w)/Math.max(1,n-1));
      const x=tile.offsetLeft+tile.offsetWidth/2-w/2+(k-(n-1)/2)*spread, y=tile.offsetTop+tile.offsetHeight-w*0.84;
      el.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; el.style.zIndex=String(5+k);
      el.classList.toggle('me', p===cur() && !G.over); el.classList.toggle('jail', !!p.jail);
    });
  }
  function renderSide(){
    const el=$('#hm-players'); if(!el||!G) return;
    const rank=[...G.players].sort((a,b)=>(a.out-b.out)||worth(b)-worth(a));
    el.innerHTML=G.players.map(p=>{
      const pr=owned(p), r=rank.indexOf(p)+1;
      return `<div class="hm-pl ${p===cur()&&!G.over?'turn':''} ${p.out?'out':''}" style="--c:${p.color}">
        ${tok(p)}
        <span class="hm-pn"><b>${esc(p.name)}${phoneOf(p)?ic('phone','tphone'):''}</b><small>${p.out?`${ic('skull')} أفلس`:G.debt&&G.debt.id===p.id?`<em class="hm-dbt">${ic('hm-receipt-tax')} عليه ${money(G.debt.n)}</em>`:p.jail?`${ic('hm-jail')} بالسجن`:`${ic('hm-wallet')} الثروة ${money(worth(p))}`}</small></span>
        <span class="hm-cash"><b>${money(p.cash)}</b><small>كاش</small></span>
        <span class="hm-rk">${r}</span>
        <span class="hm-dots">${pr.map(i=>`<i class="${G.level[i]?'b':''} ${isMort(i)?'m':''}" style="--g:${T[i].color}" title="${esc(T[i].name)}"></i>`).join('')}</span></div>`;
    }).join('');
  }
  function tileSub(i){
    const t=T[i];
    if(t.price){ const o=ownerOf(i); return !o ? money(t.price) : isMort(i) ? `<small>مرهون</small>` : t.t==='co' ? `<small>النرد ×</small> ${money(coMult(o))}` : money(rentOf(i)); }
    return t.t==='pot' ? money(G.pot) : t.t==='start' ? plus(S.salary) : t.t==='jail' ? `<small>كفالة</small> ${money(DATA.bail)}` : '';
  }
  function renderAll(){ renderBoard(); renderSide(); renderLog(); renderTrades(); pushAll(); }
  const stage = html => { const s=$('#hm-stage'); if(s) s.innerHTML=html; if(G) G.stageHtml=html; pushAll(); };
  // النرد: مكعبات ثلاثية الأبعاد تطيح وتتدحرج وتوقف على الرقم (نفس الحركة تطلع بجوالات اللاعبين)
  const PIPS = { 1:[5], 2:[1,9], 3:[1,5,9], 4:[1,3,7,9], 5:[1,3,5,7,9], 6:[1,3,4,6,7,9] };
  const FACE_ROT = { 1:[0,0], 2:[0,-90], 3:[-90,0], 4:[90,0], 5:[0,90], 6:[0,180] };
  const face = n => `<i class="f f${n}">${[1,2,3,4,5,6,7,8,9].map(k=>`<i class="${(PIPS[n]||[]).includes(k)?'on':''}"></i>`).join('')}</i>`;
  const die3 = (n, k, roll) => { const [rx,ry]=FACE_ROT[n]||[0,0], sx=roll?720+rx:rx, sy=roll?(k?-720:720)+ry:ry, sz=roll?(k?-1:1)*(160+Math.floor(Math.random()*120)):0;
    return `<span class="hm-d3w ${roll?'roll':''}" style="--dl:${k*110}ms"><span class="hm-d3" style="--rx:${sx}deg;--ry:${sy}deg;--rz:${sz}deg">${[1,2,3,4,5,6].map(face).join('')}</span><b class="hm-d3s"></b></span>`; };
  const diceHTML = (a,b,cls='') => `<span class="hm-dice3 ${cls}">${die3(a,0,cls==='roll')}${b!=null?die3(b,1,cls==='roll'):''}</span>`;
  async function rollDice(two=true){
    const a=d6(), b=two?d6():null;
    play('dice_roll',{volume:.7});
    stage(`<div class="hm-msg">${diceHTML(a,b,'roll')}</div>`);
    await sleep(1250); play('dice_land',{volume:.7});
    return [a,b];
  }
  function tick(){
    const el=$('#hm-clock'); if(!el||!G) return;
    if(G.open){ const up=Date.now()-G.t0, m=Math.floor(up/60000), s=Math.floor(up%60000/1000); el.textContent=`بدون وقت · ${m}:${String(s).padStart(2,'0')}`; return; }
    const left=Math.max(0, G.endAt-Date.now()), m=Math.floor(left/60000), s=Math.floor(left%60000/1000);
    el.textContent = G.lastRound ? 'اللفة الأخيرة' : `${m}:${String(s).padStart(2,'0')}`;
    if(left<=0 && !G.timeUp){ G.timeUp=true; toast('خلص الوقت — نكمل هاللفة وبعدها نحسب الثروات', 4000); play('buzzer',{volume:.6}); logE(null, 'خلص الوقت — نكمل هاللفة وبعدها نحسب الثروات', 0, 'info'); }
  }
  // صك العقار: السعر وجدول الإيجار
  function deed(i){
    const t=T[i];
    const rows = t.t==='co' ? `<div><span>شركة وحدة</span><b>النرد × ${money(DATA.coRent[0])}</b></div><div><span>الشركتين</span><b>النرد × ${money(DATA.coRent[1])}</b></div>` : t.t==='air'
      ? DATA.airRent.map((v,k)=>`<div><span>${['مطار واحد','مطارين','ثلاث مطارات','أربع مطارات'][k]}</span><b>${money(v)}</b></div>`).join('')
      : `<div><span>الإيجار</span><b>${money(rentAt(i,0,false))}</b></div><div><span>الدولة كاملة</span><b>${money(rentAt(i,0,true))}</b></div>`
        + LV.map((l,k)=>`<div><span>${ic(l.icon)} ${l.name}</span><b>${money(rentAt(i,k+1,true))}</b></div>`).join('');
    return `<div class="hm-deed" style="--g:${t.color}"><div class="hm-deed-h">${tileFlag(t)}<span>${esc(kindOf(t))}</span></div>
      <div class="hm-deed-n">${esc(t.name)}</div><div class="hm-deed-p">${money(t.price)}</div>
      <div class="hm-deed-r">${rows}</div>${t.t==='city'?`<div class="hm-deed-f">كل مستوى بناء ${money(upCost(i))}</div>`:''}</div>`;
  }

  // ---------- قرار: أزرار وسط اللوحة + نفس السؤال على جوال اللاعب ----------
  function decide(p, spec){
    return new Promise(res=>{
      let done=false, rid=null, tm=null;
      const box=$('#hm-ask');
      const finish=v=>{ if(done) return; done=true; clearTimeout(tm); if(rid){ const n=NET(); if(n) n.cancel(rid); } if(box) box.innerHTML=''; res(v); };
      G.finishAsk=finish;
      if(G.over){ return finish(null); }
      box.innerHTML=`<div class="hm-q ${spec.deed!=null?'with-deed':''}" style="--c:${p.color}">${spec.deed!=null?deed(spec.deed):''}<div class="hm-q-in">
        <div class="hm-who">${tok(p)}<b>${esc(p.name)}</b>${phoneOf(p)?`<small>${ic('phone')} يقدر يجاوب من جواله</small>`:''}</div><h3>${spec.title}</h3>${spec.text?`<p class="hm-q-t">${spec.text}</p>`:''}
        ${spec.input?`<form class="hm-in" data-in novalidate><input type="number" inputmode="numeric" min="${spec.input.min}" max="${spec.input.max}" step="any" value="${spec.input.def}" aria-label="السعر"><button class="btn btn-hype" type="submit">${esc(spec.input.ok||'تمام')}</button></form>
          <div class="hm-in-v" data-inv>${money(spec.input.def)}</div><div class="hm-opts many">${(spec.input.chips||[]).map(v=>`<button type="button" class="btn small" data-chip="${v}">${money(v)}</button>`).join('')}</div>
          <p class="hm-q-t">أي رقم من ${money(spec.input.min)} إلى ${money(spec.input.max)}</p>`:''}
        <div class="hm-opts ${spec.options.length>4?'many':''}">${spec.options.map((o,i)=>`<button class="btn ${o.cls||'btn-hype'} ${spec.big?'big':''}" data-o="${i}" ${o.dis?'disabled':''}>${o.icon?ic(o.icon):''}${esc(o.label)}</button>`).join('')}</div>
        ${spec.cancel?`<button class="btn ghost small" data-o="-1">${esc(spec.cancel)}</button>`:''}</div></div>`;
      $$('[data-o]',box).forEach(b=>b.onclick=()=>{ const i=+b.dataset.o; finish(i<0?null:spec.options[i].v); });
      const num = v => { const n=Math.round(Number(String(v).replace(/[^\d.]/g,''))); return spec.input && n>=spec.input.min && n<=spec.input.max ? n : null; };
      const form=box.querySelector('[data-in]');
      if(form){ const inp=form.querySelector('input'), lbl=box.querySelector('[data-inv]');
        inp.oninput=()=>{ const n=num(inp.value); lbl.textContent = n!=null ? money(n) : 'الرقم برا الحدود'; lbl.classList.toggle('bad', n==null); };
        form.onsubmit=e=>{ e.preventDefault(); const n=num(inp.value); if(n==null){ toast(`اكتب رقم من ${money(spec.input.min)} إلى ${money(spec.input.max)}`); return; } finish(n); };
        $$('[data-chip]',box).forEach(b=>b.onclick=()=>{ inp.value=b.dataset.chip; inp.oninput(); inp.focus(); }); }
      if(phoneOf(p)) rid=NET().ask(p.id, { hm:true, title:strip(spec.title), text:strip(spec.text), cancel:spec.cancel||null, deed: spec.deed!=null ? spec.deed : null, input: spec.input||null, options:spec.options.map(o=>({label:o.label, cls:o.cls||'', color:null, icon:o.icon||'', dis:!!o.dis})) },
        i=>{ if(i && typeof i==='object'){ const n=num(i.num); if(n!=null) finish(n); return; } finish(i==null||i<0?null:spec.options[i].v); });
      if(spec.timeout) tm=setTimeout(()=>finish(spec.def===undefined?null:spec.def), spec.timeout);
    });
  }
  const ok = (p, title, text) => decide(p, { title, text, options:[{v:true,label:'تمام'}], timeout:9000, def:true });

  // ---------- الفلوس ----------
  function give(p, n){ p.cash+=n; }
  // خصم مبلغ: لو الكاش ما يكفي ينباع البناء وبعده العقار للبنك بنص السعر، ولو ما كفى يفلس
  // خصم مبلغ. لو الكاش ما يكفي: ما ينباع شي لحاله — اللاعب يدبّر فلوسه (يهدم، يرهن، يبيع للبنك، يسوي صفقة)
  // واللعب يوقف لين يسدد أو يعلن إفلاسه. اللي بالسجن ما يستلم فلوس: نصيبه يروح للبنك.
  async function charge(p, n, to, why){
    if(n<=0 || p.out) return 0;
    if(to && (to.jail || to.out)) to=null;
    if(p.cash<n && !(await debtMenu(p, n, why))) return bankrupt(p, to);
    p.cash-=n; if(to) to.cash+=n;
    return n;
  }
  async function bankrupt(p, to){
    const paid=Math.max(0, p.cash); if(to) to.cash+=paid;
    owned(p).forEach(i=>{ delete G.owner[i]; delete G.level[i]; delete G.mort[i]; });
    G.trades.forEach(t=>{ if(t.st==='pending' && (t.from===p.id || t.to===p.id)){ t.st='cancelled'; t.done=Date.now(); } });
    p.cash=0; p.out=true; p.jail=0; play('fail',{volume:.7});
    logE(p, 'أعلن إفلاسه وطلع من اللعبة — أملاكه رجعت للبنك', 0, 'bad');
    stage(`<div class="hm-msg bad">${ic('skull')} ${esc(p.name)} أفلس وطلع من اللعبة</div>`);
    renderAll(); await sleep(1800);
    return paid;
  }
  // قائمة الدين: ما تكمل لين يصير معك المبلغ أو تعلن إفلاسك
  async function debtMenu(p, n, why){
    G.debt={ id:p.id, n, why:why||'' };
    try{
      for(;;){
        if(!G || G.over || p.out) return false;
        if(p.cash>=n){ logE(p, `دبّر الدين (${money(n)}) وسدد`, 0, 'good'); return true; }
        renderAll();
        stage(`<div class="hm-msg bad">${ic('hm-receipt-tax')} ${esc(p.name)} عليه <b class="hm-num">${money(n)}</b> ومعه ${money(p.cash)} — يدبّر الباقي</div>`);
        const opts=[];
        if(demolishable(p).length) opts.push({ v:'demo', label:'اهدم مبنى', icon:'hm-hammer', cls:'plain' });
        if(mortgageable(p).length) opts.push({ v:'mort', label:'ارهن عقار', icon:'hm-lock', cls:'plain' });
        if(sellable(p).length) opts.push({ v:'sell', label:'بيع عقار للبنك', icon:'hm-cash', cls:'plain' });
        if(alive().length>1) opts.push({ v:'trade', label:'صفقة مع لاعب', icon:'hm-exchange', cls:'plain' });
        opts.push({ v:'quit', label:'أعلن إفلاسي', icon:'skull', cls:'btn-bad' });
        const v=await decide(p, { title:`عليك ${money(n)}`, text:`${why?why+' — ':''}معك ${money(p.cash)} وناقصك ${money(n-p.cash)}. دبّرها من أملاكك: اهدم أو ارهن أو بيع أو سوّ صفقة. اللعب واقف لين تسدد أو تعلن إفلاسك.`, options:opts });
        if(!G || G.over) return false;
        if(v==='quit'){ const sure=await decide(p, { title:'متأكد تعلن إفلاسك؟', text:'تطلع من اللعبة وكل أملاكك ترجع للبنك.', options:[{v:true,label:'إيه، أفلست',icon:'skull',cls:'btn-bad'},{v:false,label:'لا، بدبّرها',cls:'btn-hype'}] }); if(sure) return false; }
        else if(v==='trade'){ if(phoneOf(p)){ NET().send(p.id,{ t:'hmbuild' }); toast(`${p.name} يجهّز صفقة من جواله`); } else builder(p); await sleep(400); }
        else if(v) await assetAction(p, v);
      }
    } finally { if(G) G.debt=null; renderAll(); }
  }
  // هدم / رهن / فك رهن / بيع — من قائمة الدين أو من «أملاكي» بدورك
  async function assetAction(p, kind){
    const L = kind==='demo' ? demolishable(p) : kind==='mort' ? mortgageable(p) : kind==='unmort' ? unmortgageable(p) : sellable(p);
    if(!L.length) return;
    const lbl = i => kind==='demo' ? `${T[i].name}: اهدم ${LV[G.level[i]-1].name} وخذ ${money(demoBack(i))}`
      : kind==='mort' ? `${T[i].name}: خذ ${money(mortVal(i))}`
      : kind==='unmort' ? `${T[i].name}: فكّه بـ ${money(unmortCost(i))}`
      : `${T[i].name}: بيع بـ ${money(sellBack(i))}${isMort(i)?' (مرهون)':''}`;
    const text = kind==='demo' ? 'تهدم مستوى واحد وترجع لك نص تكلفته. العقار يبقى لك.'
      : kind==='mort' ? `ترهنه للبنك مع مبانيه وتبقى مالكه، بس ما يجيب إيجار وما تبني ولا تهدم فيه. تفكه بعدين بفايدة ${Math.round(MORT_INT*100)}٪.`
      : kind==='unmort' ? 'تسدد الرهن مع الفايدة ويرجع العقار يجيب إيجار.'
      : 'تبيعه للبنك بـ 60٪ من قيمته (مع مبانيه) ويرجع بدون مالك. لو مرهون ينخصم الرهن من السعر.';
    const title = { demo:'وش تهدم؟', mort:'وش ترهن؟', unmort:'وش تفك؟', sell:'وش تبيع للبنك؟' }[kind];
    const icon = { demo:'hm-hammer', mort:'hm-lock', unmort:'hm-lock-open', sell:'hm-cash' }[kind];
    const i=await decide(p, { title, text, cancel:'رجوع', options:L.map(k=>({ v:k, label:lbl(k), icon, cls:'plain', dis: kind==='unmort' && p.cash<unmortCost(k) })) });
    if(i==null || !G || G.over || G.owner[i]!==p.id) return;
    if(kind==='demo'){ if(!(G.level[i]>0) || isMort(i)) return; const back=demoBack(i), nm=LV[G.level[i]-1].name; G.level[i]--; p.cash+=back; play('game:g_swoosh',{volume:.5}); logE(p, `هدم ${nm} في ${T[i].name}`, back); }
    else if(kind==='mort'){ if(isMort(i)) return; const v=mortVal(i); G.mort[i]=v; p.cash+=v; play('coin',{volume:.5}); logE(p, `رهن ${T[i].name} للبنك`, v, 'info'); }
    else if(kind==='unmort'){ const c=unmortCost(i); if(p.cash<c){ toast(`فك الرهن يبي ${money(c)}`); return; } p.cash-=c; delete G.mort[i]; play('bonus',{volume:.5}); logE(p, `فك الرهن عن ${T[i].name} (مع الفايدة)`, -c); }
    else { const v=sellBack(i), m=isMort(i); delete G.owner[i]; delete G.level[i]; delete G.mort[i]; p.cash+=v; play('coin',{volume:.5}); logE(p, `باع ${T[i].name} للبنك${m?' (وانسدد رهنه)':''}`, v); }
    renderAll();
  }
  async function manageMenu(p){
    for(;;){
      const opts=[];
      if(demolishable(p).length) opts.push({ v:'demo', label:'اهدم مبنى', icon:'hm-hammer', cls:'plain' });
      if(mortgageable(p).length) opts.push({ v:'mort', label:'ارهن عقار', icon:'hm-lock', cls:'plain' });
      if(unmortgageable(p).length) opts.push({ v:'unmort', label:'فك رهن', icon:'hm-lock-open', cls:'plain' });
      if(sellable(p).length) opts.push({ v:'sell', label:'بيع للبنك', icon:'hm-cash', cls:'plain' });
      if(!opts.length){ toast('ما عندك أملاك تديرها'); return; }
      const v=await decide(p, { title:'أملاكي', text:'هدم ورهن وفك رهن وبيع للبنك', cancel:'خلاص', options:opts });
      if(v==null || !G || G.over) return;
      await assetAction(p, v);
    }
  }
  // غرامة تروح للصندوق
  async function fine(p, n, why){ const paid=await charge(p,n,null,why); G.pot+=paid; return paid; }

  // ---------- المزاد ----------
  const STEP1=1000, STEP2=5000;
  function auction(i, startPrice, title){
    return new Promise(res=>{
      const t=T[i]; let price=startPrice, high=null, left=12, done=false; const outs=new Set(); let rids=[];
      if(G.over) return res(null);
      const box=$('#hm-ask'); G.focus=i; renderBoard();
      const active = () => alive().filter(p=>!outs.has(p.id));
      const clearAsks = () => { const n=NET(); if(n) rids.forEach(r=>n.cancel(r)); rids=[]; };
      const end = () => { if(done) return; done=true; clearInterval(tm); clearAsks(); box.innerHTML=''; G.focus=null; G.endAuction=null;
        if(high){ high.cash-=price; G.owner[i]=high.id; high.stats.auctions++; play('game:g_mariocoin',{volume:.6}); toast(`${high.name} فاز بمزاد ${t.name} بـ ${money(price)}`, 3200); logE(high, `فاز بمزاد ${t.name}`, -price); }
        else { toast(`ما أحد زايد على ${t.name}`, 2400); logE(null, `ما أحد زايد على ${t.name}`, 0, 'info'); }
        renderAll(); res(high); };
      G.endAuction=end;
      const bid = (p, inc) => { if(done || p===high || outs.has(p.id)) return; const np = high ? price+inc : startPrice+(inc>STEP1?inc-STEP1:0);
        if(p.cash<np){ toast(`${p.name} ما معه ${money(np)}`); return; } price=np; high=p; left=8; play('pop',{volume:.6}); if(active().every(x=>x===high)) return end(); draw(); askPhones(); };
      const quit = p => { if(done || p===high) return; outs.add(p.id); draw(); if(active().length===0 || (high && active().every(x=>x===high))) end(); };
      const askPhones = () => { clearAsks(); const n=NET(); if(!n) return;
        active().filter(p=>p!==high && phoneOf(p)).forEach(p=>{ rids.push(n.ask(p.id, { hm:true, title:`مزاد: ${t.name}`, text:high?`السعر الحالي ${money(price)} — الأعلى ${high.name}`:`يبدأ من ${money(price)}`,
          options:[{label:high?`زايد +${money(STEP1)} (${money(price+STEP1)})`:`ادخل بـ ${money(price)}`,icon:'hm-gavel',cls:'btn-mint big'},{label:`زايد +${money(STEP2)}`,icon:'up',cls:'btn-hype big'},{label:'انسحب',icon:'cancel',cls:'btn-bad'}] },
          v=>{ if(v===0) bid(p,STEP1); else if(v===1) bid(p,STEP2); else quit(p); })); }); };
      const draw = () => { if(done) return;
        box.innerHTML=`<div class="hm-q with-deed hm-auc">${deed(i)}<div class="hm-q-in"><div class="hm-who">${ic('hm-gavel')}<b>${esc(title||'مزاد')}</b></div><h3>${esc(t.name)} · <span class="hm-num">${money(price)}</span></h3>
          <p class="hm-q-t">${high?`الأعلى: <b style="color:${high.color}">${esc(high.name)}</b>`:'ما أحد زايد للحين'} · باقي <b id="hm-auc-left">${left}</b> ث</p>
          <div class="hm-auc-rows">${alive().map(p=>{ const off=outs.has(p.id), top=p===high;
            return `<div class="hm-auc-row ${off?'off':''} ${top?'top':''}" style="--c:${p.color}">${tok(p)}<b>${esc(p.name)}</b><small>${money(p.cash)}</small>
              ${top?'<span class="hm-tag">الأعلى</span>':off?'<span class="hm-tag off">انسحب</span>':`<button class="btn small btn-mint" data-b="${p.id}:${STEP1}">${high?'+'+money(STEP1):'ادخل'}</button><button class="btn small" data-b="${p.id}:${STEP2}">+${money(STEP2)}</button><button class="btn small ghost" data-q="${p.id}">انسحب</button>`}</div>`; }).join('')}</div></div></div>`;
        $$('[data-b]',box).forEach(b=>b.onclick=()=>{ const [id,inc]=b.dataset.b.split(':'); bid(byId(id), +inc); });
        $$('[data-q]',box).forEach(b=>b.onclick=()=>quit(byId(b.dataset.q))); };
      const tm=setInterval(()=>{ left--; const e=$('#hm-auc-left'); if(e) e.textContent=Math.max(0,left); if(left<=0) end(); }, window.DAHOOM_HM_FAST ? 25 : 1000);
      play('game:g_gong',{volume:.5,max:1800}); draw(); askPhones();
    });
  }

  // ---------- البناء والصفقات (قبل رمي النرد) ----------
  async function buildMenu(p){
    for(;;){
      const list=canBuild(p); if(!list.length){ toast('ما فيه شي تبنيه: لازم تملك الدولة كاملة ومعك كاش'); return; }
      const i=await decide(p, { title:'وين تبني؟', text:'كل مستوى يرفع الإيجار: بيت ثم عمارة ثم فندق ثم برج', cancel:'خلاص',
        options:list.map(k=>({ v:k, label:`${T[k].name}: ${LV[G.level[k]||0].name} بـ ${money(upCost(k))}`, icon:LV[G.level[k]||0].icon, cls:'' })) });
      if(i==null) return;
      p.cash-=upCost(i); G.level[i]=(G.level[i]||0)+1; p.stats.built++; play('game:g_powerup',{volume:.5,max:1200});
      logE(p, `بنى ${LV[G.level[i]-1].name} في ${T[i].name}`, -upCost(i)); renderAll();
    }
  }
  // ---------- الصفقات: عروض معلّقة يشوفها الكل ----------
  // العرض: from يعطي give (عقارات + كاش) ويبي get من to. ينرسل ويبقى معلّق لين to يوافق أو يرفض أو from يسحبه.
  // أي وقت بالمباراة (مو لازم دورك). عند الموافقة نتأكد إن كل شي لسا موجود — لو تغيّر الوضع العرض يفشل.
  const tradable = p => owned(p);
  const TR_AR = { pending:'معلّقة', accepted:'تمت', rejected:'انرفضت', cancelled:'انسحبت', failed:'ما زبطت', countered:'رد بعرض ثاني' };
  const sideTxt = s => [...s.props.map(i=>T[i].name), s.cash?money(s.cash):''].filter(Boolean).join('، ') || 'ولا شي';
  function cleanSide(o, p){
    const props=[...new Set((o&&o.props||[]).map(Number))].filter(i=>T[i] && T[i].price && G.owner[i]===p.id);
    const cash=Math.max(0, Math.round(Number(o&&o.cash)||0));
    return { props, cash };
  }
  function offerTrade(from, to, give, get, counterOf){
    if(!G || G.over || !from || !to || from===to || from.out || to.out) return 'العرض مو صالح';
    give=cleanSide(give, from); get=cleanSide(get, to);
    if(!give.props.length && !give.cash && !get.props.length && !get.cash) return 'العرض فاضي';
    if(get.cash && from.jail) return `${from.name} بالسجن — ما يستلم فلوس لين يطلع`;
    if(give.cash && to.jail) return `${to.name} بالسجن — ما يستلم فلوس لين يطلع`;
    if(give.cash>from.cash) return `${from.name} ما معه ${money(give.cash)}`;
    if(get.cash>to.cash) return `${to.name} ما معه ${money(get.cash)}`;
    if(G.trades.filter(t=>t.st==='pending' && t.from===from.id).length>=4) return 'عندك 4 عروض معلّقة — اسحب وحدة أول';
    if(counterOf){ const o=G.trades.find(t=>t.id===counterOf && t.st==='pending' && t.to===from.id); if(o){ o.st='countered'; o.done=Date.now(); } }
    const tr={ id:'tr'+(++G.trSeq), from:from.id, to:to.id, give, get, st:'pending', ts:Date.now(), counter:!!counterOf };
    G.trades.push(tr);
    play('game:g_mariocoin',{volume:.4});
    logE(from, `${counterOf?'رد بعرض ثاني على':'أرسل صفقة لـ'} ${to.name}: يعطي ${sideTxt(give)} مقابل ${sideTxt(get)}`, 0, 'info');
    const n=NET(); if(n) n.send(to.id, { t:'notice', msg:`عندك صفقة جديدة من ${from.name}` });
    renderTrades(); pushAll(); return tr;
  }
  function settleTrade(id, how, by){
    const tr=G && G.trades.find(t=>t.id===id); if(!tr || tr.st!=='pending') return 'العرض خلص';
    const A=byId(tr.from), B=byId(tr.to);
    if(how==='cancel'){ tr.st='cancelled'; tr.done=Date.now(); logE(A, `سحب صفقته مع ${B.name}`, 0, 'info'); }
    else if(how==='reject'){ tr.st='rejected'; tr.done=Date.now(); play('fx_deny',{volume:.5}); logE(B, `رفض صفقة ${A.name}`, 0, 'bad'); }
    else if(how==='accept'){
      const okSide=(s,p)=>s.props.every(i=>G.owner[i]===p.id) && p.cash>=s.cash && !p.out;
      if(!okSide(tr.give,A) || !okSide(tr.get,B) || (tr.get.cash && A.jail) || (tr.give.cash && B.jail)){ tr.st='failed'; tr.done=Date.now(); play('fx_deny',{volume:.5}); logE(null, `صفقة ${A.name} و${B.name} ما زبطت — الوضع تغيّر (عقار انباع أو الكاش ما يكفي)`, 0, 'bad'); }
      else {
        tr.give.props.forEach(i=>G.owner[i]=B.id); tr.get.props.forEach(i=>G.owner[i]=A.id);
        A.cash+=tr.get.cash-tr.give.cash; B.cash+=tr.give.cash-tr.get.cash;
        A.stats.trades++; B.stats.trades++; tr.st='accepted'; tr.done=Date.now();
        play('deal',{volume:.6}); toast(`تمت الصفقة بين ${A.name} و${B.name}`, 3200);
        logE(A, `صفقة مع ${B.name}: عطى ${sideTxt(tr.give)} وأخذ ${sideTxt(tr.get)}`, tr.get.cash-tr.give.cash, 'good');
        logE(B, `وافق على صفقة ${A.name}: عطى ${sideTxt(tr.get)} وأخذ ${sideTxt(tr.give)}`, tr.give.cash-tr.get.cash, 'good');
        [[A,tr.get.props],[B,tr.give.props]].forEach(([p,l])=>{ const gs=new Set(l.filter(i=>T[i].t==='city').map(i=>T[i].g)); gs.forEach(g=>{ if(groupFull(p,g)){ toast(`${p.name} كمّل ${T[groupTiles(g)[0]].country} — يقدر يبني فيها`, 3600); logE(p, `كمّل ${T[groupTiles(g)[0]].country} كاملة — يقدر يبني فيها`, 0, 'good'); } }); });
      }
      const n=NET(); if(n) n.send(A.id, { t:'notice', msg: tr.st==='accepted' ? `${B.name} وافق على صفقتك` : 'صفقتك ما زبطت — الوضع تغيّر' });
      // اللي عليه دين ودبّره بالصفقة: نرجعه لقائمة الدين عشان تتحدث
      if(tr.st==='accepted' && G.debt && (G.debt.id===A.id || G.debt.id===B.id) && G.finishAsk) G.finishAsk(null);
    }
    if(how==='reject'){ const n=NET(); if(n) n.send(A.id, { t:'notice', msg:`${B.name} رفض صفقتك` }); }
    // نخلي آخر 30 عرض بس
    if(G.trades.length>40) G.trades=G.trades.filter(t=>t.st==='pending').concat(G.trades.filter(t=>t.st!=='pending').slice(-30));
    renderAll(); renderTrades(); return tr;
  }
  // من الجوال: عرض جديد / موافقة / رفض / سحب
  function onPhoneTrade(pid, d){
    const me=byId(pid); if(!G || G.over || !me) return;
    let r=null;
    if(d.op==='new') r=offerTrade(me, byId(d.to), d.give, d.get, d.counter||null);
    else { const tr=G.trades.find(t=>t.id===d.id); if(!tr) return;
      if((d.op==='accept' || d.op==='reject') && tr.to===me.id) r=settleTrade(tr.id, d.op);
      else if(d.op==='cancel' && tr.from===me.id) r=settleTrade(tr.id, 'cancel'); }
    if(typeof r==='string'){ const n=NET(); if(n) n.send(me.id, { t:'notice', msg:r }); }
  }
  // ---------- الشاشة: لوحة الصفقات المعلّقة + نافذة العرض ----------
  const propChip = i => `<span class="hm-tp" style="--g:${T[i].color}">${esc(T[i].name)}</span>`;
  const sideHTML = s => `${s.props.map(propChip).join('')}${s.cash?`<span class="hm-tp cash">${money(s.cash)}</span>`:''}${!s.props.length&&!s.cash?'<span class="hm-tp none">ولا شي</span>':''}`;
  function renderTrades(){
    const el=$('#hm-trades'); if(!el||!G) return;
    const pend=G.trades.filter(t=>t.st==='pending');
    el.innerHTML=`<div class="hm-trh"><b>صفقات معلّقة</b><span class="hm-trn ${pend.length?'on':''}">${pend.length}</span><button class="btn small" data-trnew>${ic('team')} صفقة</button></div>
      ${pend.slice(-3).reverse().map(t=>{ const A=byId(t.from), B=byId(t.to); return `<button class="hm-tr" data-tr="${t.id}"><span><b style="color:${A.color}">${esc(A.name)}</b> ← <b style="color:${B.color}">${esc(B.name)}</b></span><small>${esc(sideTxt(t.give))} ⇄ ${esc(sideTxt(t.get))}</small></button>`; }).join('')}`;
    $$('[data-tr]',el).forEach(b=>b.onclick=()=>tradeModal(b.dataset.tr));
    const nb=el.querySelector('[data-trnew]'); if(nb) nb.onclick=async ()=>{ const who=await pickPlayer('مين يعرض الصفقة؟'); if(who) builder(who); };
  }
  function pickPlayer(title, list){
    return new Promise(res=>{ const L=list||alive();
      const m=modal(`<h3>${title}</h3><div class="hm-pk">${L.map(p=>`<button class="btn team" style="--c:${p.color}" data-p="${p.id}">${esc(p.name)}</button>`).join('')}</div><div class="row center mt-s"><button class="btn ghost" data-x>تراجع</button></div>`,{onMount(m){
        $$('[data-p]',m).forEach(b=>b.onclick=()=>{ m.remove(); res(byId(b.dataset.p)); }); m.querySelector('[data-x]').onclick=()=>{ m.remove(); res(null); }; }}); });
  }
  function tradeModal(id){
    const t=G.trades.find(x=>x.id===id); if(!t) return; const A=byId(t.from), B=byId(t.to);
    modal(`<div class="eyebrow">صفقة ${TR_AR[t.st]||''}</div><h3><span style="color:${A.color}">${esc(A.name)}</span> ← <span style="color:${B.color}">${esc(B.name)}</span></h3>
      <div class="hm-trd"><div><div class="lbl">${esc(A.name)} يعطي</div><div class="hm-tps">${sideHTML(t.give)}</div></div><div><div class="lbl">${esc(B.name)} يعطي</div><div class="hm-tps">${sideHTML(t.get)}</div></div></div>
      ${t.st==='pending'?`<p class="muted small">${phoneOf(B)?`${esc(B.name)} يقدر يرد من جواله، أو`:'المضيف'} يضغط عنه هنا.</p>
      <div class="row center mt-s"><button class="btn btn-mint" data-a="accept">${esc(B.name)} موافق</button><button class="btn btn-bad" data-a="reject">رفض</button><button class="btn" data-a="counter">عرض ثاني</button><button class="btn ghost" data-a="cancel">${esc(A.name)} يسحبها</button></div>`:''}
      <div class="row center mt-s"><button class="btn ghost" data-x>إغلاق</button></div>`,{onMount(m){
        m.querySelector('[data-x]').onclick=()=>m.remove();
        $$('[data-a]',m).forEach(b=>b.onclick=()=>{ m.remove(); const a=b.dataset.a;
          if(a==='counter') builder(B, A, { give:t.get, get:t.give, counter:t.id }); else { const r=settleTrade(t.id, a); if(typeof r==='string') toast(r); } }); }});
  }
  // نافذة بناء العرض على الشاشة (للي ما عنده جوال، أو المضيف عنه)
  function builder(from, toPre, pre){
    if(!G || G.over || !from) return;
    const others=alive().filter(x=>x!==from); if(!others.length) return;
    let to=toPre||others[0]; const sel={ give:new Set((pre&&pre.give.props)||[]), get:new Set((pre&&pre.get.props)||[]) };
    let gc=(pre&&pre.give.cash)||0, tc=(pre&&pre.get.cash)||0;
    const m=modal('<div id="hm-bld"></div>',{onMount(){}}); m.querySelector('.panel').classList.add('hm-bldp');
    const draw=()=>{ const box=m.querySelector('#hm-bld');
      const col=(p,set,k,cash)=>`<div class="hm-bc"><div class="lbl">${p===from?'تعطي':'تاخذ من '+esc(p.name)} <small>(معه ${money(p.cash)})</small></div>
        <div class="hm-bps">${tradable(p).map(i=>`<button type="button" class="hm-bp ${set.has(i)?'on':''}" data-k="${k}" data-i="${i}" style="--g:${T[i].color}"><b>${esc(T[i].name)}</b><small>${money(tileVal(i))}${G.level[i]?' · '+LV[G.level[i]-1].name:''}${isMort(i)?' · مرهون':''}</small></button>`).join('')||'<p class="muted small">ما عنده عقارات — يقدر يحط كاش بس</p>'}</div>
        <div class="hm-bcash"><span>كاش</span><input type="number" inputmode="numeric" min="0" max="${p.cash}" step="any" value="${cash}" data-c="${k}"></div>
        <div class="hm-bst">${[-10000,-5000,-1000,1000,5000,10000].map(v=>`<button type="button" class="btn small" data-st="${k}:${v}">${v>0?'+':'−'}${Math.abs(v)/1000} ألف</button>`).join('')}</div></div>`;
      box.innerHTML=`<div class="eyebrow">صفقة جديدة — ${esc(from.name)}</div><h3>مع مين؟</h3><div class="hm-pk">${others.map(p=>`<button class="btn small team ${p===to?'on':''}" style="--c:${p.color}" data-to="${p.id}">${esc(p.name)}</button>`).join('')}</div>
        <div class="hm-bcols">${col(from,sel.give,'give',gc)}${col(to,sel.get,'get',tc)}</div>
        <p class="hm-berr" id="hm-berr"></p>
        <div class="row center"><button class="btn btn-hype" data-send>أرسل العرض</button><button class="btn ghost" data-x>تراجع</button></div>`;
      $$('[data-to]',box).forEach(b=>b.onclick=()=>{ to=byId(b.dataset.to); sel.get.clear(); tc=0; draw(); });
      $$('[data-i]',box).forEach(b=>b.onclick=()=>{ const set=sel[b.dataset.k], i=+b.dataset.i; set.has(i)?set.delete(i):set.add(i); b.classList.toggle('on'); });
      $$('[data-c]',box).forEach(inp=>inp.oninput=()=>{ const v=Math.max(0,Math.round(+inp.value||0)); if(inp.dataset.c==='give') gc=v; else tc=v; });
      $$('[data-st]',box).forEach(b=>b.onclick=()=>{ const [k,d]=b.dataset.st.split(':'), who=k==='give'?from:to, inp=box.querySelector(`[data-c="${k}"]`);
        const v=Math.max(0, Math.min(who.cash, (k==='give'?gc:tc)+Number(d))); if(k==='give') gc=v; else tc=v; inp.value=v; });
      box.querySelector('[data-x]').onclick=()=>m.remove();
      box.querySelector('[data-send]').onclick=()=>{ const r=offerTrade(from, to, { props:[...sel.give], cash:gc }, { props:[...sel.get], cash:tc }, pre&&pre.counter);
        if(typeof r==='string'){ box.querySelector('#hm-berr').textContent=r; return; } m.remove(); };
    };
    draw();
  }

  // ---------- الحركة والخانات ----------
  function passStart(p){ give(p,S.salary); toast(`${p.name} مر على البداية: ${plus(S.salary)}`); play('coin',{volume:.5}); logE(p, 'مر على البداية وأخذ راتبه', S.salary); }
  async function moveTo(p, steps){
    for(let k=0;k<steps;k++){
      p.pos=(p.pos+1)%N; play('tick',{volume:.35});
      if(p.pos===0) passStart(p);
      placeTokens(); pushAll(); await sleep(190);
    }
    renderAll();
  }
  async function buyOrAuction(p, i){
    const t=T[i], price=p.discount ? Math.round(t.price/2) : t.price;
    const opts=[]; if(p.cash>=price) opts.push({v:'buy',label:`اشترِ بـ ${money(price)}`,icon:'hm-home',cls:'btn-mint big'}); opts.push({v:'auc',label:'مزاد',icon:'hm-gavel',cls:'big'});
    G.focus=i; renderBoard();
    const v=await decide(p, { deed:i, title:`${esc(t.name)} بدون مالك`, text:p.discount?`خصمك شغال: ${money(price)} بدل ${money(t.price)}`:(p.cash<price?'ما معك سعرها — تروح للمزاد':'تشتريها ولا تروح للمزاد؟'), options:opts, timeout:45000, def:'auc' });
    G.focus=null;
    if(v==='buy'){ p.cash-=price; G.owner[i]=p.id; p.discount=false; p.stats.bought++; play('buy',{volume:.6}); toast(`${p.name} اشترى ${t.name}`); logE(p, `اشترى ${t.name}`+(price<t.price?' بالخصم':''), -price);
      if(t.t==='city' && groupFull(p,t.g)){ toast(`${p.name} كمّل ${t.country} — يقدر يبني فيها`, 3600); play('levelup',{volume:.6}); logE(p, `كمّل ${t.country} كاملة — يقدر يبني فيها`, 0, 'good'); }
      renderAll(); }
    else await auction(i, Math.round(t.price/2/1000)*1000, 'مزاد');
  }
  async function land(p){
    const i=p.pos, t=T[i];
    if(t.price){
      const o=ownerOf(i);
      if(!o) return buyOrAuction(p,i);
      if(o===p){ stage(`<div class="hm-msg">${esc(p.name)} وقف على ملكه: ${esc(t.name)}</div>`); await sleep(700); return; }
      if(isMort(i)){ stage(`<div class="hm-msg">${ic('hm-lock')} ${esc(t.name)} مرهون للبنك — ما عليه إيجار</div>`); logE(p, `وقف على ${t.name} وهو مرهون — ما دفع إيجار`, 0, 'info'); await sleep(1100); return; }
      if(o.jail){ stage(`<div class="hm-msg">${ic('hm-jail')} ${esc(o.name)} بالسجن — ما يستلم إيجار</div>`); logE(p, `وقف على ${t.name} وصاحبه بالسجن — ما دفع إيجار`, 0, 'info'); await sleep(1100); return; }
      const r=rentOf(i); G.focus=i; renderBoard();
      stage(`<div class="hm-msg bad">${esc(p.name)} يدفع إيجار <b class="hm-num">${money(r)}</b> لـ <b style="color:${o.color}">${esc(o.name)}</b> على ${esc(t.name)}</div>`);
      play('pay',{volume:.6});
      const paid=await charge(p, r, o, `إيجار ${t.name} لـ ${o.name}`); p.stats.rentOut+=paid; o.stats.rentIn+=paid;
      if(!p.out) logE(p, `دفع إيجار ${t.name} لـ ${o.name}`, -paid);
      renderAll(); await sleep(1500);
      await takeover(p, o, i);
      G.focus=null; return;
    }
    if(t.t==='start'){ stage(`<div class="hm-msg">${esc(p.name)} وقف على البداية</div>`); await sleep(600); return; }
    if(t.t==='saher'){ stage(`<div class="hm-msg bad">ساهر صادك! مخالفة <b class="hm-num">${money(10000)}</b> تروح للصندوق</div>`); play('saher',{volume:.6}); const fp=await fine(p,10000,'مخالفة ساهر'); logE(p, 'صاده ساهر — المخالفة راحت للصندوق', -fp); renderAll(); await sleep(1500); return; }
    if(t.t==='pot'){ const v=G.pot>0?G.pot:5000; G.pot=0; give(p,v); p.stats.pot+=v; logE(p, 'فتح الصندوق وأخذ كل اللي فيه', v); stage(`<div class="hm-msg">${esc(p.name)} فتح الصندوق: <b class="hm-num">${plus(v)}</b></div>`); play('meme:chest',{volume:.6,max:2500}); if(v>=30000) confetti(80,1500); renderAll(); await sleep(1700); return; }
    if(t.t==='jail'){ stage(`<div class="hm-msg">${esc(p.name)} يزور السجن بس — ما عليه شي</div>`); await sleep(800); return; }
    if(t.t==='patrol') return goJail(p, `الدورية مسكت ${p.name} — على السجن`);
    if(t.t==='jet') return jet(p);
    if(t.t==='stocks') return stocks(p);
    if(t.t==='auction'){ const free=T.map((x,k)=>x.price&&!G.owner[k]?k:-1).filter(k=>k>=0);
      if(!free.length){ give(p,10000); logE(p, 'ما بقى عقار للمزاد — أخذ تعويض', 10000); stage(`<div class="hm-msg">ما بقى عقار للمزاد: ${plus(10000)}</div>`); renderAll(); await sleep(1300); return; }
      const k=rnd(free); logE(p, `وقف على المزاد: ${T[k].name} للكل`, 0, 'info'); return auction(k, Math.round(T[k].price/2/1000)*1000, 'مزاد علني'); }
    if(t.t==='luck') return luck(p);
  }
  // استحواذ: وقفت على عقار غيرك ما فيه بناء وعندك من نفس الدولة (أو مطار)؟ تقدر تاخذه منه بسعر مضاعف
  const takePrice = i => Math.round(T[i].price*DATA.takeMult/1000)*1000;
  function canTake(p, o, i){
    const t=T[i]; if(p.out || o.out || G.owner[i]!==o.id || (G.level[i]||0)>0 || isMort(i)) return false;
    const mine = t.t!=='city' ? owned(p).some(k=>T[k].t===t.t) : owned(p).some(k=>T[k].t==='city' && T[k].g===t.g);
    return mine && p.cash>=takePrice(i);
  }
  async function takeover(p, o, i){
    if(!canTake(p,o,i)) return;
    const t=T[i], price=takePrice(i);
    const yes=await decide(p, { deed:i, title:`تستحوذ على ${esc(t.name)}؟`, text:`تدفع ${money(price)} لـ ${esc(o.name)} وتصير لك. ما يقدر يرفض.`,
      options:[{v:true,label:`استحوذ بـ ${money(price)}`,icon:'flame',cls:'btn-hype big'},{v:false,label:'لا',cls:'big'}], timeout:25000, def:false });
    if(!yes || !canTake(p,o,i)) return;
    p.cash-=price; if(!o.jail) o.cash+=price; G.owner[i]=p.id; p.stats.takes++; play('snatch',{volume:.6});
    toast(`${p.name} استحوذ على ${t.name} من ${o.name} بـ ${money(price)}`, 3800); logE(p, `استحوذ على ${t.name} من ${o.name}`, -price); logE(o, `انسحب منه ${t.name} بالقوة`, price);
    if(t.t==='city' && groupFull(p,t.g)){ toast(`${p.name} كمّل ${t.country} — يقدر يبني فيها`, 3600); play('levelup',{volume:.6}); }
    renderAll(); await sleep(900);
  }
  // السجن: تروح له بدون ما تمر على البداية، وتحاول تطلع بدبل أو تدفع الكفالة
  const jailAt = () => T.findIndex(t=>t.t==='jail');
  async function goJail(p, why){
    const j=jailAt(); if(j<0 || p.out) return;
    p.pos=j; p.jail=DATA.jailTries; p.stats.jailed++; G.focus=j;
    play('fail',{volume:.6}); logE(p, why, 0, 'bad');
    stage(`<div class="hm-msg bad">${ic('hm-siren')} ${esc(why)}</div>`);
    renderAll(); await sleep(1700); G.focus=null; renderBoard();
  }
  // دور اللاعب وهو بالسجن. يرجّع true لو طلع ويكمل دوره عادي (دفع الكفالة)
  async function jailTurn(p){
    const last=p.jail===1, can=p.cash>=DATA.bail;
    stage(`<div class="hm-msg bad">${ic('hm-jail')} ${esc(p.name)} بالسجن — ${last?'آخر محاولة':`باقي ${p.jail} محاولات`}</div>`);
    const opts=[{v:'roll',label:'جرّب دبل',icon:'dice',cls:'btn-hype big'}];
    if(can) opts.push({v:'pay',label:`ادفع الكفالة ${money(DATA.bail)}`,icon:'hm-cash',cls:'big'});
    const v=await decide(p, { title:'انت بالسجن', text:`دبل يطلّعك ببلاش. ${last?'هذي آخر محاولة: لو ما طلع دبل تدفع الكفالة غصب وتمشي.':'لو ما طلع دبل تقعد دور ثاني.'} الكفالة تروح للصندوق.`, options:opts, timeout:90000, def:'roll' });
    if(!G || G.over) return false;
    if(v==='pay'){ const fp=await fine(p,DATA.bail,'كفالة السجن'); p.jail=0; logE(p, 'دفع الكفالة وطلع من السجن', -fp); renderAll(); return !p.out; }
    const [a,b]=await rollDice(true); G.lastRoll=a+b;
    stage(`<div class="hm-msg">${diceHTML(a,b)} <b class="hm-num">${a+b}</b>${a===b?'<span class="hm-tag">دبل — طلعت!</span>':''}</div>`);
    await sleep(700);
    if(a!==b){ p.jail--;
      if(p.jail>0){ logE(p, `ما طلع دبل (${a} و ${b}) — قعد بالسجن`, 0, 'bad'); play('wrong',{volume:.5}); renderAll(); await sleep(1100); return false; }
      const fp=await fine(p,DATA.bail,'كفالة السجن'); logE(p, 'خلصت محاولاته — دفع الكفالة غصب وطلع', -fp); renderAll(); if(p.out) return false; }
    else { p.jail=0; play('bonus',{volume:.6}); logE(p, `طلع دبل (${a} و ${b}) وطلع من السجن ببلاش`, 0, 'good'); }
    await moveTo(p, a+b); if(!G || G.over) return false;
    await land(p); renderAll(); await sleep(500);
    return false;
  }
  async function jet(p){
    const dest=T.map((x,k)=>k).filter(k=>k!==p.pos && ['start','air','stocks'].includes(T[k].t));
    const k=await decide(p, { title:'رحلة مجانية — وين تطير؟', text:'تنزل على الخانة وتسوي اللي فيها. البداية تعطيك راتبك.', cancel:'ما أبي أطير',
      options:dest.map(d=>({v:d,label:T[d].name,icon:T[d].t==='air'?'hm-plane':DATA.icons[T[d].t]||'',cls:''})), timeout:30000 });
    if(k==null) return;
    play('game:g_swoosh',{volume:.6}); logE(p, `طار لـ ${T[k].name}`, 0, 'info'); p.pos=k; if(k===0) passStart(p); renderAll(); await sleep(600);
    return land(p);
  }
  async function stocks(p){
    const amts=[10000,30000,50000].filter(v=>v<=p.cash);
    if(!amts.length){ stage('<div class="hm-msg">سوق الأسهم: ما معك تستثمر</div>'); await sleep(1200); return; }
    const a=await decide(p, { title:'سوق الأسهم — كم تستثمر؟', text:'ترمي نرد: 1 أو 2 تخسرها · 3 أو 4 ترجع لك · 5 تتضاعف · 6 ثلاث أضعاف', cancel:'ما أبي', options:amts.map(v=>({v,label:money(v),icon:'hm-trending-up',cls:''})), timeout:30000 });
    if(!a) return;
    p.cash-=a; renderSide();
    const [d]=await rollDice(false), back = d<=2?0 : d<=4?a : d===5?a*2 : a*3;
    give(p,back); p.stats.stocks+=back-a; logE(p, `استثمر ${money(a)} بالأسهم والنرد طلع ${d}`, back-a, back>a?'good':back===a?'info':'bad'); play(back>a?'bonus':back===a?'pop':'fail',{volume:.7});
    stage(`<div class="hm-msg ${back<a?'bad':''}">${diceHTML(d)} ${back===0?`السهم طاح: خسرت ${money(a)}`: back===a?'رجعت فلوسك': `ربحت ${money(back-a)}`}</div>`);
    renderAll(); await sleep(1700);
  }
  async function luck(p){
    if(!G.deck.length) G.deck=shuffle(DATA.luck.slice());
    const c=G.deck.pop(); play('card',{volume:.7});
    stage(`<div class="hm-luck"><small>${ic('hm-clover')} حظك</small><div class="hm-luck-t">${esc(c.text)}</div></div>`);
    await sleep(2000);
    const others=alive().filter(x=>x!==p), c0=p.cash;
    if(c.k==='cash'){ if(c.v>0) give(p,c.v); else await fine(p,-c.v,`بطاقة حظ: ${c.text}`); }
    else if(c.k==='each'){ for(const x of others){ await charge(x,c.v,p,`عيدية لـ ${p.name}`); } }
    else if(c.k==='payeach'){ for(const x of others.filter(x=>!x.jail)){ await charge(p,c.v,x,'عزومة الشباب'); } }
    else if(c.k==='all'){ alive().filter(x=>!x.jail).forEach(x=>give(x,c.v)); }
    else if(c.k==='tostart'){ logE(p, `حظك: «${c.text}»`, 0, 'info'); p.pos=0; passStart(p); }
    else if(c.k==='repair'){ const lv=owned(p).reduce((a,i)=>a+(G.level[i]||0),0); if(lv) await fine(p,lv*c.v,'صيانة المباني'); else toast('ما عندك بناء — سلمت'); }
    else if(c.k==='dice'){ const [d]=await rollDice(false); give(p,d*c.v); stage(`<div class="hm-msg">${diceHTML(d)} <b class="hm-num">${plus(d*c.v)}</b></div>`); await sleep(1300); }
    else if(c.k==='discount'){ p.discount=true; }
    else if(c.k==='rich'){ const r=[...alive()].sort((a,b)=>worth(b)-worth(a))[0]; if(r){ const fp=await fine(r,c.v,'أغنى لاعب يدفع للصندوق'); if(r!==p) logE(r, 'أغنى لاعب — دفع للصندوق', -fp); } }
    else if(c.k==='freeprop'){ const free=T.map((x,k)=>x.t==='city'&&!G.owner[k]?k:-1).filter(k=>k>=0).sort((a,b)=>T[a].price-T[b].price)[0];
      if(free!=null){ G.owner[free]=p.id; toast(`${p.name} ورث ${T[free].name}`, 3200); } else { give(p,10000); toast('كل المدن مملوكة: '+plus(10000)); } }
    else if(c.k==='jail'){ logE(p, `حظك: «${c.text}»`, 0, 'bad'); await goJail(p, `${p.name} انمسك يفحط — على السجن`); }
    else if(c.k==='airport'){ logE(p, `حظك: «${c.text}»`, 0, 'info'); let k=p.pos; do{ k=(k+1)%N; if(k===0) passStart(p); }while(T[k].t!=='air'); p.pos=k; renderAll(); await sleep(600); await land(p); }
    play(c.v<0?'pay':'coin',{volume:.5});
    if(c.k!=='airport' && c.k!=='tostart' && c.k!=='jail'){ const d=p.cash-c0; logE(p, `حظك: «${c.text}»`, d, d>0?'good':d<0?'bad':'info'); }
    renderAll();
  }

  // ---------- الدور ----------
  async function turn(){
    if(!G || G.over) return;
    const p=cur();
    if(p.out){ return next(); }
    renderAll(); play('turn',{volume:.5});
    if(p.jail){ const free=await jailTurn(p); if(!G || G.over) return; if(!free) return next(); }
    for(let rolls=0; rolls<2; rolls++){
      for(;;){
        stage(`<div class="hm-msg">${rolls?'دبل!':'دور'} <span class="who" style="--c:${p.color}">${esc(p.name)}</span>${rolls?' يرمي مرة ثانية':''}</div>`);
        const opts=[{v:'roll',label:'ارمِ النرد',icon:'dice',cls:'btn-hype big'}];
        if(canBuild(p).length) opts.push({v:'build',label:'ابنِ',icon:'hm-building',cls:'big'});
        if(owned(p).length) opts.push({v:'manage',label:'أملاكي',icon:'hm-briefcase',cls:'big'});
        if(alive().length>1) opts.push({v:'trade',label:'صفقة',icon:'hm-exchange',cls:'big'});
        const v=await decide(p, { title:'وش تسوي؟', options:opts, timeout:90000, def:'roll' });
        if(!G || G.over) return;
        if(v==='build') await buildMenu(p);
        else if(v==='manage') await manageMenu(p);
        else if(v==='trade'){ if(phoneOf(p)){ NET().send(p.id,{ t:'hmbuild' }); toast(`${p.name} يجهّز صفقته من جواله`); } else builder(p); }
        else break;
        if(!G || G.over) return;
      }
      const [a,b]=await rollDice(true); G.lastRoll=a+b;
      logE(p, `رمى النرد: ${a} و ${b} (${a+b})${a===b?' — دبل':''}`, 0, 'roll');
      stage(`<div class="hm-msg">${diceHTML(a,b)} <b class="hm-num">${a+b}</b>${a===b&&!rolls?'<span class="hm-tag">دبل</span>':''}</div>`);
      await sleep(350);
      await moveTo(p, a+b);
      if(!G || G.over) return;
      await land(p);
      if(!G || G.over) return;
      renderAll(); await sleep(500);
      if(a!==b || p.out || p.jail) break;
    }
    next();
  }
  function next(){
    if(!G || G.over) return;
    if(alive().length<=1) return endMatch();
    let n=G.turn;
    do{ n=(n+1)%G.players.length; if(n===0){ G.round++; if(G.timeUp) return endMatch(); } }while(G.players[n].out);
    G.turn=n; const r=$('#hm-round'); if(r) r.textContent='اللفة '+G.round;
    if(G.timeUp){ G.lastRound=true; tick(); }
    turn();
  }

  // ---------- البداية والنهاية ----------
  function startMatch(){
    // المتصلين بجوالاتهم أول، وبعدهم اللي على الشاشة — أول ستة يلعبون
    const n0=NET(), all=D.competitors(), live=n0 ? all.filter(c=>n0.hasPhone(c.id)) : [];
    const comps=live.concat(all.filter(c=>!live.includes(c))).slice(0,6);
    if(comps.length<2){ toast('نحتاج لاعبين اثنين على الأقل'); go('lobby'); return; }
    $('#overlay-root').innerHTML='';
    MAP = DATA.maps.find(m=>m.id===S.map) || DATA.maps[0]; T = buildTiles(MAP);
    G={ players:shuffle(comps.map(c=>({ id:c.id, name:c.name, color:c.color, avatar:c.avatar||((c.players||[])[0]||{}).avatar||'', players:c.players||[], cash:S.startCash, pos:0, out:false, discount:false,
          jail:0, stats:{ rentIn:0, rentOut:0, bought:0, auctions:0, trades:0, built:0, pot:0, stocks:0, takes:0, jailed:0 } }))),
        turn:0, round:1, owner:{}, level:{}, mort:{}, debt:null, deck:[], feed:[], trades:[], trSeq:0, sent:new Set(), stageHtml:'', pot:20000, lastRoll:7, open:!S.minutes, endAt:S.minutes ? Date.now()+S.minutes*60000 : 0, t0:Date.now(), timeUp:false, lastRound:false, over:false, focus:null };
    G.players.forEach((p,k)=>{ p.cash+=k*(DATA.seatBonus||0); });      // اللي يلعب متأخر ياخذ زيادة بسيطة تعوّضه
    const n=NET(); if(n) n.use({ teams:()=>G.players, state:hmState, onPhones:()=>renderSide(), roster:()=>{}, trade:(id,d)=>onPhoneTrade(id,d), hmDeed:i=>T[i]&&T[i].price?deed(i):'' });
    go('hawamir'); $('#hm-round').textContent='اللفة 1'; $('#hm-ask').innerHTML='';
    const bd=$('#hm-board'); if(bd) bd.style.setProperty('--felt', MAP.felt);
    const mn=$('#hm-mapname'); if(mn) mn.textContent=MAP.name;
    buildBoard(); renderLog(); renderTrades();
    clearInterval(clock); clock=setInterval(tick,1000); tick();
    play('game:g_mkcount',{volume:.5,max:2500});
    turn();
  }
  function stopAllGame(){ clearInterval(clock); clock=null; if(G){ G.over=true; if(G.endAuction) G.endAuction(); if(G.finishAsk) G.finishAsk(null); } stopAll(); }
  function endMatch(){
    if(!G || G.over) return; stopAllGame();
    const rank=[...G.players].sort((a,b)=>(a.out-b.out) || worth(b)-worth(a)), w=rank[0];
    G.final=rank.map(p=>p.id);
    go('results'); play('win'); setTimeout(()=>play('applause',{volume:.6}),1200); confetti(400,6000);
    $('#winner-title').innerHTML=`<span class="who" style="--c:${w.color}">${esc(w.name)}</span> هامور الجلسة`;
    const pod=$('#podium'); pod.innerHTML='';
    rank.forEach((p,i)=>{ const d=document.createElement('div'); d.className='p '+(i===0?'first':i===1?'second':'third'); d.style.setProperty('--c',p.color); d.style.animationDelay=(i*.2)+'s';
      d.innerHTML=`${i===0?ic('crown','crown'):''}<div class="rank">${i+1}</div><div class="pn">${esc(p.name)}</div><div class="muted small">${p.out?'أفلس':`${owned(p).length} عقار`}</div><div class="ps">${money(worth(p))}</div>`; pod.appendChild(d); });
    $('#btn-again').onclick=()=>startMatch();
    const el=$('#match-stats');
    if(el) el.innerHTML=`<div class="panel mt"><h3>أرقام المباراة</h3><div class="hm-rtable"><div class="hm-rrow hm-rth"><span>اللاعب</span><span>الثروة</span><span>كاش</span><span>عقارات</span><span>إيجار دخل</span><span>إيجار دفع</span><span>صفقات</span></div>
      ${rank.map(p=>`<div class="hm-rrow"><span style="color:${p.color}"><b>${esc(p.name)}</b></span><span>${money(worth(p))}</span><span>${money(p.cash)}</span><span>${owned(p).length}</span><span>${money(p.stats.rentIn)}</span><span>${money(p.stats.rentOut)}</span><span>${p.stats.trades}</span></div>`).join('')}</div></div>`;
    try{ const DS=window.DahoomStats; if(DS && DS.autoShow) DS.autoShow(()=>({ items:awards(rank), pool:G.players.map(p=>p.name) })); }catch(e){ console.error(e); }
    try{ const L=window.DahoomLog; if(L && L.match) L.match({ game:'hawamir', rounds:G.round, mins:Math.round((Date.now()-G.t0)/60000), mode:D.session.mode, opts:{ map:MAP.id, minutes:S.minutes, start:S.startCash },
      teams:rank.map((p,i)=>({ id:p.id, name:p.name, score:worth(p), rank:i+1, win:i===0, players:(p.players||[]).map(x=>({name:x.name, av:x.avatar||''})), st:{ cash:p.cash, props:owned(p).length, rentIn:p.stats.rentIn, rentOut:p.stats.rentOut, trades:p.stats.trades } })), items:[] }); }catch(e){ console.error(e); }
    pushAll();
  }
  function awards(rank){
    const out=[], av=p=>p.avatar?[D.avatarSrc(p.avatar)]:[];
    const top=(key,min)=>{ const p=[...G.players].sort((a,b)=>b.stats[key]-a.stats[key])[0]; return p && p.stats[key]>=min ? p : null; };
    const add=(p,title,desc,icon,value)=>{ if(p) out.push({ title, desc, icon, name:p.name, color:p.color, value, avatars:av(p) }); };
    let p=top('rentOut',20000); add(p,'محفظته مخرومة','أكثر واحد دفع إيجارات','coins',p&&money(p.stats.rentOut));
    p=top('auctions',2); add(p,'ملك المزادات','أكثر واحد فاز بمزادات','trophy',p&&`${p.stats.auctions} مزاد`);
    p=top('trades',2); add(p,'السمسار','أكثر واحد سوّى صفقات','team',p&&`${p.stats.trades} صفقة`);
    p=top('takes',2); add(p,'المستحوذ','أكثر واحد استحوذ على عقارات غيره','flame',p&&`${p.stats.takes} استحواذ`);
    p=top('built',3); add(p,'المقاول','أكثر واحد بنى','up',p&&`${p.stats.built} مستوى بناء`);
    p=top('stocks',20000); add(p,'ذيب الأسهم','أكثر واحد ربح من سوق الأسهم','sparkles',p&&money(p.stats.stocks));
    p=top('jailed',2); add(p,'خريج سجون','أكثر واحد دخل السجن','padlock',p&&`${p.stats.jailed} مرات`);
    p=top('rentIn',20000); add(p,'جامع الإيجارات','أكثر واحد دخّل إيجارات','up',p&&money(p.stats.rentIn));
    add(rank[0],'هامور الجلسة','أغنى لاعب بنهاية المباراة','crown',money(worth(rank[0])));
    return out;
  }

  // نهاية المباراة لكل لاعب: التتويجات + جدول الثروات + ممتلكات كل واحد
  function finalAll(me){
    const rank=G.final.map(id=>byId(id)).filter(Boolean);
    const aw=awards(rank).map(a=>{ const p=G.players.find(x=>x.name===a.name); return { title:a.title, desc:a.desc, icon:a.icon, who:a.name, team:'', color:a.color, value:a.value, av:p?p.avatar:'', mine:p===me }; });
    return { awards:aw,
      tables:[{ title:'أرقام المباراة', icon:'podium', head:['#','اللاعب','الثروة','كاش','عقارات','إيجار دخل','إيجار دفع','صفقات'],
        rows:rank.map((p,i)=>({ rank:i+1, name:p.name+(p.out?' (أفلس)':''), color:p.color, me:p===me, cells:[money(worth(p)), money(p.cash), owned(p).length, money(p.stats.rentIn), money(p.stats.rentOut), p.stats.trades] })) }],
      lists:[{ title:'ممتلكات كل لاعب', icon:'hm-home', items:rank.filter(p=>owned(p).length).map(p=>({ b:p.name, c:p.color, s:owned(p).map(i=>T[i].name+(G.level[i]?` (${LV[G.level[i]-1].name})`:'')).join('، ') })) }] };
  }

  // ---------- حالة الجوال ----------
  // الجزء الثابت (الخانات والصكوك) ينرسل مرة وحدة لكل جهاز
  function hmStatic(){
    return { map:MAP.id, name:MAP.name, felt:MAP.felt, levels:LV, salary:S.salary,
      tiles:T.map((t,i)=>({ t:t.t, n:t.name.replace(/^(مطار|شركة) /,'').replace(/ الدولي$/,''), full:t.name, k:t.price?kindOf(t):'', c:t.color||'', fl:t.price?tileFlag(t):'', p:t.price||0, ic:t.price?'':(DATA.icons[t.t]||''), deed:t.price?deed(i):'' })) };
  }
  function hmBoard(p, cid){
    const fresh = cid && !G.sent.has(cid); if(cid) G.sent.add(cid);
    return { st: fresh ? hmStatic() : null, key:MAP.id, me:p.id,
      own:T.map((_,i)=>G.owner[i]||null), lv:T.map((_,i)=>G.level[i]||0), val:T.map((_,i)=>T[i].price?tileVal(i):0), mort:T.map((_,i)=>G.mort[i]?unmortCost(i):0), debt:G.debt?{ id:G.debt.id, n:G.debt.n }:null, sub:T.map((_,i)=>tileSub(i)), focus:G.focus,
      pl:G.players.map(x=>({ id:x.id, name:x.name, color:x.color, av:x.avatar||'', pos:x.pos, cash:x.cash, worth:worth(x), out:x.out, jail:x.jail||0, props:owned(x).length, turn:!G.over && x===cur(), phone:phoneOf(x) })),
      pot:G.pot, round:G.round, endsIn:G.open ? 0 : Math.max(0,G.endAt-Date.now()), open:!!G.open, up:Date.now()-G.t0, lastRound:!!G.lastRound, timeUp:!!G.timeUp, stage:G.stageHtml||'',
      canBuild: !G.over && cur()===p ? canBuild(p).length : 0,
      trades: G.trades.filter(t=>t.st==='pending' || Date.now()-(t.done||0)<120000).slice(-20).map(t=>({ id:t.id, from:t.from, to:t.to, give:t.give, get:t.get, st:t.st, ts:t.ts, counter:t.counter })) };
  }
  function hmState(id, cid){
    if(!G) return { waiting:true };
    const p=byId(id); if(!p) return { waiting:true };
    const rank=[...G.players].sort((a,b)=>worth(b)-worth(a));
    const st={ game:'hawamir', team:{ id:p.id, name:p.name, color:p.color, score:money(p.cash) }, myTurn: !G.over && cur()===p,
      phase: G.over ? '' : p.out ? 'أفلست — تابع من الشاشة' : cur()===p ? 'دورك — القرارات تجيك هنا' : `دور ${cur().name}`,
      fx: owned(p).map(i=>({ n:T[i].name+(G.level[i]?` · ${LV[G.level[i]-1].name}`:''), bad:false })),
      scores: rank.map(x=>({ id:x.id, name:x.name, color:x.color, score:money(worth(x)), turn:!G.over && x===cur() })), hm: hmBoard(p, cid) };
    if(G.over && G.final){ const r=G.final.indexOf(p.id)+1; st.final={ rank:r, of:G.players.length, mid:G.t0, awards:[], all:finalAll(p), stats:{ jailed:p.stats.jailed|0, built:p.stats.built|0, trades:p.stats.trades|0, bought:p.stats.bought|0 }, rows:[['الثروة',money(worth(p))],['الكاش',money(p.cash)],['العقارات',String(owned(p).length)],['إيجار دخل',money(p.stats.rentIn)],['إيجار دفعته',money(p.stats.rentOut)]] }; }
    return st;
  }

  // ---------- الإعدادات والربط ----------
  function renderSettings(){
    $$('#hawamir-form [data-k]').forEach(el=>{ el.value=S[el.dataset.k]; el.onchange=()=>{ S[el.dataset.k]=Number(el.value); store.set('hawamir_settings2',S); }; });
    const mp=$('#hawamir-maps');
    if(mp){ mp.innerHTML=DATA.maps.map(m=>`<button type="button" class="hm-map ${m.id===S.map?'on':''}" data-map="${m.id}" style="--felt:${m.felt}">
        <span class="hm-map-top"><b>${esc(m.name)}</b><small>${esc(m.desc)}</small></span>
        <span class="hm-map-gs">${m.groups.map((g,k)=>`<span class="hm-map-g" style="--g:${DATA.colors[k]}">${flagOf(g.flag,g.name,DATA.colors[k])}<em>${esc(g.name)}</em></span>`).join('')}</span></button>`).join('');
      $$('[data-map]',mp).forEach(b=>b.onclick=()=>{ S.map=b.dataset.map; store.set('hawamir_settings2',S); play('pop'); renderSettings(); }); }
    const comps=D.competitors();
    $('#hawamir-preview').innerHTML = comps.length<2 ? '<span class="fx-tag bad">تحتاج لاعبين اثنين على الأقل</span>' :
      comps.slice(0,6).map(c=>`<span class="kh-teamtag" style="--c:${c.color}">${esc(c.name)}</span>`).join('') + (comps.length>6?'<p class="muted small">أقصى عدد 6 — أول ستة بس يلعبون.</p>':'');
  }
  function helpModal(){
    modal(`<h3>قوانين هوامير</h3><div class="help-list mt-s">
      <p><b>الهدف:</b> ${S.minutes ? `تكون أغنى لاعب لما يخلص الوقت (${S.minutes} دقيقة).` : 'بدون وقت: اللعب يكمل لين يبقى لاعب واحد ما أفلس، أو المضيف ينهيها من «إنهاء» وتنحسب الثروات.'} الثروة = الكاش + سعر عقاراتك + اللي بنيته.</p>
      <p><b>الدور:</b> ترمي النرد وتمشي. كل ما تمر على البداية تاخذ ${money(S.salary)}. لو طلع لك دبل ترمي مرة ثانية.</p>
      <p><b>مدينة بدون مالك:</b> تشتريها بسعرها، أو تروح للمزاد والكل يزايد (يبدأ من نص السعر).</p>
      <p><b>مدينة لها مالك:</b> تدفع له الإيجار. لو يملك الدولة كاملة الإيجار دبل.</p>
      <p><b>الاستحواذ:</b> لو وقفت على عقار غيرك ما فيه بناء، وعندك مدينة من نفس الدولة (أو مطار لو كان مطار، أو شركة لو كانت شركة)، تقدر تاخذه منه بضعف سعره وما يقدر يرفض. البناء يحمي عقارك من الاستحواذ.</p>
      <p><b>البناء:</b> لازم تملك كل مدن الدولة. بعدها تبني بيت ثم عمارة ثم فندق ثم برج، وكل مستوى يرفع الإيجار. تبني قبل ما ترمي النرد.</p>
      <p><b>الشركات:</b> شركتين تنشترى. إيجارها مجموع رمية اللي وقف عليها × ${money(DATA.coRent[0])}، ولو ملكت الثنتين × ${money(DATA.coRent[1])}.</p>
      <p><b>المطارات:</b> إيجارها يزيد كل ما ملكت مطار ثاني: ${DATA.airRent.map(money).join(' ثم ')}.</p>
      <p><b>الصفقات:</b> بأي وقت ترسل عرض للاعب: تحط اللي تعطيه (عقارات أو كاش أو الاثنين) واللي تبيه منه — حتى لو كاش بس. العرض يبقى معلّق ويشوفه الكل، وهو يوافق أو يرفض أو يرد بعرض ثاني. العقار المبني ينتقل بمبانيه، والمرهون ينتقل برهنه.</p>
      <p><b>الصندوق:</b> كل المخالفات والغرامات تتجمع فيه، واللي يوقف على خانة الصندوق ياخذه كله.</p>
      <p><b>السجن:</b> لو وقفت على الدورية (أو طلعت لك بطاقة حظ) تروح السجن على طول وما تاخذ راتب البداية. بدورك تجرّب تطلع دبل وتطلع ببلاش، أو تدفع كفالة ${money(DATA.bail)} للصندوق. عندك ${DATA.jailTries} محاولات، وبعدها تدفع الكفالة غصب. لو وقفت على السجن بالنرد عادي فأنت زائر بس. وانت بالسجن إيجاراتك تمشي عادي.</p>
      <p><b>الخانات الخاصة:</b> حظك (بطاقة عشوائية)، ساهر (مخالفة)، الدورية (توديك السجن)، رحلة مجانية (تطير لمطار أو للبداية أو سوق الأسهم)، سوق الأسهم (تستثمر وترمي نرد).</p>
      <p><b>ما معك تدفع؟</b> ما ينباع شي لحاله. اللعب يوقف وأنت تدبّر الفلوس: تهدم مبنى (يرجع لك نص تكلفته)، أو ترهن عقار، أو تبيعه للبنك بـ 60٪ من قيمته (المرهون ينخصم رهنه)، أو تسوي صفقة مع لاعب. لو ما قدرت تعلن إفلاسك وأملاكك ترجع للبنك.</p>
      <p><b>الرهن:</b> ترهن عقارك (مع مبانيه) للبنك وتاخذ نص قيمته، وتبقى مالكه. وهو مرهون ما يجيب إيجار وما تبني ولا تهدم فيه. تقدر تبيعه أو تعطيه بصفقة وينتقل الرهن معه. تفكه متى ما بغيت بالمبلغ + ${Math.round(MORT_INT*100)}٪ فايدة. كل هذا من زر «أملاكي» بدورك.</p>
      <p><b>بالسجن:</b> ما تستلم فلوس لين تطلع: لا إيجار ولا توزيعات ولا كاش من صفقات.</p>
      <p><b>النهاية:</b> لما يخلص الوقت نكمل اللفة عشان الكل ياخذ نفس عدد الأدوار.</p></div>
      <div class="row center mt"><button class="btn" data-x>تمام</button></div>`,{onMount(m){ m.querySelector('[data-x]').onclick=()=>m.remove(); }});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const st=$('#btn-hawamir-start'); if(st) st.onclick=()=>startMatch();
    const q=$('#hm-quit'); if(q) q.onclick=async ()=>{ if(await confirmBox('<h3>تنهي المباراة؟</h3><p class="muted">تقدر تنهيها وتحسب الثروات الحين، أو تكمل اللعب.</p>','احسب الثروات','كمّل','btn-hype')){ endMatch(); } };
    const h=$('#hm-help'); if(h) h.onclick=helpModal;
    new MutationObserver(()=>{ if($('#hawamir-settings').classList.contains('active')) renderSettings(); }).observe($('#hawamir-settings'),{attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',()=>{ if(G && !G.over) placeTokens(); });
  });
  window.DAHOOM_DEBUG_HM = { state:()=>G, settings:()=>S, tiles:()=>T, worth:p=>worth(p), end:()=>endMatch(), charge:(i,n)=>charge(G.players[i],n,null,'اختبار'), rent:i=>rentOf(i), render:()=>renderAll(),
    owned:p=>owned(p), jail:i=>{ const p=G.players[i]; p.pos=jailAt(); p.jail=DATA.jailTries; renderAll(); }, canBuild:p=>canBuild(p), upCost:i=>upCost(i), groupFull:(p,g)=>groupFull(p,g) };
  return { start:startMatch };
})();
