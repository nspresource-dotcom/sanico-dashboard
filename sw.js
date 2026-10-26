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

const CACHE = 'sayanik-v2';
const SHELL = ['./', './index.html', './manifest.json'];

/** کتابخانه‌های ثابت که از دامنه سوپابیس سرو می‌شوند: این‌ها داده نیستند،
 *  کد برنامه‌اند و آدرسشان نسخه‌دار است، پس ذخیره‌شان بی‌خطر است و باعث
 *  می‌شود بار دوم به بعد، ورود منتظر هیچ شبکه‌ای نماند. */
const isStaticLib = url =>
  url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/functions/v1/lib/');

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

  if (e.request.method !== 'GET') return;

  // کتابخانهٔ ثابت: اول از حافظه، چون هرگز عوض نمی‌شود — ورود را سریع می‌کند
  if (isStaticLib(url)) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }))
    );
    return;
  }

  // بقیهٔ درخواست‌های Supabase هرگز ذخیره نمی‌شوند — داده مالی باید زنده باشد
  if (url.hostname.endsWith('supabase.co')) return;

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
      // آفلاین: نسخه ذخیره‌شدهٔ همان درخواست. برگرداندن index.html فقط برای
      // باز کردن خودِ صفحه درست است — اگر برای یک فایل .js برگردانده شود،
      // مرورگر HTML را به‌عنوان کد اجرا می‌کند و خطای گمراه‌کننده می‌دهد.
      .catch(() => caches.match(e.request).then(r => {
        if (r) return r;
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }))
  );
});

// اجازه می‌دهد صفحه، به‌روزرسانی فوری را درخواست کند
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
