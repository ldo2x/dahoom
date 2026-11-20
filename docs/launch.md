# دحوم — خطة الإطلاق للعامة

آخر تحديث: 2026-11-20. هالملف للمالك وللي يدمج الشغل. كل بند فيه: **ليش** — **الحالة** — **وش على المالك**.

الحالات: `جاهز` (موجود بالمستودع) · `ينتظر الدمج` (الكود جاهز تحت، يحتاج يندمج بملفات مشتركة) · `ينتظر المالك` (يحتاج حساب أو قرار).

---

## 1) قائمة الإطلاق

| # | البند | ليش | الحالة | على المالك |
|---|---|---|---|---|
| 1 | `js/ice.js` (STUN أوضح + مكان لـ TURN) | الجوالات على شبكات صارمة تفشل بدون TURN | جاهز + ينتظر الدمج (سطرين) | لا شي — إلا لو بتضيف TURN (بند 2) |
| 2 | سيرفر TURN | بعض شركات الاتصالات وشبكات الدوام تمنع الاتصال المباشر | ينتظر المالك | فتح حساب مجاني (القسم 2) |
| 3 | رسائل واضحة لما يفشل الاتصال | اللاعب يعرف إن الحل "بدّل الشبكة" بدل ما يحاول للأبد | ينتظر الدمج (`remote.js`, `net.js`) | لا شي |
| 4 | PWA: `manifest.webmanifest` + أيقونات `assets/app/` | تثبيت على الشاشة الرئيسية وأيقونة مرتبة | جاهز + ينتظر الدمج (وسوم `<head>`) | لا شي |
| 5 | صورة المشاركة `assets/app/og.png` + وسوم OG | الرابط بالواتساب وتويتر يطلع بصورة وعنوان | جاهز + ينتظر الدمج | لا شي |
| 6 | `sw.js` (كاش ذكي) | فتح أسرع من ثاني مرة، وبدون نسخ قديمة عالقة | جاهز + ينتظر الدمج (تسجيل) | لا شي |
| 7 | `privacy.html` و `terms.html` | الثقة + شرط لشاشة موافقة قوقل | جاهز | **راجع كل TODO** بالصفحتين، وحط إيميل تواصل |
| 8 | روابط الخصوصية والشروط بالصفحة الرئيسية | لازم تكون واضحة من أول شاشة | ينتظر الدمج | لا شي |
| 9 | `js/lazy.js` (تحميل بيانات اللعبة عند فتحها) | يقلل أول تحميل 25% (410 كيلو) | جاهز + ينتظر الدمج | لا شي |
| 10 | نطاقات Firebase المسموحة | الدخول بقوقل يفشل على أي نطاق مو مضاف | ينتظر المالك | القسم 4 |
| 11 | قوانين Firestore | تمنع أي أحد يقرا أو يمسح السجلات | ينتظر المالك | القسم 4 — قارن بالقوانين الحالية |
| 12 | تقييد مفتاح Firebase بالنطاق | يمنع استخدام المفتاح من مواقع ثانية | ينتظر المالك | القسم 4 |
| 13 | شاشة موافقة قوقل (اسم التطبيق + روابط الخصوصية والشروط) | تطلع باسم «دحوم» بدل اسم المشروع | ينتظر المالك | القسم 4 |
| 14 | بدون تحليلات أو تتبع | نفس الوعد اللي بصفحة الخصوصية | جاهز (ما فيه شي يتتبع) | لا تضيف أدوات تتبع بدون تحديث الصفحة |
| 15 | مراقبة الأخطاء (بدون طرف ثالث) | نعرف عن الأعطال قبل ما يشتكي أحد | فكرة + كود جاهز (القسم 6) | قرار |
| 16 | نطاق خاص (اختياري) | رابط أقصر وأسهل | ينتظر المالك | القسم 5 |
| 17 | خطة الرجوع | لو صار شي بعد الإطلاق | جاهز (القسم 7) | اقرأها مرة |
| 18 | وسم إصدار قبل الإطلاق | نقطة رجوع واضحة | ينتظر المالك | `git tag launch-1 && git push --tags` |

---

## 2) الاتصال: TURN وسيرفر الربط

### الوضع الحالي (مفحوص)
- `peerjs 1.5.4` يستخدم سيرفر الربط المجاني `0.peerjs.com` (مجاني، بالتبرعات، بدون أي ضمان، وله تاريخ انقطاعات وتأخير بالدقايق مسجل بمشاكل المشروع على قيت هب).
- الإعداد الافتراضي فيه TURN باسم `eu-0.turn.peerjs.com` و `us-0.turn.peerjs.com` — **فحصناها: ما لها عنوان (DNS فاضي)**، يعني فعلياً الموجود STUN بس. اختبار `DAHOOM_ICE.test()` ما لقى أي مسار وسيط.
- اتصال PeerJS كامل بين صفحتين مع `config` الجديد: نجح خلال ~0.65 ثانية.

### الخيارات

| الخيار | التكلفة | المميزات | العيوب |
|---|---|---|---|
| **Cloudflare Realtime TURN** | مجاني لين 1000 قيقا بالشهر (مشترك مع SFU)، بعدها 0.05$/قيقا. STUN مجاني بلا حد | شبكة ضخمة قريبة من الخليج، يدعم `turns:443` (يعدّي أصعب الجدران) | البيانات مؤقتة، تحتاج Worker صغير (مجاني) يولّدها |
| **Metered Open Relay** | مجاني 20 قيقا بالشهر | أسهل شي: رابط فيه مفتاح، يرجّع البيانات مباشرة | 20 قيقا حد، والمفتاح يبان بالكود (قيّده بالنطاق من لوحتهم) |
| Twilio NTS | 0.40$/قيقا (أمريكا وأوروبا)، 0.60$ آسيا | موثوق | مدفوع من أول بايت، يحتاج سيرفر يولّد التوكن |
| coturn على سيرفر خاص | 4–6$ بالشهر لسيرفر صغير | تحكم كامل | صيانة وتحديثات أمنية وشهادة TLS — مو مناسب لهواية |

**كم نحتاج فعلياً؟** اللعب كله رسائل صغيرة (ضغطات وإجابات ونقاط الرسم). مباراة ساعة لعشر جوالات عبر TURN بالكامل أقل من 50 ميقا تقريباً. يعني حتى 20 قيقا تكفي مئات المباريات، و TURN ينستخدم بس للأجهزة اللي فشل معها المباشر (عادة 10–20%).

**التوصية:**
1. الآن: ادمج `js/ice.js` كما هو (مجاني، بدون حساب).
2. قبل الإطلاق العام: **Metered** لو تبي أسرع حل (5 دقايق)، أو **Cloudflare + Worker** لو تبي الأقوى والأكبر حد (15 دقيقة). الاثنين مجانيين لحجمنا.
3. سيرفر الربط: خلّه على `0.peerjs.com` بالإطلاق، وجهّز البديل تحت (القسم 2-ج). لو صار انقطاع أو بطء متكرر، انقل.

### 2-أ) خطوات Metered (المالك)
1. افتح `https://www.metered.ca/stun-turn` وسجّل حساب مجاني.
2. أنشئ تطبيق (مثلاً `dahoom`)، وروح لـ TURN Server ثم أنشئ Credential.
3. انسخ رابط الـ API اللي شكله: `https://dahoom.metered.live/api/v1/turn/credentials?apiKey=XXXX`
4. من إعدادات المفتاح، قيّده بالنطاق `ldo2x.github.io` لو الخيار متاح.
5. حطه في `js/ice.js` في `TURN_FETCH_URL`، وارفع.

### 2-ب) خطوات Cloudflare (المالك)
1. حساب Cloudflare مجاني ← Realtime ← TURN Server ← Create. انسخ **Turn Token ID** و **API Token**.
2. Workers & Pages ← Create ← Worker باسم `dahoom-turn`، والصق الكود تحت.
3. Settings ← Variables and Secrets: أضف سر `TURN_KEY_ID` وسر `TURN_KEY_API_TOKEN`.
4. Deploy، وانسخ الرابط `https://dahoom-turn.<حسابك>.workers.dev/` في `TURN_FETCH_URL` بـ `js/ice.js`.

```js
// Cloudflare Worker: dahoom-turn — يولّد بيانات TURN مؤقتة للموقع فقط
const ALLOWED = ['https://ldo2x.github.io', 'http://localhost:5517', 'http://127.0.0.1:5522'];
export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0], 'Vary': 'Origin', 'Cache-Control': 'no-store' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (!ALLOWED.includes(origin)) return new Response('forbidden', { status: 403, headers: cors });
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 4 * 3600 }),
    });
    return new Response(await r.text(), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
```
`ice.js` يفهم الرد (`{iceServers:[...]}`)، ويشيل روابط المنفذ 53 (محجوب بالمتصفحات)، ويحفظها 50 دقيقة بالجلسة.

### 2-ج) بديل سيرفر الربط (لو `0.peerjs.com` تعب)
- `peerjs-server` (حزمة `peer` على npm، أو صورة Docker `peerjs/peerjs-server`).
- استضافة مجانية: Render (الخدمة المجانية تنام بعد 15 دقيقة بدون حركة، وتصحى بحوالي دقيقة — رسائل WebSocket تبقيها صاحية أثناء اللعب). البديل الأضمن: سيرفر صغير مدفوع 4–5$.
- التبديل بعدها سطر بكل ملف (نفس مكان `config`):
```js
{ host:'dahoom-peer.onrender.com', port:443, path:'/', secure:true, debug:0, config:{ iceServers: window.DAHOOM_ICE.iceServers } }
```
تنبيه: الشاشة والجوالات لازم يكونون على نفس سيرفر الربط — انشر التغيير على `net.js` و `remote.js` بنفس الوقت.

---

## 3) مقتطفات جاهزة للدمج (الملفات المشتركة)

> الأرقام حسب النسخة `8590084`. لو تغيّرت، ابحث بالنص.

### 3-أ) تحميل `ice.js`
`index.html` بعد السطر 555 (`peerjs.min.js`)، و `remote.html` بعد السطر 112:
```html
<script src="js/ice.js?v=202611200620"></script>
```

### 3-ب) تمرير السيرفرات لـ PeerJS (سطرين)
`js/net.js` سطر 24:
```js
    peer = new window.Peer(PREFIX+code, Object.assign({debug:0}, window.DAHOOM_ICE ? {config:{ iceServers: window.DAHOOM_ICE.iceServers }} : {}));
```
`js/remote.js` سطر 63:
```js
    const peer = st.peer = new window.Peer(Object.assign({debug:0}, window.DAHOOM_ICE ? {config:{ iceServers: window.DAHOOM_ICE.iceServers }} : {}));
```
(الشرط عشان لو `ice.js` ما تحمّل، يرجع لإعدادات PeerJS الافتراضية بدل ما يصير بدون STUN.)

### 3-ج) رسائل فشل الاتصال — `js/remote.js`
بعد السطر 65 (`const conn = st.conn = peer.connect(...)`):
```js
      if(window.DAHOOM_ICE) window.DAHOOM_ICE.watch(conn, lost);
```
السطر 66 (المهلة) يصير:
```js
      const to = setTimeout(()=>{ if(!conn.open){ const I=window.DAHOOM_ICE; if(I) lost(I.diagnose(peer, conn)); else fail('ما قدرنا نوصل للشاشة — تأكد إن الشاشة فاتحة ومتصلة بالنت'); } }, 9000);
```
السطر 74 (`lost();` داخل `peer.on('error')`) يصير `lost(e);`

الدالة `lost` (الأسطر 78–82) تصير:
```js
  function lost(why){
    if(!st.room) return;
    const I = window.DAHOOM_ICE;
    // أول مرة: "نرجع نتصل". لو فيه سبب واضح أو تكرر الفشل: نقول له وش يسوي
    status(I && ((why && typeof why!=='function') || st.retry>=2) ? I.why(why || 'ice') : 'انقطع الاتصال… نرجع نتصل');
    clearTimeout(st.rt); st.rt=setTimeout(()=>{ if(!st.conn || !st.conn.open) connect(); }, Math.min(8000, 1500*(++st.retry)));
  }
```
(`conn.on('close', lost)` يمرر بدون سبب = الرسالة العادية. `conn.on('error', lost)` يمرر الخطأ = رسالة حسب نوعه.)

### 3-د) جهة الشاشة — `js/net.js`
السطر 30:
```js
      c.on('error', e=>{ conns.delete(c); refreshUI(); if(e && e.type==='negotiation-failed' && window.DAHOOM_ICE) toast(window.DAHOOM_ICE.MSG.host); });
```
السطر 40 (أخطاء الشبكة):
```js
      if(e.type==='network' || e.type==='server-error' || e.type==='socket-error'){ ready=false; refreshUI(); if(window.DAHOOM_ICE) toast(window.DAHOOM_ICE.why('signal')); }
```

### 3-هـ) وسوم `<head>` — `index.html`
تنضاف بعد سطر `<title>` (السطر 6)، وأيقونة SVG الحالية (السطر 9) تبقى:
```html
<meta name="description" content="دحوم: ألعاب جماعية للجمعات والسوالف. الشاشة للكل، والجوال بيد كل لاعب.">
<link rel="canonical" href="https://ldo2x.github.io/dahoom/">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="assets/app/favicon-32.png">
<link rel="apple-touch-icon" href="assets/app/apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="دحوم">
<meta name="mobile-web-app-capable" content="yes">
<meta property="og:type" content="website">
<meta property="og:site_name" content="دحوم">
<meta property="og:locale" content="ar_SA">
<meta property="og:title" content="دحوم — ألعاب الجمعة والسوالف">
<meta property="og:description" content="الشاشة للكل والجوال بيد كل لاعب: أسئلة، خلية الحروف، ارسم وخمّن، هوامير، وما أصدقك.">
<meta property="og:url" content="https://ldo2x.github.io/dahoom/">
<meta property="og:image" content="https://ldo2x.github.io/dahoom/assets/app/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="شعار دحوم: حرف الدال على مربع وردي">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="دحوم — ألعاب الجمعة والسوالف">
<meta name="twitter:description" content="الشاشة للكل والجوال بيد كل لاعب.">
<meta name="twitter:image" content="https://ldo2x.github.io/dahoom/assets/app/og.png">
<script>if('serviceWorker' in navigator && (location.protocol==='https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))){ addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); }); }</script>
```

### 3-و) وسوم `<head>` — `remote.html`
روابط الغرف (`remote.html?room=XXXX`) هي اللي تنرسل بالواتساب، فهذي الأهم. بعد السطر 8:
```html
<meta name="description" content="ادخل كود الغرفة والعب من جوالك مع اللي حولك.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="assets/app/favicon-32.png">
<link rel="apple-touch-icon" href="assets/app/apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="دحوم">
<meta name="mobile-web-app-capable" content="yes">
<meta property="og:type" content="website">
<meta property="og:site_name" content="دحوم">
<meta property="og:locale" content="ar_SA">
<meta property="og:title" content="تعال العب معنا — دحوم">
<meta property="og:description" content="افتح الرابط من جوالك وادخل الغرفة.">
<meta property="og:url" content="https://ldo2x.github.io/dahoom/remote.html">
<meta property="og:image" content="https://ldo2x.github.io/dahoom/assets/app/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://ldo2x.github.io/dahoom/assets/app/og.png">
<script>if('serviceWorker' in navigator && (location.protocol==='https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))){ addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); }); }</script>
```
`admin.html`: يُفضّل يضاف له `<meta name="robots" content="noindex">`.

### 3-ز) روابط الخصوصية والشروط
بأسفل الشاشة الرئيسية (`index.html`) وشاشة الدخول بالجوال (`remote.html`):
```html
<nav class="legal-links small muted"><a href="privacy.html">الخصوصية</a> · <a href="terms.html">الشروط</a></nav>
```

---

## 4) Firebase (المالك، من المتصفح)

**أ. النطاقات المسموحة للدخول**
Firebase Console ← مشروع `dahoom-cef06` ← Authentication ← Settings ← Authorized domains ← Add domain:
- `ldo2x.github.io`
- النطاق الخاص لو سويته (القسم 5)
- `localhost` موجود افتراضياً. احذف أي نطاق ما تستخدمه.

**ب. مزود قوقل وشاشة الموافقة**
- Authentication ← Sign-in method ← Google: مفعّل، وحط إيميل الدعم.
- Google Cloud Console (نفس المشروع) ← Google Auth Platform ← Branding: اسم التطبيق «دحوم»، الشعار `assets/app/icon-512.png`، رابط الخصوصية `https://ldo2x.github.io/dahoom/privacy.html`، رابط الشروط `https://ldo2x.github.io/dahoom/terms.html`، والنطاق `ldo2x.github.io` بالنطاقات المعتمدة.

**ج. تقييد المفتاح**
Google Cloud Console ← APIs & Services ← Credentials ← مفتاح المتصفح (اللي في `js/config.js`):
- Application restrictions ← Websites: `https://ldo2x.github.io/*` و `http://localhost:*/*` و `http://127.0.0.1:*/*`
- API restrictions: Cloud Firestore API، Identity Toolkit API، Token Service API.
ملاحظة: المفتاح عام بطبيعته؛ الحماية الحقيقية من القوانين.

**د. قوانين Firestore** — **قالب للمقارنة، لا تلصقه بدون ما تقارنه بقوانينك الحالية.**
`telemetry.js` يكتب بدون دخول (REST بالمفتاح بس)، فلازم الإنشاء يكون مسموح للكل لكن محدود، والقراءة للمالك بس.
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isOwner() {
      return request.auth != null && request.auth.token.email_verified == true
          && request.auth.token.email == 'OWNER_EMAIL_HERE';
    }
    function str(f, n) { return !(f in request.resource.data) || (request.resource.data[f] is string && request.resource.data[f].size() <= n); }

    match /reports/{id} {
      allow create: if request.resource.data.keys().hasOnly(['v','dev','kind','item','text','answer','d','tag','reason','note','by','status','at'])
                    && request.resource.data.status == 'open'
                    && str('text', 400) && str('answer', 200) && str('note', 400) && str('reason', 60) && str('by', 30);
      allow read, update, delete: if isOwner();
    }
    match /matches/{id} {
      allow create: if request.resource.data.game in ['alf','khaliya','rasm','hawamir','sadq']
                    && request.resource.data.keys().hasAll(['game','v','dev']);
      allow read, delete: if isOwner();
    }
    // ملف اللاعب (لما ينزل الدخول بقوقل): كل واحد يقرا ويكتب ملفه بس
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      allow read: if isOwner();
    }
    match /{document=**} { allow read, write: if false; }
  }
}
```
النشر: Firestore Database ← Rules ← الصق ← **Rules Playground** جرّب (إنشاء بلاغ بدون دخول = مسموح، قراءة بدون دخول = مرفوض) ← Publish.
أو بالطرفية: `firebase deploy --only firestore:rules` (يحتاج `firebase-tools` وتسجيل دخول المالك).

**هـ. التكلفة**: خلك على خطة Spark المجانية (بدون بطاقة) — لها حدود يومية (20 ألف كتابة و50 ألف قراءة) وما فيه فواتير مفاجئة. كل مباراة = كتابة وحدة.

---

## 5) نطاق خاص (اختياري)

1. اشترِ نطاق (مثلاً `.com` من أي مسجّل، أو `.sa` عن طريق مسجل معتمد من المركز السعودي لمعلومات الشبكة).
2. DNS عند المسجّل:
   - `www` ← CNAME ← `ldo2x.github.io`
   - النطاق الأساسي ← A: `185.199.108.153` و `185.199.109.153` و `185.199.110.153` و `185.199.111.153`
3. GitHub ← المستودع ← Settings ← Pages ← Custom domain ← اكتب النطاق ← Save ← بعد ما يتحقق فعّل **Enforce HTTPS**. (GitHub ينشئ ملف `CNAME` بالمستودع.)
4. بعدها حدّث: `PUBLIC_URL` في `js/net.js` (سطر 9)، روابط `og:` و `canonical`، نطاقات Firebase (4-أ)، تقييد المفتاح (4-ج)، `ALLOWED` بالـ Worker.
5. تنبيه: النطاق الجديد = تخزين محلي جديد بالمتصفح؛ أسماء اللاعبين المحفوظة والإعدادات ما تنتقل. الأفضل تسويه قبل الإطلاق العام، مو بعده. والرابط القديم `ldo2x.github.io/dahoom/` يحوّل تلقائياً.

---

## 6) الخصوصية والمراقبة

**موقفنا**: بدون تحليلات، بدون إعلانات، بدون كوكيز تتبع. الموجود: سجل المباريات والبلاغات (لتحسين المحتوى) + خطوط قوقل + سيرفرات الربط. صفحة `privacy.html` تقول هذا بالضبط — أي إضافة تتبع لازم تحدّث الصفحة قبلها.

**فكرة مراقبة الأخطاء بدون طرف ثالث** (قرار المالك): نجمع الأخطاء البرمجية بنفس صندوق `DahoomLog` وتنرسل لمجموعة `errors`، بحد أقصى 5 لكل جلسة، بدون أي بيانات شخصية، وتنعرض بـ `admin.html`.
في `js/telemetry.js` قبل `return {...}`:
```js
  let errN = 0; const seen = new Set();
  function error(msg, src, line){
    const k = String(msg).slice(0,120) + '|' + line;
    if(errN >= 5 || seen.has(k)) return; seen.add(k); errN++;
    queue('errors', { msg:clip(msg,300), src:clip(String(src||'').replace(location.origin,''),120), line:line||0,
      page:location.pathname.split('/').pop()||'index.html', ua:clip(navigator.userAgent,160) });
  }
  window.addEventListener('error', e=>error(e.message, e.filename, e.lineno));
  window.addEventListener('unhandledrejection', e=>error('promise: '+((e.reason&&e.reason.message)||e.reason), '', 0));
```
وقانون Firestore له:
```
match /errors/{id} { allow create: if request.resource.data.keys().hasOnly(['v','dev','msg','src','line','page','ua','at']) && request.resource.data.msg.size() <= 300; allow read, delete: if isOwner(); }
```
ومراقبة التوفر: قبل كل جمعة، جرّب غرفة من جوال على بيانات الجوال (مو الواي فاي)، وشغّل `await DAHOOM_ICE.test()` من كونسول الشاشة — لازم يرجع `relay: true` بعد ما ينضاف TURN.

---

## 7) خطة الرجوع (Rollback)

| المشكلة | الحل | الوقت |
|---|---|---|
| نشر خرّب شي | `git revert <sha>` ثم `git push` (لا تستخدم force push). GitHub Pages يعيد البناء خلال دقيقة إلى ثلاث | دقائق |
| الناس شايفين نسخة قديمة | HTML دايماً من الشبكة (`sw.js`). ملفات css/js: غيّر `?v=` بكل الوسوم | دقائق |
| عامل الخدمة نفسه فيه مشكلة | في `sw.js` غيّر `KILL = false` إلى `true` وانشر — كل جهاز يفتح الموقع يمسح الكاش ويشيل العامل ويعيد التحميل | أول فتحة |
| سيرفر الربط `0.peerjs.com` واقف | القسم 2-ج (سيرفر خاص) — جهّزه مسبقاً لو تقدر | ساعة |
| إغراق بلاغات أو سجلات وهمية | بالقوانين: `allow create: if false;` مؤقتاً. الأجهزة تحتفظ بآخر 60 عنصر وترسلها بعدين | دقائق |
| تسرّب أو إساءة استخدام TURN | Cloudflare: احذف المفتاح وأنشئ جديد (الـ Worker يقرا السر). Metered: أعد توليد المفتاح | دقائق |
| وسم الرجوع | قبل كل إطلاق: `git tag launch-N && git push --tags`. الرجوع الكامل: `git revert` لكل الالتزامات بعد الوسم | — |

---

## 8) الأداء

القياس: Playwright (كروميوم) على `python -m http.server`، كاش معطّل، `index.html` على الشاشة الرئيسية.
**ملاحظة**: السيرفر المحلي ما يضغط الملفات؛ GitHub Pages يضغطها (gzip)، فالأحجام الفعلية للملفات من الموقع تقريباً 42% من الأرقام الخام.

| | الطلبات | المنقول | DCL محلي | DCL 4G (9 ميقابت، 150ms) | load 4G | DCL 3G بطيء (1.6 ميقابت، 300ms) | load 3G |
|---|---|---|---|---|---|---|---|
| الحالي | 62 | 1627 KB (ملفات الموقع 1437 KB خام ≈ 599 KB مضغوط) | 461ms | 1.94s | 2.22s | 7.67s | 9.35s |
| بعد خطة التحميل عند الحاجة | 45 | 1217 KB (1031 KB خام ≈ 479 KB مضغوط) | 433ms | 1.41s | 1.70s | 5.56s | 5.93s |

أول رسم (FCP): ~0.6s على 4G و ~2.1s على 3G في الحالتين (الخطوط والـ CSS هي اللي تحدده).

توزيع الحالي: `data/` 24 ملف = 547 KB (أكبر بند) · `js/` 373 KB (alf.js لحاله 111 KB) · `assets/` 260 KB (6 صور GIF بالشاشة الأولى، أكبرها `cards/R4_s.gif` 102 KB) · خطوط قوقل 178 KB · `css/` 119 KB · `vendor/` 111 KB.

### خطة التحميل عند الحاجة (`js/lazy.js`)

| اللعبة | الملفات اللي تتحمل لما تنفتح |
|---|---|
| ألف نقطة `alf` | questions-2..8، choices (بالترتيب: questions، questions-2، choices، questions-3..8)، charades-2، challenges-2 |
| خلية الحروف `khaliya` | letters-1..4، letters-hard-1..2 |
| ارسم وخمّن `rasm` | words |
| هوامير، ما أصدقك | لا شي (ملفاتها صغيرة، و `hawamir.js`/`sadq.js` تقرا بياناتها وقت التحميل) |
| تبقى عادية (الكل) | cards، memes (يستخدمها `core.js`)، hawamir، sadq، questions، charades، challenges |

**ليش questions و charades و challenges تبقى؟** `alf.js` (الأسطر 16–18) يقرا `questionTags` و `charadeTags` و `challengeTags` أول ما يتحمّل. المرحلة الثانية: انقل هالقوائم الثلاث لملف صغير `data/tags.js` (وشيلها من الملفات الأصلية) — يوفر 107 KB زيادة.

**مهم — أرقام الأسئلة:** الأرقام (q1…q1428) تنحسب بترتيب التحميل، والبلاغات القديمة مربوطة فيها، و `choices.js` يكتب القائمة من جديد. `lazy.js` يجيب الملفات بالتوازي وينفذها **بنفس الترتيب**، وإذا فشل ملف ما ينفّذ ولا واحد. تم فحصه: البيانات بعد التحميل عند الحاجة **مطابقة تماماً** للتحميل الحالي (1428 سؤال، آخر رقم q1428، 1008 خيارات، 631 عبارة، 612 تحدي، 1799 سؤال حروف، 300 كلمة).

**الدمج:**
1. `index.html`: احذف وسوم السكربت لهذي الملفات: questions-2..8، choices، charades-2، challenges-2، words، letters-* (الأسطر 532–539، 541، 543، 546، 549–554). وأضف قبل `core.js` (السطر 557):
   ```html
   <script src="js/lazy.js?v=202611200620"></script>
   ```
2. `js/core.js` سطر 411 (`openGame`) — يبدأ التحميل أول ما تنختار اللعبة:
   ```js
   const openGame=g=>{ session.game=g; renderTeams(); go('lobby'); if(window.DahoomLazy) DahoomLazy.need(g).catch(()=>{}); };
   ```
3. `js/core.js` سطر 424 (`#btn-to-settings`) — ما نروح للإعدادات (ومنها البداية) إلا والبيانات جاهزة:
   ```js
   $('#btn-to-settings').onclick=()=>{ if(!validateLobby()) return;
     const to = session.game==='khaliya' ? 'khaliya-settings' : session.game==='rasm' ? 'rasm-settings' : session.game==='hawamir' ? 'hawamir-settings' : session.game==='sadq' ? 'sadq-settings' : 'settings';
     const L = window.DahoomLazy;
     if(!L || L.ready(session.game)) return go(to);
     toast('نجهّز اللعبة…');
     L.need(session.game).then(()=>go(to)).catch(()=>toast('ما قدرنا نحمّل اللعبة — تأكد من النت وجرّب مرة ثانية'));
   };
   ```
4. (اختياري) بنهاية `init()` في `core.js`: `if(window.DahoomLazy) DahoomLazy.warm('alf');` — يحمّل اللعبة الأشهر بهدوء بعد ما تفتح الصفحة.

**تحسينات ثانية مقترحة (مو مطبّقة):** صور الشاشة الأولى GIF (254 KB) لو تتحول WebP متحرك تنزل تقريباً للنص؛ وخط `Big Shoulders Display` يتحمل بس للأرقام، ممكن يتأجل.

---

## 9) الملفات الجديدة

- `js/ice.js` — سيرفرات الاتصال + رسائل الفشل + `DAHOOM_ICE.test()` للفحص من الكونسول
- `js/lazy.js` — تحميل بيانات الألعاب عند الحاجة
- `sw.js` — عامل الخدمة (مع مفتاح الطوارئ `KILL`)
- `manifest.webmanifest`
- `assets/app/` — `icon-192.png`، `icon-512.png`، `maskable-192.png`، `maskable-512.png`، `apple-touch-icon.png`، `favicon-32.png`، `og.png`
- `tools-make-icons.py` — يعيد توليد الأيقونات وصورة المشاركة
- `privacy.html`، `terms.html`، `css/legal.css`
