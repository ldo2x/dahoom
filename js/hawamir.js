/* ===== لعبة هوامير — عقار وتجارة =====
   الشاشة = اللوحة. كل لاعب يقرر من الشاشة أو من جواله (نفس نافذة "مطلوب منكم" حقت باقي الألعاب).
   المباراة بالوقت: لما يخلص الوقت نكمل اللفة، وأغنى لاعب (كاش + عقار + بناء) يفوز.
*/
window.DahoomHawamir = (function(){
  const D = window.Dahoom, DATA = window.DAHOOM_DATA.hawamir;
  const { $, $$, rnd, shuffle, sleep, esc, ic, store, play, stopAll, go, toast, modal, confirmBox, confetti } = D;
  const NET = () => window.DahoomNet;
  const T = DATA.tiles, N = T.length, CITY = DATA.cities;
  const DEFAULTS = { minutes:45, startCash:1500, salary:200 };
  let S = Object.assign({}, DEFAULTS, store.get('hawamir_settings', {}));
  let G = null, clock = null;
  const UP = [3, 6, 10];                       // مضاعف الإيجار لكل مستوى بناء
  const money = n => Math.round(n).toLocaleString('en-US');
  const strip = s => String(s||'').replace(/<[^>]+>/g,'');
  const phoneOf = p => { const n=NET(); return !!(n && n.hasPhone && n.hasPhone(p.id)); };
  const pushAll = () => { const n=NET(); if(n) n.pushAll(); };
  const cur = () => G.players[G.turn];
  const alive = () => G.players.filter(p=>!p.out);
  const byId = id => G.players.find(p=>p.id===id);

  // ---------- حسابات ----------
  const ownerOf = i => G.owner[i] ? byId(G.owner[i]) : null;
  const owned = p => T.map((_,i)=>i).filter(i=>G.owner[i]===p.id);
  const cityTiles = c => T.map((t,i)=>t.city===c?i:-1).filter(i=>i>=0);
  const cityFull = (p, c) => cityTiles(c).every(i=>G.owner[i]===p.id);
  const upCost = i => Math.round(T[i].price*0.5);
  function rentOf(i){
    const t=T[i], o=ownerOf(i); if(!o) return 0;
    if(t.t==='air'){ const n=owned(o).filter(k=>T[k].t==='air').length; return DATA.airRent[n-1]; }
    const base=Math.round(t.price*0.2), lv=G.level[i]||0;
    return lv ? base*UP[lv-1] : cityFull(o,t.city) ? base*2 : base;
  }
  const worth = p => p.cash + owned(p).reduce((a,i)=>a+T[i].price+(G.level[i]||0)*upCost(i),0);
  const canBuild = p => owned(p).filter(i=>T[i].t==='prop' && cityFull(p,T[i].city) && (G.level[i]||0)<3 && p.cash>=upCost(i));

  // ---------- الرسم ----------
  const cell = i => i<10 ? [1,i+1] : i<14 ? [i-8,10] : i<24 ? [6,10-(i-14)] : [5-(i-24),1];   // [صف, عمود]
  const tok = p => p.avatar ? `<img class="hm-tok" style="--c:${p.color}" src="${D.avatarSrc(p.avatar)}" alt="${esc(p.name)}">` : `<span class="hm-tok" style="--c:${p.color}">${esc(p.name[0]||'')}</span>`;
  const TICON = { start:'star', luck:'sparkles', saher:'eye', stocks:'up', auction:'coins', air:'next' };
  function renderBoard(){
    const b=$('#hm-tiles'); if(!b||!G) return;
    b.innerHTML=T.map((t,i)=>{
      const [r,c]=cell(i), o=ownerOf(i), lv=G.level[i]||0, col=t.city?CITY[t.city].color: t.t==='air'?'#90A4AE':'';
      const here=G.players.filter(p=>!p.out && p.pos===i).map(tok).join('');
      const info = t.price ? (o ? `<span class="hm-rent">إيجار ${money(rentOf(i))}</span>` : `<span class="hm-price">${money(t.price)}</span>`) : '';
      return `<div class="hm-tile ${t.t} ${o?'owned':''} ${G.focus===i?'focus':''}" style="grid-row:${r};grid-column:${c};${col?`--city:${col};`:''}${o?`--own:${o.color};`:''}" data-i="${i}">
        ${t.price?'<i class="hm-band"></i>':`<span class="hm-ticon">${ic(TICON[t.t]||'star')}</span>`}
        <span class="hm-name">${esc(t.name)}</span>${info}
        ${lv?`<span class="hm-lv">${'<i></i>'.repeat(lv)}</span>`:''}
        <span class="hm-toks">${here}</span></div>`;
    }).join('');
  }
  function renderSide(){
    const el=$('#hm-players'); if(!el||!G) return;
    const rank=[...G.players].sort((a,b)=>worth(b)-worth(a));
    el.innerHTML=rank.map((p,k)=>{
      const pr=owned(p);
      return `<div class="hm-pl ${p===cur()&&!G.over?'turn':''} ${p.out?'out':''}" style="--c:${p.color}">
        <span class="hm-rk">${k+1}</span>${tok(p)}
        <span class="hm-pn"><b>${esc(p.name)}</b>${phoneOf(p)?ic('phone','tphone'):''}<small>${p.out?'أفلس':`كاش ${money(p.cash)}`}</small></span>
        <span class="hm-pw"><b>${money(worth(p))}</b><small>الثروة</small></span>
        <span class="hm-dots">${pr.map(i=>`<i style="--city:${T[i].city?CITY[T[i].city].color:'#90A4AE'}" title="${esc(T[i].name)}"></i>`).join('')}</span></div>`;
    }).join('');
  }
  function renderAll(){ renderBoard(); renderSide(); pushAll(); }
  const stage = html => { const s=$('#hm-stage'); if(s) s.innerHTML=html; };
  const diceHTML = (a,b) => `<span class="hm-dice"><b>${a}</b>${b!=null?`<b>${b}</b>`:''}</span>`;
  function tick(){
    const el=$('#hm-clock'); if(!el||!G) return;
    const left=Math.max(0, G.endAt-Date.now()), m=Math.floor(left/60000), s=Math.floor(left%60000/1000);
    el.textContent = G.lastRound ? 'اللفة الأخيرة' : `${m}:${String(s).padStart(2,'0')}`;
    if(left<=0 && !G.timeUp){ G.timeUp=true; toast('خلص الوقت — نكمل هاللفة وبعدها نحسب الثروات', 4000); play('buzzer',{volume:.6}); }
  }

  // ---------- قرار: أزرار وسط اللوحة + نفس السؤال على جوال اللاعب ----------
  function decide(p, spec){
    return new Promise(res=>{
      let done=false, rid=null, tm=null;
      const box=$('#hm-ask');
      const finish=v=>{ if(done) return; done=true; clearTimeout(tm); if(rid){ const n=NET(); if(n) n.cancel(rid); } if(box) box.innerHTML=''; res(v); };
      G.finishAsk=finish;
      if(G.over){ return finish(null); }
      box.innerHTML=`<div class="hm-q" style="--c:${p.color}"><div class="eyebrow">${tok(p)} ${esc(p.name)}${phoneOf(p)?` · ${ic('phone')} يقدر يجاوب من جواله`:''}</div><h3>${spec.title}</h3>${spec.text?`<p class="muted">${spec.text}</p>`:''}
        <div class="row center">${spec.options.map((o,i)=>`<button class="btn ${o.cls||'btn-hype'} ${spec.big?'big':''}" data-o="${i}">${esc(o.label)}</button>`).join('')}</div>
        ${spec.cancel?`<div class="row center mt-s"><button class="btn ghost small" data-o="-1">${esc(spec.cancel)}</button></div>`:''}</div>`;
      $$('[data-o]',box).forEach(b=>b.onclick=()=>{ const i=+b.dataset.o; finish(i<0?null:spec.options[i].v); });
      if(phoneOf(p)) rid=NET().ask(p.id, { title:strip(spec.title), text:strip(spec.text), cancel:spec.cancel||null, options:spec.options.map(o=>({label:o.label, cls:o.cls||'', color:null})) },
        i=>finish(i==null||i<0?null:spec.options[i].v));
      if(spec.timeout) tm=setTimeout(()=>finish(spec.def===undefined?null:spec.def), spec.timeout);
    });
  }
  const ok = (p, title, text) => decide(p, { title, text, options:[{v:true,label:'تمام'}], timeout:9000, def:true });

  // ---------- الفلوس ----------
  function give(p, n){ p.cash+=n; }
  // خصم مبلغ: لو الكاش ما يكفي ينباع البناء وبعده العقار للبنك بنص السعر، ولو ما كفى يفلس
  async function charge(p, n, to, why){
    if(n<=0 || p.out) return 0;
    const sold=[];
    while(p.cash<n){
      const built=owned(p).filter(i=>G.level[i]>0).sort((a,b)=>upCost(a)-upCost(b))[0];
      if(built!=null){ G.level[built]--; p.cash+=Math.round(upCost(built)/2); sold.push('بناء '+T[built].name); continue; }
      const pr=owned(p).sort((a,b)=>T[a].price-T[b].price)[0];
      if(pr!=null){ delete G.owner[pr]; delete G.level[pr]; p.cash+=Math.round(T[pr].price/2); sold.push(T[pr].name); continue; }
      break;
    }
    const paid=Math.min(n, Math.max(0,p.cash)); p.cash-=paid; if(to) to.cash+=paid;
    if(sold.length) toast(`${p.name} باع للبنك بنص السعر: ${sold.join('، ')}`, 4200);
    if(paid<n){ p.out=true; p.cash=0; play('fail',{volume:.7}); G.log.push(`${p.name} أفلس`); renderAll(); await ok(p, `${esc(p.name)} أفلس وطلع من اللعبة`, why||''); }
    return paid;
  }

  // ---------- المزاد ----------
  function auction(i, startPrice, title){
    return new Promise(res=>{
      const t=T[i]; let price=startPrice, high=null, left=12, done=false; const outs=new Set(); let rids=[];
      if(G.over) return res(null);
      const box=$('#hm-ask'); G.focus=i; renderBoard();
      const active = () => alive().filter(p=>!outs.has(p.id));
      const clearAsks = () => { const n=NET(); if(n) rids.forEach(r=>n.cancel(r)); rids=[]; };
      const end = () => { if(done) return; done=true; clearInterval(tm); clearAsks(); box.innerHTML=''; G.focus=null; G.endAuction=null;
        if(high){ high.cash-=price; G.owner[i]=high.id; high.stats.auctions++; play('game:g_mariocoin',{volume:.6}); toast(`${high.name} فاز بمزاد ${t.name} بـ ${money(price)}`, 3200); }
        else toast(`ما أحد زايد على ${t.name}`, 2400);
        renderAll(); res(high); };
      G.endAuction=end;
      const bid = (p, inc) => { if(done || p===high || outs.has(p.id)) return; const np = high ? price+inc : Math.max(price, startPrice)+(inc>20?inc-20:0);
        if(p.cash<np){ toast(`${p.name} ما معه ${money(np)}`); return; } price=np; high=p; left=8; play('pop',{volume:.6}); if(active().every(x=>x===high)) return end(); draw(); askPhones(); };
      const quit = p => { if(done || p===high) return; outs.add(p.id); draw(); if(active().length===0 || (high && active().every(x=>x===high))) end(); };
      const askPhones = () => { clearAsks(); const n=NET(); if(!n) return;
        active().filter(p=>p!==high && phoneOf(p)).forEach(p=>{ rids.push(n.ask(p.id, { title:`مزاد: ${t.name}`, text:high?`السعر الحالي ${money(price)} — الأعلى ${high.name}`:`يبدأ من ${money(price)}`,
          options:[{label:high?`زايد +20 (${money(price+20)})`:`ادخل بـ ${money(price)}`,cls:'btn-mint big'},{label:`زايد +100`,cls:'btn-hype big'},{label:'انسحب',cls:'btn-bad'}] },
          v=>{ if(v===0) bid(p,20); else if(v===1) bid(p,100); else quit(p); })); }); };
      const draw = () => { if(done) return;
        box.innerHTML=`<div class="hm-q hm-auc"><div class="eyebrow">${ic('coins')} ${esc(title||'مزاد')}</div><h3>${esc(t.name)} — <b>${money(price)}</b> ريال</h3>
          <p class="muted">${high?`الأعلى: <b style="color:${high.color}">${esc(high.name)}</b>`:'ما أحد زايد للحين'} · باقي <b id="hm-auc-left">${left}</b> ث</p>
          <div class="hm-auc-rows">${alive().map(p=>{ const off=outs.has(p.id), top=p===high;
            return `<div class="hm-auc-row ${off?'off':''} ${top?'top':''}" style="--c:${p.color}">${tok(p)}<b>${esc(p.name)}</b><small>${money(p.cash)}</small>
              ${top?'<span class="fx-tag">الأعلى</span>':off?'<span class="muted small">انسحب</span>':`<button class="btn small btn-mint" data-b="${p.id}:20">${high?'+20':'ادخل'}</button><button class="btn small" data-b="${p.id}:100">+100</button><button class="btn small ghost" data-q="${p.id}">انسحب</button>`}</div>`; }).join('')}</div></div>`;
        $$('[data-b]',box).forEach(b=>b.onclick=()=>{ const [id,inc]=b.dataset.b.split(':'); bid(byId(id), +inc); });
        $$('[data-q]',box).forEach(b=>b.onclick=()=>quit(byId(b.dataset.q))); };
      const tm=setInterval(()=>{ left--; const e=$('#hm-auc-left'); if(e) e.textContent=Math.max(0,left); if(left<=0) end(); }, 1000);
      play('game:g_gong',{volume:.5,max:1800}); draw(); askPhones();
    });
  }

  // ---------- البناء والصفقات (قبل رمي النرد) ----------
  async function buildMenu(p){
    for(;;){
      const list=canBuild(p); if(!list.length){ toast('ما فيه شي تبنيه: لازم تملك المدينة كاملة ومعك كاش'); return; }
      const i=await decide(p, { title:'وش تبني؟', text:'كل مستوى يرفع الإيجار (×3 ثم ×6 ثم ×10)', cancel:'خلاص',
        options:list.map(k=>({ v:k, label:`${T[k].name} · مستوى ${(G.level[k]||0)+1} · ${money(upCost(k))}`, cls:'' })) });
      if(i==null) return;
      p.cash-=upCost(i); G.level[i]=(G.level[i]||0)+1; p.stats.built++; play('game:g_powerup',{volume:.5,max:1200}); renderAll();
    }
  }
  async function tradeMenu(p){
    const others=alive().filter(x=>x!==p);
    const mode=await decide(p, { title:'صفقة', cancel:'تراجع', options:[{v:'buy',label:'أشتري عقار من لاعب'},{v:'sell',label:'أبيع عقار للاعب',cls:''}] });
    if(!mode) return;
    const who=await decide(p, { title: mode==='buy'?'تشتري من مين؟':'تبيع لمين؟', cancel:'تراجع', options:others.map(x=>({v:x.id,label:`${x.name} · ${money(x.cash)}`,cls:''})) });
    if(!who) return; const x=byId(who), seller= mode==='buy'?x:p, buyer= mode==='buy'?p:x;
    const list=owned(seller).filter(i=>!(G.level[i]>0));
    if(!list.length){ toast(`${seller.name} ما عنده عقار ينباع (العقار المبني ما ينباع)`); return; }
    const i=await decide(p, { title:'أي عقار؟', cancel:'تراجع', options:list.map(k=>({v:k,label:`${T[k].name} (${money(T[k].price)})`,cls:''})) });
    if(i==null) return;
    const base=T[i].price, prices=[0.75,1,1.5,2,3].map(m=>Math.round(base*m/10)*10).filter(v=>v<=buyer.cash);
    if(!prices.length){ toast(`${buyer.name} ما معه كاش يكفي`); return; }
    const price=await decide(p, { title:`بكم؟ (${esc(T[i].name)})`, cancel:'تراجع', options:prices.map(v=>({v,label:money(v),cls:''})) });
    if(price==null) return;
    G.focus=i; renderBoard();
    const yes=await decide(x, { title: mode==='buy' ? `${esc(p.name)} يبي يشتري منك "${esc(T[i].name)}" بـ ${money(price)}` : `${esc(p.name)} يعرض عليك "${esc(T[i].name)}" بـ ${money(price)}`,
      options:[{v:true,label:'موافق',cls:'btn-mint big'},{v:false,label:'لا',cls:'btn-bad big'}], timeout:30000, def:false });
    G.focus=null;
    if(yes && buyer.cash>=price && G.owner[i]===seller.id){ buyer.cash-=price; seller.cash+=price; G.owner[i]=buyer.id; p.stats.trades++; x.stats.trades++; play('meme:cash',{volume:.6}); toast(`تمت الصفقة: ${T[i].name} صار لـ ${buyer.name} بـ ${money(price)}`, 3600); G.log.push(`صفقة: ${T[i].name} لـ ${buyer.name} بـ ${money(price)}`); }
    else { play('fx_deny',{volume:.5}); toast(`${x.name} رفض الصفقة`); }
    renderAll();
  }

  // ---------- الحركة والخانات ----------
  async function moveTo(p, steps){
    for(let k=0;k<steps;k++){
      p.pos=(p.pos+1)%N; play('tick',{volume:.35});
      if(p.pos===0){ give(p,S.salary); toast(`${p.name} مر على البداية: +${money(S.salary)}`); play('coin',{volume:.5}); }
      renderBoard(); await sleep(170);
    }
    renderAll();
  }
  async function buyOrAuction(p, i){
    const t=T[i], price=p.discount ? Math.round(t.price/2) : t.price;
    const opts=[]; if(p.cash>=price) opts.push({v:'buy',label:`اشترِ بـ ${money(price)}`,cls:'btn-mint big'}); opts.push({v:'auc',label:'مزاد',cls:'big'});
    G.focus=i; renderBoard();
    const v=await decide(p, { title:`${esc(t.name)}${t.city?` — ${esc(CITY[t.city].name)}`:''}`, text:`السعر ${money(t.price)}${p.discount?` · خصمك: ${money(price)}`:''} · الإيجار ${t.t==='air'?money(DATA.airRent[0]):money(Math.round(t.price*0.2))}`, options:opts, timeout:45000, def:'auc' });
    G.focus=null;
    if(v==='buy'){ p.cash-=price; G.owner[i]=p.id; p.discount=false; p.stats.bought++; play('bonus',{volume:.6}); toast(`${p.name} اشترى ${t.name}`); G.log.push(`${p.name} اشترى ${t.name}`); renderAll(); }
    else await auction(i, Math.round(t.price/2/10)*10, 'مزاد');
  }
  async function land(p){
    const i=p.pos, t=T[i];
    if(t.t==='prop' || t.t==='air'){
      const o=ownerOf(i);
      if(!o) return buyOrAuction(p,i);
      if(o===p){ stage(`<div class="hm-msg">${esc(p.name)} وقف على ملكه: ${esc(t.name)}</div>`); return; }
      const r=rentOf(i); G.focus=i; renderBoard();
      stage(`<div class="hm-msg bad">${esc(p.name)} يدفع إيجار <b>${money(r)}</b> لـ <b style="color:${o.color}">${esc(o.name)}</b> على ${esc(t.name)}</div>`);
      play('wrong',{volume:.5});
      const paid=await charge(p, r, o, `ما قدر يدفع إيجار ${t.name}`); p.stats.rentOut+=paid; o.stats.rentIn+=paid;
      renderAll(); await sleep(1500); G.focus=null; return;
    }
    if(t.t==='saher'){ const f=Math.min(200, Math.max(50, Math.round(p.cash*0.1/10)*10)); stage(`<div class="hm-msg bad">ساهر صادك! مخالفة <b>${money(f)}</b></div>`); play('meme:fbi',{volume:.5,max:1800}); await charge(p,f,null,'ما قدر يدفع المخالفة'); renderAll(); await sleep(1500); return; }
    if(t.t==='stocks') return stocks(p);
    if(t.t==='auction'){ const free=T.map((x,k)=>x.price&&!G.owner[k]?k:-1).filter(k=>k>=0);
      if(!free.length){ give(p,100); stage('<div class="hm-msg">ما بقى عقار للمزاد: +100</div>'); renderAll(); await sleep(1300); return; }
      const k=rnd(free); return auction(k, Math.round(T[k].price/2/10)*10, 'مزاد علني'); }
    if(t.t==='luck') return luck(p);
  }
  async function stocks(p){
    const amts=[100,300,500].filter(v=>v<=p.cash);
    if(!amts.length){ stage('<div class="hm-msg">سوق الأسهم: ما معك تستثمر</div>'); await sleep(1200); return; }
    const a=await decide(p, { title:'سوق الأسهم — كم تستثمر؟', text:'ترمي نرد: 1 أو 2 تخسرها · 3 أو 4 ترجع لك · 5 تتضاعف · 6 ثلاث أضعاف', cancel:'ما أبي', options:amts.map(v=>({v,label:money(v),cls:''})), timeout:30000 });
    if(!a) return;
    p.cash-=a; play('drums',{volume:.5}); stage(`<div class="hm-msg">السوق يتحرك…</div>`); await sleep(900);
    const d=1+Math.floor(Math.random()*6), back = d<=2?0 : d<=4?a : d===5?a*2 : a*3;
    give(p,back); play(back>a?'bonus':back===a?'pop':'fail',{volume:.7});
    stage(`<div class="hm-msg ${back<a?'bad':''}">${diceHTML(d)} ${back===0?`السهم طاح: خسرت ${money(a)}`: back===a?'رجعت فلوسك': `ربحت ${money(back-a)}`}</div>`);
    renderAll(); await sleep(1700);
  }
  async function luck(p){
    if(!G.deck.length) G.deck=shuffle(DATA.luck.slice());
    const c=G.deck.pop(); play('card',{volume:.7});
    stage(`<div class="hm-luck"><div class="eyebrow">${ic('sparkles')} حظك</div><div class="hm-luck-t">${esc(c.text)}</div></div>`);
    await sleep(1800);
    const others=alive().filter(x=>x!==p);
    if(c.k==='cash'){ if(c.v>0) give(p,c.v); else await charge(p,-c.v,null,'ما قدر يدفع'); }
    else if(c.k==='each'){ for(const x of others){ await charge(x,c.v,p); } }
    else if(c.k==='payeach'){ for(const x of others){ await charge(p,c.v,x); } }
    else if(c.k==='tostart'){ p.pos=0; give(p,S.salary); }
    else if(c.k==='repair'){ const lv=owned(p).reduce((a,i)=>a+(G.level[i]||0),0); if(lv) await charge(p,lv*c.v,null,'ما قدر يدفع الصيانة'); }
    else if(c.k==='dice'){ const d=1+Math.floor(Math.random()*6); give(p,d*c.v); stage(`<div class="hm-msg">${diceHTML(d)} +${money(d*c.v)}</div>`); await sleep(1300); }
    else if(c.k==='discount'){ p.discount=true; }
    else if(c.k==='rich'){ const r=[...alive()].sort((a,b)=>worth(b)-worth(a))[0]; if(r) await charge(r,c.v,null,''); }
    else if(c.k==='airport'){ let k=p.pos; do{ k=(k+1)%N; if(k===0) give(p,S.salary); }while(T[k].t!=='air'); p.pos=k; renderAll(); await sleep(500); await land(p); }
    play(c.v<0?'wrong':'coin',{volume:.4}); renderAll();
  }

  // ---------- الدور ----------
  async function turn(){
    if(!G || G.over) return;
    const p=cur();
    if(p.out){ return next(); }
    renderAll();
    for(;;){
      stage(`<div class="hm-msg"><span class="who" style="--c:${p.color}">${esc(p.name)}</span> — دورك</div>`);
      const opts=[{v:'roll',label:'ارمِ النرد',cls:'btn-hype big'}];
      if(canBuild(p).length) opts.push({v:'build',label:'ابنِ',cls:'big'});
      if(alive().length>1) opts.push({v:'trade',label:'صفقة',cls:'big'});
      const v=await decide(p, { title:'وش تسوي؟', options:opts, timeout:90000, def:'roll' });
      if(!G || G.over) return;
      if(v==='build') await buildMenu(p); else if(v==='trade') await tradeMenu(p); else break;
    }
    const a=1+Math.floor(Math.random()*6), b=1+Math.floor(Math.random()*6);
    play('drums',{volume:.4,max:700}); stage(`<div class="hm-msg">${diceHTML('·','·')}</div>`); await sleep(500);
    stage(`<div class="hm-msg">${diceHTML(a,b)} <b>${a+b}</b></div>`); play('pop',{volume:.6});
    await moveTo(p, a+b);
    if(!G || G.over) return;
    await land(p);
    if(!G || G.over) return;
    renderAll(); await sleep(500);
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
    const comps=D.competitors().slice(0,6);
    if(comps.length<2){ toast('نحتاج لاعبين اثنين على الأقل'); go('lobby'); return; }
    $('#overlay-root').innerHTML='';
    G={ players:shuffle(comps.map(c=>({ id:c.id, name:c.name, color:c.color, avatar:c.avatar||((c.players||[])[0]||{}).avatar||'', players:c.players||[], cash:S.startCash, pos:0, out:false, discount:false,
          stats:{ rentIn:0, rentOut:0, bought:0, auctions:0, trades:0, built:0 } }))),
        turn:0, round:1, owner:{}, level:{}, deck:[], log:[], endAt:Date.now()+S.minutes*60000, t0:Date.now(), timeUp:false, lastRound:false, over:false, focus:null };
    const n=NET(); if(n) n.use({ teams:()=>G.players, state:hmState, onPhones:()=>renderSide(), roster:()=>{} });
    go('hawamir'); $('#hm-round').textContent='اللفة 1'; $('#hm-ask').innerHTML='';
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
      d.innerHTML=`${i===0?ic('crown','crown'):''}<div class="rank">${i+1}</div><div class="pn">${esc(p.name)}</div><div class="muted small">${p.out?'أفلس':`${owned(p).length} عقار`}</div><div class="ps">${money(worth(p))} <span class="muted small">ريال</span></div>`; pod.appendChild(d); });
    $('#btn-again').onclick=()=>startMatch();
    const el=$('#match-stats');
    if(el) el.innerHTML=`<div class="panel mt"><h3>أرقام المباراة</h3><div class="hm-table"><div class="hm-tr hm-th"><span>اللاعب</span><span>الثروة</span><span>كاش</span><span>عقارات</span><span>إيجار دخل</span><span>إيجار دفع</span><span>صفقات</span></div>
      ${rank.map(p=>`<div class="hm-tr"><span style="color:${p.color}"><b>${esc(p.name)}</b></span><span>${money(worth(p))}</span><span>${money(p.cash)}</span><span>${owned(p).length}</span><span>${money(p.stats.rentIn)}</span><span>${money(p.stats.rentOut)}</span><span>${p.stats.trades}</span></div>`).join('')}</div></div>`;
    try{ const DS=window.DahoomStats; if(DS && DS.autoShow) DS.autoShow(()=>({ items:awards(rank), pool:G.players.map(p=>p.name) })); }catch(e){ console.error(e); }
    try{ const L=window.DahoomLog; if(L && L.match) L.match({ game:'hawamir', rounds:G.round, mins:Math.round((Date.now()-G.t0)/60000), mode:D.session.mode, opts:{ minutes:S.minutes, start:S.startCash },
      teams:rank.map((p,i)=>({ id:p.id, name:p.name, score:worth(p), rank:i+1, win:i===0, players:(p.players||[]).map(x=>({name:x.name, av:x.avatar||''})), st:{ cash:p.cash, props:owned(p).length, rentIn:p.stats.rentIn, rentOut:p.stats.rentOut, trades:p.stats.trades } })), items:[] }); }catch(e){ console.error(e); }
    pushAll();
  }
  function awards(rank){
    const out=[], av=p=>p.avatar?[D.avatarSrc(p.avatar)]:[];
    const top=(key,min)=>{ const p=[...G.players].sort((a,b)=>b.stats[key]-a.stats[key])[0]; return p && p.stats[key]>=min ? p : null; };
    const add=(p,title,desc,icon,value)=>{ if(p) out.push({ title, desc, icon, name:p.name, color:p.color, value, avatars:av(p) }); };
    let p=top('rentOut',200); add(p,'محفظته مخرومة','أكثر واحد دفع إيجارات','coins',p&&`${money(p.stats.rentOut)} ريال`);
    p=top('auctions',2); add(p,'ملك المزادات','أكثر واحد فاز بمزادات','trophy',p&&`${p.stats.auctions} مزاد`);
    p=top('trades',2); add(p,'السمسار','أكثر واحد سوّى صفقات','team',p&&`${p.stats.trades} صفقة`);
    p=top('rentIn',200); add(p,'جامع الإيجارات','أكثر واحد دخّل إيجارات','up',p&&`${money(p.stats.rentIn)} ريال`);
    add(rank[0],'هامور الجلسة','أغنى لاعب بنهاية المباراة','crown',`${money(worth(rank[0]))} ريال`);
    return out;
  }

  // ---------- حالة الجوال ----------
  function hmState(id){
    if(!G) return { waiting:true };
    const p=byId(id); if(!p) return { waiting:true };
    const rank=[...G.players].sort((a,b)=>worth(b)-worth(a));
    const st={ game:'hawamir', team:{ id:p.id, name:p.name, color:p.color, score:p.cash }, myTurn: !G.over && cur()===p,
      phase: G.over ? '' : p.out ? 'أفلست — تابع من الشاشة' : cur()===p ? 'دورك — القرارات تجيك هنا' : `دور ${cur().name}`,
      fx: owned(p).map(i=>({ n:T[i].name+(G.level[i]?` · مستوى ${G.level[i]}`:''), bad:false })),
      scores: rank.map(x=>({ id:x.id, name:x.name, color:x.color, score:worth(x), turn:!G.over && x===cur() })) };
    if(G.over && G.final){ const r=G.final.indexOf(p.id)+1; st.final={ rank:r, of:G.players.length, awards:[], rows:[['الثروة',money(worth(p))],['الكاش',money(p.cash)],['العقارات',String(owned(p).length)],['إيجار دخل',money(p.stats.rentIn)],['إيجار دفعته',money(p.stats.rentOut)]] }; }
    return st;
  }

  // ---------- الإعدادات والربط ----------
  function renderSettings(){
    $$('#hawamir-form [data-k]').forEach(el=>{ el.value=S[el.dataset.k]; el.onchange=()=>{ S[el.dataset.k]=Number(el.value); store.set('hawamir_settings',S); }; });
    const comps=D.competitors();
    $('#hawamir-preview').innerHTML = comps.length<2 ? '<span class="fx-tag bad">تحتاج لاعبين اثنين على الأقل</span>' :
      comps.slice(0,6).map(c=>`<span class="kh-teamtag" style="--c:${c.color}">${esc(c.name)}</span>`).join('') + (comps.length>6?'<p class="muted small">أقصى عدد 6 — أول ستة بس يلعبون.</p>':'');
  }
  function helpModal(){
    modal(`<h3>قوانين هوامير</h3><div class="help-list mt-s">
      <p><b>الهدف:</b> تكون أغنى لاعب لما يخلص الوقت (${S.minutes} دقيقة). الثروة = الكاش + سعر عقاراتك + اللي بنيته.</p>
      <p><b>الدور:</b> ترمي النرد وتمشي. كل ما تمر على البداية تاخذ ${money(S.salary)}.</p>
      <p><b>عقار بدون مالك:</b> تشتريه بسعره، أو يروح للمزاد والكل يزايد (يبدأ من نص السعر).</p>
      <p><b>عقار له مالك:</b> تدفع له الإيجار. لو يملك المدينة كاملة الإيجار دبل.</p>
      <p><b>البناء:</b> لازم تملك المدينة كاملة. كل مستوى يرفع الإيجار: ×3 ثم ×6 ثم ×10. تبني قبل ما ترمي النرد.</p>
      <p><b>المطارات:</b> إيجارها يزيد كل ما ملكت مطار ثاني: 50 ثم 100 ثم 150 ثم 250.</p>
      <p><b>الصفقات:</b> قبل ما ترمي النرد تقدر تعرض تشتري عقار من لاعب أو تبيع له، وهو يوافق أو يرفض.</p>
      <p><b>الخانات الخاصة:</b> حظك (بطاقة عشوائية)، ساهر (مخالفة)، سوق الأسهم (تستثمر وترمي نرد)، مزاد (عقار عشوائي للكل).</p>
      <p><b>ما معك تدفع؟</b> ينباع بناؤك وبعده عقارك للبنك بنص السعر. لو ما كفى تفلس وتطلع.</p>
      <p><b>النهاية:</b> لما يخلص الوقت نكمل اللفة عشان الكل ياخذ نفس عدد الأدوار.</p></div>
      <div class="row center mt"><button class="btn" data-x>تمام</button></div>`,{onMount(m){ m.querySelector('[data-x]').onclick=()=>m.remove(); }});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const st=$('#btn-hawamir-start'); if(st) st.onclick=()=>startMatch();
    const q=$('#hm-quit'); if(q) q.onclick=async ()=>{ if(await confirmBox('<h3>تنهي المباراة؟</h3><p class="muted">تقدر تنهيها وتحسب الثروات الحين، أو تطلع بدون نتيجة.</p>','احسب الثروات','كمّل','btn-hype')){ endMatch(); } };
    const h=$('#hm-help'); if(h) h.onclick=helpModal;
    new MutationObserver(()=>{ if($('#hawamir-settings').classList.contains('active')) renderSettings(); }).observe($('#hawamir-settings'),{attributes:true,attributeFilter:['class']});
  });
  window.DAHOOM_DEBUG_HM = { state:()=>G, settings:()=>S, worth:p=>worth(p), end:()=>endMatch(), charge:(i,n)=>charge(G.players[i],n,null,'اختبار'), rent:i=>rentOf(i), render:()=>renderAll() };
  return { start:startMatch };
})();
