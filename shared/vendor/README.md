# کتابخانه‌های محلی

`supabase.min.js` این‌جا قرار می‌گیرد تا داشبوردها روی سرور داخلی بدون اینترنت کار کنند.
ساختن آن (یک بار، روی سیستمی که به npm دسترسی دارد):

```bash
bash tools/vendor-libs.sh
```

اگر فایل نباشد، `shared/supa.js` به‌ترتیب از تابع `lib` روی Supabase، jsdelivr و unpkg می‌گیرد.
