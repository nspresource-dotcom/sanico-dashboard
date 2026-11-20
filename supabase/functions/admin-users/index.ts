// مدیریت کاربران برای کنسول مدیریت دسترسی سایا نیک
// فقط کسی که در app_access نقش admin در داشبورد «admin» دارد می‌تواند صدا بزند.
// روی سرور داخلی: همین فایل با `supabase functions deploy admin-users` یا با edge-runtime خودمیزبان اجرا می‌شود.
// متغیرهای SUPABASE_URL، SUPABASE_ANON_KEY و SUPABASE_SERVICE_ROLE_KEY را محیط اجرا می‌دهد؛ هیچ کلیدی در کد نیست.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: me } = await caller.auth.getUser();
  if (!me?.user) return json({ error: "ابتدا وارد شوید." }, 401);
  const { data: isAdmin } = await caller.rpc("is_app_admin");
  if (!isAdmin) return json({ error: "فقط مدیر دسترسی می‌تواند کاربر را مدیریت کند." }, 403);
  const myEmail = (me.user.email ?? "").toLowerCase();
  const admin = createClient(url, service, { auth: { persistSession: false } });

  let b: Record<string, string>;
  try { b = await req.json(); } catch { return json({ error: "درخواست نامعتبر" }, 400); }
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return json({ error: "ایمیل درست نیست." }, 400);
  const log = (action: string) => admin.from("app_access_log").insert({ by_email: myEmail, email, dashboard: null, action });
  const finance = (f: string) => f === "admin" || f === "viewer" ? f : "none";
  async function userId(): Promise<string | null> {
    const { data } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
    if (data?.id) return data.id;
    for (let page = 1; page <= 20; page++) {
      const { data: l } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const u = l?.users.find((x) => (x.email ?? "").toLowerCase() === email);
      if (u) return u.id;
      if (!l || l.users.length < 200) break;
    }
    return null;
  }
  async function setFinance(f: string) {
    const fin = finance(f);
    await admin.from("user_allowlist").update({ role: fin === "admin" ? "admin" : "viewer" }).ilike("email", email);
    await admin.from("profiles").update({ role: fin === "admin" ? "admin" : "viewer", is_active: fin !== "none" }).ilike("email", email);
  }

  try {
    if (b.action === "create") {
      const pw = String(b.password ?? "");
      if (pw.length < 8) return json({ error: "رمز دست‌کم ۸ نویسه باشد." }, 400);
      if (await userId()) return json({ error: "این ایمیل از قبل حساب دارد." }, 409);
      const fin = finance(b.finance);
      const { error: e1 } = await admin.from("user_allowlist").upsert({ email, full_name: b.full_name || null, role: fin === "admin" ? "admin" : "viewer" }, { onConflict: "email" });
      if (e1) throw e1;
      const { error: e2 } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: { full_name: b.full_name || null } });
      if (e2) throw e2;
      await setFinance(fin);
      await log("حساب کاربری ساخته شد" + (fin === "none" ? "" : "؛ داشبورد مالی: " + (fin === "admin" ? "مدیر" : "مشاهده")));
      return json({ ok: true });
    }
    const id = await userId();
    if (!id) return json({ error: "حسابی با این ایمیل نیست." }, 404);
    if (b.action === "password") {
      const pw = String(b.password ?? "");
      if (pw.length < 8) return json({ error: "رمز دست‌کم ۸ نویسه باشد." }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password: pw });
      if (error) throw error;
      await log("رمز عبور تغییر کرد");
      return json({ ok: true });
    }
    if (b.action === "disable" || b.action === "enable") {
      if (email === myEmail) return json({ error: "حساب خودتان را نمی‌توانید غیرفعال کنید." }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: b.action === "disable" ? "876000h" : "none" });
      if (error) throw error;
      await log(b.action === "disable" ? "حساب غیرفعال شد" : "حساب فعال شد");
      return json({ ok: true });
    }
    if (b.action === "finance") {
      await setFinance(b.finance);
      await log("داشبورد مالی: " + ({ admin: "مدیر", viewer: "مشاهده", none: "بدون دسترسی" } as Record<string, string>)[finance(b.finance)]);
      return json({ ok: true });
    }
    if (b.action === "rename") {
      await admin.from("user_allowlist").update({ full_name: b.full_name || null }).ilike("email", email);
      await admin.from("profiles").update({ full_name: b.full_name || null }).ilike("email", email);
      await log("نام تغییر کرد");
      return json({ ok: true });
    }
    return json({ error: "عملیات ناشناخته" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 500);
  }
});
