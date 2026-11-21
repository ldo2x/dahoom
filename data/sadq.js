// لعبة «ما أصدقك» — لعبة خداع: الشخصيات والحركات وأحداث المجلس
// كل لاعب عنده ورقتين شخصيات مقلوبة (حياتين). يقدر يدّعي أي شخصية حتى لو ما هي عنده،
// والباقين يقدرون يقولون «ما أصدقك». الفلوس (ريالات) والغرامات تروح لصندوق المجلس.
window.DAHOOM_DATA = window.DAHOOM_DATA || {};
window.DAHOOM_DATA.sadq = {
  // الشخصيات — كل وحدة 3 نسخ بالكومة
  roles: {
    tajer:  { name:'التاجر',  icon:'coins',       color:'#D9961A', act:'tijara',    block:null,        line:'يجيب الفلوس بسرعة' },
    wasta:  { name:'الواسطة', icon:'phone',       color:'#2E9E5B', act:'wasta',     block:'mukhalafa', line:'يعرف أحد بكل مكان' },
    muhami: { name:'المحامي', icon:'hm-gavel',    color:'#8A5A2B', act:'istishara', block:'fadiha',    line:'عنده مخرج لكل ورطة' },
    harami: { name:'الحرامي', icon:'ninja',       color:'#5E6680', act:'nashl',     block:'mubadala',  line:'خفيف يد وما ينضحك عليه' },
    shurti: { name:'الشرطي',  icon:'hm-siren',    color:'#2478C8', act:'mukhalafa', block:'nashl',     line:'يحب يكتب مخالفات' },
    faddah: { name:'المخبر',  icon:'hm-camera',   color:'#D5489A', act:'fadiha',    block:null,        line:'يعرف أسرار الكل' },
    dallal: { name:'الدلّال', icon:'hm-exchange', color:'#E2563F', act:'mubadala',  block:null,        line:'يبيعك الشي ويشتريه منك' },
  },
  order: ['tajer','wasta','muhami','harami','shurti','faddah','dallal'],
  // الحركات: role = الشخصية اللي لازم تدّعيها (null = أي أحد) · target = على لاعب · cost = تنحط بالصندوق أول ما تعلنها
  actions: {
    dawam:     { name:'دوام',    icon:'hm-briefcase', role:null,     desc:'خذ 1 من البنك' },
    salfa:     { name:'سلفة',    icon:'hm-cash',      role:null,     desc:'خذ 3 الحين، وبداية دورك الجاي تدفع 4 للصندوق' },
    tard:      { name:'طرد',     icon:'exit',         role:null,     desc:'ادفع 7 للصندوق ولاعب يخسر ورقة. ما ينصد', target:true, cost:7 },
    tijara:    { name:'تجارة',   icon:'coins',        role:'tajer',  desc:'خذ 3 من البنك' },
    wasta:     { name:'واسطة',   icon:'phone',        role:'wasta',  desc:'خذ اللي في صندوق المجلس (لين 5)' },
    istishara: { name:'استشارة', icon:'hm-gavel',     role:'muhami', desc:'اسحب ورقتين وبدّل وحدة من أوراقك لو تبي' },
    nashl:     { name:'نشل',     icon:'ninja',        role:'harami', desc:'خذ 2 من لاعب', target:true, blockedBy:'shurti' },
    mukhalafa: { name:'مخالفة',  icon:'hm-siren',     role:'shurti', desc:'لاعب يدفع 2 للصندوق', target:true, blockedBy:'wasta' },
    fadiha:    { name:'بلاغ',    icon:'hm-camera',    role:'faddah', desc:'ادفع 3 للصندوق ولاعب يخسر ورقة', target:true, cost:3, blockedBy:'muhami' },
    mubadala:  { name:'مبادلة',  icon:'hm-exchange',  role:'dallal', desc:'خذ ورقة عشوائية من لاعب وعطه وحدة من أوراقك', target:true, blockedBy:'harami' },
  },
  actionOrder: ['dawam','salfa','tard','tijara','wasta','istishara','nashl','mukhalafa','fadiha','mubadala'],
  // أحداث المجلس: وحدة بداية كل لفة (من اللفة الثانية)
  events: [
    { id:'rawatib', name:'يوم رواتب',     icon:'hm-briefcase', desc:'الدوام يعطي 2 بدل 1 هاللفة' },
    { id:'taftish', name:'حملة تفتيش',    icon:'search',       desc:'اللي يكشف غلط يدفع 2 للصندوق بدل ما يخسر ورقة' },
    { id:'zakat',   name:'زكاة',          icon:'coins',        desc:'كل لاعب معه 7 أو أكثر يدفع 2 للصندوق الحين' },
    { id:'hazr',    name:'حظر تجوّل',     icon:'padlock',      desc:'ما فيه نشل ولا مخالفة هاللفة' },
    { id:'takhfid', name:'تخفيضات',       icon:'down',         desc:'الطرد بـ 5 بدل 7 هاللفة' },
    { id:'malyan',  name:'الصندوق مليان', icon:'hm-building-bank', desc:'البنك يحط 3 في صندوق المجلس' },
    { id:'hudu',    name:'لفة هادية',     icon:'moon',         desc:'ولا شي — لفة عادية' },
  ],
  copies: 3, forceAt: 10, tardCost: 7, tardSale: 5, potStart: 2, loanTake: 3, loanPay: 4, wastaMax: 5,
};
