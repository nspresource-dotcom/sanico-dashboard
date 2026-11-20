#!/usr/bin/env bash
# فایل‌های بیرونی را داخل مخزن می‌آورد تا سایت روی شبکهٔ بسته هم کار کند.
set -euo pipefail
cd "$(dirname "$0")/.."
VER=$(grep -o 'LIB_VERSION: *"[^"]*"' shared/config.js | grep -o '[0-9][0-9.]*')
TMP=$(mktemp -d)
( cd "$TMP" && npm pack "@supabase/supabase-js@${VER}" >/dev/null && tar -xzf supabase-supabase-js-*.tgz )
cp "$TMP/package/dist/umd/supabase.min.js" shared/vendor/supabase.min.js
rm -rf "$TMP"
echo "✓ shared/vendor/supabase.min.js  (supabase-js ${VER})"
test -s shared/fonts/vazirmatn.woff2 && echo "✓ shared/fonts/vazirmatn.woff2"
