/* بارگذاری کتابخانهٔ supabase-js بدون وابستگی اجباری به اینترنت.
   ترتیب: فایل محلی ← تابع lib روی همان سرور Supabase ← jsdelivr ← unpkg.
   base: مسیر ریشهٔ سایت نسبت به صفحهٔ جاری ("./" یا "../") — از data-base تگ script خوانده می‌شود. */
(function () {
  var C = window.SAYA_CONFIG || {}, me = document.currentScript, base = (me && me.getAttribute("data-base")) || "./";
  var v = C.LIB_VERSION || "2.45.4";
  var list = [base + "shared/vendor/supabase.min.js", C.SUPABASE_URL + "/functions/v1/lib/supabase.js"];
  if (!C.OFFLINE) list.push("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@" + v + "/dist/umd/supabase.min.js", "https://unpkg.com/@supabase/supabase-js@" + v + "/dist/umd/supabase.min.js");
  function one(src) {
    return new Promise(function (res, rej) {
      if (window.supabase && window.supabase.createClient) return res(window.supabase);
      var s = document.createElement("script"); s.src = src; s.async = true;
      var t = setTimeout(function () { rej(new Error("timeout " + src)); }, 6000);
      s.onload = function () { clearTimeout(t); window.supabase && window.supabase.createClient ? (window.__libFrom = src, res(window.supabase)) : rej(new Error("bad " + src)); };
      s.onerror = function () { clearTimeout(t); rej(new Error("load " + src)); };
      document.head.appendChild(s);
    });
  }
  /* پشت‌سرهم، نه موازی: فایل محلی معمولاً فوری می‌رسد و نباید درخواست بیرونی بی‌جا زده شود */
  window.SayaLib = list.reduce(function (p, src) { return p.catch(function () { return one(src); }); }, Promise.reject());
  window.SayaLib.catch(function () {}); /* خطا را کسی که منتظر اتصال است می‌گیرد؛ این‌جا فقط جلوی هشدار بی‌صاحب را می‌گیریم */
  window.sayaClient = async function () {
    var lib = await window.SayaLib;
    if (!window.__sayaDb) window.__sayaDb = lib.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
    return window.__sayaDb;
  };
})();
