// بطاقات لعبة ألف نقطة — v2.3 (46 بطاقة: ترندات ونكت ومقولات سعودية + ميمز قيمنق وأفلام ورياكشنز)
// tier: legendary (أحمر) / medium (ذهبي) / normal (أزرق) / black (أسود)
// kind: attack هجوم / defense دفاع / buff دعم / chaos فوضى / reaction رد فعل / dud
// phase: وقت ما تلمع البطاقة (early بداية / mid وسط / late نهاية) — تنسحب أكثر بوقتها وبعضها أقوى فيه
// target: 'next' اللي بعدك، 'prev' اللي قبلك، 'leader' المتصدر، 'choose' تختار أي فريق
// src: مصدر الميم (للعرض)  ·  tweet:{...} تنرسم كتغريدة بدل الصورة
// snd: 'meme:<ملف>' من assets/sfx/meme أو 'game:<ملف>' من assets/sfx/game
//
// كل بطاقة لها دور واحد واضح — ما فيه بطاقتين يسوون نفس الشي.
// ميزان القيمة (تقريبًا بالنقاط مقارنة بالخصم): أزرق ≈ 30–50 · ذهبي ≈ 60–100 · أحمر ≈ 120–180
window.DAHOOM_DATA = window.DAHOOM_DATA || {};
window.DAHOOM_DATA.cards = [
  // ===== الحمراء (7) — تقلب المباراة =====
  { id:'R1', tier:'legendary', kind:'reaction', fx:'reverse', name:'العب غيرها', src:'رياكشن', snd:'game:c_unoreverse',
    desc:'رد فعل: أول ما أحد يرمي عليك بطاقة هجوم، العبها وترجع الضربة كاملة على اللي رماها. ما تحسب من بطاقة دورك.' },
  { id:'R2', phase:'late', tier:'legendary', kind:'buff', fx:'x2next', name:'خلك ذيب', src:'أفلام', snd:'game:c_wolf',
    desc:'أول نجاح لك بدورك الجاي — بأي خانة — نقاطه ×2. الذيب ما يرضى بالنص.' },
  { id:'R3', phase:'late', tier:'legendary', kind:'chaos', fx:'jackpot', name:'جاك بوت', src:'أنمي', snd:'game:c_hakari',
    desc:'دورك الجاي: تنجح؟ النقاط ×2. تفشل؟ تنخصم منك نفس النقاط. هاكاري يقول: المقامرة حياة.' },
  { id:'R4', phase:'late', tier:'legendary', kind:'attack', fx:'snap', target:'leader', name:'شلوطة تايم', src:'سعودي', snd:'game:g_punch',
    desc:'المتصدر ياكل شلوطة: يخسر 20% من نقاطه (تقريب لأقرب 25، أقصى شي 150). لو انت المتصدر ما تنلعب.' },
  { id:'R5', tier:'legendary', kind:'buff', fx:'extraTurn', name:'طقها والحقها', src:'قيمنق', snd:'game:c_gottagofast',
    desc:'بعد ما يخلص دورك تلعب دور ثاني على طول. Gotta go fast.' },
  { id:'R6', phase:'late', tier:'legendary', kind:'attack', fx:'undo', target:'prev', name:'كأنك يا بو زيد ما غزيت', src:'سعودي', snd:'game:g_pacman',
    desc:'الفريق اللي لعب قبلك: كل النقاط اللي كسبها بدوره الأخير تنمسح. تعب على الفاضي.' },

  { id:'R7', tier:'legendary', phase:'late', kind:'buff', fx:'finisher', name:'الضربة القاضية', src:'رياضة', snd:'game:g_fatality',
    desc:'أول نجاح لك بدورك الجاي: لو نقاطك 75% من الهدف أو أكثر تنضرب ×3، وإلا ×1.5. تحفظها للحسم.' },

  // ===== الذهبية (16) — قوية وتحتاج توقيت =====
  { id:'G1', tier:'medium', kind:'buff', fx:'reroll', name:'اصرمني', src:'سعودي', snd:'meme:sa_khalas',
    desc:'طلع لك سؤال أو عبارة أو تحدي ما يعجبك؟ اصرمه وخذ غيره بنفس الصعوبة. مرة وحدة بدورك الجاي.' },
  { id:'G3', phase:'mid', tier:'medium', kind:'attack', fx:'harder', target:'next', name:'شد حيلك', src:'قيمنق', snd:'game:c_youdied',
    desc:'الفريق اللي بعدك: صعوبته الجاية ترتفع درجة، بس بسعر الصعوبة اللي اختارها. YOU DIED.' },
  { id:'G5', phase:'mid', tier:'medium', kind:'attack', fx:'ratio', target:'next', name:'نص نص', src:'سعودي', snd:'game:g_ding',
    desc:'الفريق اللي بعدك: أول نقاط يكسبها، تاخذ نصها انت (أقصى شي 100). نبي العدالة.' },
  { id:'G6', phase:'mid', tier:'medium', kind:'chaos', fx:'trade', target:'choose', name:'خذ وهات', src:'سعودي', snd:'meme:cash',
    desc:'اختار أي فريق: تاخذ بطاقة عشوائية من يده، وتعطيه بطاقة من يدك تختارها. (أحسن مكان ترمي فيه السودا).' },
  { id:'G7', phase:'mid', tier:'medium', kind:'attack', fx:'factcheck', target:'next', name:'كاشفك', src:'سعودي', snd:'game:g_mgs',
    desc:'الفريق اللي بعدك: كل طاقاته الشغالة تنلغى، وتنحرق بطاقة عشوائية من يده. حتى "محد قدّك" ما تحميه.' },
  { id:'G8', phase:'late', tier:'medium', kind:'attack', fx:'shadowban', target:'prev', name:'ولا كلمة', src:'سعودي', snd:'meme:sa_uskot',
    desc:'الفريق اللي قبلك: ممنوع يسرق لين نهاية اللفة، وممنوع يلعب بطاقة بدوره الجاي.' },
  { id:'G9', tier:'medium', kind:'defense', fx:'immune', name:'محد قدّك', src:'سعودي', snd:'game:g_powerup',
    desc:'حصانة ضد بطاقات الهجوم لين نهاية اللفة الجاية. ما تخاف إلا من ربك.' },
  { id:'G11', tier:'medium', kind:'buff', fx:'wasta', name:'الواسطة', src:'تغريدة', snd:'meme:sa_yasheikh',
    tweet:{ name:'أبو واسطة', handle:'@wasta_master', text:'اللي يسأل كيف وصلت؟ لا تسأل. اتصلت على واحد يعرف واحد.', likes:'12.4K' },
    desc:'هالدور تختار الخانة بنفسك، ونقاطك بسعر الصعوبة اللي فوق اللي اخترتها (الصعب ياخذ +50).' },
  { id:'G12', phase:'mid', tier:'medium', kind:'chaos', fx:'pot', name:'القطة', src:'مواقف', snd:'game:g_mariocoin',
    desc:'كل الفرق (وانت معهم) تدفع 50 بالقطة. أول فريق ينجح بعدها ياخذها كلها. والدور الجاي دورك.' },
  { id:'G13', phase:'late', tier:'medium', kind:'attack', fx:'evilEye', target:'leader', name:'عين وصابتك', src:'سعودي', snd:'meme:sa_yasatr',
    desc:'المتصدر: أول نجاح له نص نقاطه تطير. قولوا ما شاء الله. لو انت المتصدر ما تنلعب.' },
  { id:'G14', phase:'early', tier:'medium', kind:'buff', fx:'yasalam', name:'يا سلام', src:'سعودي', snd:'meme:wow',
    desc:'لين نهاية اللفة الجاية: كل ما فريق ثاني ينجح بأي شي، تاخذ انت 15 وتصفق له. كل ما زاد الفرق زاد دخلك.' },
  { id:'G15', tier:'medium', kind:'attack', fx:'coal', target:'next', name:'الجمرة', src:'رياكشن', snd:'game:c_ticking',
    desc:'تحط الجمرة بيد الفريق اللي بعدك. ينجح بدوره؟ تنتقل للي بعده. يفشل؟ تنفجر عليه: −75. محد يبيها.' },
  { id:'G16', tier:'medium', kind:'chaos', fx:'copy', name:'نسخ لصق', src:'رياكشن', snd:'game:c_copy',
    desc:'تعيد آخر بطاقة انلعبت باللعبة (من أي فريق) كأنها لك. الهجوم يتحسب هدفه منك انت.' },

  { id:'G17', tier:'medium', phase:'early', kind:'buff', fx:'capital', name:'رأس مال', src:'مواقف', snd:'meme:cash',
    desc:'من الحين لين آخر المباراة: كل نجاح لكم يجيب +10 زيادة. كل ما لعبتها بدري، كسبت أكثر.' },
  { id:'G18', tier:'medium', phase:'mid', kind:'attack', fx:'bench', target:'choose', name:'خلك برا السالفة', src:'أفلام', snd:'meme:sa_atla',
    desc:'اختار فريق وبعدين اختار لاعب منه: هاللاعب ما يجاوب ولا يمثّل ولا يخمّن بدور فريقه الجاي. لازم الفريق فيه لاعبين أو أكثر.' },
  { id:'G19', tier:'medium', phase:'late', kind:'attack', fx:'brake', target:'leader', name:'على وين؟', src:'أفلام', snd:'meme:sa_lysh',
    desc:'المتصدر ما يقدر يعدّي الهدف هاللفة: أي نقاط توصله للهدف تتوقف قبله بـ25. تشتري لفة كاملة للباقين.' },

  // ===== الزرقاء (18) — صغيرة بس تصنع الفرق =====
  { id:'N1', phase:'early', tier:'normal', kind:'buff', fx:'streak', name:'مولّعة', src:'قيمنق', snd:'game:c_onfire',
    desc:'+20 على طول، وكل نجاح ورا بعض بعدها يجيب +20 زيادة لين أول فشل.' },
  { id:'N2', tier:'normal', kind:'buff', fx:'spoiler', name:'وش السالفة', src:'سعودي', snd:'meme:huh',
    desc:'في سؤالك الجاي ينكشف لك أول حرف من الجواب وعدد كلماته.' },
  { id:'N3', tier:'normal', kind:'defense', fx:'copium', name:'بسيطة', src:'سعودي', snd:'meme:sa_miskeen',
    desc:'لو فشلت بدورك الجاي (أي خانة)، تاخذ 40 نقطة مواساة. سعداء بهذي النتائج.' },
  { id:'N4', tier:'normal', kind:'reaction', fx:'seen', name:'طنّش', src:'سعودي', snd:'meme:nope',
    desc:'رد فعل: أول ما توصلك بطاقة هجوم، العبها والضربة تنلغى. نو كومنت. ما تحسب من بطاقة دورك.' },
  { id:'N5', phase:'early', tier:'normal', kind:'chaos', fx:'gacha', name:'ضربة حظ', src:'قيمنق', snd:'meme:chest',
    desc:'نفتح لك صندوقين عشوائيين وتختار بطاقة وحدة منهم. ممكن ذهبية… وممكن سودا.' },
  { id:'N6', phase:'mid', tier:'normal', kind:'attack', fx:'lag', target:'next', name:'النت فاصل', src:'مواقف', snd:'meme:winerror',
    desc:'الفريق اللي بعدك: وقته بدوره الجاي ينقص للنص (إجابة، تمثيل، تحدي). اللود ما يخلص.' },
  { id:'N8', tier:'normal', kind:'buff', fx:'choose', name:'على كيفي', src:'تغريدة', snd:'meme:rizz',
    tweet:{ name:'مزاجي', handle:'@3la_kefi', text:'أنا أختار الخانة. ليش؟ على كيفي.', likes:'987' },
    desc:'هالدور انت تختار الخانة بنفسك بدل السحب. تلعبها قبل السحب.' },
  { id:'N9', tier:'normal', kind:'defense', fx:'lock', name:'خلها بيننا', src:'رياكشن', snd:'game:c_shh',
    desc:'سؤالك الجاي محمي: لو ضيعته ما فيه سرقة لأحد. محد لازم يعرف.' },
  { id:'N11', tier:'normal', kind:'defense', fx:'cleanse', name:'رايق', src:'رياكشن', snd:'game:c_chillguy',
    desc:'+25 على طول، وتمسح عنك كل الضربات الشغالة (نت فاصل، نص نص، ولا كلمة، عين، الجمرة…).' },
  { id:'N12', tier:'normal', kind:'buff', fx:'fullsteal', name:'ببلاش', src:'رياكشن', snd:'game:c_freeestate',
    desc:'أول سرقة ناجحة لك لين نهاية اللفة الجاية تاخذ نقاطها كاملة بدل النص.' },
  { id:'N13', tier:'normal', kind:'chaos', fx:'hayat', name:'هياط', src:'سعودي', snd:'meme:sa_majnoon',
    desc:'هالدور لازم تختار "صعب". تنجح؟ +50 فوق نقاطك. تفشل؟ −25. وريهم وش عندك.' },
  { id:'N14', tier:'normal', kind:'buff', fx:'sawalif', name:'سواليف', src:'سعودي', snd:'meme:sa_halaeyal',
    desc:'أول "بدون كلام" تمثله: مسموح لك تقول كلمة وحدة بس، ولو خمّنوها تاخذ +25 زيادة.' },
  { id:'N15', phase:'mid', tier:'normal', kind:'attack', fx:'prank', target:'next', name:'مقلب', src:'سعودي', snd:'game:g_clashlaugh',
    desc:'تدس بطاقة سودا عشوائية في يد الفريق اللي بعدك. لو يده مليانة يطير منه بطاقة عشانها.' },
  { id:'N16', phase:'mid', tier:'normal', kind:'chaos', fx:'swapTurn', target:'choose', name:'روح انت أول', src:'أفلام', snd:'game:g_swoosh',
    desc:'تبدّل دورك بدور فريق ما لعب هاللفة: هو يلعب الحين وانت تاخذ مكانه. تشوف وش يسوي قبلك، أو تهرب من ضربة.' },
  { id:'N17', phase:'mid', tier:'normal', kind:'attack', fx:'roast', target:'choose', name:'طقطقة', src:'سعودي', snd:'meme:sa_tagtaga',
    desc:'اختار أي فريق تطقطق عليه: يخسر 40 نقطة على طول. جبت الموضوع طقطقة.' },
  { id:'N18', phase:'mid', tier:'normal', kind:'chaos', fx:'bet', target:'choose', name:'أراهنك', src:'أفلام', snd:'meme:dun',
    desc:'اختار فريق وتوقّع: بينجح أو بيفشل بدوره الجاي؟ صدقت: +50. خربت: −25.' },

  { id:'N19', tier:'normal', phase:'early', kind:'chaos', fx:'haul', name:'زاد الطريق', src:'مواقف', snd:'game:g_oneup',
    desc:'تسحب بطاقتين على طول. بأول المباراة يعني خيارات أكثر لكل اللفات الجاية.' },
  { id:'N20', tier:'normal', phase:'late', kind:'buff', fx:'comeback', name:'ما بقى شي', src:'رياكشن', snd:'game:g_ohmygod',
    desc:'لو انتم الأخير: تاخذون ربع الفرق بينكم وبين المتصدر (أقل شي 25، أقصى شي 150). لو مو الأخير: +25.' },

  // ===== السودا (5) — شكلها بس =====
  { id:'K1', tier:'black', kind:'dud', fx:'none', name:'مافي رصيد', src:'سعودي', snd:'meme:sa_flws',
    desc:'حاولت تشغّلها… رصيدك ما يكفي. (ما تسوي شي)' },
  { id:'K2', tier:'black', kind:'dud', fx:'none', name:'دق علي', src:'سعودي', snd:'game:c_nokia',
    desc:'"دق علي إذا احتجت شي"… ودقيت: الرقم المطلوب مغلق. (ما تسوي شي)' },
  { id:'K3', tier:'black', kind:'dud', fx:'none', name:'توصي؟', src:'رياكشن', snd:'meme:sa_hala',
    desc:'تسألك بكل أدب "توصي شي؟"… وتطلع قبل لا ترد. (ما تسوي شي)' },
  { id:'K4', tier:'black', kind:'dud', fx:'none', name:'تبيني أضحك؟', src:'سعودي', snd:'meme:sa_dmk',
    desc:'سحبتها وتتوقعها تسوي شي؟ تبيني أضحك يعني؟ (ما تسوي شي)' },
  { id:'K5', tier:'black', kind:'dud', fx:'none', name:'انضحك عليك', src:'قيمنق', snd:'meme:rickroll',
    desc:'Never gonna give you up… ولا نقطة. (ما تسوي شي)' },
];

window.DAHOOM_DATA.cardWeights = { legendary: 8, medium: 26, normal: 50, black: 16 };

window.DAHOOM_DATA.cardKinds = {
  attack:   { name:'هجوم',    icon:'attack' },
  defense:  { name:'دفاع',    icon:'defense' },
  buff:     { name:'دعم',     icon:'buff' },
  chaos:    { name:'فوضى',    icon:'chaos' },
  reaction: { name:'رد فعل',  icon:'reaction' },
  dud:      { name:'ولا شي',  icon:'dud' },
};
