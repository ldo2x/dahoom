/* ===== دحوم — تحميل بيانات الألعاب عند الحاجة =====
   بدل ما الصفحة تحمّل كل ملفات data/ (أكثر من 600 كيلو) قبل ما تفتح، كل لعبة تحمّل ملفاتها لما تنفتح.

   الاستخدام:
     DahoomLazy.need('alf').then(()=>{ ... })   // يحمّل ملفات اللعبة مرة وحدة بس، ويرجع وعد (Promise)
     DahoomLazy.warm('khaliya')                   // تحميل هادي بالخلفية (وقت فراغ المتصفح)

   مهم — الترتيب: ملفات الأسئلة تعطي أرقام (q1, q2…) حسب ترتيب التحميل، والبلاغات القديمة مربوطة بهالأرقام.
   وكمان choices.js يكتب القائمة من جديد، فلازم ينفّذ قبل questions-3..8.
   عشان كذا: نجيب كل ملفات اللعبة مع بعض (بالتوازي) وننفّذها بالترتيب المكتوب هنا بالضبط — وإذا فشل
   ملف واحد ما ننفّذ ولا واحد (عشان الأرقام ما تخترب)، والمحاولة الجاية تعيدها كلها.

   الملفات اللي تبقى عادية في index.html (لأن الكود يقرأها أول ما يشتغل):
   cards.js و memes.js (core.js) ، hawamir.js و sadq.js (hawamir.js/sadq.js تاخذها وقت التحميل) ،
   وكمان questions.js و charades.js و challenges.js لين تنتقل قوائم التصنيفات (questionTags…) لملف صغير —
   لأن alf.js يقرأها أول ما يشتغل. شوف docs/launch.md.
*/
window.DahoomLazy = (function(){
  // نفس رقم النسخة (?v=) حق هالملف — عشان كاش المتصفح يتجدد مع كل نشر
  const V = (function(){ const s = document.currentScript && document.currentScript.src || ''; const m = s.match(/[?&]v=([^&#]+)/); return m ? m[1] : ''; })();

  // الترتيب هنا = ترتيبها الحالي في index.html (لا تغيّره)
  const GAMES = {
    alf: ['data/questions.js', 'data/questions-2.js', 'data/choices.js', 'data/questions-3.js', 'data/questions-4.js',
          'data/questions-5.js', 'data/questions-6.js', 'data/questions-7.js', 'data/questions-8.js',
          'data/charades.js', 'data/charades-2.js', 'data/challenges.js', 'data/challenges-2.js'],
    khaliya: ['data/letters-1.js', 'data/letters-2.js', 'data/letters-3.js', 'data/letters-4.js',
              'data/letters-hard-1.js', 'data/letters-hard-2.js'],
    rasm: ['data/words.js'],
    hawamir: [],
    sadq: [],
  };

  const done = new Set();          // ملفات تنفّذت
  const running = new Map();       // لعبة -> وعد شغال

  // الملفات اللي أصلاً محمّلة بوسم <script> عادي نعتبرها جاهزة
  function scan(){
    Array.prototype.forEach.call(document.scripts, s => {
      const m = (s.getAttribute('src') || '').match(/(data\/[^?#]+\.js)/);
      if(m) done.add(m[1]);
    });
  }

  const url = p => p + (V ? '?v=' + V : '');
  function get(p){
    return fetch(url(p), { credentials: 'same-origin' }).then(r => {
      if(!r.ok) throw new Error(p + ' ' + r.status);
      return r.text();
    });
  }
  function exec(p, code){
    const s = document.createElement('script');
    s.textContent = code + '\n//# sourceURL=' + location.href.replace(/[^/]*([?#].*)?$/, '') + url(p);
    document.head.appendChild(s);
    s.remove();
    done.add(p);
  }

  function need(game){
    scan();
    const list = (GAMES[game] || []).filter(p => !done.has(p));
    if(!list.length) return Promise.resolve(game);
    if(running.has(game)) return running.get(game);
    const job = Promise.all(list.map(get))
      .then(codes => { codes.forEach((c, i) => { if(!done.has(list[i])) exec(list[i], c); }); return game; })
      .finally(() => running.delete(game));
    running.set(game, job);
    return job;
  }

  // تحميل بالخلفية بدون ما يزاحم أول فتح للصفحة
  function warm(game){
    const go = () => need(game).catch(() => {});
    if('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500);
  }

  const ready = game => (GAMES[game] || []).every(p => done.has(p));

  return { need, warm, ready, GAMES };
})();
