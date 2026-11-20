// صور اللاعبين — المصدر الوحيد للقائمة (core.js و account.js و remote.js ياخذون منه)
// كل اسم = ملف assets/avatars/<الاسم>.webp — لا تحذف اسم قديم (الملفات الشخصية المحفوظة تشير له)، تقدر تبدّل الصورة نفسها.
// مصدر كل صورة ورخصتها: assets/avatars/SOURCES.md
(function(){
  const groups = [
    { id:'memes', name:'ميمز', list:['doge','cheems','pepe_the_frog','trollface','gigachad','wojak','shrek_face','kermit','grumpy_cat','smudge_cat','crying_cat','pop_cat',
      'hide_the_pain_harold','mr_bean','nicolas_cage','the_rock_eyebrow','monkey_puppet','sad_hamster','chill_guy','side_eye_chloe','spongebob','patrick_star','squidward','minion'] },
    { id:'anime', name:'أنمي', list:['gojo','sukuna','itadori','kirara_hoshi','hakari','tanjiro','nezuko','zenitsu','luffy','zoro','naruto','goku','saitama','levi','mikasa',
      'anya','yor','loid','denji','power','sung_jinwoo','hinata_shoyo','isagi','momo_ayase','okarun','frieren','fern','killua','marin','bocchi','zero_two','megumin',
      'kaguya','chika','mai','tan_otori','astolfo','felix_argyle','hideri','saika','nagisa'] },
    { id:'cute', name:'لطيفين', list:['capybara','chiikawa','hamtaro','pochita','baby_yoda','shiba','kitten','puppy','red_panda','panda','quokka','sea_otter','fennec','bunny','hedgehog','owl','penguins'] },
    { id:'vibes', name:'أجواء', list:['full_moon','sunset_sea','sakura','starry_night','great_wave','aurora','milky_way','mountain_lake','tokyo_night','neon_city','lavender','tulip','sunflower','latte'] },
    { id:'gulf', name:'خليجي', list:['saudi_smile','saudi_smirk','falcon','arabian_horse','camel','dallah','palms','dunes','alula','edge_of_world','riyadh_night'] },
    { id:'stars', name:'مشاهير', list:['dua_lipa','keanu_reeves','tom_holland','mrbeast','jackie_chan','mohammed_abdu'] },
    { id:'sports', name:'رياضة', list:['ronaldo','messi','salah','benzema','mbappe','salem_aldawsari','football','stadium'] },
    { id:'games', name:'ألعاب', list:['mario','sonic','pikachu','eevee','kirby','link','steve','creeper','pacman','master_chief','barbarian'] },
  ];
  const all = [];
  groups.forEach(g => g.list.forEach(a => { if(!all.includes(a)) all.push(a); }));
  window.DAHOOM_AVATARS = { groups, all };
})();
