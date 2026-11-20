/* ===== دحوم — سيرفرات الاتصال (ICE) =====
   الشاشة والجوال يتصلون مباشرة (WebRTC). عشان يلقون بعض:
   - STUN: يعرّف الجهاز على عنوانه العام. مجاني وكافي لأغلب البيوت.
   - TURN: وسيط يمرّر البيانات لما الشبكة تمنع الاتصال المباشر (بعض شركات الجوال، شبكات الدوام والفنادق).
   ملاحظة: peerjs 1.5.4 يجي معه TURN افتراضي (eu-0/us-0.turn.peerjs.com) بس أسماءه ما عادت تشتغل
   (فحصناها نوفمبر ٢٠٢٦: ما لها عنوان)، يعني فعلياً الموجود STUN بس. هنا نحط STUN أوضح ومكان لـ TURN حقيقي.

   الاستخدام في net.js و remote.js:
     new window.Peer(id, { debug:0, config:{ iceServers: window.DAHOOM_ICE.iceServers } })
   المصفوفة نفسها (نفس المرجع) تتحدث لما توصل بيانات TURN، فأي اتصال جديد ياخذها تلقائياً.
*/
window.DAHOOM_ICE = (function(){

  // ====================================================================
  // ==== TURN — هنا يضيف صاحب الموقع بيانات TURN (اختر طريقة وحدة) ====
  // ====================================================================
  // (1) رابط يرجّع بيانات TURN بصيغة JSON (الأفضل — البيانات تتجدد وما تنحفظ بالكود):
  //     Metered (مجاني 20 قيقا بالشهر):
  //       'https://<اسم-التطبيق>.metered.live/api/v1/turn/credentials?apiKey=<المفتاح>'
  //     Cloudflare (مجاني 1000 قيقا بالشهر) عن طريق Worker صغير — شوف docs/launch.md:
  //       'https://dahoom-turn.<حسابك>.workers.dev/'
  const TURN_FETCH_URL = '';
  // (2) أو بيانات ثابتة (أسهل، بس أي أحد يقدر يشوفها من الكود — حدّد الاستخدام من لوحة المزوّد):
  //     { urls:['turn:example.com:3478','turns:example.com:443?transport=tcp'], username:'...', credential:'...' }
  const TURN_STATIC = [];
  // ====================================================================

  // STUN: سيرفرين يكفون (كثرة السيرفرات تبطّئ تجميع المسارات)
  const STUN = [
    { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] },
  ];
  const iceServers = [].concat(STUN, TURN_STATIC);
  const CACHE = 'dahoom_turn_cache';
  const CACHE_MS = 50 * 60 * 1000;   // بيانات Cloudflare/Metered المؤقتة نحفظها أقل من ساعة

  // يضيف سيرفرات TURN الجديدة لنفس المصفوفة (in place) عشان الاتصالات الجاية تاخذها
  function inject(list){
    if(!Array.isArray(list) || !list.length) return;
    list.forEach(s => {
      if(!s || !s.urls) return;
      // المنفذ 53 محجوب بالمتصفحات (Cloudflare يرجّعه) — نشيله عشان ما ننتظره على الفاضي
      const urls = [].concat(s.urls).filter(u => !/:53(\?|$)/.test(u));
      if(urls.length) iceServers.push(Object.assign({}, s, { urls }));
    });
  }
  // يقبل: [ ... ] (Metered) أو { iceServers:[...] } أو { iceServers:{...} } (Cloudflare)
  function normalize(j){
    if(Array.isArray(j)) return j;
    if(j && Array.isArray(j.iceServers)) return j.iceServers;
    if(j && j.iceServers && j.iceServers.urls) return [j.iceServers];
    return [];
  }
  const ready = (function(){
    if(!TURN_FETCH_URL || typeof fetch !== 'function') return Promise.resolve(iceServers);
    try{
      const c = JSON.parse(sessionStorage.getItem(CACHE) || 'null');
      if(c && c.exp > Date.now()){ inject(c.list); return Promise.resolve(iceServers); }
    }catch(e){}
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const to = setTimeout(() => ctl && ctl.abort(), 5000);
    return fetch(TURN_FETCH_URL, { signal: ctl ? ctl.signal : undefined, cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(j => { const list = normalize(j); inject(list); try{ sessionStorage.setItem(CACHE, JSON.stringify({ exp: Date.now() + CACHE_MS, list })); }catch(e){} return iceServers; })
      .catch(e => { console.warn('[DAHOOM_ICE] TURN fetch failed', e); return iceServers; })
      .finally(() => clearTimeout(to));
  })();

  // ---------- تشخيص الاتصال ورسائل واضحة للاعب ----------
  // أسباب: 'ice' = الشبكة مانعة الاتصال المباشر ، 'signal' = ما وصلنا لسيرفر الربط ،
  //        'browser' = المتصفح ما يدعم ، 'offline' = ما فيه نت ، 'slow' = الاتصال بطيء
  const MSG = {
    ice:     'شبكتك مانعة الاتصال المباشر بالشاشة. جرّب تبدّل من الواي فاي لبيانات الجوال أو العكس، وبعدها ادخل الكود مرة ثانية.',
    signal:  'ما قدرنا نوصل لسيرفر الربط. تأكد إن النت شغال، أو بدّل الشبكة وجرّب مرة ثانية.',
    browser: 'متصفحك ما يدعم الاتصال المباشر. افتح الرابط من كروم أو سفاري بنسخة محدّثة.',
    offline: 'جوالك مو متصل بالنت. شغّل الواي فاي أو بيانات الجوال وجرّب.',
    slow:    'الاتصال ثقيل شوي… لو طوّل، بدّل الشبكة وارجع ادخل الكود.',
    room:    'الكود غلط أو الشاشة مقفلة. تأكد من الكود وجرب مرة ثانية.',
    host:    'فيه جوال ما قدر يتصل بالشاشة — غالباً شبكته مانعة الاتصال. خلّه يبدّل لبيانات الجوال أو الواي فاي الثاني.',
  };
  // يحوّل خطأ PeerJS (أو سبب جاهز) لسبب من فوق
  function reason(e){
    if(typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
    const t = typeof e === 'string' ? e : (e && e.type) || '';
    if(MSG[t]) return t;
    if(t === 'negotiation-failed' || t === 'webrtc') return 'ice';
    if(t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed' || t === 'disconnected') return 'signal';
    if(t === 'browser-incompatible') return 'browser';
    if(t === 'peer-unavailable') return 'room';
    return 'ice';
  }
  const why = e => MSG[reason(e)];

  // يراقب اتصال (DataConnection حق PeerJS): لو مسار الشبكة فشل يستدعي onBad('ice')
  function watch(conn, onBad){
    const pc = conn && conn.peerConnection;
    if(!pc || !pc.addEventListener) return;
    let fired = false;
    const check = () => {
      const s = pc.iceConnectionState;
      if(!fired && s === 'failed'){ fired = true; onBad && onBad('ice'); }
    };
    pc.addEventListener('iceconnectionstatechange', check);
  }
  // بعد مهلة بدون فتح: نحاول نعرف السبب من حالة المسار
  function diagnose(peer, conn){
    if(typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
    if(peer && (peer.disconnected || peer.destroyed || !peer.open)) return 'signal';
    const pc = conn && conn.peerConnection;
    const s = pc && pc.iceConnectionState;
    if(s === 'failed' || s === 'checking' || s === 'new') return 'ice';
    return 'slow';
  }

  // فحص يدوي من الكونسول: await DAHOOM_ICE.test()  → هل فيه مسار TURN (relay) شغال؟
  async function test(ms){
    await ready;
    const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: 'relay' });
    const found = [];
    pc.onicecandidate = e => { if(e.candidate && / relay /.test(e.candidate.candidate)) found.push(e.candidate.candidate); };
    pc.createDataChannel('t');
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise(r => setTimeout(r, ms || 5000));
    pc.close();
    return { relay: found.length > 0, candidates: found, servers: iceServers.map(s => [].concat(s.urls).join(' ')) };
  }

  return { iceServers, ready, why, reason, watch, diagnose, test, MSG };
})();
