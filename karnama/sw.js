/**
 * کارنما (نسخهٔ نمایشی) — Service Worker
 *
 * این نسخه سرور ندارد: همهٔ داده در خودِ مرورگر شما (localStorage) می‌ماند.
 * پس برخلاف داشبورد مالی، اینجا «دادهٔ کهنه» معنا ندارد و می‌توانیم تمام
 * فایل‌ها را از حافظه سرو کنیم. نتیجه: اپ آفلاین هم باز می‌شود و روی خط
 * کند، فوری بالا می‌آید.
 *
 * نسخهٔ تازه در پس‌زمینه گرفته می‌شود و بی‌اجازه کنترل را نمی‌گیرد —
 * دفعهٔ بعد که اپ را ببندید و باز کنید، نسخهٔ تازه بالا می‌آید.
 */

const BUILD = '13';
const CACHE = 'karnama-' + BUILD;

const SHELL = [
  './', './index.html', './style.css', './app.js', './data-source.js',
  './demo-api.js', './jalali.js', './permissions.js',
  './manifest.json', './icon.svg', './icon-192.png', './icon-512.png',
  './vazirmatn.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // خودِ sw.js هرگز از حافظه نمی‌آید، وگرنه مرورگر دیگر نسخهٔ تازه را نمی‌بیند
  if (/\/sw\.js$/i.test(url.pathname)) return;

  // فونت حالا روی همین دامنه است، پس چیزی از بیرون لازم نداریم
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then((hit) => {
      const fresh = fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      // از حافظه فوری، و به‌روزرسانی در پس‌زمینه
      return hit || fresh;
    }),
  );
});
