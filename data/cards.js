// بطاقات لعبة ألف نقطة — v3 (42 بطاقة: أقل وأقوى + 3 بطاقات تحدي فريق ضد فريق)
// tier: legendary (أحمر) / medium (ذهبي) / normal (أزرق) / black (أسود)
// kind: attack هجوم / defense دفاع / buff دعم / chaos فوضى / reaction رد فعل / dud
// phase: وقت ما تلمع البطاقة (early بداية / mid وسط / late نهاية) — تنسحب أكثر بوقتها وبعضها أقوى فيه
// target: 'next' اللي بعدك، 'prev' اللي قبلك، 'leader' المتصدر، 'choose' تختار أي فريق
// src: مصدر الميم (للعرض)  ·  tweet:{...} تنرسم كتغريدة بدل الصورة
// snd: 'meme:<ملف>' من assets/sfx/meme أو 'game:<ملف>' من assets/sfx/game
//
// كل بطاقة لها دور واحد واضح — ما فيه بطاقتين يسوون نفس الشي.
// ميزان القيمة (تقريبًا بالنقاط مقارنة بالخصم): أزرق ≈ 50–100 · ذهبي ≈ 100–200 · أحمر ≈ 200–400
window.DAHOOM_DATA = window.DAHOOM_DATA || {};
window.DAHOOM_DATA.cards = [
  // ===== الحمراء (8) — تقلب المباراة =====
  { id:'R1', tier:'legendary', kind:'reaction', fx:'reverse', name:'العب غيرها', src:'رياكشن', snd:'game:c_unoreverse',
    desc:'رد فعل: إذا أحد هاجمك، يرجع الهجوم عليه. الفار يحرقها من يدك.' },
  { id:'R2', phase:'late', tier:'legendary', kind:'attack', fx:'wolf', target:'choose', name:'خلك ذيب', src:'أفلام', snd:'game:c_wolf',
    desc:'تختار فريق. إذا نجحت بهالدور، نفس نقاطك تنخصم منه.' },
  { id:'R3', phase:'late', tier:'legendary', kind:'buff', fx:'jackpot', name:'جاك بوت', src:'أنمي', snd:'game:c_hakari',
    desc:'تدفع 150 عشان تلعبها. تنجح بهالدور: نقاطك ×2. تفشل: راحت الـ150.' },
  { id:'R4', phase:'late', tier:'legendary', kind:'attack', fx:'snap', target:'leader', name:'فرقعة ثانوس', src:'أفلام', snd:'meme:inevitable',
    desc:'ثانوس يفرقع: المتصدر يخسر ربع نقاطه (أقصى شي 250). إذا انت المتصدر تنحرق.' },
  { id:'R5', tier:'legendary', kind:'buff', fx:'extraTurn', name:'طقها والحقها', src:'قيمنق', snd:'game:c_gottagofast',
    desc:'تلعب دورين ورا بعض.' },
  { id:'R6', phase:'late', tier:'legendary', kind:'attack', fx:'undo', target:'prev', name:'كأنك يا بو زيد ما غزيت', src:'سعودي', snd:'meme:itsgone',
    desc:'يمسح نقاط آخر دور للفريق اللي قبلك. إذا ما كسب شي تنحرق.' },

  { id:'R7', tier:'legendary', phase:'late', kind:'buff', fx:'finisher', name:'فاتاليتي', src:'قيمنق', snd:'game:g_fatality',
    desc:'نجاحك بهالدور ينضرب: ×3 لو نقاطك فوق 75% من الهدف، وإلا ×1.5.' },

  { id:'R8', tier:'legendary', kind:'attack', fx:'hamour', target:'choose', name:'الهامور', src:'مواقف', snd:'meme:yoink',
    desc:'تاخذ 150 نقطة من فريق تختاره.' },
  { id:'R9', tier:'legendary', kind:'attack', fx:'hawk', target:'choose', name:'عين الصقر', src:'أفلام', snd:'meme:sus',
    desc:'تشوف يد فريق تختاره مكشوفة، وتاخذ منها البطاقة اللي تبيها. يده فاضية؟ تخسر 50.' },

  // ===== الذهبية (16) — قوية وتحتاج توقيت =====
  { id:'G1', tier:'normal', kind:'buff', fx:'reroll', name:'تخطي الإعلان', src:'يوتيوب', snd:'meme:skibidi',
    desc:'تتخطى سؤالك أو عبارتك أو تحديك وتاخذ غيره، مرة وحدة بهالدور.' },
  { id:'G3', phase:'mid', tier:'normal', kind:'attack', fx:'harder', target:'next', name:'زيدوها ملح', src:'ميمز', snd:'meme:salt',
    desc:'ترش ملح على الفريق اللي بعدك: صعوبته ترتفع درجة بنفس النقاط.' },
  { id:'G5', phase:'mid', tier:'medium', kind:'attack', fx:'ratio', target:'next', name:'شريك مخالف', src:'سعودي', snd:'meme:dirtydeeds',
    desc:'تدخل شريك مع الفريق اللي بعدك: تاخذ نص أول نقاط يكسبها (أقصى شي 150).' },
  { id:'G6', phase:'mid', tier:'medium', kind:'chaos', fx:'trade', target:'choose', name:'خذ وهات', src:'سعودي', snd:'meme:cash',
    desc:'تاخذ بطاقة عشوائية من فريق تختاره، وتعطيه بطاقة من يدك.' },
  { id:'G7', tier:'medium', kind:'attack', fx:'factcheck', target:'choose', name:'الفار', src:'رياضة', snd:'meme:whistle',
    desc:'اختراق: يكسر دفاع فريق تختاره (وضع الطيران، إنه فخ، تأمين ضد الغير) ويحرق كل بطايق رد الفعل من يده. ما ينرد عليه. ما عنده دفاع؟ تخسر 50.' },
  { id:'G8', phase:'late', tier:'medium', kind:'attack', fx:'shadowban', target:'prev', name:'ولا كلمة', src:'سعودي', snd:'meme:sa_uskot',
    desc:'الفريق اللي قبلك ممنوع يسرق هاللفة، وممنوع يلعب بطاقة بدوره الجاي.' },
  { id:'G9', tier:'medium', kind:'defense', fx:'immune', name:'وضع الطيران', src:'سوشال', snd:'meme:planeding',
    desc:'ما يوصلك ولا هجوم لين نهاية اللفة الجاية. الاختراق يعديها.' },
  { id:'G11', tier:'medium', kind:'buff', fx:'wasta', name:'الواسطة', src:'تغريدة', snd:'meme:sa_yasheikh',
    desc:'تختار خانتك، وتاخذ نقاط الصعوبة الأعلى (الصعب +100).' },
  { id:'G12', phase:'mid', tier:'medium', kind:'chaos', fx:'pot', name:'القطة', src:'مواقف', snd:'game:g_mariocoin',
    desc:'كل فريق يدفع 100. أول فريق ينجح ياخذ المبلغ كله.' },
  { id:'G13', phase:'late', tier:'medium', kind:'attack', fx:'evilEye', target:'leader', name:'عين وصابتك', src:'سعودي', snd:'meme:sa_yasatr',
    desc:'أول نجاح للمتصدر ياخذ نص نقاطه بس. إذا انت المتصدر تنحرق.' },
  { id:'G14', tier:'medium', kind:'reaction', fx:'wow', name:'يا سلام', src:'سعودي', snd:'meme:slowclap',
    desc:'رد فعل: إذا فريق كسب 200 أو أكثر بدور واحد، تطلع لحالها وتاخذ ربع نقاطه.' },
  { id:'G15', tier:'medium', kind:'attack', fx:'coal', target:'next', name:'الجمرة', src:'رياكشن', snd:'game:c_ticking',
    desc:'تروح للفريق اللي بعدك. ينجح: تنتقل للي بعده. يفشل: يخسر 150.' },
  { id:'G16', tier:'medium', kind:'chaos', fx:'copy', name:'نسخ لصق', src:'رياكشن', snd:'game:c_copy',
    desc:'تلعب آخر بطاقة انلعبت. إذا ما انلعبت بطاقة قبل تنحرق.' },

  { id:'G17', tier:'medium', phase:'early', kind:'buff', fx:'capital', name:'ستونكس', src:'ميمز', snd:'meme:stonks',
    desc:'+25 على كل نجاح لكم لين نهاية المباراة.' },
  { id:'G18', tier:'medium', phase:'mid', kind:'attack', fx:'bench', target:'choose', name:'خلك برا السالفة', src:'أفلام', snd:'meme:sa_atla',
    desc:'لاعب تختاره من فريق ثاني يجلس برا دور فريقه الجاي. إذا كل الفرق لاعب واحد تنحرق.' },
  { id:'G19', tier:'medium', phase:'late', kind:'attack', fx:'brake', target:'leader', name:'على وين؟', src:'أفلام', snd:'meme:sa_lysh',
    desc:'المتصدر ما يقدر يوصل الهدف هاللفة. إذا انت المتصدر تنحرق.' },

  { id:'G20', tier:'medium', kind:'duel', fx:'duelBuzz', target:'choose', name:'الكلاسيكو', src:'رياضة', snd:'game:g_ucl',
    desc:'كلاسيكو ضد فريق تختاره: سؤال واحد بالبز. تحدد الرهان (100 أو 150 أو 200) والفايز ياخذه من الخاسر.' },
  { id:'G21', tier:'medium', kind:'duel', fx:'duelAct', target:'choose', name:'فيلم صامت', src:'أفلام', snd:'meme:shhh',
    desc:'فيلم صامت ضد فريق تختاره: كل فريق يمثّل عبارة، والأسرع ياخذ 150 من الثاني.' },

  { id:'G22', tier:'medium', kind:'buff', fx:'mc2', name:'حذف إجابتين', src:'مسابقات', snd:'game:g_fifty',
    desc:'أول سؤالين عامين يجونك يطلعون بخيارين بس. تبقى معك لين تنستخدم.' },
  { id:'G23', tier:'medium', kind:'attack', fx:'pick', target:'choose', name:'نشّال', src:'أفلام', snd:'game:g_pacman',
    desc:'تشوف ظهر بطايق فريق تختاره، وتسحب وحدة منها على عماك. يده فاضية؟ تخسر 50.' },
  { id:'G24', tier:'medium', kind:'attack', fx:'steal', target:'choose', name:'اللي لك لي', src:'مواقف', snd:'meme:yoink',
    desc:'اختراق: تاخذ طاقة شغالة من فريق تختاره وتصير لك (ستونكس، مولّعة، وضع الطيران…). ما عنده طاقة؟ تخسر 50.' },
  { id:'G25', tier:'medium', kind:'reaction', fx:'envy', name:'ما تهنى', src:'سعودي', snd:'game:g_nope',
    desc:'رد فعل: إذا فريق لعب بطاقة دعم، تخربها عليه. لو كانت جاك بوت، الـ150 اللي دفعها تجيك.' },
  // ===== الزرقاء (18) — صغيرة بس تصنع الفرق =====
  { id:'N1', phase:'early', tier:'normal', kind:'buff', fx:'streak', name:'مولّعة', src:'قيمنق', snd:'game:c_onfire',
    desc:'+50 الحين، و+50 على كل نجاح ورا بعض. تنتهي مع أول فشل.' },
  { id:'N4', tier:'medium', kind:'reaction', fx:'seen', name:'بلوك', src:'سوشال', snd:'meme:nope',
    desc:'رد فعل: إذا أحد هاجمك، تسوي له بلوك والهجوم ينلغي. الفار يحرقها من يدك.' },
  { id:'N5', phase:'early', tier:'normal', kind:'chaos', fx:'gacha', name:'باكج فيفا', src:'قيمنق', snd:'meme:walkout',
    desc:'تفتح باكج: تسحب بطاقتين وتختار وحدة.' },
  { id:'N6', phase:'mid', tier:'normal', kind:'attack', fx:'lag', target:'next', name:'النت فاصل', src:'مواقف', snd:'meme:winerror',
    desc:'الفريق اللي بعدك ينقص وقته للنص بدوره الجاي.' },
  { id:'N8', tier:'normal', kind:'buff', fx:'choose', name:'على كيفي', src:'تغريدة', snd:'meme:idowhatiwant',
    desc:'تختار خانتك بهالدور.' },
  { id:'N11', tier:'normal', kind:'defense', fx:'cleanse', name:'رايق', src:'رياكشن', snd:'game:c_chillguy',
    desc:'+50 ويزيل كل التأثيرات السلبية عنك.' },
  { id:'N12', tier:'normal', kind:'buff', fx:'fullsteal', name:'ببلاش', src:'رياكشن', snd:'game:c_freeestate',
    desc:'أول سرقة لك تاخذ نقاطها كاملة بدل النص. صالحة لين نهاية اللفة الجاية.' },
  { id:'N13', tier:'normal', kind:'chaos', fx:'hayat', name:'هياط', src:'سعودي', snd:'meme:sa_majnoon',
    desc:'لازم تختار صعب. تنجح: +200 زيادة. تفشل: −50.' },
  { id:'N15', phase:'mid', tier:'normal', kind:'attack', fx:'prank', target:'next', name:'مقلب', src:'سعودي', snd:'game:g_clashlaugh',
    desc:'تحط بطاقة سودا بيد الفريق اللي بعدك.' },
  { id:'N16', phase:'mid', tier:'normal', kind:'chaos', fx:'swapTurn', target:'choose', name:'روح انت أول', src:'أفلام', snd:'game:g_swoosh',
    desc:'تبدّل دورك مع فريق ما لعب هاللفة. إذا الكل لعب تنحرق.' },
  { id:'N17', phase:'mid', tier:'normal', kind:'attack', fx:'roast', target:'choose', name:'طقطقة', src:'سعودي', snd:'meme:sa_tagtaga',
    desc:'تختار فريق فشل بدوره الأخير ويخسر 100. إذا ما كان فاشل تنحرق.' },
  { id:'N18', phase:'mid', tier:'normal', kind:'chaos', fx:'bet', target:'choose', name:'أراهنك', src:'أفلام', snd:'meme:dun',
    desc:'تختار فريق وتتوقع: بينجح بدوره الجاي أو بيفشل. توقعك صح: +100. غلط: −50.' },

  { id:'N19', tier:'normal', phase:'early', kind:'chaos', fx:'haul', name:'مقاضي الشهر', src:'سعودي', snd:'game:g_oneup',
    desc:'تتمون: تسحب بطاقتين.' },
  { id:'N20', tier:'normal', phase:'late', kind:'buff', fx:'comeback', name:'ريمونتادا', src:'رياضة', snd:'game:g_ohmygod',
    desc:'إذا انتم الأخير: تاخذون ثلث الفرق مع المتصدر (50 إلى 250). غير كذا: +50.' },

  { id:'N21', tier:'normal', kind:'buff', fx:'mc4', name:'من سيربح المليون', src:'مسابقات', snd:'game:g_lifeline',
    desc:'أول سؤال عام يجيك يطلع بأربع خيارات مثل المسابقة. تبقى معك لين يجيك سؤال عام.' },
  { id:'N22', tier:'normal', kind:'defense', fx:'insure', name:'تأمين ضد الغير', src:'سعودي', snd:'meme:phew',
    desc:'أول خسارة نقاط تجيك تنزل للنص، من هجوم أو عقوبة. تبقى معك لين تنستخدم.' },
  { id:'N23', tier:'normal', kind:'defense', fx:'ambush', name:'إنه فخ', src:'أفلام', snd:'meme:trap',
    desc:'أول فريق يهاجمك يخسر 100، والهجوم يكمل. يبقى لين أحد يهاجمك.' },
  // ===== السودا (6) — ثلاث ما تسوي شي، وثلاث تسوي شي تافه =====
  { id:'K2', tier:'black', kind:'dud', fx:'none', name:'دق علي', src:'سعودي', snd:'game:c_nokia',
    desc:'الرقم المطلوب مغلق. ما تسوي شي.' },
  { id:'K3', tier:'black', kind:'dud', fx:'none', name:'توصي؟', src:'رياكشن', snd:'meme:sa_hala',
    desc:'يسألك توصي شي ويمشي. ما تسوي شي.' },
  { id:'K4', tier:'black', kind:'dud', fx:'none', name:'شاحن مقطوع', src:'مواقف', snd:'meme:windowsshut',
    desc:'يشحن إذا مسكته بزاوية معينة. ما تسوي شي.' },
  { id:'K5', tier:'black', kind:'buff', fx:'fakka', name:'فكّة', src:'مواقف', snd:'game:g_mariocoin',
    desc:'+10 نقاط. ايه، بس كذا.' },
  { id:'K6', tier:'black', kind:'chaos', fx:'coin', name:'يا نصيب', src:'مواقف', snd:'game:g_suspense',
    desc:'ترمي عملة: +50 أو −50.' },
  { id:'K7', tier:'black', kind:'chaos', fx:'stick', name:'لزقة', src:'رياكشن', snd:'meme:bruh',
    desc:'تنتقل ليد الفريق اللي بعدك وتصير مشكلته.' },
];

window.DAHOOM_DATA.cardWeights = { legendary: 10, medium: 32, normal: 48, black: 10 };

window.DAHOOM_DATA.cardKinds = {
  attack:   { name:'هجوم',    icon:'attack' },
  defense:  { name:'دفاع',    icon:'defense' },
  buff:     { name:'دعم',     icon:'buff' },
  chaos:    { name:'فوضى',    icon:'chaos' },
  reaction: { name:'رد فعل',  icon:'reaction' },
  duel:     { name:'تحدي',    icon:'whistle' },
  dud:      { name:'ولا شي',  icon:'dud' },
};
