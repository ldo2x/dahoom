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
  // ===== الحمراء (7) — تقلب المباراة =====
  { id:'R1', tier:'legendary', kind:'reaction', fx:'reverse', name:'العب غيرها', src:'رياكشن', snd:'game:c_unoreverse',
    desc:'رد فعل: أحد رمى عليك هجوم؟ ترجع الضربة عليه كاملة.' },
  { id:'R2', phase:'late', tier:'legendary', kind:'buff', fx:'x2next', name:'خلك ذيب', src:'أفلام', snd:'game:c_wolf',
    desc:'نجاحك بهالدور نقاطه دبل.' },
  { id:'R3', phase:'late', tier:'legendary', kind:'chaos', fx:'jackpot', name:'جاك بوت', src:'أنمي', snd:'game:c_hakari',
    desc:'هالدور: تنجح تاخذ الدبل، تفشل تنخصم منك نفس النقاط.' },
  { id:'R4', phase:'late', tier:'legendary', kind:'attack', fx:'snap', target:'leader', name:'شلوطة تايم', src:'سعودي', snd:'game:g_punch',
    desc:'المتصدر يخسر ربع نقاطه (أقصى شي 250).' },
  { id:'R5', tier:'legendary', kind:'buff', fx:'extraTurn', name:'طقها والحقها', src:'قيمنق', snd:'game:c_gottagofast',
    desc:'تلعب دورين ورا بعض.' },
  { id:'R6', phase:'late', tier:'legendary', kind:'attack', fx:'undo', target:'prev', name:'كأنك يا بو زيد ما غزيت', src:'سعودي', snd:'meme:itsgone',
    desc:'اللي لعب قبلك تنمسح كل نقاط دوره الأخير.' },

  { id:'R7', tier:'legendary', phase:'late', kind:'buff', fx:'finisher', name:'الضربة القاضية', src:'رياضة', snd:'game:g_fatality',
    desc:'نجاحك بهالدور ×3 لو انت فوق 75% من الهدف، وإلا ×1.5.' },

  { id:'R8', tier:'legendary', kind:'duel', fx:'duelQ', target:'choose', art:'attack', name:'انزلي', src:'تحدي', snd:'game:g_finishhim',
    desc:'تحدي أسئلة لاعب ضد لاعب: تختار خصمك، سؤال لك وسؤال له. أول واحد يغلط يخسر 200 والثاني ياخذها.' },

  // ===== الذهبية (16) — قوية وتحتاج توقيت =====
  { id:'G1', tier:'medium', kind:'buff', fx:'reroll', name:'اصرمني', src:'سعودي', snd:'meme:sa_khalas',
    desc:'ما عجبك السؤال أو العبارة أو التحدي؟ بدّله مرة وحدة بهالدور.' },
  { id:'G3', phase:'mid', tier:'medium', kind:'attack', fx:'harder', target:'next', name:'شد حيلك', src:'قيمنق', snd:'game:g_megalo',
    desc:'اللي بعدك تطلع له صعوبة أعلى بدرجة وبنفس السعر.' },
  { id:'G5', phase:'mid', tier:'medium', kind:'attack', fx:'ratio', target:'next', name:'نص نص', src:'سعودي', snd:'game:g_ding',
    desc:'أول نقاط يكسبها اللي بعدك تاخذ نصها (أقصى شي 150).' },
  { id:'G6', phase:'mid', tier:'medium', kind:'chaos', fx:'trade', target:'choose', name:'خذ وهات', src:'سعودي', snd:'meme:cash',
    desc:'تاخذ بطاقة عشوائية من يد أي فريق، وتعطيه بطاقة تختارها من يدك.' },
  { id:'G7', phase:'mid', tier:'medium', kind:'attack', fx:'factcheck', target:'next', name:'كاشفك', src:'سعودي', snd:'game:g_mgs',
    desc:'اللي بعدك تنلغى كل طاقاته وتنحرق بطاقة من يده. حتى الحصانة ما تحميه.' },
  { id:'G8', phase:'late', tier:'medium', kind:'attack', fx:'shadowban', target:'prev', name:'ولا كلمة', src:'سعودي', snd:'meme:sa_uskot',
    desc:'اللي قبلك ممنوع يسرق هاللفة وممنوع يلعب بطاقة بدوره الجاي.' },
  { id:'G9', tier:'medium', kind:'defense', fx:'immune', name:'محد قدّك', src:'سعودي', snd:'game:g_powerup',
    desc:'ما أحد يقدر يهاجمك لين نهاية اللفة الجاية.' },
  { id:'G11', tier:'medium', kind:'buff', fx:'wasta', name:'الواسطة', src:'تغريدة', snd:'meme:sa_yasheikh',
    tweet:{ name:'أبو واسطة', handle:'@wasta_master', text:'كيف وصلت؟ أعرف واحد يعرف واحد.', likes:'12.4K' },
    desc:'تختار خانتك، ونقاطك بسعر الصعوبة اللي فوقها (الصعب يزيد 100).' },
  { id:'G12', phase:'mid', tier:'medium', kind:'chaos', fx:'pot', name:'القطة', src:'مواقف', snd:'game:g_mariocoin',
    desc:'كل فريق يحط 100 بالقطة، وأول فريق ينجح ياخذها كلها.' },
  { id:'G13', phase:'late', tier:'medium', kind:'attack', fx:'evilEye', target:'leader', name:'عين وصابتك', src:'سعودي', snd:'meme:sa_yasatr',
    desc:'أول نجاح للمتصدر يطير نصه.' },
  { id:'G14', phase:'early', tier:'medium', kind:'buff', fx:'yasalam', name:'يا سلام', src:'سعودي', snd:'meme:wow',
    desc:'لين نهاية اللفة الجاية: كل ما فريق ثاني ينجح تاخذ 30.' },
  { id:'G15', tier:'medium', kind:'attack', fx:'coal', target:'next', name:'الجمرة', src:'رياكشن', snd:'game:c_ticking',
    desc:'تعطي الجمرة للي بعدك: ينجح تروح للي بعده، يفشل تنفجر فيه ويخسر 150.' },
  { id:'G16', tier:'medium', kind:'chaos', fx:'copy', name:'نسخ لصق', src:'رياكشن', snd:'game:c_copy',
    desc:'تلعب آخر بطاقة انلعبت كأنها بطاقتك.' },

  { id:'G17', tier:'medium', phase:'early', kind:'buff', fx:'capital', name:'رأس مال', src:'مواقف', snd:'meme:stonks',
    desc:'كل نجاح لكم لين آخر المباراة يزيد 25. العبها بدري.' },
  { id:'G18', tier:'medium', phase:'mid', kind:'attack', fx:'bench', target:'choose', name:'خلك برا السالفة', src:'أفلام', snd:'meme:sa_atla',
    desc:'تختار لاعب من فريق ثاني يجلس برا دور فريقه الجاي: لا يجاوب ولا يمثّل.' },
  { id:'G19', tier:'medium', phase:'late', kind:'attack', fx:'brake', target:'leader', name:'على وين؟', src:'أفلام', snd:'meme:sa_lysh',
    desc:'المتصدر ما يقدر يوصل الهدف هاللفة.' },

  { id:'G20', tier:'medium', kind:'duel', fx:'duelBuzz', target:'choose', art:'whistle', name:'وجه لوجه', src:'تحدي', snd:'game:g_fight',
    desc:'تتحدى فريق على سؤال واحد بالبز، وانت تحدد الرهان: 100 أو 200 أو 300. اللي يجاوب صح ياخذها من الثاني.' },
  { id:'G21', tier:'medium', kind:'duel', fx:'duelAct', target:'choose', art:'masks', name:'تحدي الصمت', src:'تحدي', snd:'meme:shhh',
    desc:'تتحدى فريق بالتمثيل: كل فريق يمثّل عبارة، والأسرع ياخذ 150 من الثاني.' },

  // ===== الزرقاء (18) — صغيرة بس تصنع الفرق =====
  { id:'N1', phase:'early', tier:'normal', kind:'buff', fx:'streak', name:'مولّعة', src:'قيمنق', snd:'game:c_onfire',
    desc:'+50 الحين، وكل نجاح ورا بعض يزيد 50 لين أول فشل.' },
  { id:'N4', tier:'normal', kind:'reaction', fx:'seen', name:'طنّش', src:'سعودي', snd:'meme:nope',
    desc:'رد فعل: أحد رمى عليك هجوم؟ تلغيه.' },
  { id:'N5', phase:'early', tier:'normal', kind:'chaos', fx:'gacha', name:'ضربة حظ', src:'قيمنق', snd:'meme:chest',
    desc:'تسحب بطاقتين وتختار وحدة.' },
  { id:'N6', phase:'mid', tier:'normal', kind:'attack', fx:'lag', target:'next', name:'النت فاصل', src:'مواقف', snd:'meme:winerror',
    desc:'اللي بعدك وقته بالنص بدوره الجاي.' },
  { id:'N8', tier:'normal', kind:'buff', fx:'choose', name:'على كيفي', src:'تغريدة', snd:'meme:idowhatiwant',
    tweet:{ name:'مزاجي', handle:'@3la_kefi', text:'أنا أختار الخانة. ليش؟ على كيفي.', likes:'987' },
    desc:'تختار خانتك بنفسك هالدور.' },
  { id:'N11', tier:'normal', kind:'defense', fx:'cleanse', name:'رايق', src:'رياكشن', snd:'game:c_chillguy',
    desc:'+50، وتمسح عنك كل الضربات اللي عليك.' },
  { id:'N12', tier:'normal', kind:'buff', fx:'fullsteal', name:'ببلاش', src:'رياكشن', snd:'game:c_freeestate',
    desc:'أول سرقة لك لين نهاية اللفة الجاية تاخذها كاملة مو نصها.' },
  { id:'N13', tier:'normal', kind:'chaos', fx:'hayat', name:'هياط', src:'سعودي', snd:'meme:sa_majnoon',
    desc:'لازم تختار صعب: تنجح +150 زيادة، تفشل −75.' },
  { id:'N15', phase:'mid', tier:'normal', kind:'attack', fx:'prank', target:'next', name:'مقلب', src:'سعودي', snd:'game:g_clashlaugh',
    desc:'تحط بطاقة سودا بيد اللي بعدك.' },
  { id:'N16', phase:'mid', tier:'normal', kind:'chaos', fx:'swapTurn', target:'choose', name:'روح انت أول', src:'أفلام', snd:'game:g_swoosh',
    desc:'تبدّل دورك مع فريق ما لعب هاللفة.' },
  { id:'N17', phase:'mid', tier:'normal', kind:'attack', fx:'roast', target:'choose', name:'طقطقة', src:'سعودي', snd:'meme:sa_tagtaga',
    desc:'أي فريق تختاره يخسر 100.' },
  { id:'N18', phase:'mid', tier:'normal', kind:'chaos', fx:'bet', target:'choose', name:'أراهنك', src:'أفلام', snd:'meme:dun',
    desc:'تتوقع فريق بينجح ولا بيفشل بدوره الجاي: صح +100، غلط −50.' },

  { id:'N19', tier:'normal', phase:'early', kind:'chaos', fx:'haul', name:'زاد الطريق', src:'مواقف', snd:'game:g_oneup',
    desc:'تسحب بطاقتين على طول.' },
  { id:'N20', tier:'normal', phase:'late', kind:'buff', fx:'comeback', name:'ما بقى شي', src:'رياكشن', snd:'game:g_ohmygod',
    desc:'لو انتم الأخير تاخذون ثلث الفرق بينكم وبين المتصدر (من 50 إلى 250). غير كذا +50.' },

  // ===== السودا (5) — شكلها بس =====
  { id:'K2', tier:'black', kind:'dud', fx:'none', name:'دق علي', src:'سعودي', snd:'game:c_nokia',
    desc:'الرقم المطلوب مغلق. ما تسوي شي.' },
  { id:'K3', tier:'black', kind:'dud', fx:'none', name:'توصي؟', src:'رياكشن', snd:'meme:sa_hala',
    desc:'يسألك توصي شي ويمشي. ما تسوي شي.' },
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
