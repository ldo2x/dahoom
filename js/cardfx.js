/* ===== مؤثرات البطاقات v3 — سموث =====
   كل الحركة على transform/opacity أو على كانفس واحد (requestAnimationFrame).
   ما فيه فلاتر على الصفحة كاملة، ولا blur، ولا mix-blend — هذي اللي كانت تقطّع.
*/
window.DahoomFX = (function(){
  const D = window.Dahoom;
  const { play, confetti, reaction } = D;
  const POWER = { legendary:1, medium:.6, normal:.3, black:.35 };
  const TIER_COL = { legendary:'#FF3B4E', medium:'#FFC23A', normal:'#3BA8FF', black:'#6B6478' };
  const TIER_SND = { legendary:[['game:g_lightsaber',0,.55],['fx_thunder',150,.45]], medium:[['game:g_zelda',0,.5]], normal:[['game:g_swoosh',0,.5]], black:[['fx_trombone',0,.45]] };
  const SND_DELAY = { legendary:650, medium:450, normal:150, black:300 };
  // نص الختم الكبير لكل تأثير
  const LOOK = {
    reverse:'العب غيرها', x2next:'ذيب ×2', jackpot:'JACKPOT', snap:'شلوطة', extraTurn:'طقها', undo:'ما غزيت',
    reroll:'اصرمني', spoiler:'وش السالفة', harder:'شد حيلك', lag:'النت فاصل', ratio:'نص نص', trade:'خذ وهات',
    factcheck:'كاشفك', shadowban:'ولا كلمة', immune:'محد قدّك', wasta:'واسطة', pot:'القطة', evilEye:'عين',
    yasalam:'يا سلام', coal:'الجمرة', copy:'نسخ لصق', streak:'مولّعة', hayat:'هياط', sawalif:'سواليف', prank:'مقلب',
    copium:'بسيطة', seen:'طنّش', gacha:'ضربة حظ', choose:'على كيفي', lock:'بيننا', cleanse:'رايق', fullsteal:'ببلاش',
    swapTurn:'روح انت أول', roast:'طقطقة', bet:'أراهنك',
    capital:'رأس مال', bench:'برا!', brake:'على وين؟', finisher:'K.O.', haul:'زاد الطريق', comeback:'ما بقى شي',
  };

  // ---------- طبقة DOM خفيفة (عناصر قليلة، transform/opacity بس) ----------
  const layer = () => { let l=document.getElementById('fx-layer'); if(!l){ l=document.createElement('div'); l.id='fx-layer'; l.className='fx-layer'; document.body.appendChild(l);} return l; };
  const add = (cls, html, ms, setup) => { const d=document.createElement('div'); d.className=cls; d.innerHTML=html||''; if(setup) setup(d); layer().appendChild(d); setTimeout(()=>d.remove(), ms); return d; };
  function shake(p){
    const el = document.querySelector('.card-overlay .co-wrap') || document.querySelector('.screen.active .stage') || document.querySelector('.screen.active');
    if(!el) return; el.style.setProperty('--fx-shake',(4+8*p).toFixed(1)+'px');
    el.classList.remove('fx-shaking'); void el.offsetWidth; el.classList.add('fx-shaking'); setTimeout(()=>el.classList.remove('fx-shaking'),480);
  }
  function tint(col, op){ add('fx-tint','',700,d=>{ d.style.background=col; d.style.setProperty('--fx-op',op); }); }
  function ring(col, n){ for(let i=0;i<n;i++) add('fx-ring','',1000+i*160,d=>{ d.style.setProperty('--fx-rcol',col); d.style.animationDelay=(i*.16)+'s'; }); }
  function stamp(txt, col){ if(!txt) return; add('fx-stamp',`<span>${D.esc(txt)}</span>`,1300,d=>d.style.setProperty('--fx-scol',col)); }
  function scan(){ add('fx-scan','',900); }

  // ---------- جزيئات على كانفس واحد ----------
  const P = { c:null, x:null, list:[], raf:0 };
  function canvas(){
    if(!P.c){ P.c=document.createElement('canvas'); P.c.className='fx-canvas'; document.body.appendChild(P.c); P.x=P.c.getContext('2d'); }
    const dpr=Math.min(2,window.devicePixelRatio||1);
    if(P.c.width!==innerWidth*dpr){ P.c.width=innerWidth*dpr; P.c.height=innerHeight*dpr; P.x.setTransform(dpr,0,0,dpr,0,0); }
    return P;
  }
  function burst(col, n){
    canvas(); const cx=innerWidth/2, cy=innerHeight*.45;
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2, v=6+Math.random()*12;
      P.list.push({x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-3,s:5+Math.random()*10,r:Math.random()*6,vr:(Math.random()-.5)*.4,life:1,decay:.012+Math.random()*.012,col:i%4===0?'#ffffff':col});
    }
    if(!P.raf) P.raf=requestAnimationFrame(tick);
  }
  function tick(){
    const x=P.x; x.clearRect(0,0,innerWidth,innerHeight);
    P.list=P.list.filter(p=>p.life>0);
    for(const p of P.list){
      p.x+=p.vx; p.y+=p.vy; p.vx*=.97; p.vy=p.vy*.97+.35; p.r+=p.vr; p.life-=p.decay;
      x.globalAlpha=Math.max(0,p.life); x.fillStyle=p.col;
      x.save(); x.translate(p.x,p.y); x.rotate(p.r); x.beginPath(); x.moveTo(0,-p.s); x.lineTo(p.s*.6,0); x.lineTo(0,p.s); x.lineTo(-p.s*.6,0); x.fill(); x.restore();
    }
    x.globalAlpha=1;
    P.raf = P.list.length ? requestAnimationFrame(tick) : 0;
    if(!P.raf) x.clearRect(0,0,innerWidth,innerHeight);
  }

  let ON = true;
  const setEnabled = v => { ON=!!v; };

  function sound(card,{volume=1}={}){
    (TIER_SND[card.tier]||[]).forEach(([n,d,v])=>setTimeout(()=>play(n,{volume:v*volume}),d));
    if(card.snd) setTimeout(()=>play(card.snd,{volume:.9*volume}), SND_DELAY[card.tier]||100);
  }

  // صوت الفئة بس (للسحب السري — ما يفضح البطاقة)
  function tierSound(tier){ (TIER_SND[tier]||[]).forEach(([n,d,v])=>setTimeout(()=>play(n,{volume:v}),d)); }

  function visual(card){
    if(!ON) return;
    const p=POWER[card.tier]??.3, col=TIER_COL[card.tier];
    if(card.tier==='black'){ tint('#000',.45); reaction('black',2400); return; }
    burst(col, Math.round(18+40*p));
    if(p>=.6){ ring(col, card.tier==='legendary'?2:1); stamp(LOOK[card.fx],col); }
    if(card.tier==='legendary'){ shake(p); tint(col,.22); confetti(90,1600,[col,'#fff','#FFC23A']); reaction('legendary',2800); }
    if(card.fx==='factcheck'||card.fx==='spoiler') scan();
    if(card.fx==='lag'||card.fx==='shadowban') tint('#000',.4);
  }

  // تشويق قصير قبل كشف البطاقة
  const SUSPENSE_MS = 1000;
  function suspense(el){
    if(!ON) return 420;
    play('fx_tension',{volume:.6});
    if(el){ el.classList.add('suspense'); setTimeout(()=>el.classList.remove('suspense'), SUSPENSE_MS); }
    return SUSPENSE_MS;
  }
  function aura(el, tier){ if(el && ON) el.classList.add('aura-'+tier); }

  return { sound, tierSound, visual, suspense, aura, setEnabled, SUSPENSE_MS, get enabled(){ return ON; } };
})();
