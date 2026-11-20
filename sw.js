/* ===== دحوم — عامل الخدمة (Service Worker) =====
   الهدف: فتح أسرع من ثاني مرة، بدون ما نعلّق أحد على نسخة قديمة.
   - صفحات HTML: من الشبكة دايماً (network-first). لو النت مقطوع نعرض آخر نسخة محفوظة.
   - css / js / data / assets من نفس الموقع: من الكاش فوراً ونحدّثه بالخلفية (stale-while-revalidate).
     ورقم ?v= بالرابط يخلي كل نشر جديد = رابط جديد، ونمسح النسخ القديمة لنفس الملف.
   - أي شي من موقع ثاني (خطوط قوقل، Firebase، سيرفر PeerJS) ما نلمسه.
   - طلبات الصوت/الفيديو اللي فيها Range ما نلمسها (تخرب التشغيل).

   الطوارئ (rollback): غيّر KILL إلى true وانشر — كل الأجهزة تمسح الكاش وتشيل العامل أول ما تفتح الموقع.
*/
const VERSION = 'dahoom-sw-1';
const KILL = false;
const PAGES = VERSION + '-pages';
const ASSETS = VERSION + '-assets';
const MAX_ASSETS = 500;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => KILL || !k.startsWith(VERSION)).map(k => caches.delete(k)));
    if (KILL) {
      await self.registration.unregister();
      const wins = await self.clients.matchAll({ type: 'window' });
      wins.forEach(w => w.navigate(w.url));
      return;
    }
    await self.clients.claim();
  })());
});

const isHTML = req => req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

self.addEventListener('fetch', e => {
  if (KILL) return;
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has('range')) return;
  if (url.pathname.endsWith('/sw.js')) return;

  if (isHTML(req)) { e.respondWith(networkFirst(req)); return; }
  e.respondWith(staleWhileRevalidate(req, e));
});

async function networkFirst(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res && res.ok && res.type === 'basic') cache.put(stripSearch(req.url), res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(stripSearch(req.url)) || await cache.match(new URL('./', self.registration.scope).href);
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(req, e) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(req);
  const update = fetch(req).then(async res => {
    if (res && res.ok && res.type === 'basic') {
      await cache.put(req, res.clone());
      await dropOldVersions(cache, req.url);
      trim(cache);
    }
    return res;
  }).catch(() => hit);
  if (hit) { e.waitUntil(update); return hit; }
  return update;
}

// HTML: نحفظها بدون ?room=… عشان روابط الغرف ما تملي الكاش
function stripSearch(u) { const x = new URL(u); x.search = ''; x.hash = ''; return x.href; }

// نفس الملف بـ ?v= أقدم = نمسحه
async function dropOldVersions(cache, u) {
  const now = new URL(u);
  if (!now.searchParams.has('v')) return;
  const keys = await cache.keys();
  await Promise.all(keys.map(k => {
    const x = new URL(k.url);
    return (x.pathname === now.pathname && x.search !== now.search) ? cache.delete(k) : null;
  }));
}

let trimming = false;
async function trim(cache) {
  if (trimming) return; trimming = true;
  try {
    const keys = await cache.keys();
    const extra = keys.length - MAX_ASSETS;
    for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
  } finally { trimming = false; }
}
