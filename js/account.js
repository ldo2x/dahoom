/* ===== دحوم — الحسابات والملف الشخصي والأصدقاء والإنجازات =====
   window.DahoomAccount — يشتغل بأي صفحة فيها js/config.js + css/style.css + js/account.js.

   الفكرة:
   - اللاعب يا يسجّل بقوقل أو بيوزرنيم وكلمة سر (ملفه ينحفظ في Firestore)، يا يلعب كضيف (كل شي بجهازه في localStorage).
   - كل حساب له يوزرنيم ما يتكرر (هو معرّف الحساب): ينحجز بوثيقة usernames/{اليوزرنيم}، ويتغيّر مرة كل ساعتين.
     الدخول باليوزرنيم: Firebase يبي إيميل، فنسوي لكل حساب «إيميل دخول» داخلي وهمي (ما يوصله شي) ونحفظه بوثيقة اليوزرنيم.
   - الحالة: presence/{uid} = متصل / بجلسة / يلعب لعبة كذا (تتحدث كل دقيقة والصفحة مفتوحة).
   - الضيف لما يسجّل دخول: أرقامه وإنجازاته تنتقل لحسابه مرة وحدة (وتتصفّر عند الضيف عشان ما تنحسب مرتين).
   - كل شي "أوفلاين أول": الملف ينعرض من النسخة المحفوظة بالجهاز فورًا، والمباريات تنحط بطابور
     وتنرسل للسحابة أول ما يرجع النت. لو Firebase ما حمّل أبد، اللعب ما يتأثر.
   - مكتبة Firebase ما تنحمّل إلا لو اللاعب مسجّل قبل بهالجهاز أو ضغط "سجّل دخول" (عشان الصفحة تبقى خفيفة).
   - ولا دالة ترمي خطأ للي يناديها: الفشل يرجع null أو false.

   وضع الاختبار (localhost بس): ?accstub=1 أو localStorage dahoom_acc_stub=1 أو window.DAHOOM_ACC_STUB=true
   يبدّل Firebase بسحابة وهمية داخل localStorage (تسجيل دخول وهمي + نفس المنطق) عشان نختبر بدون قوقل.
*/
window.DahoomAccount = (function(){
  'use strict';
  const FBV = '10.12.2';
  const CFG = () => window.DAHOOM_FB || {};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ic = (n, cls='') => `<i class="ic ${cls}" style="--i:url(../assets/icons/${n}.svg)"></i>`;
  const rid = (n=10) => { const a='abcdefghijkmnpqrstuvwxyz23456789'; let s=''; const r=new Uint8Array(n); try{ crypto.getRandomValues(r); }catch(e){ for(let i=0;i<n;i++) r[i]=Math.random()*256; } for(let i=0;i<n;i++) s+=a[r[i]%a.length]; return s; };
  const int = (v, lo, hi, d=0) => { v=Math.round(Number(v)); if(!isFinite(v)) v=d; return Math.max(lo, Math.min(hi, v)); };
  const clone = o => JSON.parse(JSON.stringify(o));
  const withTimeout = (p, ms) => new Promise((res, rej) => { const t=setTimeout(()=>rej(new Error('timeout')), ms); p.then(v=>{ clearTimeout(t); res(v); }, e=>{ clearTimeout(t); rej(e); }); });

  // ---------- التخزين بالجهاز ----------
  const P = 'dahoom_acc_';
  const ls = {
    get(k, d=null){ try{ const v=localStorage.getItem(P+k); return v==null ? d : JSON.parse(v); }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem(P+k, JSON.stringify(v)); }catch(e){} },
    del(k){ try{ localStorage.removeItem(P+k); }catch(e){} },
  };
  const isLocalHost = (()=>{ try{ const h=location.hostname; return h==='localhost'||h==='127.0.0.1'||h==='[::1]'||h.endsWith('.localhost'); }catch(e){ return false; } })();
  const STUB = !!window.DAHOOM_ACC_STUB || (isLocalHost && (()=>{ try{ return new URLSearchParams(location.search).has('accstub') || localStorage.getItem('dahoom_acc_stub')==='1'; }catch(e){ return false; } })());

  // ---------- الألعاب ----------
  const GAMES = {
    alf:     { name:'ألف نقطة',    icon:'brain' },
    khaliya: { name:'خلية الحروف', icon:'acc-hexagon' },
    rasm:    { name:'ارسم وخمّن',  icon:'acc-brush' },
    hawamir: { name:'هوامير',      icon:'hm-building' },
    sadq:    { name:'ما أصدقك',    icon:'masks' },
  };
  const GAME_IDS = Object.keys(GAMES);

  // صور اللاعبين وألوانهم: نفس قوائم core.js (لو الصفحة فيها core.js ناخذها منه)
  const AVATARS = (window.Dahoom && window.Dahoom.AVATARS) || ['doge','cheems','pepe_the_frog','trollface','gigachad','wojak','shrek_face','patrick_star','squidward','kermit','grumpy_cat','smudge_cat','crying_cat','pop_cat',
    'hide_the_pain_harold','mr_bean','nicolas_cage','the_rock_eyebrow','monkey_puppet','capybara','sad_hamster','chill_guy','minion','baby_yoda','side_eye_chloe','spongebob','saudi_smile','saudi_smirk',
    'tan_otori','astolfo','felix_argyle','hideri','saika','nagisa','anya','chika','frieren','marin','bocchi','nezuko','zero_two','megumin','kaguya','power','mai','luffy','naruto','goku','saitama','hakari','pochita','pikachu','chiikawa','hamtaro'];
  const COLORS = ['#FF3D81','#38B6FF','#FFC23A','#2EE59D','#B07CFF','#FF8A3D','#2EC4B6','#FF5A5F','#C6F432','#F72585','#5B8CFF','#FFD166'];
  const avatarSrc = a => 'assets/avatars/' + (AVATARS.includes(a) ? a : AVATARS[0]) + '.webp';
  const randAvatar = () => AVATARS[Math.floor(Math.random()*AVATARS.length)];

  // ---------- المستويات ----------
  // مجموع الخبرة اللازم توصل المستوى L: 25×(L−1)×(L+2) → م2=100، م5=700، م10=2700، م25=15600
  const MAX_LEVEL = 99;
  const xpNeed = L => 25*(L-1)*(L+2);
  const levelOf = xp => { let L=1; while(L<MAX_LEVEL && xpNeed(L+1)<=xp) L++; return L; };
  function levelInfo(xp){
    xp = Math.max(0, xp|0); const L=levelOf(xp), a=xpNeed(L), b=xpNeed(Math.min(MAX_LEVEL, L+1));
    return { level:L, xp, from:a, to:b, into:xp-a, need:b-a, pct: b>a ? Math.min(1,(xp-a)/(b-a)) : 1 };
  }
  // خبرة المباراة: حضور 20، فوز 30، منصة 10، وكل منافس 2 (لين 10)
  const isPodium = m => m.of>=3 ? m.rank<=3 : m.rank===1;
  const xpFor = m => 20 + (m.won?30:0) + (isPodium(m)?10:0) + Math.min(m.of,10)*2;

  // ---------- الندرة ----------
  const RARITY = {
    common:    { name:'عادي',   xp:20,  color:'var(--ok)' },
    rare:      { name:'نادر',   xp:50,  color:'var(--info)' },
    epic:      { name:'ملحمي',  xp:120, color:'var(--steal)' },
    legendary: { name:'أسطوري', xp:250, color:'var(--gold)' },
  };

  // ---------- الإنجازات ----------
  // val(S) يرجع الرقم الحالي، goal الهدف. التقدّم = val/goal.
  const per = (S, g) => (S.per && S.per[g]) || { g:0, w:0, best:0, s:{} };
  const pstat = (S, g, k) => (per(S,g).s || {})[k] || 0;
  const countGames = (S, f) => GAME_IDS.filter(g=>per(S,g)[f]>0).length;
  const ACHIEVEMENTS = [
    // عامة
    { id:'first_game', name:'أول طلعة',       desc:'العب أول مباراة',                     icon:'acc-rocket',   rarity:'common',    goal:1,   val:S=>S.games },
    { id:'first_win',  name:'أول فوز',        desc:'افز بأي لعبة',                         icon:'trophy',       rarity:'common',    goal:1,   val:S=>S.wins },
    { id:'games_10',   name:'من أهل المجلس',  desc:'العب 10 مباريات',                      icon:'team',         rarity:'common',    goal:10,  val:S=>S.games },
    { id:'games_50',   name:'سهّير',          desc:'العب 50 مباراة',                       icon:'hourglass',    rarity:'rare',      goal:50,  val:S=>S.games },
    { id:'games_200',  name:'عمود المجلس',    desc:'العب 200 مباراة',                      icon:'acc-chart',    rarity:'epic',      goal:200, val:S=>S.games },
    { id:'wins_10',    name:'فوّاز',          desc:'افز 10 مرات',                          icon:'acc-medal',    rarity:'rare',      goal:10,  val:S=>S.wins },
    { id:'wins_50',    name:'ما ينغلب',       desc:'افز 50 مرة',                           icon:'crown',        rarity:'epic',      goal:50,  val:S=>S.wins },
    { id:'streak_3',   name:'على نار',        desc:'افز 3 مرات ورا بعض',                   icon:'flame',        rarity:'rare',      goal:3,   val:S=>S.bestStreak },
    { id:'streak_5',   name:'محد يوقفه',      desc:'افز 5 مرات ورا بعض',                   icon:'acc-bolt',     rarity:'legendary', goal:5,   val:S=>S.bestStreak },
    { id:'podium_10',  name:'دايم بالمنصة',   desc:'خلّص بالمراكز الثلاث الأولى 10 مرات',  icon:'podium',       rarity:'rare',      goal:10,  val:S=>S.podiums },
    { id:'last_5',     name:'الحظ زعلان',     desc:'اطلع الأخير 5 مرات وكمّل لعب',         icon:'skull',        rarity:'common',    goal:5,   val:S=>S.lasts },
    { id:'explorer',   name:'جرّب كل شي',     desc:'العب كل ألعاب دحوم الخمس',             icon:'acc-target',   rarity:'rare',      goal:5,   val:S=>countGames(S,'g') },
    { id:'all_wins',   name:'سيد الألعاب',    desc:'افز مرة على الأقل بكل لعبة',           icon:'sparkles',     rarity:'legendary', goal:5,   val:S=>countGames(S,'w') },
    { id:'big_room',   name:'الديوانية فل',   desc:'العب مباراة فيها 8 منافسين وفوق',      icon:'acc-users',    rarity:'rare',      goal:8,   val:S=>S.maxOf },
    { id:'night_owl',  name:'سهرة للفجر',     desc:'العب مباراة بين 2 و5 الفجر',           icon:'moon',         rarity:'rare',      goal:1,   val:S=>S.night },
    { id:'days_7',     name:'زبون دايم',      desc:'العب في 7 أيام مختلفة',                icon:'acc-calendar', rarity:'rare',      goal:7,   val:S=>S.days },
    { id:'days_30',    name:'من أهل البيت',   desc:'العب في 30 يوم مختلف',                 icon:'acc-calendar', rarity:'epic',      goal:30,  val:S=>S.days },
    { id:'level_10',   name:'مستوى عشرة',     desc:'وصّل المستوى 10',                      icon:'star',         rarity:'epic',      goal:10,  val:S=>S.level },
    { id:'level_25',   name:'أسطورة دحوم',    desc:'وصّل المستوى 25',                      icon:'acc-award',    rarity:'legendary', goal:25,  val:S=>S.level },
    { id:'friend_1',   name:'أخوياك معك',       desc:'ضيف أول صديق',                         icon:'acc-user-plus',rarity:'common',    goal:1,   val:S=>S.friends },
    { id:'friend_10',  name:'الشلة كاملة',    desc:'ضيف 10 أصدقاء',                        icon:'acc-users',    rarity:'rare',      goal:10,  val:S=>S.friends },
    // ألف نقطة
    { id:'alf_win',    name:'أبو ألف',        desc:'افز بألف نقطة',                        icon:'brain',        rarity:'common',    goal:1,   val:S=>per(S,'alf').w,  game:'alf' },
    { id:'alf_10',     name:'ملك الأسئلة',    desc:'افز بألف نقطة 10 مرات',                icon:'brain',        rarity:'epic',      goal:10,  val:S=>per(S,'alf').w,  game:'alf' },
    { id:'alf_steals', name:'حرامي النقاط',   desc:'اسرق 25 مرة بألف نقطة',                icon:'ninja',        rarity:'rare',      goal:25,  val:S=>pstat(S,'alf','steals'), game:'alf' },
    // خلية الحروف
    { id:'kh_win',     name:'النحّال',        desc:'افز بخلية الحروف',                     icon:'acc-hexagon',  rarity:'common',    goal:1,   val:S=>per(S,'khaliya').w, game:'khaliya' },
    { id:'kh_10',      name:'ملك الخلية',     desc:'افز بخلية الحروف 10 مرات',             icon:'hive',         rarity:'epic',      goal:10,  val:S=>per(S,'khaliya').w, game:'khaliya' },
    // ارسم وخمّن
    { id:'rs_win',     name:'فنان الحارة',    desc:'افز بارسم وخمّن',                      icon:'acc-brush',    rarity:'common',    goal:1,   val:S=>per(S,'rasm').w, game:'rasm' },
    { id:'rs_20',      name:'ريشة ذهبية',     desc:'العب ارسم وخمّن 20 مرة',               icon:'acc-palette',  rarity:'rare',      goal:20,  val:S=>per(S,'rasm').g, game:'rasm' },
    // هوامير
    { id:'hm_win',     name:'هامور',          desc:'افز بهوامير',                          icon:'hm-building',  rarity:'common',    goal:1,   val:S=>per(S,'hawamir').w, game:'hawamir' },
    { id:'hm_5',       name:'إمبراطور العقار',desc:'افز بهوامير 5 مرات',                   icon:'hm-building-skyscraper', rarity:'epic', goal:5, val:S=>per(S,'hawamir').w, game:'hawamir' },
    // ما أصدقك
    { id:'sq_win',     name:'وجه بوكر',       desc:'افز بما أصدقك',                        icon:'masks',        rarity:'common',    goal:1,   val:S=>per(S,'sadq').w, game:'sadq' },
    { id:'sq_caught',  name:'كاشف الكذب',     desc:'اكشف 15 كذبة صح بما أصدقك',            icon:'eye',          rarity:'rare',      goal:15,  val:S=>pstat(S,'sadq','caught'), game:'sadq' },
  ];
  const ACH = Object.fromEntries(ACHIEVEMENTS.map(a=>[a.id,a]));
  function achProgress(id, S){
    const a=ACH[id]; if(!a) return null; S=normStats(S);
    const v=Math.max(0, Number(a.val(S))||0), done=!!S.ach[id];
    return { done, at:S.ach[id]||0, value:Math.min(v,a.goal), goal:a.goal, pct: done ? 1 : Math.min(1, v/a.goal) };
  }

  // ---------- الكماليات: الخلفيات والإطارات والألقاب ----------
  // unlock: {level:n} أو {ach:'id'} — بدون unlock = مفتوح للكل
  const BANNERS = [
    { id:'dusk',  name:'غروب',      bg:'linear-gradient(135deg,#FF3D81 0%,#7A2BBF 58%,#2A1740 100%)' },
    { id:'night', name:'ليل نجد',   bg:'radial-gradient(circle at 30% 40%,rgba(255,255,255,.55) 0 1px,transparent 2px) 0 0/38px 38px,radial-gradient(circle at 70% 70%,rgba(255,255,255,.35) 0 1px,transparent 2px) 0 0/57px 57px,linear-gradient(180deg,#0B1636,#2B1B4F)' },
    { id:'sadu',  name:'سدو',       bg:'linear-gradient(90deg,rgba(13,11,20,.55),rgba(13,11,20,.1)),var(--sadu-weave) 0 0/28px 28px', unlock:{ level:3 } },
    { id:'mint',  name:'نعناع',     bg:'linear-gradient(120deg,#2FD98F,#1D8A8A 60%,#123A4A)', unlock:{ ach:'first_win' } },
    { id:'dunes', name:'طعوس',      bg:'radial-gradient(120% 80% at 85% 125%,#B8621F 0 42%,transparent 43%),radial-gradient(130% 90% at 10% 135%,#D98A35 0 46%,transparent 47%),linear-gradient(180deg,#FFD08A,#F08A3C)', unlock:{ level:5 } },
    { id:'sea',   name:'بحر جدة',   bg:'radial-gradient(140% 60% at 50% 120%,#0B1A3A 0 40%,transparent 41%),linear-gradient(160deg,#7CC6FF,#1B4E9B 65%,#0B1A3A)', unlock:{ level:8 } },
    { id:'neon',  name:'نيون',      bg:'linear-gradient(135deg,#C6F432,#2EC4B6 50%,#5B8CFF)', unlock:{ ach:'games_50' } },
    { id:'fire',  name:'جمر',       bg:'radial-gradient(90% 130% at 50% 135%,#FFCB62,#FF5468 45%,#4A0B1A 85%)', unlock:{ ach:'streak_3' } },
    { id:'gold',  name:'ذهب',       bg:'linear-gradient(135deg,rgba(245,184,61,.94),rgba(135,82,0,.94)),var(--sadu-weave) 0 0/22px 22px', unlock:{ level:12 } },
    { id:'royal', name:'ملكي',      bg:'linear-gradient(135deg,rgba(91,50,201,.88),rgba(20,10,40,.92)),var(--sadu-weave) 0 0/34px 34px', unlock:{ ach:'all_wins' } },
  ];
  const FRAMES = [
    { id:'none',    name:'بدون' },
    { id:'color',   name:'لونك' },
    { id:'brand',   name:'وردي' },
    { id:'mint',    name:'أخضر',     unlock:{ ach:'first_win' } },
    { id:'gold',    name:'ذهبي',     unlock:{ level:5 } },
    { id:'double',  name:'مزدوج',    unlock:{ ach:'podium_10' } },
    { id:'sadu',    name:'سدو',      unlock:{ level:10 } },
    { id:'fire',    name:'جمر',      unlock:{ ach:'streak_5' } },
    { id:'rainbow', name:'قوس قزح',  unlock:{ ach:'all_wins' } },
  ];
  const TITLES = [
    { id:'new',      name:'لاعب جديد' },
    { id:'regular',  name:'من أهل المجلس', unlock:{ ach:'games_10' } },
    { id:'winner',   name:'الفوّاز',       unlock:{ ach:'wins_10' } },
    { id:'hot',      name:'على نار',       unlock:{ ach:'streak_3' } },
    { id:'unlucky',  name:'الحظ زعلان',    unlock:{ ach:'last_5' } },
    { id:'nightowl', name:'السهران',       unlock:{ ach:'night_owl' } },
    { id:'brain',    name:'أبو ألف',       unlock:{ ach:'alf_win' } },
    { id:'bee',      name:'النحّال',       unlock:{ ach:'kh_win' } },
    { id:'artist',   name:'الفنان',        unlock:{ ach:'rs_win' } },
    { id:'whale',    name:'الهامور',       unlock:{ ach:'hm_win' } },
    { id:'poker',    name:'وجه بوكر',      unlock:{ ach:'sq_win' } },
    { id:'social',   name:'اجتماعي',       unlock:{ ach:'friend_10' } },
    { id:'master',   name:'سيد الألعاب',   unlock:{ ach:'all_wins' } },
    { id:'legend',   name:'أسطورة دحوم',   unlock:{ ach:'level_25' } },
  ];
  const CAT = { banner:BANNERS, frame:FRAMES, title:TITLES };
  const findIn = (kind, id) => (CAT[kind]||[]).find(x=>x.id===id) || null;
  function isUnlocked(kind, id, S){
    const it=findIn(kind, id); if(!it) return false; if(!it.unlock) return true; S=normStats(S);
    if(it.unlock.level) return S.level >= it.unlock.level;
    if(it.unlock.ach) return !!S.ach[it.unlock.ach];
    return false;
  }
  function unlockHint(kind, id){
    const it=findIn(kind, id); if(!it || !it.unlock) return '';
    if(it.unlock.level) return `يفتح بالمستوى ${it.unlock.level}`;
    const a=ACH[it.unlock.ach]; return a ? `يفتح بإنجاز «${a.name}»` : '';
  }
  const bannerBg = id => (findIn('banner', id) || BANNERS[0]).bg;
  const titleName = id => (findIn('title', id) || TITLES[0]).name;

  // ---------- شكل الملف ----------
  function blankStats(){ return { games:0, wins:0, xp:0, level:1, streak:0, bestStreak:0, podiums:0, lasts:0, maxOf:0, night:0, days:0, lastDay:'', friends:0, per:{}, ach:{}, recent:[] }; }
  function newProfile(o={}){
    return Object.assign(blankStats(), { name:cleanName(o.name)||'لاعب', avatar:AVATARS.includes(o.avatar)?o.avatar:randAvatar(), banner:'dusk', frame:'color',
      color:/^#[0-9a-f]{6}$/i.test(o.color||'')?o.color:COLORS[Math.floor(Math.random()*COLORS.length)], bio:'', title:'new', merged:[], created:Date.now(), updated:Date.now() });
  }
  // يصلّح أي ملف ناقص أو قديم (من السحابة أو الجهاز) عشان باقي الكود يثق بالشكل
  function normStats(S){
    S = S || {}; const b=blankStats();
    for(const k of Object.keys(b)) if(S[k]===undefined || S[k]===null || typeof S[k]!==typeof b[k] || Array.isArray(b[k])!==Array.isArray(S[k])) S[k]=clone(b[k]);
    for(const g of Object.keys(S.per)){ if(!GAMES[g]) { delete S.per[g]; continue; } const x=S.per[g]||{}; S.per[g]={ g:x.g|0, w:x.w|0, best:Number(x.best)||0, s:(x.s&&typeof x.s==='object')?x.s:{} }; }
    S.level = levelOf(S.xp);
    return S;
  }
  function normProfile(p){
    p = normStats(p || {});
    if(!p.name) p.name='لاعب'; if(!AVATARS.includes(p.avatar)) p.avatar=AVATARS[0];
    if(!findIn('banner', p.banner)) p.banner='dusk'; if(!findIn('frame', p.frame)) p.frame='color'; if(!findIn('title', p.title)) p.title='new';
    if(!/^#[0-9a-f]{6}$/i.test(p.color||'')) p.color=COLORS[0];
    if(typeof p.bio!=='string') p.bio='';
    if(!Array.isArray(p.merged)) p.merged=[];
    if(typeof p.username!=='string' || !UNAME_RE.test(p.username)) p.username='';
    p.unameAt = Number(p.unameAt)||0;
    return p;
  }
  // الحقول اللي تنكتب بالسحابة (لازم تطابق firestore.rules)
  const DOC_KEYS = ['name','nameLower','username','unameAt','avatar','banner','frame','color','bio','title','xp','level','games','wins','streak','bestStreak','podiums','lasts','maxOf','night','days','lastDay','friends','per','ach','recent','merged','created','updated'];
  function toDoc(p){ const d={}; p.nameLower=normName(p.name); for(const k of DOC_KEYS) d[k]=clone(p[k]); return d; }

  // ---------- اليوزرنيم ----------
  // حروف إنجليزية صغيرة وأرقام و _ و . (من 3 إلى 20) — لازم تطابق firestore.rules
  const UNAME_RE = /^[a-z0-9_.]{3,20}$/;
  const UNAME_GAP = 2*3600*1000;   // تغيير اليوزرنيم: مرة كل ساعتين
  const LOGIN_DOMAIN = 'login.dahoom.invalid';   // نطاق محجوز ما يستقبل بريد — للإيميل الداخلي حق الدخول باليوزرنيم
  const cleanUname = s => String(s||'').trim().replace(/^@/,'').toLowerCase();
  function unameProblem(u){
    if(!u) return 'اكتب يوزرنيم';
    if(u.length<3) return 'اليوزرنيم لازم 3 حروف أو أكثر';
    if(u.length>20) return 'اليوزرنيم أقصاه 20 حرف';
    if(!UNAME_RE.test(u)) return 'استخدم حروف إنجليزية صغيرة وأرقام و _ و . بس';
    if(/^[._]|[._]$/.test(u) || /\.\./.test(u)) return 'لا تبدأ ولا تنتهي بنقطة أو شرطة، ولا نقطتين ورا بعض';
    return '';
  }

  // ---------- الأسماء ----------
  const BAD_CH = /[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩<>]/g;
  const cleanName = s => String(s||'').replace(BAD_CH,'').replace(/\s+/g,' ').trim().slice(0,20);
  const cleanBio = s => String(s||'').replace(/[\u0000-\u0009\u000B-\u001F\u007F‪-‮⁦-⁩]/g,'').replace(/\n{3,}/g,'\n\n').trim().slice(0,120);
  // للبحث: نشيل التشكيل والتطويل ونوحّد الهمزات والتاء المربوطة والألف المقصورة
  const normName = s => String(s||'').toLowerCase().normalize('NFKC').replace(/[ً-ٰٟـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim().slice(0,40);

  // ---------- تطبيق مباراة على الأرقام ----------
  const ymd = t => { const d=new Date(t); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
  function evalAch(S){
    const fresh=[];
    for(let pass=0; pass<4; pass++){
      S.level=levelOf(S.xp); let got=0;
      for(const a of ACHIEVEMENTS){
        if(S.ach[a.id]) continue;
        if((Number(a.val(S))||0) >= a.goal){ S.ach[a.id]=Date.now(); S.xp += RARITY[a.rarity].xp; fresh.push(a.id); got++; }
      }
      if(!got) break;
    }
    S.level=levelOf(S.xp);
    return fresh;
  }
  function applyMatch(S, m){
    if(S.recent.some(r=>r.id===m.id)) return { newAchievements:[], levelUp:false, xp:0, dup:true };
    const lv0=S.level;
    S.games++; if(m.won) S.wins++;
    const g = S.per[m.game] || (S.per[m.game] = { g:0, w:0, best:0, s:{} });
    g.g++; if(m.won) g.w++; if(m.score>g.best) g.best=m.score;
    for(const [k,v] of Object.entries(m.stats||{})){ if(k in g.s || Object.keys(g.s).length<8) g.s[k]=int((g.s[k]||0)+v, 0, 1e7); }
    S.streak = m.won ? S.streak+1 : 0; S.bestStreak = Math.max(S.bestStreak, S.streak);
    if(isPodium(m)) S.podiums++;
    if(m.of>1 && m.rank===m.of) S.lasts++;
    S.maxOf = Math.max(S.maxOf, m.of);
    const h=new Date(m.at).getHours(); if(h>=2 && h<5) S.night++;
    const day=ymd(m.at); if(day!==S.lastDay){ S.days++; S.lastDay=day; }
    const gain=xpFor(m); S.xp += gain;
    S.recent.unshift({ id:m.id, game:m.game, rank:m.rank, of:m.of, won:m.won, score:m.score, mode:m.mode, at:m.at });
    S.recent.sort((a,b)=>b.at-a.at); if(S.recent.length>20) S.recent.length=20;
    const fresh=evalAch(S);
    return { newAchievements:fresh, levelUp:S.level>lv0, level:S.level, xp:gain };
  }
  // دمج أرقام ضيف بملف (مرة وحدة لكل دفعة id)
  function mergeStats(T, src, id){
    if(id && T.merged.includes(id)) return;
    src=normStats(clone(src));
    for(const k of ['games','wins','podiums','lasts','night','days','xp']) T[k]+=src[k];
    T.bestStreak=Math.max(T.bestStreak, src.bestStreak); T.maxOf=Math.max(T.maxOf, src.maxOf);
    for(const [g,x] of Object.entries(src.per)){
      const t=T.per[g] || (T.per[g]={ g:0, w:0, best:0, s:{} });
      t.g+=x.g; t.w+=x.w; t.best=Math.max(t.best, x.best);
      for(const [k,v] of Object.entries(x.s||{})) if(k in t.s || Object.keys(t.s).length<8) t.s[k]=int((t.s[k]||0)+v,0,1e7);
    }
    for(const [a,t] of Object.entries(src.ach)) if(ACH[a]){ if(!T.ach[a]) T.ach[a]=t; else T.ach[a]=Math.min(T.ach[a], t); }
    const seen=new Set(T.recent.map(r=>r.id));
    T.recent = T.recent.concat(src.recent.filter(r=>!seen.has(r.id))).sort((a,b)=>b.at-a.at).slice(0,20);
    if(id){ T.merged.push(id); if(T.merged.length>10) T.merged=T.merged.slice(-10); }
    evalAch(T);
  }
  // تنظيف مدخلات recordMatch
  function cleanMatch(m){
    if(!m || !GAMES[m.game]) return null;
    const of=int(m.of, 1, 50, 1), rank=int(m.rank, 1, of, of);
    const stats={}; let n=0;
    if(m.stats && typeof m.stats==='object') for(const [k,v] of Object.entries(m.stats)){ if(n>=8) break; if(/^[a-zA-Z]{1,16}$/.test(k) && isFinite(Number(v))){ stats[k]=int(v,0,1e5); n++; } }
    let at = m.at instanceof Date ? m.at.getTime() : Number(m.at); if(!isFinite(at) || at<=0 || at>Date.now()+864e5) at=Date.now();
    return { id: /^[\w-]{4,40}$/.test(m.id||'') ? m.id : 'm'+Date.now().toString(36)+rid(6), game:m.game, rank, of,
      won: m.won===undefined ? rank===1 : !!m.won, score:int(m.score,-1e7,1e7,0), stats,
      mode: String(m.mode||'').replace(/[^a-z]/g,'').slice(0,8) || 'solo', at };
  }

  // =====================================================================
  //  طبقة السحابة: Firebase الحقيقي أو الوهمي (نفس الواجهة)
  //  boot, onAuth, signIn, signOut, get, set, list, search, batch — كلها ممكن ترمي، واللي فوق يمسك
  // =====================================================================
  function firebaseCloud(){
    let A=null, F=null, auth=null, db=null, booting=null;
    const boot = () => booting || (booting = (async()=>{
      const c=CFG(); if(!c.apiKey || !c.projectId) throw new Error('no-config');
      const base=`https://www.gstatic.com/firebasejs/${FBV}/`;
      const [App, Au, Fs] = await withTimeout(Promise.all([import(base+'firebase-app.js'), import(base+'firebase-auth.js'), import(base+'firebase-firestore.js')]), 15000);
      const app = App.getApps().find(a=>a.name==='[DEFAULT]') || App.initializeApp(c);
      A=Au; F=Fs; auth=A.getAuth(app); db=F.getFirestore(app);
      try{ const r=await A.getRedirectResult(auth); void r; }catch(e){}
      return true;
    })().catch(e=>{ booting=null; throw e; }));
    const ref = p => F.doc(db, ...p.split('/'));
    const col = p => F.collection(db, ...p.split('/'));
    const T = 9000;
    return {
      kind:'firebase', boot,
      onAuth(cb){ A.onAuthStateChanged(auth, u=>cb(u ? { uid:u.uid, name:u.displayName||'' } : null)); },
      async signIn(){
        const prov = new A.GoogleAuthProvider(); prov.setCustomParameters({ prompt:'select_account' });
        try{ const r=await A.signInWithPopup(auth, prov); return r && r.user ? { uid:r.user.uid, name:r.user.displayName||'' } : null; }
        catch(e){
          if(e && (e.code==='auth/popup-blocked' || e.code==='auth/operation-not-supported-in-this-environment')){ ls.set('redir', 1); await A.signInWithRedirect(auth, prov); return null; }
          throw e;
        }
      },
      signOut: () => A.signOut(auth),
      async signUpPw(em, pw){ const r=await A.createUserWithEmailAndPassword(auth, em, pw); return { uid:r.user.uid, name:'' }; },
      async signInPw(em, pw){ const r=await A.signInWithEmailAndPassword(auth, em, pw); return { uid:r.user.uid, name:r.user.displayName||'' }; },
      hasPw(){ const u=auth.currentUser; return !!(u && u.providerData.some(x=>x.providerId==='password')); },
      pwEmail(){ const u=auth.currentUser, x=u && u.providerData.find(x=>x.providerId==='password'); return x ? x.email : ''; },
      async setPw(em, pw){
        const u=auth.currentUser; if(!u) throw new Error('no-user');
        if(u.providerData.some(x=>x.providerId==='password')) await A.updatePassword(u, pw);
        else await A.linkWithCredential(u, A.EmailAuthProvider.credential(em, pw));
      },
      async get(p){ const s=await withTimeout(F.getDoc(ref(p)), T); return s.exists() ? s.data() : null; },
      set: (p, d, merge) => withTimeout(F.setDoc(ref(p), d, merge ? { merge:true } : {}), T),
      async list(p, n=100){ const s=await withTimeout(F.getDocs(F.query(col(p), F.limit(n))), T); return s.docs.map(d=>Object.assign({ id:d.id }, d.data())); },
      async search(pre, n, field){
        const k=field||'nameLower';
        const q=F.query(col('users'), F.where(k,'>=',pre), F.where(k,'<=',pre+''), F.orderBy(k), F.limit(n));
        const s=await withTimeout(F.getDocs(q), T); return s.docs.map(d=>Object.assign({ id:d.id }, d.data()));
      },
      async batch(ops){ const b=F.writeBatch(db); ops.forEach(o=>o.del ? b.delete(ref(o.path)) : b.set(ref(o.path), o.data, o.merge?{ merge:true }:{})); await withTimeout(b.commit(), T); },
    };
  }
  // سحابة وهمية للاختبار: قاعدة بيانات داخل localStorage، والمستخدم يتحدد بـ window.DAHOOM_ACC_STUB_USER أو يتولّد
  function stubCloud(){
    const DBK='stub_db', AUK='stub_auth', lag=()=>new Promise(r=>setTimeout(r, 15));
    const db=()=>ls.get(DBK, {}), save=d=>ls.set(DBK, d);
    let cb=null;
    const fail = () => { if(window.DAHOOM_ACC_STUB_FAIL) throw new Error('stub-offline'); };
    return {
      kind:'stub',
      async boot(){ await lag(); fail(); return true; },
      onAuth(f){ cb=f; setTimeout(()=>f(ls.get(AUK, null)), 5); },
      async signIn(){ await lag(); fail(); const u=window.DAHOOM_ACC_STUB_USER || { uid:'stub_'+rid(8), name:'لاعب تجريبي' }; ls.set(AUK, u); if(cb) cb(u); return u; },
      async signOut(){ ls.del(AUK); if(cb) cb(null); },
      async signUpPw(em, pw){ await lag(); fail(); const pws=ls.get('stub_pw',{}); if(pws[em]) throw { code:'auth/email-already-in-use' }; const u={ uid:'stub_'+rid(8), name:'' }; pws[em]={ pw, uid:u.uid }; ls.set('stub_pw',pws); ls.set(AUK,u); if(cb) cb(u); return u; },
      async signInPw(em, pw){ await lag(); fail(); const x=ls.get('stub_pw',{})[em]; if(!x || x.pw!==pw) throw { code:'auth/invalid-credential' }; const u={ uid:x.uid, name:'' }; ls.set(AUK,u); if(cb) cb(u); return u; },
      hasPw(){ const u=ls.get(AUK,null), pws=ls.get('stub_pw',{}); return !!(u && Object.values(pws).some(x=>x.uid===u.uid)); },
      pwEmail(){ const u=ls.get(AUK,null), pws=ls.get('stub_pw',{}); return (u && Object.keys(pws).find(k=>pws[k].uid===u.uid)) || ''; },
      async setPw(em, pw){ await lag(); fail(); const u=ls.get(AUK,null); if(!u) throw new Error('no-user'); const pws=ls.get('stub_pw',{}); const k=Object.keys(pws).find(k=>pws[k].uid===u.uid)||em; pws[k]={ pw, uid:u.uid }; ls.set('stub_pw',pws); },
      async get(p){ await lag(); fail(); const v=db()[p]; return v ? clone(v) : null; },
      async set(p, d, merge){ await lag(); fail(); const x=db(); x[p] = merge ? Object.assign(x[p]||{}, clone(d)) : clone(d); save(x); },
      async list(p, n=100){ await lag(); fail(); const x=db(), pre=p+'/'; return Object.keys(x).filter(k=>k.startsWith(pre) && !k.slice(pre.length).includes('/')).slice(0,n).map(k=>Object.assign({ id:k.slice(pre.length) }, clone(x[k]))); },
      async search(pre, n, field){ await lag(); fail(); const f=field||'nameLower', x=db(); return Object.keys(x).filter(k=>/^users\/[^/]+$/.test(k) && String(x[k][f]||'').startsWith(pre)).sort((a,b)=>x[a][f]<x[b][f]?-1:1).slice(0,n).map(k=>Object.assign({ id:k.slice(6) }, clone(x[k]))); },
      async batch(ops){ await lag(); fail(); const x=db(); ops.forEach(o=>{ if(o.del) delete x[o.path]; else x[o.path] = o.merge ? Object.assign(x[o.path]||{}, clone(o.data)) : clone(o.data); }); save(x); },
    };
  }
  const cloud = STUB ? stubCloud() : firebaseCloud();
  let cloudOk = null;    // null = ما جرّبنا، true/false
  async function bootCloud(){ try{ await cloud.boot(); cloudOk=true; return true; }catch(e){ cloudOk=false; return false; } }

  // =====================================================================
  //  الحالة
  // =====================================================================
  // mode: 'none' (ما اختار) | 'guest' | 'user'
  const st = { mode:'none', uid:null, prof:null, ready:false, offline:false, syncing:false, authHooked:false };
  const subs = new Set();
  function emit(){ const c=current(); subs.forEach(f=>{ try{ f(c); }catch(e){ console.error(e); } }); }
  const guestRec = () => { const g=ls.get('guest', null); return g && /^g_[a-z0-9]{6,16}$/.test(g.id||'') ? normProfile(g) : null; };
  const saveGuest = g => ls.set('guest', g);
  const userCache = uid => { const c=ls.get('u_'+uid, null); return c ? normProfile(c) : null; };
  const saveCache = (uid, p) => ls.set('u_'+uid, p);
  const queue = uid => Object.assign({ matches:[], patch:null, merge:null, friends:null }, ls.get('q_'+uid, {}));
  const saveQueue = (uid, q) => ls.set('q_'+uid, q);
  const queueEmpty = q => !q.matches.length && !q.patch && !q.merge && q.friends==null;

  function pub(p, uid, guest){
    if(!p) return null; const L=levelInfo(p.xp);
    return { uid, guest:!!guest, name:p.name, username:p.username||'', unameAt:p.unameAt||0, avatar:p.avatar, banner:p.banner, frame:p.frame, color:p.color, bio:p.bio, title:p.title, titleName:titleName(p.title),
      level:L.level, xp:p.xp, levelInfo:L, games:p.games, wins:p.wins, offline: !guest && st.offline && uid===st.uid };
  }
  function full(p, uid, guest){ if(!p) return null; return Object.assign(clone(p), pub(p, uid, guest)); }
  function current(){
    if(st.mode==='guest' && st.prof) return pub(st.prof, st.prof.id, true);
    if(st.mode==='user' && st.prof) return pub(st.prof, st.uid, false);
    return null;
  }

  // ---------- المزامنة مع السحابة ----------
  // السحابة هي الأساس: نقرا الوثيقة، نطبّق عليها الطابور (مع منع التكرار)، ونكتبها. لو فشل، الطابور يبقى لين ينجح.
  let syncAgain=false, retryT=0;
  async function sync(){
    if(st.mode!=='user' || !st.uid) return false;
    if(st.syncing){ syncAgain=true; return false; }
    st.syncing=true; const uid=st.uid;
    try{
      if(!await bootCloud()) throw new Error('cloud');
      const q=queue(uid);
      let doc = await cloud.get('users/'+uid);
      const base = doc ? normProfile(doc) : normProfile(clone(st.prof || newProfile()));
      if(!doc){ Object.assign(base, blankStats(), { merged:[] }); base.level=1; }   // ملف جديد: الأرقام تجي من الطابور بس
      if(q.merge) mergeStats(base, q.merge.stats, q.merge.id);
      for(const m of q.matches) applyMatch(base, m);
      if(q.patch) Object.assign(base, q.patch);
      if(q.friends!=null){ base.friends=q.friends; evalAch(base); }
      base.updated=Date.now(); if(!base.created) base.created=Date.now();
      if(!doc || !queueEmpty(q)) await cloud.set('users/'+uid, toDoc(base));   // ملف جديد أو فيه تغييرات
      // نشيل من الطابور اللي انكتب بس (ممكن انضاف شي وقت الانتظار)
      const q2=queue(uid), done=new Set(q.matches.map(m=>m.id));
      q2.matches=q2.matches.filter(m=>!done.has(m.id));
      if(q.merge && q2.merge && q2.merge.id===q.merge.id) q2.merge=null;
      if(q.patch && JSON.stringify(q2.patch)===JSON.stringify(q.patch)) q2.patch=null;
      if(q2.friends===q.friends) q2.friends=null;
      saveQueue(uid, q2);
      if(st.uid===uid){
        // اللي بقى بالطابور (لو فيه) نطبّقه على النسخة المحلية عشان العرض يبقى صح
        const view=normProfile(clone(base)); q2.matches.forEach(m=>applyMatch(view,m)); if(q2.patch) Object.assign(view,q2.patch);
        st.prof=view; saveCache(uid, view); st.offline=false; emit();
      }
      return true;
    }catch(e){
      if(!st.offline){ st.offline=true; emit(); }
      clearTimeout(retryT); retryT=setTimeout(sync, 30000);
      return false;
    }finally{
      st.syncing=false;
      if(syncAgain){ syncAgain=false; setTimeout(sync, 50); }
    }
  }
  window.addEventListener('online', ()=>{ if(st.mode==='user') sync(); });

  // ---------- الدخول ----------
  function enterUser(u){
    const uid=u.uid; ls.set('last', uid); ls.del('redir');
    let cache=userCache(uid);
    const g=guestRec();
    if(!cache) cache=normProfile(newProfile({ name: (g && g.name) || u.name, avatar: g && g.avatar, color: g && g.color }));
    // ضيف عنده أرقام؟ تنتقل للحساب مرة وحدة وتتصفّر عنده
    if(g && (g.games>0 || Object.keys(g.ach).length)){
      const q=queue(uid);
      if(!q.merge){
        const stats=clone(g); const id='g'+rid(10);
        q.merge={ id, stats:{ games:stats.games, wins:stats.wins, xp:stats.xp, streak:stats.streak, bestStreak:stats.bestStreak, podiums:stats.podiums, lasts:stats.lasts, maxOf:stats.maxOf, night:stats.night, days:stats.days, lastDay:stats.lastDay, per:stats.per, ach:stats.ach, recent:stats.recent } };
        saveQueue(uid, q); mergeStats(cache, q.merge.stats, id);
        Object.assign(g, blankStats()); saveGuest(g);
      }
    }
    st.mode='user'; st.uid=uid; st.prof=cache; saveCache(uid, cache); emit();
    setTimeout(()=>beat(true), 1500);
    return sync();
  }
  function enterGuestOrNone(){
    const g=guestRec();
    if(g){ st.mode='guest'; st.uid=g.id; st.prof=g; } else { st.mode='none'; st.uid=null; st.prof=null; }
  }
  let authFirst=null;
  function hookAuth(){
    if(st.authHooked) return authFirst; st.authHooked=true;
    authFirst = new Promise(res=>{
      let first=true;
      cloud.onAuth(u=>{
        if(u){ if(st.mode!=='user' || st.uid!==u.uid) enterUser(u); else sync(); }
        else if(st.mode==='user'){ ls.del('last'); enterGuestOrNone(); emit(); }
        if(first){ first=false; res(); }
      });
    });
    return authFirst;
  }

  // ---------- الواجهة العامة ----------
  let initP=null;
  function init(){
    if(initP) return initP;
    initP = (async()=>{
      try{
        injectCSS();
        const last=ls.get('last', null);
        // نعرض النسخة المحفوظة فورًا (حتى لو النت مقطوع)
        if(last && userCache(last)){ st.mode='user'; st.uid=last; st.prof=userCache(last); } else enterGuestOrNone();
        // Firebase ينحمّل بس لو اللاعب مسجّل قبل بهالجهاز (أو راجع من تسجيل بإعادة توجيه)
        if(last || ls.get('redir', null)){
          if(await withTimeout(bootCloud(), 8000).catch(()=>false)){ await withTimeout(hookAuth(), 6000).catch(()=>{}); }
          else if(st.mode==='user'){ st.offline=true; }
        }
      }catch(e){ console.warn('[DahoomAccount] init', e); }
      st.ready=true; emit();
      return current();
    })();
    return initP;
  }
  function onChange(cb){ if(typeof cb!=='function') return ()=>{}; subs.add(cb); return ()=>subs.delete(cb); }

  async function signInGoogle(){
    try{
      if(!await bootCloud()) return null;
      hookAuth();
      const u=await cloud.signIn(); if(!u) return null;
      if(st.mode!=='user' || st.uid!==u.uid) await enterUser(u);
      return current();
    }catch(e){ console.warn('[DahoomAccount] signIn', e && (e.code||e.message)); return null; }
  }
  async function signOut(){
    try{
      const uid=st.uid;
      if(st.mode==='user'){ try{ if(cloudOk){ ACT.s='off'; await beat(true).catch(()=>{}); await cloud.signOut(); } }catch(e){} }
      ls.del('last');
      // نمسح نسخة الحساب من الجهاز (جهاز مشترك) إلا لو فيه شي ما انرسل
      if(uid && queueEmpty(queue(uid))){ ls.del('u_'+uid); ls.del('q_'+uid); ls.del('sent_'+uid); }
      enterGuestOrNone(); st.offline=false; emit(); return true;
    }catch(e){ return false; }
  }
  function continueAsGuest(o={}){
    try{
      let g=guestRec();
      if(!g){ g=normProfile(newProfile({ name:o.name, avatar:o.avatar, color:o.color })); g.id='g_'+rid(10); }
      else { if(o.name && cleanName(o.name)) g.name=cleanName(o.name); if(AVATARS.includes(o.avatar)) g.avatar=o.avatar; }
      saveGuest(g);
      if(st.mode!=='user'){ st.mode='guest'; st.uid=g.id; st.prof=g; emit(); }
      return current();
    }catch(e){ return null; }
  }
  async function saveProfile(patch={}){
    try{
      if(!st.prof || st.mode==='none') return false;
      const p=st.prof, out={};
      if('name' in patch){ const n=cleanName(patch.name); if(!n) return false; out.name=n; }
      if('bio' in patch) out.bio=cleanBio(patch.bio);
      if('avatar' in patch){ if(!AVATARS.includes(patch.avatar)) return false; out.avatar=patch.avatar; }
      if('color' in patch){ if(!/^#[0-9a-f]{6}$/i.test(patch.color||'')) return false; out.color=patch.color.toUpperCase(); }
      for(const k of ['banner','frame','title']) if(k in patch){ if(!isUnlocked(k, patch[k], p)) return false; out[k]=patch[k]; }
      Object.assign(p, out); p.updated=Date.now();
      if(st.mode==='guest'){ saveGuest(p); emit(); return true; }
      const q=queue(st.uid); q.patch=Object.assign(q.patch||{}, out); saveQueue(st.uid, q);
      saveCache(st.uid, p); emit(); sync();
      return true;
    }catch(e){ console.warn('[DahoomAccount] saveProfile', e); return false; }
  }
  // m: { game, rank, of, won, score, stats, mode, at, id?, name?, avatar? }
  // لو ما فيه هوية، يسوي ضيف تلقائي باسم m.name (عشان المباراة ما تضيع)
  function recordMatch(m){
    try{
      const x=cleanMatch(m); if(!x) return null;
      if(st.mode==='none'){ if(!continueAsGuest({ name:m.name, avatar:m.avatar })) return null; }
      const res=applyMatch(st.prof, x);
      if(res.dup) return { newAchievements:[], levelUp:false, xp:0 };
      if(st.mode==='guest') saveGuest(st.prof);
      else { const q=queue(st.uid); q.matches.push(x); if(q.matches.length>200) q.matches=q.matches.slice(-200); saveQueue(st.uid, q); saveCache(st.uid, st.prof); sync(); }
      emit();
      return { newAchievements:res.newAchievements.map(id=>Object.assign({ id }, pickAch(id))), levelUp:res.levelUp, level:res.level, xp:res.xp };
    }catch(e){ console.warn('[DahoomAccount] recordMatch', e); return null; }
  }
  const pickAch = id => { const a=ACH[id]; return a ? { name:a.name, desc:a.desc, icon:a.icon, rarity:a.rarity } : {}; };

  // ملف كامل (أرقام وإنجازات وآخر المباريات). uid فاضي = ملفي
  const profCache = new Map();
  async function getProfile(uid){
    try{
      if(!uid || uid===st.uid) return st.prof ? full(st.prof, st.uid, st.mode==='guest') : null;
      if(/^g_/.test(uid)) return null;   // الضيوف ما لهم ملف عام
      if(!/^[\w-]{4,128}$/.test(uid)) return null;
      if(!await bootCloud()) return profCache.get(uid) || null;
      const d=await cloud.get('users/'+uid); if(!d) return null;
      const p=full(normProfile(d), uid, false); profCache.set(uid, p); return p;
    }catch(e){ return profCache.get(uid) || null; }
  }
  // البحث: بالاسم، أو باليوزرنيم (يبدأ بـ @ أو مكتوب بحروف إنجليزية) — نجمع الاثنين بدون تكرار
  async function searchUsers(prefix){
    try{
      const raw=String(prefix||'').trim(); if(!raw) return [];
      if(!await bootCloud()) return [];
      const un=cleanUname(raw), byU=/^@/.test(raw) || /^[a-z0-9_.]+$/i.test(raw), byN=!/^@/.test(raw) && normName(raw);
      const [a, b] = await Promise.all([ byU && un ? cloud.search(un, 10, 'username').catch(()=>[]) : [], byN ? cloud.search(normName(raw), 10).catch(()=>[]) : [] ]);
      const seen=new Set(), out=[];
      for(const d of a.concat(b)){ if(d.id===st.uid || seen.has(d.id)) continue; seen.add(d.id); const x=normProfile(d);
        out.push({ uid:d.id, name:x.name, username:x.username, avatar:x.avatar, frame:x.frame, color:x.color, level:x.level, title:x.title, titleName:titleName(x.title) }); }
      return out.slice(0, 12);
    }catch(e){ return []; }
  }
  // صاحب يوزرنيم معيّن (أو null)
  async function findByUsername(u){
    try{ u=cleanUname(u); if(unameProblem(u)) return null; if(!await bootCloud()) return null;
      const d=await cloud.get('usernames/'+u); return d && d.uid ? d.uid : null; }catch(e){ return null; }
  }
  // هل اليوزرنيم متاح؟ { ok, why }
  async function checkUsername(u){
    u=cleanUname(u); const bad=unameProblem(u); if(bad) return { ok:false, why:bad };
    if(st.prof && st.prof.username===u) return { ok:true, why:'', same:true };
    try{ if(!await bootCloud()) return { ok:false, why:'ما قدرنا نوصل، تأكد من النت' };
      const d=await cloud.get('usernames/'+u); return d ? { ok:false, why:'اليوزرنيم مأخوذ، جرّب غيره' } : { ok:true, why:'' };
    }catch(e){ return { ok:false, why:'ما قدرنا نتأكد، جرّب مرة ثانية' }; }
  }
  // كم باقي لين يقدر يغيّر اليوزرنيم (ملي ثانية، 0 = يقدر الحين)
  const unameWait = () => { const p=st.prof; if(!p || !p.username || !p.unameAt) return 0; return Math.max(0, p.unameAt + UNAME_GAP - Date.now()); };
  // يحجز يوزرنيم جديد ويفك القديم (عملية وحدة). يرجع { ok, why }
  async function setUsername(u){
    try{
      if(!signedIn()) return { ok:false, why:'سجّل دخول أول' };
      u=cleanUname(u); const bad=unameProblem(u); if(bad) return { ok:false, why:bad };
      const p=st.prof, old=p.username||'';
      if(old===u) return { ok:true, why:'' };
      const w=unameWait(); if(w>0) return { ok:false, why:`تقدر تغيّره بعد ${Math.ceil(w/60000)} دقيقة` };
      if(!await bootCloud()) return { ok:false, why:'ما قدرنا نوصل، تأكد من النت' };
      // نتأكد إن وثيقة الحساب موجودة ومحدّثة (لو فيه مزامنة شغالة ننتظرها)
      let synced=false; for(let i=0;i<12 && !synced;i++){ synced=await sync(); if(!synced){ if(!st.syncing && st.offline) break; await new Promise(r=>setTimeout(r,500)); } }
      if(!synced) return { ok:false, why:'ما قدرنا نحفظ، جرّب مرة ثانية' };
      const taken=await cloud.get('usernames/'+u); if(taken && taken.uid!==st.uid) return { ok:false, why:'اليوزرنيم مأخوذ، جرّب غيره' };
      const oldDoc = old ? await cloud.get('usernames/'+old).catch(()=>null) : null;
      const em = (oldDoc && oldDoc.em) || (cloud.pwEmail ? cloud.pwEmail() : '') || '';
      const now=Date.now();
      const ops=[ { path:'users/'+st.uid, data:{ username:u, unameAt:now }, merge:true }, { path:'usernames/'+u, data: em ? { uid:st.uid, em, at:now } : { uid:st.uid, at:now } } ];
      if(old) ops.push({ path:'usernames/'+old, del:true });
      await cloud.batch(ops);
      p.username=u; p.unameAt=now; saveCache(st.uid, p); emit();
      return { ok:true, why:'' };
    }catch(e){ console.warn('[DahoomAccount] setUsername', e && (e.code||e.message)); return { ok:false, why:'ما قدرنا نحجزه — يمكن أحد سبقك عليه، جرّب مرة ثانية' }; }
  }
  // ---------- الدخول باليوزرنيم وكلمة السر ----------
  const pwProblem = pw => !pw ? 'اكتب كلمة السر' : String(pw).length<6 ? 'كلمة السر لازم 6 حروف أو أكثر' : String(pw).length>64 ? 'كلمة السر طويلة مرة' : '';
  const authWhy = e => { const c=(e && e.code)||''; return /invalid-credential|wrong-password|user-not-found|invalid-login/.test(c) ? 'اليوزرنيم أو كلمة السر غلط'
    : /too-many-requests/.test(c) ? 'محاولات كثيرة — انتظر شوي وجرّب' : /operation-not-allowed/.test(c) ? 'الدخول بكلمة السر مو مفعّل للحين'
    : /weak-password/.test(c) ? 'كلمة السر ضعيفة، خلها 6 حروف أو أكثر' : /requires-recent-login/.test(c) ? 'لأمانك: اطلع وادخل مرة ثانية وبعدها غيّر كلمة السر'
    : /network|timeout/.test(c+String(e&&e.message)) ? 'ما قدرنا نوصل، تأكد من النت' : 'صار خطأ، جرّب مرة ثانية'; };
  // حساب جديد: يوزرنيم + كلمة سر (+ اسم وصورة). يرجع { ok, why }
  async function signUpWithPassword(u, pw, o={}){
    try{
      u=cleanUname(u); const bad=unameProblem(u)||pwProblem(pw); if(bad) return { ok:false, why:bad };
      if(!await bootCloud()) return { ok:false, why:'ما قدرنا نوصل، تأكد من النت' };
      hookAuth();
      const free=await cloud.get('usernames/'+u); if(free) return { ok:false, why:'اليوزرنيم مأخوذ، جرّب غيره' };
      const em='u'+rid(14)+'@'+LOGIN_DOMAIN;
      const user=await cloud.signUpPw(em, pw);
      if(o.name || o.avatar) continueAsGuest({ name:o.name, avatar:o.avatar });   // الاسم والصورة يمشون مع الحساب الجديد
      await enterUser(user);
      const r=await setUsername(u);
      if(!r.ok) return { ok:true, why:'انفتح حسابك، بس اليوزرنيم ما انحجز: '+r.why };
      return { ok:true, why:'' };
    }catch(e){ console.warn('[DahoomAccount] signUp', e && (e.code||e.message)); return { ok:false, why:authWhy(e) }; }
  }
  async function signInWithPassword(u, pw){
    try{
      u=cleanUname(u); if(unameProblem(u) || !pw) return { ok:false, why:'اكتب اليوزرنيم وكلمة السر' };
      if(!await bootCloud()) return { ok:false, why:'ما قدرنا نوصل، تأكد من النت' };
      hookAuth();
      const d=await cloud.get('usernames/'+u);
      if(!d || !d.em) return { ok:false, why:'اليوزرنيم أو كلمة السر غلط' };
      const user=await cloud.signInPw(d.em, pw);
      if(st.mode!=='user' || st.uid!==user.uid) await enterUser(user);
      return { ok:true, why:'' };
    }catch(e){ return { ok:false, why:authWhy(e) }; }
  }
  // كلمة سر للحساب الحالي (حساب قوقل يقدر يضيف كلمة سر عشان يدخل باليوزرنيم بعد)
  const hasPassword = () => { try{ return signedIn() && cloudOk && cloud.hasPw ? cloud.hasPw() : false; }catch(e){ return false; } };
  async function setPassword(pw){
    try{
      if(!signedIn()) return { ok:false, why:'سجّل دخول أول' };
      const bad=pwProblem(pw); if(bad) return { ok:false, why:bad };
      const p=st.prof; if(!p.username) return { ok:false, why:'اختر يوزرنيم أول' };
      if(!await bootCloud()) return { ok:false, why:'ما قدرنا نوصل، تأكد من النت' };
      const ud=await cloud.get('usernames/'+p.username);
      const em=(ud && ud.em) || cloud.pwEmail() || ('u'+rid(14)+'@'+LOGIN_DOMAIN);
      await cloud.setPw(em, pw);
      if(!ud || ud.em!==em) await cloud.set('usernames/'+p.username, { uid:st.uid, em, at:Date.now() });
      return { ok:true, why:'' };
    }catch(e){ return { ok:false, why:authWhy(e) }; }
  }

  // ---------- الحالة: متصل / في جلسة / يلعب ----------
  // s: 'on' متصل بالموقع، 'lobby' بجلسة ينتظر، 'play' يلعب الحين، 'off' طلع. g: اللعبة
  const ACT = { s:'on', g:'' }; let actT=0, actSent='';
  const ONLINE_MS = 150*1000;
  function setActivity(s, g){
    ACT.s = ['on','lobby','play','off'].includes(s) ? s : 'on'; ACT.g = GAMES[g] ? g : '';
    clearTimeout(actT); actT=setTimeout(beat, 400);
  }
  async function beat(force){
    clearTimeout(actT);
    try{
      if(!signedIn() || !cloudOk){ actT=setTimeout(beat, 60000); return; }
      if(document.visibilityState==='hidden' && ACT.s!=='off' && !force){ actT=setTimeout(beat, 60000); return; }
      const key=ACT.s+'|'+ACT.g, now=Date.now();
      if(force || key!==actSent || now-(beat.last||0)>55000){ await cloud.set('presence/'+st.uid, { s:ACT.s, g:ACT.g, at:now }); actSent=key; beat.last=now; }
    }catch(e){}
    if(ACT.s!=='off') actT=setTimeout(beat, 60000);
  }
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') beat(true); });
  // حالة لاعب: { on, s, g, at, text }
  const GAME_AR = g => (GAMES[g]||{}).name || '';
  function presenceText(x){
    if(!x || !x.at) return { on:false, text:'' };
    const on = x.s!=='off' && Date.now()-x.at < ONLINE_MS;
    if(on){
      const t = x.s==='play' ? (x.g ? 'يلعب '+GAME_AR(x.g)+' الحين' : 'يلعب الحين') : x.s==='lobby' ? (x.g ? 'بجلسة '+GAME_AR(x.g) : 'بجلسة') : 'متصل';
      return { on:true, s:x.s, g:x.g, at:x.at, text:t };
    }
    const m=Math.round((Date.now()-x.at)/60000);
    const ago = m<60 ? `قبل ${Math.max(1,m)} دقيقة` : m<1440 ? `قبل ${Math.round(m/60)} ساعة` : `قبل ${Math.round(m/1440)} يوم`;
    return { on:false, s:'off', at:x.at, text:'آخر ظهور '+ago };
  }
  async function getPresence(uid){
    try{ if(!uid || /^g_/.test(uid) || !await bootCloud()) return { on:false, text:'' }; return presenceText(await cloud.get('presence/'+uid)); }catch(e){ return { on:false, text:'' }; }
  }

  // أصدقاء أي لاعب (للعرض بملفه) + المشتركين معي
  async function listFriendsOf(uid){
    try{
      if(!uid || uid===st.uid) return listFriends();
      if(!signedIn() || !await bootCloud()) return [];
      const l=await cloud.list(`users/${uid}/friends`, 300);
      const mine=new Set(((await cloud.list(`users/${st.uid}/friends`, 300).catch(()=>[]))||[]).map(f=>f.id));
      return l.map(f=>({ uid:f.id, name:cleanName(f.name)||'لاعب', avatar:AVATARS.includes(f.avatar)?f.avatar:AVATARS[0], mutual:mine.has(f.id), me:f.id===st.uid }))
        .sort((a,b)=>(b.mutual-a.mutual) || a.name.localeCompare(b.name,'ar'));
    }catch(e){ return []; }
  }

  // ---------- الأصدقاء ----------
  const signedIn = () => st.mode==='user' && !!st.uid;
  const sentSet = () => new Set(signedIn() ? ls.get('sent_'+st.uid, []) : []);
  function markSent(uid, on){ const s=sentSet(); if(on) s.add(uid); else s.delete(uid); ls.set('sent_'+st.uid, [...s].slice(-100)); }
  async function sendFriendRequest(uid){
    try{
      if(!signedIn() || !uid || uid===st.uid || /^g_/.test(uid)) return false;
      if(!await bootCloud()) return false;
      // هو أرسل لي قبل؟ نقبل على طول
      const incoming = await cloud.get(`users/${st.uid}/requests/${uid}`);
      if(incoming) return respondFriendRequest(uid, true);
      const p=st.prof;
      await cloud.set(`users/${uid}/requests/${st.uid}`, { from:st.uid, name:p.name, avatar:p.avatar, level:p.level, at:Date.now() });
      markSent(uid, true); return true;
    }catch(e){ return false; }
  }
  async function respondFriendRequest(uid, accept){
    try{
      if(!signedIn() || !uid) return false;
      if(!await bootCloud()) return false;
      const me=st.uid, p=st.prof;
      if(accept){
        const req = await cloud.get(`users/${me}/requests/${uid}`); if(!req) return false;
        const other = await getProfile(uid);
        const name = cleanName((other && other.name) || req.name) || 'لاعب', avatar = AVATARS.includes(other && other.avatar) ? other.avatar : (AVATARS.includes(req.avatar) ? req.avatar : AVATARS[0]);
        const now=Date.now();
        await cloud.batch([
          { path:`users/${me}/friends/${uid}`, data:{ uid, name, avatar, at:now } },
          { path:`users/${uid}/friends/${me}`, data:{ uid:me, name:p.name, avatar:p.avatar, at:now } },
          { path:`users/${me}/requests/${uid}`, del:true },
        ]);
        markSent(uid, false);
        await refreshFriendCount();
      } else {
        await cloud.batch([{ path:`users/${me}/requests/${uid}`, del:true }]);
      }
      return true;
    }catch(e){ return false; }
  }
  async function removeFriend(uid){
    try{
      if(!signedIn() || !uid) return false;
      if(!await bootCloud()) return false;
      await cloud.batch([{ path:`users/${st.uid}/friends/${uid}`, del:true }, { path:`users/${uid}/friends/${st.uid}`, del:true }]);
      await refreshFriendCount(); return true;
    }catch(e){ return false; }
  }
  async function refreshFriendCount(list){
    try{
      if(!list) list=await cloud.list(`users/${st.uid}/friends`, 300);
      const n=list.length;
      if(st.prof && st.prof.friends!==n){
        st.prof.friends=n; const fresh=evalAch(st.prof);
        const q=queue(st.uid); q.friends=n; saveQueue(st.uid, q); saveCache(st.uid, st.prof); emit(); sync();
        if(fresh.length) document.dispatchEvent(new CustomEvent('dahoom:achievements', { detail:{ newAchievements:fresh.map(id=>Object.assign({ id }, pickAch(id))), levelUp:false } }));
      }
    }catch(e){}
  }
  // الأصدقاء مع آخر بياناتهم وحالتهم (أول 40 نجيب ملفهم الحالي، الباقي من النسخة المحفوظة مع الصداقة)
  async function listFriends(){
    try{
      if(!signedIn() || !await bootCloud()) return [];
      const l=await cloud.list(`users/${st.uid}/friends`, 300);
      refreshFriendCount(l);
      const [fresh, pres] = await Promise.all([ Promise.all(l.slice(0,40).map(f=>getProfile(f.id).catch(()=>null))), Promise.all(l.slice(0,40).map(f=>getPresence(f.id).catch(()=>null))) ]);
      return l.map((f,i)=>{ const x=fresh[i], pr=pres[i]||{ on:false, text:'' }; return { uid:f.id, name:(x&&x.name)||f.name||'لاعب', username:(x&&x.username)||'', avatar:(x&&x.avatar)||f.avatar, frame:(x&&x.frame)||'color', color:(x&&x.color)||COLORS[0], level:(x&&x.level)||1, titleName:x?x.titleName:'', at:f.at||0, pres:pr }; })
        .sort((a,b)=>(b.pres.on-a.pres.on) || b.level-a.level || a.name.localeCompare(b.name,'ar'));
    }catch(e){ return []; }
  }
  async function listRequests(){
    try{
      if(!signedIn() || !await bootCloud()) return [];
      const l=await cloud.list(`users/${st.uid}/requests`, 100);
      return l.map(r=>({ uid:r.id, name:cleanName(r.name)||'لاعب', avatar:AVATARS.includes(r.avatar)?r.avatar:AVATARS[0], level:r.level|0||1, at:r.at||0 })).sort((a,b)=>b.at-a.at);
    }catch(e){ return []; }
  }

  // =====================================================================
  //  الواجهة: صورة بإطار، الشارة، وتنبيه الإنجازات
  // =====================================================================
  // صورة اللاعب بإطاره. size بالبكسل
  function avatarHTML(p, size=48, extra=''){
    p=p||{}; const fr=findIn('frame', p.frame) ? p.frame : 'color';
    return `<span class="dacc-av dacc-fr-${fr} ${extra}" style="--s:${size}px;--pc:${esc(p.color||COLORS[0])}"><img src="${avatarSrc(p.avatar)}" alt="" width="${size}" height="${size}" decoding="async"></span>`;
  }
  // صورة مع حلقة المستوى (للشارة الصغيرة)
  function ringHTML(c, size=40){
    const r=size/2+4, C=2*Math.PI*(r-2), pct=c.levelInfo ? c.levelInfo.pct : 0;
    return `<span class="dacc-ring" style="--s:${size}px;--pc:${esc(c.color)}"><svg viewBox="0 0 ${2*r} ${2*r}" aria-hidden="true"><circle cx="${r}" cy="${r}" r="${r-2}" class="bg"/><circle cx="${r}" cy="${r}" r="${r-2}" class="fg" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-pct)).toFixed(1)}"/></svg><img src="${avatarSrc(c.avatar)}" alt="" width="${size}" height="${size}"><b>${c.level}</b></span>`;
  }
  // الشارة: صورة + اسم + حلقة مستوى، أو أزرار الدخول
  function mountBadge(el, opts={}){
    if(!el) return ()=>{};
    const href = opts.href || 'profile.html';
    injectCSS(); init();
    let guestForm=false, gAv=randAvatar(), busy=false;
    function render(){
      const c=current();
      if(!st.ready){ el.innerHTML='<span class="dacc-badge dacc-skel" aria-hidden="true"></span>'; return; }
      if(c && !guestForm){
        el.innerHTML=`<a class="dacc-badge" href="${esc(href)}" aria-label="ملفك: ${esc(c.name)}، مستوى ${c.level}">${ringHTML(c, 34)}<span class="dacc-bt"><b>${esc(c.name)}</b><small>${c.guest?'ضيف':esc(c.titleName)}${c.offline?' · بدون نت':''}</small></span></a>`;
        return;
      }
      if(guestForm){
        el.innerHTML=`<form class="dacc-badge dacc-gform"><button type="button" class="dacc-gav" data-shuffle aria-label="غيّر الصورة"><img src="${avatarSrc(gAv)}" alt=""></button>
          <input type="text" maxlength="20" placeholder="اسمك" aria-label="اسمك" required value="${esc(c?c.name:'')}"><button class="btn small btn-hype" type="submit">يلا</button><button class="btn small ghost" type="button" data-x aria-label="إلغاء">${ic('cancel')}</button></form>`;
        const f=el.querySelector('form'), inp=f.querySelector('input'); setTimeout(()=>inp.focus(), 0);
        f.querySelector('[data-shuffle]').onclick=()=>{ gAv=randAvatar(); f.querySelector('[data-shuffle] img').src=avatarSrc(gAv); };
        f.querySelector('[data-x]').onclick=()=>{ guestForm=false; render(); };
        f.onsubmit=e=>{ e.preventDefault(); const n=cleanName(inp.value); if(!n){ inp.focus(); return; } guestForm=false; continueAsGuest({ name:n, avatar:gAv }); };
        return;
      }
      el.innerHTML=`<span class="dacc-badge dacc-out"><button class="btn small btn-hype" data-in ${busy?'disabled':''}>${ic('acc-login')} سجّل دخول</button><button class="btn small ghost" data-guest>${ic('acc-ghost')} العب كضيف</button></span>`;
      el.querySelector('[data-in]').onclick=async()=>{ busy=true; render(); await signInGoogle(); busy=false; render(); };
      el.querySelector('[data-guest]').onclick=()=>{ guestForm=true; render(); };
    }
    const off=onChange(render); render();
    return ()=>{ off(); el.innerHTML=''; };
  }
  // تنبيه الإنجازات الجديدة والمستوى (res = نتيجة recordMatch)
  function showUnlocks(res){
    try{
      if(!res) return; injectCSS();
      let root=document.getElementById('dacc-toasts');
      if(!root){ root=document.createElement('div'); root.id='dacc-toasts'; root.setAttribute('aria-live','polite'); document.body.appendChild(root); }
      const items=(res.newAchievements||[]).map(a=>{ const A=ACH[a.id||a]||a; return `<div class="dacc-toast" style="--rc:${RARITY[A.rarity].color}"><i class="dacc-ti">${ic(A.icon)}</i><span><small>إنجاز جديد · ${RARITY[A.rarity].name}</small><b>${esc(A.name)}</b></span></div>`; });
      if(res.levelUp) items.unshift(`<div class="dacc-toast lvl" style="--rc:var(--brand)"><i class="dacc-ti">${ic('star')}</i><span><small>مستوى جديد</small><b>المستوى ${res.level||current()?.level||''}</b></span></div>`);
      items.forEach((h,i)=>setTimeout(()=>{ const d=document.createElement('div'); d.innerHTML=h; const t=d.firstChild; root.appendChild(t); setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(), 400); }, 4200); }, i*450));
    }catch(e){}
  }
  document.addEventListener('dahoom:achievements', e=>showUnlocks(e.detail));

  // CSS الشارة والإطارات والتنبيهات (ينحقن مرة وحدة عشان أي صفحة تقدر تستخدمها)
  function injectCSS(){
    if(document.getElementById('dacc-css')) return;
    const s=document.createElement('style'); s.id='dacc-css';
    s.textContent=`
.dacc-av{--s:48px;position:relative;display:inline-grid;place-items:center;width:calc(var(--s) + 8px);height:calc(var(--s) + 8px);border-radius:50%;flex:none;padding:4px;background:var(--line)}
.dacc-av img{width:var(--s);height:var(--s);border-radius:50%;object-fit:cover;display:block;background:var(--surface-2);box-shadow:0 0 0 2px var(--surface)}
.dacc-fr-none{background:transparent}
.dacc-fr-color{background:var(--pc)}
.dacc-fr-brand{background:var(--brand)}
.dacc-fr-mint{background:linear-gradient(135deg,#5BE6A9,#1D8A8A)}
.dacc-fr-gold{background:conic-gradient(from 30deg,#FFE3A1,#F5B83D,#875200,#F5B83D,#FFE3A1,#C98A1A,#FFE3A1)}
.dacc-fr-double{background:radial-gradient(closest-side,transparent calc(100% - 7px),var(--pc) calc(100% - 7px) calc(100% - 4px),var(--surface) calc(100% - 4px) calc(100% - 2px),var(--text) calc(100% - 2px))}
.dacc-fr-sadu{background:var(--sadu-weave) 0 0/14px 14px}
.dacc-fr-fire{background:conic-gradient(#FFCB62,#FF5468,#8A1A2B,#FF5468,#FFCB62,#FF8A3D,#FFCB62)}
.dacc-fr-rainbow{background:conic-gradient(#FF3D81,#FFC23A,#2EE59D,#38B6FF,#B07CFF,#FF3D81)}
.dacc-ring{--s:40px;position:relative;display:inline-grid;place-items:center;width:calc(var(--s) + 8px);height:calc(var(--s) + 8px);flex:none}
.dacc-ring svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}
.dacc-ring circle{fill:none;stroke-width:3}
.dacc-ring .bg{stroke:var(--line)}
.dacc-ring .fg{stroke:var(--pc);stroke-linecap:round}
.dacc-ring img{width:var(--s);height:var(--s);border-radius:50%;object-fit:cover;background:var(--surface-2)}
.dacc-ring b{position:absolute;bottom:-4px;inset-inline-start:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:var(--text);color:var(--bg);font-family:var(--num);font-weight:800;font-size:.78rem;line-height:20px;text-align:center}
.dacc-badge{display:inline-flex;align-items:center;gap:10px;min-height:44px;color:var(--text);text-decoration:none;border-radius:999px;padding:3px 4px 3px 14px;border:1px solid var(--line);background:var(--surface)}
a.dacc-badge:hover{background:var(--surface-2)}
a.dacc-badge:focus-visible,.dacc-gav:focus-visible{outline:3px solid var(--info);outline-offset:3px}
.dacc-bt{display:flex;flex-direction:column;line-height:1.2;min-width:0}
.dacc-bt b{font-size:.95rem;max-width:12em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dacc-bt small{color:var(--mute);font-size:.78rem;font-weight:600}
.dacc-out{border:0;background:transparent;padding:0;gap:8px;flex-wrap:wrap}
.dacc-skel{width:150px;height:44px;background:var(--surface-2)}
.dacc-gform{padding:4px;gap:6px}
.dacc-gform input[type=text]{width:9em;padding:6px 10px;font-size:.95rem}
.dacc-gav{border:0;padding:0;background:none;cursor:pointer;border-radius:50%;flex:none}
.dacc-gav img{width:34px;height:34px;border-radius:50%;display:block;object-fit:cover}
#dacc-toasts{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:90;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;width:min(92vw,360px)}
.dacc-toast{display:flex;align-items:center;gap:12px;width:100%;background:var(--surface);color:var(--text);border:1px solid var(--line);border-inline-start:5px solid var(--rc);border-radius:var(--r-m);padding:10px 14px;box-shadow:var(--shadow-2);animation:daccIn .35s cubic-bezier(.2,1.2,.3,1)}
.dacc-toast.out{opacity:0;transform:translateY(-8px);transition:opacity .35s,transform .35s}
.dacc-toast span{display:flex;flex-direction:column;line-height:1.3}
.dacc-toast small{color:var(--mute);font-weight:700;font-size:.8rem}
.dacc-toast b{font-size:1.05rem}
.dacc-ti{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--rc);color:var(--ink);flex:none;font-style:normal}
.dacc-ti .ic{width:24px;height:24px}
@keyframes daccIn{from{opacity:0;transform:translateY(-12px) scale(.96)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.dacc-toast{animation:none}.dacc-toast.out{transition:none}}`;
    (document.head || document.documentElement).appendChild(s);
  }

  return {
    // الأساس
    init, current, onChange, signInGoogle, signOut, continueAsGuest, saveProfile, recordMatch,
    getProfile, searchUsers, sendFriendRequest, respondFriendRequest, listFriends, listRequests, removeFriend,
    // اليوزرنيم وكلمة السر والحالة
    checkUsername, setUsername, unameWait, findByUsername, signUpWithPassword, signInWithPassword, setPassword, hasPassword,
    setActivity, getPresence, listFriendsOf, unameProblem, UNAME_GAP,
    // الكتالوجات
    ACHIEVEMENTS, BANNERS, FRAMES, TITLES, RARITY, GAMES, AVATARS, COLORS,
    // أدوات للعرض
    mountBadge, showUnlocks, avatarHTML, ringHTML, avatarSrc, bannerBg, titleName, levelInfo, achProgress, isUnlocked, unlockHint, normName,
    pendingSentTo: uid => sentSet().has(uid),
    get mode(){ return st.mode; }, get ready(){ return st.ready; }, get offline(){ return st.offline; }, get stub(){ return STUB; },
    // للاختبار فقط
    _debug: { st, queue, sync, applyMatch, cleanMatch, levelOf, xpNeed },
  };
})();
