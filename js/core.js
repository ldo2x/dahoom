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
  // أصوات النظام كلها أصلية: وصفات تتولّد بالمتصفح (Web Audio) — ولا ملف صوت من برا.
  // 'meme:xxx' من assets/sfx/meme و'game:xxx' من assets/sfx/game تبقى لمحتوى البطاقات والميمز بس.
  const audio = { on: store.get('sound', true), vol: store.get('volume', 0.4), cache:{}, loops:{} };
  // اختيارات صاحب المنصة من صفحة pick.html (تنحفظ بالجهاز): صور البطاقات، أصوات اللعبة، وأصوات موقوفة
  const picks = Object.assign({ snd:{}, csnd:{}, gif:{}, off:[] }, store.get('picks', {}));
  // الأسماء القديمة ← أصواتنا الأصلية. أي play('game:..') أو اسم قديم ينادى من النظام يتحول هنا
  // (أصوات البطاقات نفسها تنادى بـ raw:true وما تمر من هنا)
  const ALIAS = {
    unlock:'join', fx_tension:'suspense', fx_deny:'deny', fx_whoosh:'whoosh', fx_trombone:'card_curse', fx_thunder:'card_legend',
    'game:g_mgs':'buzzin', 'game:g_zelda':'reveal', 'game:g_mariocoin':'coin_big', 'game:g_oneup':'connect',
    'game:g_finishhim':'final_round', 'game:g_gong':'event', 'game:g_powerup':'build', 'game:g_swoosh':'whoosh', 'game:g_mkcount':'cheer',
    'game:g_lightsaber':'card_legend', 'game:g_suspense':'suspense',
    'game:g_doublekill':'streak2', 'game:g_triplekill':'streak3', 'game:g_ultrakill':'streak4', 'game:g_monsterkill':'streak5', 'game:g_godlike':'streak6',
  };
  const CAP = {};   // أقصى مدة (ملي ثانية) لملف صوت معيّن لو صاحب المنصة اختار ملف بدل الأصلي
  // الاسم ← المفتاح: اختيار صاحب المنصة أول ('syn' = الأصلي)، بعدين الاسم البديل، و'syn:xxx' = وصفة مولّدة
  const resolve = name => {
    const p = picks.snd[name]; if(p && p!=='syn') return p;
    const n = ALIAS[name] || name; return SYN[n] ? 'syn:'+n : n;
  };

  // ===== محرك الأصوات الأصلية =====
  // الطابع: مجلس سعودي — دربوكة وطار، نقرات عود وماريمبا، وأجراس صافية. بدون أصوات ثمانية بت.
  // كل وصفة: { d: المدة بالثواني، v: موازنة العلو، f: x => ترسم الصوت بأدوات kit }، وloop: تتكرر (إيقاع العدّاد)
  const hz = m => 440*Math.pow(2,(m-69)/12);          // رقم النوتة ← تردد (يقبل ربع تون: 75.5 = مي نص بيمول، مقام الراست)
  const NB = new WeakMap();
  function noiseBuf(c){ let b=NB.get(c); if(!b){ let s=20231; const n=c.sampleRate*2; b=c.createBuffer(1,n,c.sampleRate); const d=b.getChannelData(0); for(let i=0;i<n;i++){ s=(s*1103515245+12345)&0x7fffffff; d[i]=s/0x3fffffff-1; } NB.set(c,b); } return b; }
  function kit(c, out, t0){
    const T = t => t0+t, nyq = c.sampleRate/2.3;
    const env = (p, t, a, g, d) => { p.setValueAtTime(0.0001,T(t)); p.exponentialRampToValueAtTime(Math.max(0.0002,g),T(t+a)); p.exponentialRampToValueAtTime(0.0001,T(t+a+d)); };
    const tone = (t, f, d, {type='sine', g=.2, a=.004, f2, glide, det=0, to=out}={}) => {
      if(f>nyq) return; const o=c.createOscillator(), v=c.createGain(); o.type=type; o.frequency.setValueAtTime(f,T(t));
      if(f2) o.frequency.exponentialRampToValueAtTime(f2,T(t+(glide||d))); if(det) o.detune.value=det;
      env(v.gain,t,a,g,d); o.connect(v); v.connect(to); o.start(T(t)); o.stop(T(t+a+d+.05));
    };
    const noise = (t, d, {g=.2, type='bandpass', f=2000, f2, q=1, a=.002, to=out}={}) => {
      const s=c.createBufferSource(); s.buffer=noiseBuf(c); s.loop=true; const fl=c.createBiquadFilter(); fl.type=type; fl.Q.value=q;
      fl.frequency.setValueAtTime(f,T(t)); if(f2) fl.frequency.exponentialRampToValueAtTime(f2,T(t+a+d));
      const v=c.createGain(); env(v.gain,t,a,g,d); s.connect(fl); fl.connect(v); v.connect(to); s.start(T(t), (t*7.31)%1.5); s.stop(T(t+a+d+.05));
    };
    return {
      hz, tone, noise,
      // ماريمبا: نغمة خشبية دافية
      mar:(t, f, d=.35, g=.25) => { tone(t,f,d,{g,a:.002}); tone(t,f*3.93,d*.22,{g:g*.2,a:.001}); },
      // عود: وترين مزدوجين وفلتر ينغلق (نقرة دافية)
      oud:(t, f, d=.5, g=.2) => {
        const fl=c.createBiquadFilter(); fl.type='lowpass'; fl.Q.value=2.5; fl.frequency.setValueAtTime(Math.min(f*9,8000),T(t)); fl.frequency.exponentialRampToValueAtTime(Math.max(f*1.3,180),T(t+d*.75)); fl.connect(out);
        tone(t,f,d,{type:'sawtooth',g:g*.55,a:.002,to:fl}); tone(t,f,d,{type:'sawtooth',g:g*.45,a:.002,det:8,to:fl});
        noise(t,.018,{g:g*.25,type:'highpass',f:3000});
      },
      // جرس صافي (أجزاء غير متناسقة مثل الجلوكن)
      bell:(t, f, d=.7, g=.15) => { [[1,1,1],[2.76,.32,.45],[5.4,.12,.25],[8.93,.05,.14]].forEach(([r,k,dd])=>tone(t,f*r,d*dd,{g:g*k,a:.002})); },
      // دم: ضربة الطار/الدربوكة الغامقة
      doum:(t, g=.5, f=90, d=.35) => {
        const o=c.createOscillator(), v=c.createGain(); o.frequency.setValueAtTime(f*1.9,T(t)); o.frequency.exponentialRampToValueAtTime(f,T(t+.045)); o.frequency.exponentialRampToValueAtTime(f*.82,T(t+d));
        env(v.gain,t,.003,g,d); o.connect(v); v.connect(out); o.start(T(t)); o.stop(T(t+d+.05));
        tone(t,f*2,d*.5,{g:g*.4,a:.003}); tone(t,f*3.01,d*.3,{g:g*.15,a:.003}); noise(t,.035,{g:g*.3,type:'lowpass',f:1200});   // التوافقيات عشان تنسمع حتى بسماعة الجوال
      },
      // تك: حافة الدربوكة
      tek:(t, g=.3) => { noise(t,.045,{g,f:3400,q:1.4}); tone(t,1250,.05,{type:'triangle',g:g*.3,a:.001}); },
      // كا: ضربة مكتومة / طرقة خشب
      ka:(t, g=.25) => { noise(t,.03,{g,f:1800,q:.9}); tone(t,620,.035,{g:g*.35,a:.001}); },
      // تصفيقة
      clap:(t, g=.25, f=1400) => { [0,.009,.018].forEach(o=>noise(t+o,.008,{g,f,q:.8,a:.001})); noise(t+.027,.08,{g:g*.8,f,q:.8,a:.001}); },
      // لمعة خفيفة (هواء عالي)
      shim:(t, d=.5, g=.05) => noise(t,d,{g,type:'highpass',f:7000,a:.03}),
    };
  }
  const R = (d, v, f, extra) => Object.assign({ d, v, f }, extra||{});
  // سلسلة نجاحات: كل نجاح زيادة نغمة، وكل مستوى أعلى من اللي قبله
  const streak = n => R(.07*(n-1)+.62, 0.75, x => { const up=n-2; x.doum(0,.4,95,.25); [84,88,91,96,100].slice(0,n).forEach((m,i)=>x.bell(i*.07, x.hz(m+up), i===n-1?.6:.3, i===n-1?.2:.13)); if(n>=4) x.shim(.07*(n-1), .4, .04); });
  const SYN = {
    // ---- الواجهة ----
    pop:      R(.15, 1.19, x => x.mar(0, x.hz(79), .12, .3)),                                          // ضغطة / تنقل
    tick:     R(.06, 2.5, x => { x.tone(0,1700,.025,{type:'triangle',g:.18,a:.001}); x.noise(0,.015,{g:.12,f:3000,q:2}); }), // اختيار صغير / خطوة
    bling:    R(.5,  1.47, x => { x.bell(0, x.hz(88), .4, .14); x.bell(.06, x.hz(95), .45, .12); x.shim(.04,.3,.03); }), // تم / تلميح
    notify:   R(.4,  1.25, x => { x.mar(0, x.hz(81), .2, .22); x.mar(.11, x.hz(81), .25, .22); }),      // تنبيه خفيف
    jingle:   R(1.05,0.75, x => { x.doum(0,.4); [72,74,75.5,79].forEach((m,i)=>{ x.oud(i*.11, x.hz(m), i===3?.6:.2, .16); x.mar(i*.11, x.hz(m+12), i===3?.5:.15, .1); }); x.bell(.33, x.hz(96), .6, .1); x.shim(.33,.5,.04); }), // دخول المنصة (بصمة الراست)
    join:     R(.45, 1.08, x => { x.mar(0, x.hz(79), .25, .25); x.mar(.08, x.hz(86), .35, .25); }),     // لاعب انضاف
    connect:  R(.5,  1.67, x => { [84,88,91].forEach((m,i)=>x.bell(i*.07, x.hz(m), .35, .13)); }),     // جوال اتصل
    // ---- الدور والوقت ----
    turn:     R(.6,  0.76, x => { x.doum(0,.35,100,.25); x.tek(.13,.12); x.bell(0, x.hz(88), .5, .14); }), // بداية دور
    levelup:  R(.8,  0.71, x => { x.doum(0,.4); x.bell(0, x.hz(79), .4, .15); x.bell(.12, x.hz(84), .6, .17); x.shim(.12,.45,.035); }), // لفة / مرحلة جديدة
    buzzin:   R(.45, 1.28, x => { x.tek(0,.35); x.tone(0,1200,.06,{f2:2400,g:.1}); x.bell(.02, x.hz(93), .4, .16); }), // أول واحد ضغط / انتباه
    countdown:R(.2,  1.69, x => { x.tek(0,.3); x.mar(0, x.hz(93), .12, .2); }),                          // آخر الثواني
    clockloop:R(2.4, 1.14, x => { x.doum(0,.22,95,.25); x.tek(.3,.11); x.tek(.9,.11); x.doum(1.2,.18,95,.22); x.tek(1.8,.11); x.ka(2.1,.07); }, {loop:true}), // إيقاع المقسوم تحت العدّاد
    buzzer:   R(.8,  0.84, x => { x.doum(0,.4,80,.3); x.oud(0, x.hz(57), .25, .3); x.oud(.22, x.hz(53), .5, .32); }), // خلص الوقت (نازل وغامق)
    // ---- صح وغلط ----
    correct:  R(.55, 0.9, x => { x.mar(0, x.hz(79), .3, .26); x.mar(.085, x.hz(84), .4, .28); x.bell(.085, x.hz(96), .4, .07); }),
    wrong:    R(.55, 0.93, x => { x.doum(0,.25,100,.2); x.oud(0, x.hz(51), .22, .26); x.oud(.13, x.hz(50), .35, .26); }),
    fail:     R(1.05,0.8, x => { [69,67,66,63,62].forEach((m,i)=>x.oud(i*.12, x.hz(m), i===4?.5:.16, .2)); x.doum(.48,.35,85,.4); }), // نزلة حجاز
    steal:    R(.5,  1.6, x => { x.noise(0,.12,{g:.14,f:600,f2:4000,q:1.2,a:.04}); x.oud(.1, x.hz(74), .35, .18); x.oud(.1, x.hz(81), .35, .14); }),
    reveal:   R(.75, 1.41, x => { [84,86,87.5,91].forEach((m,i)=>x.bell(i*.08, x.hz(m), i===3?.5:.25, .14)); x.shim(.24,.4,.03); }), // جاهز / انكشف
    final_round: R(1.2, 0.69, x => { x.doum(0,.5,75,.4); x.doum(.3,.5,75,.4); [62,63,66,67,69].forEach((m,i)=>x.oud(.45+i*.1, x.hz(m), i===4?.3:.12, .18)); x.bell(.85, x.hz(81), .3, .1); }),
    // ---- الفلوس ----
    coin:     R(.35, 1.57, x => { x.bell(0, x.hz(95), .25, .15); x.bell(.07, x.hz(100), .28, .13); }),  // دخل فلوس / نقاط
    coin_big: R(.9,  1.6, x => { [88,92,95,100,96,100,104].forEach((m,i)=>x.bell(i*.075, x.hz(m), .3, .12)); x.shim(.2,.6,.035); }), // القطة / جاك بوت
    pay:      R(.45, 1.06, x => { x.mar(0, x.hz(64), .22, .26); x.mar(.09, x.hz(59), .3, .26); x.noise(0,.05,{g:.12,type:'lowpass',f:900}); }), // طلعت فلوس
    bonus:    R(.7,  1.14, x => { [72,76,79,84].forEach((m,i)=>x.mar(i*.06, x.hz(m), i===3?.4:.15, .2)); x.bell(.18, x.hz(96), .45, .08); }),
    buy:      R(.45, 0.89, x => { x.doum(0,.35,120,.18); x.ka(0,.22); x.bell(.08, x.hz(91), .25, .12); x.bell(.14, x.hz(96), .28, .1); }), // ختم الشراء
    build:    R(.75, 1.63, x => { x.ka(0,.3); x.ka(.13,.3); x.bell(.26, x.hz(84), .3, .13); x.bell(.34, x.hz(91), .4, .13); }), // طرقتين وبناء
    deal:     R(.6,  1.85, x => { x.oud(0, x.hz(67), .2, .18); x.oud(.1, x.hz(74), .25, .18); x.bell(.2, x.hz(91), .35, .12); }), // صفقة تمت
    saher:    R(.55, 2.92, x => { x.noise(0,.02,{g:.1,type:'highpass',f:3000}); x.ka(.03,.12); x.tone(.01,2000,.1,{f2:4000,g:.05}); x.tone(.15, 988, .12,{type:'triangle',g:.15}); x.tone(.29, 784, .2,{type:'triangle',g:.15}); }), // فلاش ساهر
    snatch:   R(.4,  1.61, x => { x.noise(0,.15,{g:.15,f:800,f2:5000,q:1.2,a:.05}); x.mar(.12, x.hz(86), .22, .2); }), // نشل / استحواذ
    out:      R(.9,  0.87, x => { x.doum(0,.45,70,.5); x.oud(.05, x.hz(62), .8, .18); x.tone(.05, x.hz(62), .8,{f2:x.hz(55),g:.08}); }), // طلع من اللعبة
    // ---- البطاقات والنرد ----
    card:     R(.35, 2.38, x => { x.noise(0,.14,{g:.16,f:1200,f2:4500,q:1,a:.03}); x.mar(.09, x.hz(84), .2, .12); }), // سحب بطاقة
    card_play:R(.45, 1.52, x => { x.noise(0,.12,{g:.14,f:1000,f2:4000,a:.03}); x.mar(.1, x.hz(79), .2, .2); x.mar(.17, x.hz(86), .25, .2); }),
    card_rare:R(.7,  1.58, x => { x.noise(0,.12,{g:.14,f:1000,f2:4000,a:.03}); [84,88,91].forEach((m,i)=>x.bell(.08+i*.07, x.hz(m), .4, .13)); x.shim(.15,.45,.035); }),
    card_legend:R(1.2,0.69, x => { x.doum(0,.55,65,.6); x.noise(0,.4,{g:.2,type:'lowpass',f:1500,f2:300}); x.oud(0, x.hz(50), .9, .18); [86,90,93].forEach(m=>x.bell(.12, x.hz(m), .8, .08)); x.shim(.1,.8,.05); }),
    card_curse:R(1.0,0.94, x => { x.doum(0,.4,75,.4); [67,66,63,62].forEach((m,i)=>x.oud(i*.15, x.hz(m-12), i===3?.5:.18, .2)); }),
    suspense: R(1.0, 2.24, x => { [0,.12,.22,.31,.39,.46,.52,.57,.62,.66,.7,.74,.78,.82].forEach((t,i)=>x.mar(t, x.hz(i%2?75:74), .1, .06+i*.009)); x.noise(0,.32,{g:.1,f:300,f2:2500,q:1.5,a:.6}); }),
    dice_roll:R(.85, 5.93, x => { [0,.06,.11,.19,.24,.33,.4,.5,.58,.7].forEach((t,i)=>{ const k=1-i*.07; x.noise(t,.015,{g:.2*k,f:2600+(i*911)%1900,q:3,a:.001}); x.tone(t,900+(i*373)%500,.02,{type:'triangle',g:.08*k,a:.001}); }); x.noise(0,.75,{g:.04,type:'lowpass',f:400}); }),
    dice_land:R(.3,  1.41, x => { x.ka(0,.3); x.doum(0,.25,140,.12); x.ka(.08,.15); }),
    whoosh:   R(.45, 6.31, x => { x.noise(0,.25,{g:.18,f:300,f2:3500,q:.9,a:.12}); }),
    deny:     R(.4,  1.03, x => { x.oud(0, x.hz(62), .1, .2); x.mar(0, x.hz(62), .12, .2); x.oud(.14, x.hz(57), .16, .2); x.mar(.14, x.hz(57), .18, .2); }), // مرفوض / ما زبطت («أوه-أوه» نازلة)
    challenge:R(1.15,0.61, x => { [62,62,63,63,64,64,65,65,66,67,68,69].forEach((m,i)=>x.oud(i*.06, x.hz(m), .07, .08+i*.012)); x.noise(0,.22,{g:.12,f:400,f2:3000,q:1.4,a:.56}); x.tek(.8,.4); x.doum(.8,.5,85,.3); x.bell(.8, x.hz(81), .35, .1); x.bell(.8, x.hz(75), .35, .1); }), // «ما أصدقك»: توتر طالع وصفعة
    event:    R(1.2, 0.68, x => { [[1,1,1],[2.71,.4,.6],[5.15,.15,.35],[8.1,.06,.2]].forEach(([r,k,dd])=>x.tone(0,330*r,1.1*dd,{g:.22*k,a:.003})); x.doum(0,.3,90,.3); }), // حدث / مزاد (طاسة نحاس)
    // ---- الحماس والفوز ----
    drums:    R(.6,  0.61, x => { x.doum(0,.45,110,.3); x.doum(.2,.45,110,.3); x.tek(.4,.25); x.noise(0,.2,{g:.07,f:200,f2:1200,q:1,a:.4}); }), // يلا نبدأ السحب
    drumroll: R(1.2, 0.76, x => { for(let i=0;i<18;i++) (i%2?x.ka:x.tek)(i*.055, .07+i*.012); x.doum(1.0,.5,85,.2); }),
    cheer:    R(1.2, 0.46, x => { [0,.12,.22,.3,.36,.41,.45].forEach((t,i)=>x.tek(t,.1+i*.03)); x.doum(.5,.55); [72,76,79,84].forEach(m=>x.mar(.5, x.hz(m), .55, .12)); x.bell(.5, x.hz(96), .6, .08); x.clap(.5,.18); x.shim(.5,.55,.04); }), // بداية المباراة
    win:      R(2.5, 0.53, x => {
      [[0,'d'],[.25,'t'],[.75,'t'],[1,'d'],[1.5,'t'],[1.75,'t']].forEach(([t,k])=>k==='d'?x.doum(t,.4):x.tek(t,.18));
      [[0,72],[.125,74],[.25,75.5],[.5,79],[.75,77],[.875,75.5],[1,75.5],[1.25,77],[1.5,79],[1.75,81]].forEach(([t,m])=>{ x.mar(t, x.hz(m), .22, .2); x.oud(t, x.hz(m-12), .2, .08); });
      [1,1.5].forEach(t=>x.clap(t,.14));
      x.doum(2,.5,80,.45); x.clap(2,.18); [72,79,84,88].forEach(m=>x.mar(2, x.hz(m), .45, .13)); x.bell(2, x.hz(96), .45, .1); x.shim(2,.42,.05);
    }),
    applause: R(2.4, 1.02, x => {   // تصفيق جماعي على الإيقاع (صفقة خليجية) + تصفيق متفرق
      [0,.3,.6,.75,.9,1.2,1.5,1.65,1.8,2.1].forEach((t,i)=>[0,.007,.013,.021].forEach((o,j)=>x.clap(t+o, .07, 1100+j*260+(i%3)*90)));
      [0,.9,1.8].forEach(t=>x.doum(t,.3,95,.25));
      for(let i=0;i<34;i++){ const t=(i*0.6180339)%1*2.2; x.clap(t, .035*(1-t/2.6), 900+(i*577)%1600); }
    }),
  };
  [2,3,4,5,6].forEach(n=>SYN['streak'+n]=streak(n));

  let AC=null, BUS=null;
  const actx = () => { if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } } if(AC.state==='suspended') AC.resume(); return AC; };
  // خط الخروج: محدّد خفيف يمنع التقطيع لو انطبقت أصوات فوق بعض
  function bus(c){ if(!BUS){ BUS=c.createDynamicsCompressor(); BUS.threshold.value=-6; BUS.knee.value=3; BUS.ratio.value=12; BUS.attack.value=.002; BUS.release.value=.15; BUS.connect(c.destination); } return BUS; }
  // يرسم وصفة على أي سياق (حي أو أوفلاين للاختبار) — يرجع عقدة العلو
  function renderSyn(name, c, dest, vol=1, t0){
    const r=SYN[name]; if(!r) return null; const g=c.createGain(); g.gain.value=vol*(r.v||1); g.connect(dest);
    r.f(kit(c, g, t0==null ? c.currentTime+0.01 : t0)); return g;
  }
  function synth(name, vol){ const c=actx(); if(!c) return; const g=renderSyn(name, c, bus(c), vol); if(g) setTimeout(()=>{ try{ g.disconnect(); }catch(e){} }, (SYN[name].d+0.6)*1000); }
  // تكرار وصفة (عدّاد السؤال): تنجدول قدّام بثانية، وتوقف بـ pause() مثل ملف الصوت
  function synLoop(name, vol){
    const c=actx(); if(!c) return null; const r=SYN[name]; const g=c.createGain(); g.gain.value=vol; g.connect(bus(c));
    let next=c.currentTime+0.05, alive=true;
    const pump=()=>{ if(!alive) return; if(next<c.currentTime) next=c.currentTime+0.02; while(next<c.currentTime+1.2){ renderSyn(name, c, g, 1, next); next+=r.d; } };
    pump(); const iv=setInterval(pump, 300);
    return { loop:true, currentTime:0,
      pause(){ if(!alive) return; alive=false; clearInterval(iv); try{ g.gain.setTargetAtTime(0.0001,c.currentTime,.03); }catch(e){} setTimeout(()=>{ try{ g.disconnect(); }catch(e){} },400); },
      get volume(){ return g.gain.value/2.5; }, set volume(v){ g.gain.value=v*2.5; } };
  }
  const srcOf = n => n.startsWith('meme:') ? 'assets/sfx/meme/'+n.slice(5)+'.mp3' : n.startsWith('game:') ? 'assets/sfx/game/'+n.slice(5)+'.mp3' : 'assets/sfx/'+n.replace(/^file:/,'')+'.mp3';
  function base(name){ if(!audio.cache[name]){ const a=new Audio(srcOf(name)); a.preload='auto'; audio.cache[name]=a; } return audio.cache[name]; }
  // تجهيز ملفات الصوت اللي اختارها صاحب المنصة بالخلفية (أصوات النظام مولّدة وما تحتاج تحميل)
  const warm = [...new Set(Object.values(picks.snd))].filter(k=>k && k!=='syn' && k!=='none');
  function warmNext(){
    const k=warm.shift(); if(!k) return;
    const a=base(k); let done=false; const nx=()=>{ if(done) return; done=true; setTimeout(warmNext,120); };
    a.addEventListener('canplaythrough',nx,{once:true}); a.addEventListener('error',nx,{once:true}); setTimeout(nx,5000);
  }
  if(document.readyState==='complete') setTimeout(warmNext,1500); else window.addEventListener('load',()=>setTimeout(warmNext,1500),{once:true});
  document.addEventListener('pointerdown', ()=>actx(), {once:true});
  // max: أقصى مدة بالملي ثانية (الميمز الطويلة تنقص). raw: صوت محتوى (بطاقة/ميم) يتشغل مثل ما هو بدون تحويل
  function play(name, {volume=1, loop=false, rate=1, max, raw=false}={}){
    if(!audio.on || !name) return null;
    let key = raw ? name : resolve(name);
    if(key==='none' || picks.off.includes(key)) return null;
    if(key.startsWith('syn:')){
      const n=key.slice(4), v=Math.min(1.5, volume*audio.vol*2.5);
      if(loop){ stop(name); const L=synLoop(n, v); if(L) audio.loops[name]=L; return L; }
      synth(n, v); return null;
    }
    if(loop) stop(name);
    const b = base(key);
    const a = loop ? b : b.cloneNode();
    a.volume = Math.min(1, volume * audio.vol); a.loop = loop; a.currentTime = 0;
    try{ a.playbackRate = rate; a.preservesPitch = false; }catch(e){}
    a.play().catch(()=>{});
    if(loop) audio.loops[name]=a;
    else { const cap = max ?? CAP[name] ?? (key.includes(':') ? 4200 : 0); if(cap) setTimeout(()=>fade(a), cap); }
    return a;
  }
  function fade(a){ let v=a.volume; const t=setInterval(()=>{ v-=.08; if(v<=0){ a.pause(); clearInterval(t); } else a.volume=v; },40); }
  function stop(name){ const a=audio.loops[name]; if(a){ a.pause(); a.currentTime=0; delete audio.loops[name]; } }
  function stopAll(){ Object.keys(audio.loops).forEach(stop); }
  function toggleSound(){ audio.on=!audio.on; store.set('sound',audio.on); if(!audio.on) stopAll(); updateSoundBtn(); }
  function setVolume(v){ audio.vol=Math.max(0,Math.min(1,v)); store.set('volume',audio.vol); Object.values(audio.loops).forEach(a=>a.volume=Math.min(1,.35*audio.vol)); }
  function updateSoundBtn(){ $$('.btn-sound').forEach(b=>b.innerHTML = audio.on ? ic('sound')+' الصوت' : ic('mute')+' مكتوم'); $$('.sw-sound').forEach(c=>c.checked=audio.on); $$('.vol-slider').forEach(s=>{ s.value=Math.round(audio.vol*100); s.disabled=!audio.on; }); }
  // صوت ميم للحظة معينة (من data/memes.js)
  function memeSound(kind, opts={}){
    const M=(window.DAHOOM_DATA||{}).memes||{}; const l=((M.sounds&&M.sounds[kind])||[]).filter(x=>!picks.off.includes('meme:'+x));
    if(l&&l.length) return play('meme:'+rnd(l), Object.assign({volume:.8},opts));
  }

  // ---------- الشاشات ----------
  function go(id){
    $$('.screen').forEach(s=>s.classList.remove('active'));
    $('#'+id).classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
    document.dispatchEvent(new CustomEvent('dahoom:screen',{detail:id}));
    play('pop',{volume:.4});
  }
  document.addEventListener('click', e => { const t = e.target.closest('[data-go]'); if(t) go(t.dataset.go); });
  // الشعار «دحوم» (div بدور رابط) يشتغل بالكيبورد بعد
  document.addEventListener('keydown', e => { if(e.key!=='Enter' && e.key!==' ') return; const t=e.target.closest && e.target.closest('[data-go][role="link"]'); if(t && e.target===t){ e.preventDefault(); go(t.dataset.go); } });

  // ---------- Toast / Modal ----------
  function toast(msg, ms=2400){
    $$('.toast').forEach(t=>t.remove());
    const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t);
    setTimeout(()=>t.remove(), ms);
    // وسط المباراة: كل تنبيه ينضاف لسجل الأحداث اللي يشوفه اللاعبين بجوالاتهم
    if(document.querySelector('#game.active, #khaliya.active')) feed({x:String(msg)});
  }
  // سجل الأحداث: {x:نص, n:اسم, c:لون, a:مبلغ/نقاط, k:نوع}
  function feed(e){ document.dispatchEvent(new CustomEvent('dahoom:feed',{detail:Object.assign({ts:Date.now()}, e)})); }
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
    const c=conf.c; if(c.width!==innerWidth||c.height!==innerHeight){ c.width=innerWidth; c.height=innerHeight; } c.style.display='block';
    for(let i=0;i<n;i++) conf.parts.push({x:Math.random()*c.width,y:-20-Math.random()*200,w:6+Math.random()*8,h:10+Math.random()*12,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.3,vy:2+Math.random()*4,vx:(Math.random()-.5)*2,col:rnd(cols)});
    const end=Date.now()+ms;
    cancelAnimationFrame(conf.raf);
    (function tick(){
      const x=conf.ctx, H=c.height+30, keep=[];
      x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,c.width,c.height);
      for(const p of conf.parts){
        p.y+=p.vy; p.x+=p.vx; p.r+=p.vr; if(p.y>=H) continue; keep.push(p);
        if(p.y<-30) continue;                                   // لسا فوق الشاشة — لا ترسمها
        const co=Math.cos(p.r), si=Math.sin(p.r);
        x.setTransform(co,si,-si,co,p.x,p.y); x.fillStyle=p.col; x.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      }
      conf.parts=keep;
      if(keep.length && Date.now()<end+4000) conf.raf=requestAnimationFrame(tick);
      else { conf.parts=[]; x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,c.width,c.height); c.style.display='none'; }  // مخفي وهو فاضي — ما يكلف المتصفح شي
    })();
  }

  // ---------- الميمز ----------
  const memeSrc = x => /^(https?:|data:|\.|\/|assets\/)/.test(x) ? x : (/\.webp$/i.test(x) ? 'assets/memes/'+x : 'assets/gif/'+(/\.\w+$/.test(x)?x:x+'.webp'));
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
    d.innerHTML=`<img src="${memeSrc(rnd(list))}" alt="" decoding="async" onerror="this.onerror=null;this.src='${memeSrc(fb)}'">${cap?`<div class="cap">${esc(cap)}</div>`:''}`;
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
    const own = picks.gif[c.id];
    const art = own ? `<img src="${esc(own)}" alt="" loading="lazy">` : c.tweet
      ? `<div class="tweet"><div class="tw-h"><span class="tw-av">${esc(c.tweet.name[0])}</span><span><b>${esc(c.tweet.name)}</b><i>${esc(c.tweet.handle)}</i></span></div><p>${esc(c.tweet.text)}</p><div class="tw-f"><span>${ic('star')} ${esc(c.tweet.likes)}</span><span>${ic('recycle')} ترند</span></div></div>`
      : c.art ? `<div class="tcg-icon">${ic(c.art)}</div>`
      : `<img src="assets/cards/${c.id}${anim?'.webp':'_s.gif'}" alt="" loading="lazy">`;
    // تشريح البطاقة: لوحة الاسم ← الصورة ← سطر النوع ← النص ← المصدر ورقم البطاقة
    return `<div class="tcg ${c.tier} ${size}${c.phase&&c.phase===window.DAHOOM_PHASE?' in-phase':''}" data-id="${c.id}">
      ${flag?`<span class="tcg-flag">${esc(flag)}</span>`:''}
      <div class="tcg-in">
        <div class="tcg-art">${art}${c.target?`<span class="tcg-tgt">على ${TARGET_AR[c.target]}</span>`:''}</div>
        <div class="tcg-top"><span class="tcg-kind">${ic(K.icon)} ${K.name}</span><span class="tcg-tier">${TIER_AR[c.tier]}</span></div>
        <div class="tcg-name">${esc(c.name)}</div>
        <div class="tcg-desc">${esc(c.desc)}</div>
        <div class="tcg-meme">${c.phase?`<span class="tcg-phase ph-${c.phase}">تلمع في ${{early:'البداية',mid:'الوسط',late:'النهاية'}[c.phase]}</span>`:''}</div>
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
    'hide_the_pain_harold','mr_bean','nicolas_cage','the_rock_eyebrow','monkey_puppet','capybara','sad_hamster','chill_guy','minion','baby_yoda','side_eye_chloe','spongebob','saudi_smile','saudi_smirk',
    'tan_otori','astolfo','felix_argyle','hideri','saika','nagisa','anya','chika','frieren','marin','bocchi','nezuko','zero_two','megumin','kaguya','power','mai','luffy','naruto','goku','saitama','hakari','pochita','pikachu','chiikawa','hamtaro'];
  const avatarSrc = a => { if(!AVATARS.includes(a)){ let h=0; for(const ch of String(a||'')) h=(h*31+ch.charCodeAt(0))>>>0; a=AVATARS[h%AVATARS.length]; } return 'assets/avatars/'+a+'.webp'; };

  const session = {
    players: store.get('players', []),
    teams: store.get('teams', []),
    mode: store.get('mode','teams'),
    phoneTeams: store.get('phoneTeams', false),   // اللاعبين ينشئون فرق من جوالاتهم؟ (المضيف يفعّلها)
    game: 'alf',
    save(){ store.set('players',this.players); store.set('teams',this.teams); store.set('mode',this.mode); store.set('phoneTeams',!!this.phoneTeams); document.dispatchEvent(new CustomEvent('dahoom:session')); }
  };
  let pick = { color: COLORS[0], avatar: AVATARS[0] };
  let selectedPlayer = null;
  const TEAM_NAMES = ['الذيابة','الصقور','الهوامير','الكواسر','النشامى','الفرسان'];

  function renderPickers(){
    const cw=$('#p-colors'); cw.innerHTML='';
    COLORS.forEach(c=>{ const b=document.createElement('button'); b.style.background=c; b.className=c===pick.color?'sel':''; b.setAttribute('aria-label','لون '+c); b.onclick=()=>{pick.color=c; renderPickers(); play('tick',{volume:.4});}; cw.appendChild(b); });
    const aw=$('#p-avatars'); aw.innerHTML='';
    AVATARS.forEach(a=>{ const b=document.createElement('button'); b.className=a===pick.avatar?'sel':''; b.style.background=pick.color+'40'; b.innerHTML=`<img src="${avatarSrc(a)}" alt="${a}" loading="lazy" decoding="async" width="96" height="96">`; b.onclick=()=>{pick.avatar=a; renderPickers(); play('pop',{volume:.4});}; aw.appendChild(b); });
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
    return {id:'t'+Date.now()+Math.floor(Math.random()*999), name:TEAM_NAMES.find(n=>!usedN.includes(n))||('فريق '+(session.teams.length+1)), color:COLORS.find(c=>!used.includes(c))||rnd(COLORS), members:[]}; }
  function addTeam(){
    if(session.teams.length>=6){ toast('الحد الأقصى 6 فرق'); return; }
    session.teams.push(newTeam()); play('pop'); session.save(); renderTeams();
  }
  // فريق ينشئه لاعب من جواله (لو المضيف مفعّل الخيار)
  function createTeam(name){
    if(session.mode!=='teams' || !session.phoneTeams) return null;
    if(session.teams.length >= (session.game==='khaliya' ? 2 : 6)) return null;
    const t=newTeam(); name=String(name||'').trim().slice(0,18);
    if(name && !session.teams.some(x=>x.name===name)) t.name=name;
    session.teams.push(t); session.save(); renderTeams(); play('pop'); toast(`فريق جديد من الجوال: ${t.name}`);
    return t;
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
    { const pt=$('#opt-phone-teams'); if(pt){ pt.checked=!!session.phoneTeams; pt.closest('label').style.display = solo ? 'none' : ''; } }
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
    const pickIds=['R4','G6','N11','R1','R8','G9','N17','R2'];
    // البداية: يدّين ورق متقابلة على جنبين الشاشة (مثل اللي قاعدين بالمجلس) — الشكل كله من CSS
    const sc=$('#splash-cards'); if(sc){
      const hand=ids=>`<div class="sp-hand">${ids.map(id=>{ const c=C.find(k=>k.id===id); return c?cardHTML(c,{size:'mini'}):''; }).join('')}</div>`;
      sc.innerHTML=hand(pickIds.slice(0,3))+hand(pickIds.slice(3,6));
    }
    const fan=$('#hero-fan'); if(fan){
      fan.innerHTML=['G6','R4','N11'].map(id=>{ const c=C.find(k=>k.id===id); return c?cardHTML(c,{size:'mini'}):''; }).join('');
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
    $$('input[name="theme-pick"]').forEach(r=>r.checked = r.value===(day?'day':'night'));
  }
  document.addEventListener('change', e=>{ const r=e.target; if(r.name==='theme-pick' && r.checked){ applyTheme(r.value, true); play('tick',{volume:.4}); } });
  function toggleTheme(){ applyTheme(getTheme()==='day'?'night':'day', true); play('tick',{volume:.4}); }
  document.addEventListener('click', e=>{ if(e.target.closest('.btn-theme')) toggleTheme(); });
  try{ matchMedia('(prefers-color-scheme: light)').addEventListener('change', e=>{ if(!savedTheme()) applyTheme(e.matches?'day':'night', false); }); }catch(e){}

  // ---------- قائمة الإعدادات بالرئيسية (الصوت، الوضع، تصفير المحتوى، ملفي) ----------
  function closeSettingsMenu(focusBtn){
    const b=$('#btn-settings'), m=$('#set-menu'); if(!b || !m || m.hidden) return;
    m.hidden=true; b.setAttribute('aria-expanded','false'); if(focusBtn) b.focus();
  }
  function initSettingsMenu(){
    const b=$('#btn-settings'), m=$('#set-menu'); if(!b || !m) return;
    b.onclick=e=>{ e.stopPropagation(); if(!m.hidden){ closeSettingsMenu(); return; }
      m.hidden=false; b.setAttribute('aria-expanded','true'); updateSoundBtn(); updateThemeBtns(); play('tick',{volume:.4});
      const f=m.querySelector('a,button,input'); if(f) f.focus({preventScroll:true}); };
    document.addEventListener('click', e=>{ if(!m.hidden && !m.contains(e.target) && e.target!==b) closeSettingsMenu(); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !m.hidden) closeSettingsMenu(true); });
    m.addEventListener('focusout', e=>{ if(e.relatedTarget && !m.contains(e.relatedTarget) && e.relatedTarget!==b) closeSettingsMenu(); });
    document.addEventListener('dahoom:screen', ()=>closeSettingsMenu());
  }

  // ---------- تهيئة ----------
  function init(){
    if(!$('#btn-enter')) return;   // صفحات الأدوات (مثل pick.html) تستخدم النواة بدون واجهة المنصة
    renderPickers(); renderPlayers(); renderTeams(); updateSoundBtn(); updateThemeBtns(); decorate();
    $('#btn-enter').onclick=()=>{ play('jingle',{volume:.9}); go('home'); };
    $$('.btn-sound').forEach(b=>b.onclick=toggleSound);
    $$('.sw-sound').forEach(c=>c.onchange=()=>{ if(c.checked!==audio.on) toggleSound(); if(audio.on) play('tick',{volume:.5}); });
    $$('.vol-slider').forEach(sl=>{ sl.oninput=()=>setVolume(sl.value/100); sl.onchange=()=>play('pop'); });
    initSettingsMenu();
    // اختيار لعبة = تسوي جلسة: تفتح الغرفة وتدخلها كلاعب من نفس الجهاز (تقدر تخليه شاشة عرض بس من الشريط)
    // أسئلة اللعبة (البنوك الكبيرة) تبدأ تتحمّل بالخلفية أول ما تنختار اللعبة — وقت الانتظار يكفيها غالباً
    const openGame=g=>{ closeSettingsMenu(); session.game=g; renderTeams(); go('lobby'); if(window.DahoomLazy) window.DahoomLazy.need(g).catch(()=>{}); if(window.DahoomOwner) window.DahoomOwner.enter(); };
    // لو ضغطوا «ابدأ» قبل ما تكمل الأسئلة: نوقف الضغطة، نعرض «نجهّز الأسئلة» وبعدها نكمل تلقائي
    const START_OF = { 'btn-start':'alf', 'btn-khaliya-start':'khaliya', 'btn-rasm-start':'rasm', 'btn-hawamir-start':'hawamir', 'btn-sadq-start':'sadq' };
    document.addEventListener('click', e=>{
      const b=e.target.closest && e.target.closest('button[id]'); const g=b && (START_OF[b.id] || (b.id==='btn-again' ? session.game : null)), L=window.DahoomLazy;
      if(!g) return;
      // كل اللاعبين المتصلين لازم يكونون ضاغطين «مستعد»
      const N=window.DahoomNet, wait=N && N.waitingFor ? N.waitingFor() : [];
      if(wait.length){ e.stopImmediatePropagation(); e.preventDefault(); toast('ننتظر يضغطون مستعد: '+wait.join('، '), 3500); play('fx_deny',{volume:.5}); return; }
      if(!L || L.ready(g)) return;
      e.stopImmediatePropagation(); e.preventDefault();
      const B=window.DahoomBusy, job=L.need(g);
      (B ? B.wrap(job, 'نجهّز الأسئلة…') : job).then(()=>b.click(), ()=>toast('ما قدرنا نحمّل أسئلة اللعبة — تأكد من النت وجرّب مرة ثانية', 4000));
    }, true);
    // «سوّ جلسة»: ينزل لقسم الألعاب ويوقف على أول لعبة — اختيار اللعبة هو اللي يفتح الجلسة
    { const hm=$('#hub-make'); if(hm) hm.onclick=()=>{
      const sec=$('#games'); if(!sec) return;
      const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
      sec.scrollIntoView({behavior: still?'auto':'smooth', block:'start'});
      const t=$('.game-tile', sec); if(t) setTimeout(()=>t.focus({preventScroll:true}), still?0:450);
      sec.classList.remove('cue'); void sec.offsetWidth; sec.classList.add('cue'); setTimeout(()=>sec.classList.remove('cue'), 1800);
      play('pop',{volume:.4}); }; }
    { const hj=$('#hub-join'); if(hj) hj.onclick=()=>window.DahoomOwner && window.DahoomOwner.joinModal(); }
    $('#card-alf').onclick=()=>openGame('alf');
    $('#card-khaliya').onclick=()=>openGame('khaliya');
    $('#card-rasm').onclick=()=>openGame('rasm');
    { const hm=$('#card-hawamir'); if(hm) hm.onclick=()=>{ session.mode='solo'; session.save(); $$('input[name=mode]').forEach(r=>r.checked=r.value==='solo'); openGame('hawamir'); }; }
    { const sq=$('#card-sadq'); if(sq) sq.onclick=()=>{ session.mode='solo'; session.save(); $$('input[name=mode]').forEach(r=>r.checked=r.value==='solo'); openGame('sadq'); }; }
    $$('.game-tile').forEach(t=>t.addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target===t){ e.preventDefault(); t.click(); } }));
    $('#btn-add-player').onclick=addPlayer;
    $('#p-name').addEventListener('keydown',e=>{ if(e.key==='Enter') addPlayer(); });
    $('#btn-add-team').onclick=addTeam;
    $('#btn-auto-teams').onclick=autoTeams;
    $('#opt-phone-teams').onchange=e=>{ session.phoneTeams=e.target.checked; session.save(); if(window.DahoomNet) window.DahoomNet.refresh(); };
    $$('input[name=mode]').forEach(r=>r.onchange=()=>{ session.mode=r.value; session.save(); renderTeams(); });
    $('#btn-to-settings').onclick=()=>{ if(validateLobby()) go(session.game==='khaliya' ? 'khaliya-settings' : session.game==='rasm' ? 'rasm-settings' : session.game==='hawamir' ? 'hawamir-settings' : session.game==='sadq' ? 'sadq-settings' : 'settings'); };
    $('#btn-reset-used').onclick=async ()=>{
      closeSettingsMenu();
      if(await confirmBox('<h3>تصفير المحتوى المستخدم؟</h3><p class="muted">يرجع كل الأسئلة والعبارات والتحديات اللي انلعبت قبل.</p>','صفّر','إلغاء')){
        store.del('used'); store.del('used_letters'); store.del('used_words'); toast('رجع كل المحتوى جديد'); play('bling'); }
    };
  }
  document.addEventListener('DOMContentLoaded', init);

  return { refreshLobby:()=>{ renderPlayers(); renderTeams(); }, feed, joinPlayer, joinable, createTeam, AVATARS, $, $$, rnd, shuffle, sleep, esc, ic, store, play, stop, stopAll, memeSound, go, toast, modal, confirmBox, confetti, reaction, flash,
    session, competitors, avatarSrc, picks, SYN, ALIAS, resolve, renderSyn, COLORS, setVolume, toggleTheme, applyTheme, cardHTML, TIER_AR, TARGET_AR,
    setReactions(v){ reactOn=!!v; } };
})();
