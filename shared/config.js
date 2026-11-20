/* تنظیمات اتصال همهٔ داشبوردهای سایا نیک — تنها جایی که برای انتقال به سرور داخلی باید عوض شود.
   روی سرور داخلی: نشانی Supabase خودمیزبان و کلید anon همان سرور را این‌جا بگذارید.
   (کلید anon/publishable عمومی است و جای امن‌کردنش RLS پایگاه داده است، نه پنهان‌کردن کلید.) */
window.SAYA_CONFIG = {
  SUPABASE_URL: "https://zlzjzzqrkbsqornnimlx.supabase.co",
  SUPABASE_KEY: "sb_publishable_SC84u5DIOQgSgNI43KE6NQ_wWGGTg69",
  /* ترتیب منابع کتابخانهٔ supabase-js. فایل محلی اول است تا سرور داخلیِ بدون اینترنت هم کار کند
     (با tools/vendor-libs.sh ساخته می‌شود). منابع بیرونی فقط پشتیبان‌اند؛ روی شبکهٔ بسته می‌توانید
     OFFLINE را true کنید تا اصلاً سراغشان نرود. */
  OFFLINE: false,
  LIB_VERSION: "2.45.4"
};
