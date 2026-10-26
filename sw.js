/**
 * سایا نیک — Service Worker
 *
 * قاعده: داده همیشه زنده، پوستهٔ برنامه از حافظه.
 *
 * برای یک داشبورد مالی، نشان دادن عدد کهنه بدتر از نشان ندادن است —
 * پس هیچ پاسخی از سوپابیس ذخیره نمی‌شود و اعداد هر بار تازه خوانده
 * می‌شوند. ولی خودِ فایل‌های برنامه (HTML، آیکن، کتابخانه) با هر بار
 * باز شدن اپ دوباره از اینترنت گرفته می‌شدند و روی خط کند، همین
 * انتظار بود که حس «کندی» می‌داد. حالا این فایل‌ها فوراً از حافظه
 * می‌آیند و نسخهٔ تازه در پس‌زمینه گرفته می‌شود؛ وقتی آماده شد،
 * نوار «نسخه تازه داشبورد آماده است» را می‌بینید.
 */

const CACHE = 'sayanik-v3';
const SHELL = ['./', './index.html', './manifest.json'];

/** کتابخانه‌های ثابت که از دامنه سوپابیس سرو می‌شوند: این‌ها داده نیستند،
 *  کد برنامه‌اند و آدرسشان نسخه‌دار است، پس ذخیره‌شان بی‌خطر است. */
const isStaticLib = url =>
  url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/functions/v1/lib/');

/** پوستهٔ برنامه: صفحه، آیکن‌ها، manifest — نه داده. */
const isShell = url =>
  url.origin === location.origin &&
  // خود sw.js هرگز از حافظه سرو نمی‌شود، وگرنه مرورگر دیگر نسخهٔ تازه را نمی‌بیند
  !/\/sw\.js$/i.test(url.pathname) &&
  (url.pathname.endsWith('/') ||
   /\.(html|css|js|json|png|jpe?g|svg|webmanifest|woff2?)$/i.test(url.pathname));

self.addEventListener('install', e => {
  /* عمداً skipWaiting اینجا صدا زده نمی‌شود.
     اگر نسخه جدید بی‌اجازه کنترل را بگیرد، صفحه رویداد controllerchange
     می‌گیرد و خودش را رفرش می‌کند؛ و اگر سرور لحظه‌ای نسخه قدیم و جدید را
     قاطی سرو کند (که هنگام انتشار روی گیت‌هاب پیجز پیش می‌آید) همین چرخه
     تکرار می‌شود و داشبورد روی «در حال بارگذاری…» گیر می‌کند.
     نسخه جدید منتظر می‌ماند تا کاربر دکمه «به‌روزرسانی» را بزند. */
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

  // کتابخانهٔ ثابت: اول از حافظه، چون هرگز عوض نمی‌شود
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

  // داده‌های Supabase هرگز ذخیره نمی‌شوند — عدد مالی باید زنده باشد
  if (url.hostname.endsWith('supabase.co')) return;

  // پوستهٔ برنامه: فوراً از حافظه، و تازه‌سازی در پس‌زمینه
  if (isShell(url)) {
    const net = fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => null);
    e.waitUntil(net);
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit || net.then(r => r || (e.request.mode === 'navigate'
          ? caches.match('./index.html')
          : Response.error())))
    );
    return;
  }

  // هر چیز دیگر: اول شبکه
  e.respondWith(
    fetch(e.request)
      .then(res => {
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
