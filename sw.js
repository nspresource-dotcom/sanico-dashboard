/**
 * سایا نیک — Service Worker
 *
 * قاعده: همیشه اول از شبکه.
 *
 * برای یک داشبورد مالی، نشان دادن عدد کهنه بدتر از نشان ندادن است.
 * پس هر بار که اپ باز می‌شود، نسخه تازه از اینترنت گرفته می‌شود.
 * نسخه ذخیره‌شده فقط وقتی استفاده می‌شود که اینترنت نباشد — و در آن
 * حالت خود اپ به شما می‌گوید که داده کهنه است.
 */

const CACHE = 'sayanik-v1';
const SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();                       // نسخه جدید بلافاصله جایگزین شود
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // درخواست‌های Supabase هرگز ذخیره نمی‌شوند — داده مالی باید زنده باشد
  if (url.hostname.endsWith('supabase.co')) return;

  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // نسخه تازه را برای حالت آفلاین نگه دار
        if (res && res.status === 200 && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

// اجازه می‌دهد صفحه، به‌روزرسانی فوری را درخواست کند
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
