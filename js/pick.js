/* ===== صفحة الاختيارات (pick.html) =====
   صاحب المنصة يختار صورة كل بطاقة ويسمع الأصوات ويبدّلها. الاختيارات تنحفظ بالجهاز (dahoom_picks)
   واللعبة تقراها من js/core.js. زر «انسخ اختياراتي» يطلع النص اللي ينرسل عشان تتثبت للكل.
   DEF لازم يطابق ALIAS في core.js.
*/
(function(){
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ic = n => `<i class="ic" style="--i:url(../assets/icons/${n}.svg)"></i>`;
  const C = window.DAHOOM_DATA.cards, M = window.DAHOOM_DATA.memes, PK = window.DAHOOM_PICK;
  const KEY = 'dahoom_picks';
  const blank = () => ({ snd:{}, csnd:{}, gif:{}, off:[] });
  let P = blank();
  try{ P = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){}
  const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(P)); }catch(e){} count(); };
  function count(){
    const n = Object.keys(P.gif).length + Object.keys(P.snd).length + Object.keys(P.csnd).length + P.off.length;
    $('#pk-count').textContent = n ? `${n} اختيار` : 'ولا اختيار';
  }

  // ---------- تشغيل الأصوات ----------
  const DEF = { correct:'game:g_ding', wrong:'game:g_feudx', steal:'game:g_mgs', coin:'game:g_mariocoin', bonus:'game:g_oneup',
    win:'game:g_ffwin', applause:'meme:passed', clockloop:'game:g_jeopardy', cheer:'game:g_mkcount', levelup:'game:g_mclevel',
    unlock:'meme:discord', bling:'game:g_sonic', fail:'game:g_mariodeath', card:'game:g_swoosh', drumroll:'file:drumroll',
    buzzer:'file:buzzer', tick:'file:tick', pop:'syn', jingle:'syn', drums:'syn' };
  const SYN = { pop:[[520,0,60,'sine',.2,760]], drums:[[300,0,220,'sine',.12,900]],
    jingle:[[659,0,100,'triangle',.17],[784,95,100,'triangle',.17],[988,190,100,'triangle',.17],[1319,285,300,'triangle',.19]] };
  const EVENTS = [
    ['correct','إجابة صح','لما الفريق يجاوب صح'], ['wrong','إجابة غلط','لما يجاوب غلط'], ['fail','فشل','تحدي أو تمثيل ما نجح'],
    ['steal','سرقة','فريق سرق السؤال'], ['coin','نقاط','لما تنضاف نقاط'], ['bonus','بونص','بونص، وإعلان اسم الفايز باللقب'],
    ['cheer','بداية المباراة','لما تضغط ابدأ'], ['levelup','لفة جديدة','بداية كل لفة'], ['card','سحب بطاقة','بطاقة تنسحب أو تتبدل'],
    ['drums','بداية السحب','قبل ترتيب الفرق وبداية التتويج'], ['drumroll','طبل','قبل إعلان كل لقب'], ['buzzer','خلص الوقت','نهاية العدّاد'],
    ['tick','عدّاد','آخر ثواني الوقت'], ['clockloop','موسيقى الوقت','تشتغل طول وقت السؤال'], ['unlock','لاعب دخل','لاعب انضاف'],
    ['bling','تم','تلميح أو تأكيد'], ['pop','ضغطة زر','التنقل بين الشاشات'], ['jingle','دخول المنصة','زر الدخول بأول شاشة'],
    ['win','الفوز','شاشة الفايز'], ['applause','تصفيق النهاية','بعد إعلان الفايز'],
  ];
  const srcOf = n => n.startsWith('meme:') ? 'assets/sfx/meme/'+n.slice(5)+'.mp3' : n.startsWith('game:') ? 'assets/sfx/game/'+n.slice(5)+'.mp3' : 'assets/sfx/'+n.replace(/^file:/,'')+'.mp3';
  const nice = k => !k ? '' : k==='syn' ? 'نغمة بسيطة' : k==='none' ? 'بدون صوت' : k.replace(/^(game:[gc]_|game:|meme:sa_|meme:|file:)/,'');
  let AC=null, cur=null, stopT=0;
  function synth(name){
    try{ AC = AC || new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
    const t0=AC.currentTime+0.01;
    (SYN[name]||SYN.pop).forEach(([f,st,du,type,g,f2])=>{ const o=AC.createOscillator(), a=AC.createGain(), s=t0+st/1000, e=s+du/1000;
      o.type=type; o.frequency.setValueAtTime(f,s); if(f2) o.frequency.exponentialRampToValueAtTime(f2,e);
      a.gain.setValueAtTime(0.0001,s); a.gain.exponentialRampToValueAtTime(g,s+0.008); a.gain.exponentialRampToValueAtTime(0.0001,e);
      o.connect(a); a.connect(AC.destination); o.start(s); o.stop(e+0.03); });
  }
  function play(key, name){
    if(cur){ cur.pause(); cur=null; } clearTimeout(stopT);
    if(!key || key==='none') return;
    if(key==='syn') return synth(name);
    cur = new Audio(srcOf(key)); cur.volume=.6; cur.play().catch(()=>{});
    const a=cur; stopT=setTimeout(()=>{ if(cur===a){ a.pause(); cur=null; } }, 6000);
  }
  const libOpts = sel => [['file','أصوات أساسية'],['game','قيمنق'],['meme','ميمز']].map(([g,label])=>
    `<optgroup label="${label}">${PK.lib[g].map(f=>{ const v=g+':'+f; return `<option value="${v}"${v===sel?' selected':''}>${esc(nice(v))}</option>`; }).join('')}</optgroup>`).join('');

  // ---------- صور البطاقات ----------
  const small = ([k,n]) => `https://media.tenor.com/${k}AAAAM/${n}.gif`;
  const full  = ([k,n]) => `https://media.tenor.com/${k}AAAAC/${n}.gif`;
  function gifCard(c){
    const cand = PK.gifs[c.id] || [], pick = P.gif[c.id] || '';
    const custom = pick && !cand.some(x=>full(x)===pick);
    return `<section class="pk-card" data-card="${c.id}">
      <h3><i class="pk-dot ${c.tier}"></i>${esc(c.name)} <small>${c.id}</small></h3><p>${esc(c.desc)}</p>
      <div class="pk-gifs">
        <button class="pk-g ${c.art?'icon':''} ${pick?'':'sel'}" data-u="">${c.art ? ic(c.art) : `<img src="assets/cards/${c.id}_s.gif" alt="" loading="lazy">`}<span>الحالية</span></button>
        ${cand.map(x=>`<button class="pk-g ${full(x)===pick?'sel':''}" data-u="${esc(full(x))}"><img src="${esc(small(x))}" alt="" loading="lazy"></button>`).join('')}
        ${custom?`<button class="pk-g sel" data-u="${esc(pick)}"><img src="${esc(pick)}" alt="" loading="lazy"><span>رابطك</span></button>`:''}
      </div>
      <div class="pk-url"><input type="url" placeholder="أو الصق رابط صورة أو GIF من عندك (https://...)" value="${custom?esc(pick):''}"><button class="btn ghost" data-use>استخدمه</button></div>
    </section>`;
  }
  function tabGif(){
    $('#pk-main').innerHTML = `<p class="pk-note">اضغط الصورة اللي تناسب البطاقة. لو ولا وحدة تعجبك الصق رابط من عندك، أو خلّها على «الحالية».</p>` + C.map(gifCard).join('');
    $('#pk-main').onclick = e => {
      const g = e.target.closest('.pk-g'), use = e.target.closest('[data-use]'); if(!g && !use) return;
      const sec = e.target.closest('[data-card]'), id = sec.dataset.card;
      if(g){ if(g.dataset.u) P.gif[id]=g.dataset.u; else delete P.gif[id]; }
      else { const v = sec.querySelector('input').value.trim(); if(!/^https:\/\/\S+$/.test(v)){ alert('الرابط لازم يبدأ بـ https://'); return; } P.gif[id]=v; }
      save(); const c=C.find(x=>x.id===id); const tmp=document.createElement('div'); tmp.innerHTML=gifCard(c); sec.replaceWith(tmp.firstElementChild);
    };
  }

  // ---------- أصوات اللعبة ----------
  function tabSnd(){
    $('#pk-main').onclick=null;
    $('#pk-main').innerHTML = `<p class="pk-note">كل سطر صوت يطلع بلحظة معينة. اضغط «اسمع»، ولو ما عجبك اختر غيره من القائمة.</p><div class="pk-rows">${EVENTS.map(([n,label,when])=>{
      const v=P.snd[n]||''; return `<div class="pk-row ${v?'changed':''}" data-ev="${n}"><button class="pk-play">اسمع</button><b>${label}</b><span class="muted">${when}</span>
        <select><option value="">الأصلي (${esc(nice(DEF[n]))})</option>${SYN[n]&&DEF[n]!=='syn'?`<option value="syn"${v==='syn'?' selected':''}>نغمة بسيطة</option>`:''}<option value="none"${v==='none'?' selected':''}>بدون صوت</option>${libOpts(v)}</select></div>`; }).join('')}</div>`;
    $$('#pk-main [data-ev]').forEach(r=>{ const n=r.dataset.ev, s=r.querySelector('select');
      const now = () => P.snd[n] || DEF[n];
      r.querySelector('.pk-play').onclick=()=>play(now(), n);
      s.onchange=()=>{ if(s.value) P.snd[n]=s.value; else delete P.snd[n]; r.classList.toggle('changed', !!s.value); save(); play(now(), n); }; });
  }

  // ---------- أصوات اللحظات (قوائم عشوائية) ----------
  const POOLS = { correct:'إجابة صح', wrong:'إجابة غلط', steal:'سرقة', win:'الفوز', lose:'الخسارة', legendary:'بطاقة حمراء', black:'بطاقة سودا', finalRound:'اللفة الأخيرة', tie:'تعادل' };
  function tabPool(){
    $('#pk-main').onclick=null;
    $('#pk-main').innerHTML = `<p class="pk-note">بكل لحظة اللعبة تختار صوت عشوائي من هالقائمة. اسمعها ووقّف اللي ما تبيه.</p>` + Object.entries(M.sounds||{}).map(([k,l])=>
      `<h2 class="pk-group">${POOLS[k]||k}</h2><div class="pk-clips">${l.map(f=>{ const key='meme:'+f, off=P.off.includes(key);
        return `<span class="pk-clip ${off?'off':''}" data-clip="${key}"><button class="p">${esc(nice(key))}</button><button class="x">${off?'رجّعه':'وقّفه'}</button></span>`; }).join('')}</div>`).join('');
    $$('#pk-main [data-clip]').forEach(c=>{ const key=c.dataset.clip;
      c.querySelector('.p').onclick=()=>play(key);
      c.querySelector('.x').onclick=()=>{ const i=P.off.indexOf(key); if(i>=0) P.off.splice(i,1); else P.off.push(key); save();
        $$(`#pk-main [data-clip="${key}"]`).forEach(x=>{ const off=P.off.includes(key); x.classList.toggle('off',off); x.querySelector('.x').textContent=off?'رجّعه':'وقّفه'; }); }; });
  }

  // ---------- أصوات البطاقات ----------
  function tabCsnd(){
    $('#pk-main').onclick=null;
    $('#pk-main').innerHTML = `<p class="pk-note">الصوت اللي يطلع لما تنلعب كل بطاقة.</p><div class="pk-rows">${C.map(c=>{ const v=P.csnd[c.id]||'';
      return `<div class="pk-row ${v?'changed':''}" data-cs="${c.id}"><button class="pk-play">اسمع</button><b><i class="pk-dot ${c.tier}"></i> ${esc(c.name)}</b><span class="muted">${esc(c.desc)}</span>
        <select><option value="">الأصلي (${esc(nice(c.snd)||'بدون')})</option><option value="none"${v==='none'?' selected':''}>بدون صوت</option>${libOpts(v)}</select></div>`; }).join('')}</div>`;
    $$('#pk-main [data-cs]').forEach(r=>{ const id=r.dataset.cs, c=C.find(x=>x.id===id), s=r.querySelector('select');
      const now = () => P.csnd[id] || c.snd;
      r.querySelector('.pk-play').onclick=()=>play(now());
      s.onchange=()=>{ if(s.value) P.csnd[id]=s.value; else delete P.csnd[id]; r.classList.toggle('changed', !!s.value); save(); play(now()); }; });
  }

  // ---------- ربط ----------
  const TABS = { gif:tabGif, snd:tabSnd, pool:tabPool, csnd:tabCsnd };
  function open(t){ $$('#pk-tabs button').forEach(b=>b.classList.toggle('on', b.dataset.tab===t)); TABS[t](); window.scrollTo(0,0); }
  $('#pk-tabs').onclick = e => { const b=e.target.closest('[data-tab]'); if(b) open(b.dataset.tab); };
  $('#pk-copy').onclick = async () => {
    const txt = JSON.stringify(P), out=$('#pk-out'); out.value=txt; out.classList.remove('hidden');
    let ok=false; try{ await navigator.clipboard.writeText(txt); ok=true; }catch(e){ out.focus(); out.select(); }
    $('#pk-copy').textContent = ok ? 'انتسخت — أرسلها' : 'انسخ النص اللي تحت'; setTimeout(()=>$('#pk-copy').textContent='انسخ اختياراتي', 2500);
  };
  $('#pk-reset').onclick = () => { if(!confirm('تمسح كل اختياراتك وترجع اللعبة للأصلي؟')) return; P=blank(); save(); $('#pk-out').classList.add('hidden'); open($('#pk-tabs .on').dataset.tab); };
  count(); open('gif');
  window.DAHOOM_PICKS_DEBUG = { get:()=>P };
})();
