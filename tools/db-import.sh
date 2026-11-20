#!/usr/bin/env bash
# بازگردانی خروجی db-export.sh روی Supabase خودمیزبان (سرور داخلی).
# LOCAL_DB_URL: مثلاً postgresql://postgres:POSTGRES_PASSWORD@127.0.0.1:5432/postgres
set -euo pipefail
: "${LOCAL_DB_URL:?LOCAL_DB_URL را تنظیم کنید}"
IN="${1:?مسیر پوشهٔ خروجی را بدهید}"
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=0 -f "$IN/roles.sql"
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f "$IN/schema.sql"
# تریگرها هنگام ورود داده خاموش‌اند تا قواعد کسب‌وکار (مثل تأیید یا ثبت گزارش) روی دادهٔ قدیمی دوباره اجرا نشود
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -c "SET session_replication_role = replica;" -f "$IN/auth_users.sql" -f "$IN/data.sql"
echo "✓ بازگردانی کامل شد. حالا shared/config.js را به نشانی سرور داخلی تغییر دهید."
