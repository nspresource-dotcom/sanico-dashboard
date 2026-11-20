// سرو کتابخانهٔ supabase-js از دامنهٔ خود Supabase (پشتیبانِ فایل محلی shared/vendor/supabase.min.js).
// روی سرور داخلیِ بدون اینترنت این تابع لازم نیست: فایل محلی با tools/vendor-libs.sh ساخته می‌شود.
// این یک پراکسی عمومی نیست: فقط آدرس‌های داخل ASSETS سرو می‌شوند.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ASSETS: Record<string, { url: string; type: string }> = {
  "supabase.js": {
    url: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js",
    type: "application/javascript; charset=utf-8",
  },
};

const memo = new Map<string, { body: Uint8Array; type: string }>();
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("method not allowed", { status: 405, headers: CORS });
  const key = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
  const asset = ASSETS[key];
  if (!asset) return new Response("not found", { status: 404, headers: CORS });
  const headers = { ...CORS, "Content-Type": asset.type, "Cache-Control": "public, max-age=31536000, immutable" };
  const hit = memo.get(key);
  if (hit) return new Response(req.method === "HEAD" ? null : hit.body, { headers });
  try {
    const up = await fetch(asset.url, { redirect: "follow" });
    if (!up.ok) return new Response("upstream " + up.status, { status: 502, headers: CORS });
    const body = new Uint8Array(await up.arrayBuffer());
    if (body.byteLength < 1000) return new Response("upstream too small", { status: 502, headers: CORS });
    memo.set(key, { body, type: asset.type });
    return new Response(req.method === "HEAD" ? null : body, { headers });
  } catch (e) {
    return new Response("upstream error: " + String(e), { status: 502, headers: CORS });
  }
});
