/* ===== ميمات ولحظات اللعب =====
   كل قائمة تقبل اسم ملف داخل assets/memes أو assets/gif، أو رابط مباشر من النت.
   تبي تزيد؟ حط الملف في assets/memes واكتب اسمه هنا.
*/
window.DAHOOM_DATA = window.DAHOOM_DATA || {};
window.DAHOOM_DATA.memes = {
  // ميمات لحظات اللعب
  moments: {
    correct:     ['sheesh.webp','big_brain.webp','lets_gooo.webp','mind_blown.webp','sa_fist.webp','sa_celebrate.webp','sa_clap.webp','sa_ok.webp'],
    wrong:       ['emotional_damage.webp','bruh_moment.webp','sad_violin.webp','nice_try.webp','sa_facepalm.webp','sa_what.webp','sa_no.webp','you_died.webp'],
    steal:       ['yoink.webp','mine_now.webp','sa_shock.webp','sa_laugh.webp'],
    think:       ['math_lady_confused.webp','thinking_hmm.webp'],
    drum:        ['drumroll_please.webp'],
    win:         ['victory_royale.webp','we_are_the_champions.webp','mission_passed.webp','sa_ardah.webp','sa_celebrate.webp'],
    jackpotWin:  ['stonks.webp'],
    jackpotLose: ['not_stonks.webp','you_died.webp','sa_sad.webp'],
    finalRound:  ['finish_him.webp'],
    tie:         ['spiderman_pointing.webp'],
    legendary:   ['plot_twist.webp','oh_no_anyway.webp'],
    black:       ['sad_trombone.webp'],
    reverse:     ['spiderman_pointing.webp'],
  },
  // أصوات لحظات اللعب (assets/sfx/meme)
  sounds: {
    correct:  ['sheesh','sa_kafu','sa_hala','wow'],
    wrong:    ['bruh','damage','oof','sa_khalas','sa_lysh'],
    steal:    ['yeet','fbi','sa_taal'],
    win:      ['passed','victory','sa_fakhoor'],
    lose:     ['wasted'],
    legendary:['boom'],
    black:    ['spongefail','violin'],
    finalRound:['dun'],
    tie:      ['tbc'],
  },
  // ذبات تطلع مكتوبة فوق الميم
  captions: {
    legendary:   ['بلوت تويست','قلبت الطاولة','هذي مو بطاقة… هذي إعلان حرب','خلاص خلّصت اللعبة','ما توقعناها منك'],
    medium:      ['حركة نظيفة','مو بطالة أبد','شكلك ناوي على شي','الله يعينهم عليك'],
    normal:      ['بسيطة… بس تفرق','خير وبركة','مشّها'],
    black:       ['انضحك عليك','بس كذا؟','الله يعوضك','سحبة فاضية زي الوعود'],
    jackpotWin:  ['ستونكس','طلعت مقامر محترف','الحظ حليفك اليوم'],
    jackpotLose: ['نوت ستونكس','قلنا لك على قدك','المقامرة ما ترحم'],
    steal:       ['يوينك','سرقة قدام الكل','خذاها وهو يضحك','ببلاش'],
    correct:     ['شيييش','كفو والله','قوي ما شاء الله','ذيب','هذا الكلام'],
    wrong:       ['إيموشنال ديميج','قريبة… بس لا','يا ساتر','خلاص ياخي','YOU DIED'],
    finalRound:  ['FINISH HIM','اللفة الأخيرة — شدّوا حيلكم','الحين بانت الرجال'],
    tie:         ['تعادل؟ نحسمها','ما فيه إلا الحسم'],
    reverse:     ['العب غيرها','رجعت لك','ارتدت عليك'],
  },
};
