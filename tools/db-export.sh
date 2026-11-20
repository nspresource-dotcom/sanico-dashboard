#!/usr/bin/env bash
# خروجی کامل پایگاه داده از Supabase ابری برای انتقال به سرور داخلی.
# نیاز: Supabase CLI و pg_dump (نسخهٔ ۱۵ یا بالاتر).
# SUPABASE_DB_URL: رشتهٔ اتصال از داشبورد Supabase ‹ Project Settings ‹ Database ‹ Connection string (Session pooler)
#   مثال: export SUPABASE_DB_URL="postgresql://postgres.zlzjzzqrkbsqornnimlx:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
set -euo pipefail
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL را تنظیم کنید}"
OUT="${1:-backup/$(date +%Y%m%d-%H%M)}"; mkdir -p "$OUT"
supabase db dump --db-url "$SUPABASE_DB_URL" -f "$OUT/roles.sql" --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" -f "$OUT/schema.sql"
supabase db dump --db-url "$SUPABASE_DB_URL" -f "$OUT/data.sql" --use-copy --data-only
# کاربران و رمزهای عبور (هش‌شده) — بدون این‌ها همه باید از نو حساب بسازند
pg_dump "$SUPABASE_DB_URL" --data-only --table=auth.users --table=auth.identities --column-inserts -f "$OUT/auth_users.sql"
# کد توابع لبه (edge functions)
mkdir -p "$OUT/functions"
for f in admin-users lib ask; do supabase functions download "$f" --project-ref "${PROJECT_REF:-zlzjzzqrkbsqornnimlx}" --workdir "$OUT/functions" || true; done
echo "✓ خروجی در $OUT — این پوشه شامل دادهٔ محرمانه است؛ آن را در مخزن git نگذارید."
