# دحوم — الحسابات والملف الشخصي والربع والإنجازات

الملفات:

| الملف | وش فيه |
|---|---|
| `js/account.js` | الموديول `window.DahoomAccount` (الدخول، الضيف، الأرقام، الإنجازات، الربع، الشارة) |
| `profile.html` + `js/profile.js` + `css/profile.css` | صفحة الملف (`profile.html` ملفي، `profile.html?u=<uid>` ملف أي لاعب) |
| `firestore.rules` | القوانين كاملة (البلاغات + المباريات + اللوبي + الحسابات) |
| `assets/icons/acc-*.svg` | أيقونات جديدة بنمط Tabler (قناع، نفس `ic()`) |

## التركيب (للي يدمج)

أي صفحة تبي الحسابات تحتاج `css/style.css` (الرموز والأيقونات) وهالسكربتات بالترتيب:

```html
<script src="js/config.js"></script>
<script src="js/account.js"></script>
```

- `account.js` ما يعتمد على `core.js` ولا `remote.js`، ولو `core.js` موجود ياخذ منه قائمة الصور.
- مكتبة Firebase **ما تنحمّل** إلا لو اللاعب مسجّل قبل بهالجهاز أو ضغط «سجّل دخول»، فالصفحات تبقى خفيفة.
- الموديول ما يرمي أخطاء أبد: الفشل يرجع `null` أو `false` أو `[]`.

### 1) الشارة (بالشاشة الكبيرة أو الجوال)

```html
<div id="acc-badge"></div>
```
```js
DahoomAccount.mountBadge(document.getElementById('acc-badge'));   // يرجع دالة لإزالتها
```
مسجّل أو ضيف: صورة بحلقة المستوى + الاسم + اللقب، وتفتح `profile.html`.
بدون هوية: زرين «سجّل دخول» و«العب كضيف» (الضيف يكتب اسمه بنفس الشارة).
خيار: `mountBadge(el, { href:'profile.html' })`.

### 2) تسجيل المباراة بالجوال (remote.js) لما توصل الحالة النهائية

بـ `remote.js` الحالة النهائية توصل في `S.final = { rank, of, awards, rows, all }` (مكان `if(done){ ... }` داخل رسم `#r-final`).
سجّلها مرة وحدة لكل مباراة (فيه حماية من التكرار بـ `id`، بس الأحسن تتأكد بنفسك):

```js
if(done && !st.recorded){
  st.recorded = true;
  const f = S.final;
  const res = window.DahoomAccount && DahoomAccount.recordMatch({
    id: st.room + '-' + (S.matchId || S.game) + '-' + (st.pid || ''),  // اختياري: يمنع التكرار لو انرسلت الحالة مرتين
    game: S.game,                 // 'alf' | 'khaliya' | 'rasm' | 'hawamir' | 'sadq'
    rank: f.rank, of: f.of,
    won: f.rank === 1,
    score: t.score,               // نقاط الفريق / الكاش / الريال
    mode: st.mode,                // 'solo' | 'teams'
    stats: { /* أرقام صغيرة اختيارية، شوف الجدول تحت */ },
    name: me()?.name, avatar: me()?.avatar   // لو ما فيه هوية، يتسوى ضيف بهالاسم تلقائي
  });
  if(res) DahoomAccount.showUnlocks(res);   // تنبيه الإنجازات والمستوى الجديد
}
// وارجع st.recorded=false لما تبدأ مباراة جديدة (مثل ما يرجع st.finalShown)
```

مفاتيح `stats` اللي لها إنجازات (الباقي ينحفظ بس، لين 8 مفاتيح لكل لعبة، أرقام صحيحة 0–100000):

| اللعبة | المفتاح | المعنى |
|---|---|---|
| alf | `steals` | عدد السرقات بالمباراة |
| sadq | `caught` | كذبات كشفها صح (`p.stats.chWon`) |
| أي لعبة | أي اسم إنجليزي قصير | ينجمع بالملف لإنجازات مستقبلية |

لما يكون المضيف لاعب عادي: نفس النداء بجهاز المضيف لنفسه.

### 3) رابط الملف
- `profile.html` ملفي. `profile.html?u=<uid>` ملف لاعب ثاني (للضيوف ما فيه ملف عام).

## مرجع الـ API

| الدالة | ترجع |
|---|---|
| `init()` | `Promise<current()>`، تخلص لما تنعرف حالة الدخول (أقصى شي ~8 ثواني لو النت معلّق) |
| `current()` | `{ uid, guest, name, avatar, banner, frame, color, bio, title, titleName, level, xp, levelInfo, games, wins, offline }` أو `null` |
| `onChange(cb)` | دالة إلغاء الاشتراك. `cb(current())` مع أي تغيير |
| `signInGoogle()` | `Promise<current()\|null>` (نافذة قوقل، ولو انحجبت يحوّل للصفحة) |
| `signOut()` | `Promise<boolean>`. يرجع للضيف لو موجود |
| `continueAsGuest({ name, avatar })` | `current()` (ضيف `g_xxxxxxxxxx` بـ localStorage) |
| `saveProfile(patch)` | `Promise<boolean>`. `name` ≤20، `bio` ≤120، `avatar` من القائمة، `color` `#RRGGBB`، `banner`/`frame`/`title` لازم تكون مفتوحة |
| `recordMatch(m)` | `{ newAchievements:[{id,name,desc,icon,rarity}], levelUp, level, xp }` أو `null` |
| `getProfile(uid?)` | الملف كامل (فيه `per`, `ach`, `recent`, `streak`…) أو `null`. بدون uid = ملفي |
| `searchUsers(prefix)` | `[{ uid, name, avatar, frame, color, level, titleName }]` (أول 10) |
| `sendFriendRequest(uid)` | `Promise<boolean>`، ولو هو أرسل لك قبل يقبل على طول |
| `respondFriendRequest(uid, accept)` | `Promise<boolean>` |
| `listFriends()` / `listRequests()` | مصفوفات (فاضية لو ضيف أو بدون نت) |
| `removeFriend(uid)` | `Promise<boolean>` (ينشال من القائمتين) |
| `mountBadge(el, opts?)` | دالة إزالة |
| `showUnlocks(res)` | يعرض تنبيهات الإنجازات والمستوى |
| أدوات | `avatarHTML(p,size)`, `ringHTML(c,size)`, `avatarSrc(a)`, `bannerBg(id)`, `titleName(id)`, `levelInfo(xp)`, `achProgress(id, profile)`, `isUnlocked(kind,id,profile)`, `unlockHint(kind,id)` |
| كتالوجات | `ACHIEVEMENTS`, `BANNERS`, `FRAMES`, `TITLES`, `RARITY`, `GAMES`, `AVATARS`, `COLORS` |
| حالة | `mode` (`none`/`guest`/`user`)، `ready`، `offline`، `stub` |

حدث عام: `document` يطلق `dahoom:achievements` (`detail` نفس شكل نتيجة `recordMatch`) لما ينفتح إنجاز من الربع، و`showUnlocks` يمسكه تلقائي.

## المستويات والخبرة
- خبرة المباراة: 20 حضور + 30 فوز + 10 منصة (أول 3) + 2 لكل منافس (لين 10).
- الإنجاز يعطي خبرة حسب ندرته: عادي 20، نادر 50، ملحمي 120، أسطوري 250.
- مجموع الخبرة للمستوى L = `25×(L−1)×(L+2)` → م2 = 100، م5 = 700، م10 = 2700، م25 = 15600 (أقصى مستوى 99).

## الإنجازات (32)
- **عامة (21):** أول طلعة، أول فوز، من أهل المجلس (10)، سهّير (50)، عمود المجلس (200)، فوّاز (10 فوز)، ما ينغلب (50 فوز)، على نار (3 ورا بعض)، محد يوقفه (5 ورا بعض)، دايم بالمنصة، الحظ زعلان (الأخير 5 مرات)، جرّب كل شي، سيد الألعاب (فوز بكل لعبة)، الديوانية فل (8 منافسين)، سهرة للفجر (2–5 الفجر)، زبون دايم (7 أيام)، من أهل البيت (30 يوم)، مستوى عشرة، أسطورة دحوم (م25)، ربعك معك، الشلة كاملة.
- **لكل لعبة (11):** ألف نقطة 3 (أبو ألف، ملك الأسئلة، حرامي النقاط) · خلية الحروف 2 · ارسم وخمّن 2 · هوامير 2 · ما أصدقك 2 (وجه بوكر، كاشف الكذب).
- الندرة: عادي 10، نادر 12، ملحمي 7، أسطوري 3. الإنجاز المقفل ينعرض رمادي مع شريط تقدم «3 من 10».

الكماليات: 10 خلفيات (CSS بس: تدرجات + `--sadu-weave`)، 9 إطارات، 14 لقب. بعضها يفتح بالمستوى (3، 5، 8، 10، 12) وبعضها بإنجاز.

## نموذج البيانات

**`users/{uid}`** — الملف العام (يقراه الكل، يكتبه صاحبه):
```
name, nameLower (للبحث: بدون تشكيل، الهمزات موحّدة), avatar, banner, frame, color, bio, title,
xp, level, games, wins, streak, bestStreak, podiums, lasts, maxOf, night, days, lastDay, friends,
per: { alf:{ g, w, best, s:{ steals:… } }, … },
ach: { first_game: <ms>, … },
recent: [ { id, game, rank, of, won, score, mode, at } ]   // آخر 20 داخل الوثيقة نفسها
merged: [ <ids دفعات الضيف اللي اندمجت> ], created, updated
```
آخر المباريات داخل الوثيقة (مو مجموعة فرعية): قراية وحدة للملف كامل، والكتابة ذرّية، وما نحتاج نحذف القديم.
ما ننخزن الإيميل ولا صورة قوقل — الملف العام فيه بس اللي يختاره اللاعب.

**`users/{uid}/requests/{fromUid}`** — `{ from, name, avatar, level, at }` ينشئه المرسل بس، يقراه ويحذفه الطرفين.
**`users/{uid}/friends/{friendUid}`** — `{ uid, name, avatar, at }`. القبول batch واحد: يكتب بالقائمتين ويحذف الطلب. الحذف من الطرفين.

**بالجهاز (localStorage):** `dahoom_acc_guest` (الضيف وأرقامه)، `dahoom_acc_u_<uid>` (نسخة الحساب للعرض بدون نت)، `dahoom_acc_q_<uid>` (طابور اللي ما انرسل: مباريات، تعديل، دمج الضيف)، `dahoom_acc_last`، `dahoom_acc_sent_<uid>`.

**المزامنة:** السحابة هي الأساس. كل مزامنة تقرا الوثيقة، تطبّق الطابور عليها (المباراة المكررة بنفس `id` تنرفض)، وتكتبها. لو فشلت (نت/Firebase) الطابور يبقى وتنعاد كل 30 ثانية ومع رجوع النت.

**الضيف ← حساب:** أول دخول بقوقل، أرقام الضيف وإنجازاته تنضاف للحساب كدفعة لها `id` (ما تنضاف مرتين)، وتتصفّر عند الضيف. الاسم والصورة يصيرون اسم الحساب لو الحساب جديد.

## rooms (اللوبي العام)

`rooms/{code}` — يكتبه المضيف (حتى الضيف) عن طريق REST بدون تسجيل:

| الحقل | النوع |
|---|---|
| `code` | نص ≤4، لازم يساوي معرّف الوثيقة، `^[A-Z2-9]{4}$` |
| `game` | نص ≤12 |
| `gameName` | نص ≤24 |
| `host`, `hostAv` | نص ≤24 |
| `players`, `max` | عدد صحيح 0–20 |
| `phase` | نص ≤12 |
| `pub` | bool |
| `updatedAt` | timestamp (REST: `timestampValue`) لازم يكون ضمن ±5 دقايق من وقت السيرفر |
| `v` | عدد صحيح |

القراءة للكل (`list` لين 50 بالاستعلام)، الإنشاء والتحديث للكل لو الحقول بالضبط هذي وصحيحة، والحذف ممنوع (نظّف القديمة من الكونسول أو بـ TTL على `updatedAt`).

## الاختبار بدون قوقل
على `localhost` بس: `profile.html?accstub=1` (أو `localStorage.dahoom_acc_stub='1'` أو `window.DAHOOM_ACC_STUB=true` قبل السكربت) يبدّل Firebase بسحابة وهمية داخل localStorage بنفس المنطق. `window.DAHOOM_ACC_STUB_USER={uid,name}` يحدد مين يسجّل، و`window.DAHOOM_ACC_STUB_FAIL=true` يحاكي انقطاع السحابة.

## خطوات صاحب المشروع في Firebase Console
1. **القوانين:** افتح `firestore.rules`، بدّل `'ADMIN_EMAIL'` بإيميل حساب قوقل حقك و`'ADMIN_UID'` برقم حسابك (يطلع لك بلوحة الإدارة لو ما تعرّفت عليك — لو حطيت كلمة سر لحسابك إيميله يتغيّر، فالرقم هو الأضمن)، وانسخ الملف كامل في Firestore Database > Rules > Publish.
2. **الدومين:** Authentication > Settings > Authorized domains > تأكد إن `ldo2x.github.io` موجود (وأضف `localhost` للتجربة لو مو موجود).
3. **تسجيل قوقل:** Authentication > Sign-in method > Google مفعّل (مفعّل من قبل للوحة المراجعة).
3ب. **الدخول باليوزرنيم:** Authentication > Sign-in method > Email/Password مفعّل (بدون Email link). الحسابات تستخدم إيميل داخلي وهمي على نطاق `login.dahoom.invalid` (ما يوصله بريد).
4. **الفهارس:** البحث بالاسم يستخدم فهرس حقل واحد (`nameLower`) وهو تلقائي، ما يحتاج شي. لو طلع خطأ فهرس بالكونسول، اضغط الرابط اللي فيه.
5. اختياري: TTL policy على `rooms` بحقل `updatedAt` عشان الغرف القديمة تنحذف لحالها.

## اليوزرنيم والدخول بكلمة السر
- `users/{uid}.username` (حروف إنجليزية صغيرة وأرقام و `_` و `.`، من 3 إلى 20) و`unameAt` (وقت آخر تغيير).
- `usernames/{username}` = `{ uid, em?, at }`: حجز اليوزرنيم. `em` هو إيميل الدخول الداخلي لو الحساب له كلمة سر.
- التغيير عملية وحدة (batch): تحديث الملف + حجز الجديد + فك القديم. القوانين ترفض أي تغيير بدون حجز، وأقل من ساعتين من آخر تغيير.
- حساب قوقل يقدر يضيف كلمة سر (`setPassword`) ويصير يدخل باليوزرنيم بعد.
- نسيان كلمة السر: ما فيه استرجاع بالبريد (الإيميل وهمي). اللي داخل بقوقل يدخل بقوقل ويحط كلمة سر جديدة.

## الحالة (presence)
`presence/{uid}` = `{ s: on|lobby|play|off, g: اللعبة, at }`. الجوال يكتبها حسب حالته بالجلسة، والصفحات الثانية «متصل». تنكتب كل دقيقة تقريباً والصفحة ظاهرة، ونعتبره متصل لو آخر نبضة قبل أقل من دقيقتين ونص.

## حدود معروفة
- الأرقام تنحسب بجهاز اللاعب، فاللي يعرف يقدر يغش بأرقامه (القوانين تحمي الشكل والأحجام وتمنع الكتابة بملف غيره، بس ما فيه سيرفر يتحقق من النتيجة).
- الأسماء مو فريدة، بس اليوزرنيم فريد (البحث بـ @ يلقاه).
- قائمة «طلبات أرسلتها» محفوظة بالجهاز بس.
