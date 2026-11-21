/* ===== دحوم — فلتر الكلام البذيء =====
   للأسماء واليوزرنيم والنبذة وأسماء الفرق والتخمينات اللي تطلع للكل.
   DahoomBad.has(نص)    → true لو فيه كلمة ما تصلح
   DahoomBad.clean(نص)  → نفس النص والكلمات اللي ما تصلح صارت ***
   الطريقة: نوحّد الحروف (أإآ→ا، ة→ه، ى→ي، نشيل التشكيل والتطويل والحروف المكررة)، ونقسّم الكلام لكلمات،
   ونشيل البادئات واللواحق الشايعة (ال، يا، و، ب / ك، ه، ها، كم…) ونطابق الجذر.
   الكلمات القصيرة (مثل كس وزب) تنطابق ككلمة كاملة بس — عشان «عكس» و«زبون» و«تاكسي» ما تنحجب.
   الكلمات الطويلة الواضحة تنطابق حتى لو داخل كلمة ثانية.
   الحروف المفرّقة (ك س م ك) أو المفصولة بنقاط تنجمع قبل الفحص. */
(function(){
  // ---------- القوائم (مكتوبة بعد التوحيد: ة→ه، ى→ي، أ→ا) ----------
  // كلمة كاملة (بعد شيل البادئات واللواحق)
  const WORD = new Set([
    'كس','كسس','كسك','كسها','كسمك','كسامك','كسختك','كسخت','زب','زبي','زبك','ازبار','طيز','طيزك','طيازه',
    'نيك','نيكه','انيك','انيكك','ينيك','تنيك','نيكني','منيك','منيوك','منيوكه','نياك','متناك','انتاك',
    'شرموط','شرموطه','شراميط','قحبه','قحاب','قحبات','عاهر','عاهره','عواهر','لوطي','لواط',
    'ديوث','دياثه','معرص','عرص','عرصه','خنيث','مخنث','شاذ','سكس','سكسي','بورن','اباحي','اباحيه','بظر','مهبل',
    'خرا','خره','يلعن','تفو',
    // إنجليزي وعربيزي
    'fuck','fuk','fck','fuq','shit','sh1t','bitch','cunt','dick','dik','cock','pussy','whore','slut','nigger','nigga','faggot','fag',
    'porn','sex','sexy','asshole','bastard','penis','vagina','rape','retard','motherfucker',
    'kos','koss','kosomak','kosomk','zeb','zib','teez','tiz','neek','nik','sharmoota','sharmota','gahba','qahba','manyook','khawal',
  ]);
  // تنحجب حتى لو كانت داخل كلمة (طويلة وواضحة، ما تجي صدفة داخل كلمة عادية)
  const PART = [
    'كسمك','كسامك','كسختك','شرموط','قحبه','منيوك','متناك','عاهره','ديوث','معرص','انيكك','نيكني','طيزك',
    'fuck','fuk','fck','shit','bitch','cunt','nigg','fagg','whore','porn','pussy','asshole','motherf','kosom','sharmo','gahba','qahba','manyo','khawal',
  ];
  const PRE = ['وال','بال','لل','ال','يا','و','ب','ل'];
  const SUF = ['هم','هن','كم','كن','ها','نا','ه','ك','ي'];   // بدون ون/ين/ات: «زبون» كانت تصير «زب»

  // ---------- التوحيد ----------
  const LEET = { '0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','@':'a','$':'s','!':'i' };
  function norm(s){
    return String(s||'').toLowerCase()
      .replace(/[ً-ٰٟـ]/g,'')               // التشكيل والتطويل
      .replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
      .replace(/ک/g,'ك').replace(/ی/g,'ي').replace(/[​-‏‪-‮⁦-⁩]/g,'');
  }
  const squeeze = w => w.replace(/(.)\1+/g,'$1');                  // كككس → كس
  const leet = w => w.replace(/[0134578@$!]/g, c=>LEET[c]);
  // كلمات + الحروف المفرّقة مجموعة (ك س م ك / f.u.c.k)
  function words(s){
    const raw = norm(s).split(/[^a-z0-9@$!ء-ي]+/).filter(Boolean);
    const out = [], run = [];
    const flush = () => { if(run.length>1) out.push(run.join('')); run.length=0; };
    raw.forEach(w=>{ if([...w].length===1) run.push(w); else { flush(); out.push(w); } });
    flush();
    // ونضيف النص كامل بدون فواصل للحروف المفرّقة بنقاط (f.u.c.k يصير fuck)
    const glued = norm(s).replace(/[\s._\-*~|\\\/]+/g,'');
    return { list: out.concat(raw), glued };
  }
  function stems(w){
    const set = new Set([w]);
    for(const p of PRE) if(w.startsWith(p) && w.length-p.length>=2) set.add(w.slice(p.length));
    for(const x of [...set]) for(const s of SUF) if(x.endsWith(s) && x.length-s.length>=2) set.add(x.slice(0,-s.length));
    return set;
  }
  function badWord(w){
    for(const v of new Set([w, squeeze(w), leet(w), squeeze(leet(w))])){
      for(const st of stems(v)) if(WORD.has(st)) return true;
      if(PART.some(p=>v.includes(p))) return true;
    }
    return false;
  }
  function has(s){
    if(!s) return false;
    const { list, glued } = words(s);
    if(list.some(badWord)) return true;
    const g = squeeze(leet(glued));
    return WORD.has(g) || PART.some(p=>g.includes(p));
  }
  // يستبدل الكلمات اللي ما تصلح بنجوم (للتخمينات وأسماء الفرق)
  function clean(s){
    s = String(s||''); if(!has(s)) return s;
    const out = s.replace(/[^\s]+/g, w => badWord(norm(w).replace(/[^a-z0-9@$!ء-ي]+/g,'')) ? '***' : w);
    return has(out) ? '***' : out;
  }
  window.DahoomBad = { has, clean, _norm:norm };
})();
