/* کنسول مدیریت دسترسی: چه داشبوردی برای چه کسی و با چه سطحی فعال باشد.
   داده: app_dashboards، app_access، app_access_log (Supabase). فقط نقش admin در داشبورد «admin» می‌تواند وارد شود. */
var SUPABASE_URL = "https://zlzjzzqrkbsqornnimlx.supabase.co", SUPABASE_ANON_KEY = "sb_publishable_SC84u5DIOQgSgNI43KE6NQ_wWGGTg69";
var $ = function (id) { return document.getElementById(id); }, db = null;
var X = { page: "matrix", me: "", users: [], dash: [], acc: [], log: [], profiles: [] };
var ROLES = { viewer: "مشاهده", editor: "ثبت و ویرایش", admin: "مدیر" };
var APAGES = [
  { k: "matrix", t: "ماتریس دسترسی", ic: "list", h: "هر کاربر به کدام داشبورد و با چه سطحی" },
  { k: "users", t: "کاربران", ic: "edit", h: "افزودن کاربر، رمز، فعال و غیرفعال کردن" },
  { k: "dash", t: "داشبوردها", ic: "layers", h: "فهرست داشبوردها؛ افزودن داشبورد تازه در آینده" },
  { k: "log", t: "گزارش تغییرات", ic: "clock", h: "چه کسی، کی، چه دسترسی‌ای را تغییر داد" }
];
function esc(s) { return String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function toast(t) { var el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("on"); }, 2600); }
function when(iso) { if (!iso) return "—"; return formatJalali(String(iso).slice(0, 10)) + " " + toFa(new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" })); }

async function ensureDb() {
  if (db) return db;
  await new Promise(function (res, rej) { var s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
    s.onload = res; s.onerror = function () { var b = document.createElement("script"); b.src = "https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"; b.onload = res; b.onerror = rej; document.head.appendChild(b); }; document.head.appendChild(s); });
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); return db;
}

/* ---------- داده ---------- */
async function load() {
  var a = await db.from("app_dashboards").select("*").order("sort"), b = await db.from("app_access").select("*"), c = await db.rpc("app_users"),
      d = await db.from("app_access_log").select("*").order("at", { ascending: false }).limit(200), e = await db.from("profiles").select("email,full_name,role,is_active");
  X.dash = a.data || []; X.acc = b.data || []; X.users = c.data || []; X.log = d.data || []; X.profiles = e.data || [];
}
function allEmails() { var m = {}; X.users.forEach(function (u) { m[u.email] = { email: u.email, name: u.full_name, last: u.last_sign_in, reg: true, off: u.disabled }; });
  X.acc.forEach(function (a) { if (!m[a.email]) m[a.email] = { email: a.email, name: null, last: null, reg: false }; });
  return Object.keys(m).sort().map(function (k) { return m[k]; }); }
function roleOf(email, dash) { var r = X.acc.filter(function (a) { return a.email === email && a.dashboard === dash; })[0]; return r ? r.role : ""; }
async function setRole(email, dash, role) {
  email = email.trim().toLowerCase();
  if (email === X.me && dash === "admin" && role !== "admin") { toast("دسترسی مدیر خودتان را نمی‌توانید بردارید؛ اول مدیر دیگری تعریف کنید."); render(); return; }
  var r = role ? await db.from("app_access").upsert({ email: email, dashboard: dash, role: role, updated_at: new Date().toISOString(), updated_by: X.me })
               : await db.from("app_access").delete().eq("email", email).eq("dashboard", dash);
  if (r.error) { toast("ثبت نشد: " + r.error.message); return; }
  await db.from("app_access_log").insert({ by_email: X.me, email: email, dashboard: dash, action: role ? "دسترسی: " + ROLES[role] : "دسترسی برداشته شد" });
  await load(); render(); toast("ثبت شد.");
}

/* ---------- صفحه‌ها ---------- */
function roleSel(email, d) { var r = roleOf(email, d.key);
  return '<select class="r-' + (r || "none") + '" data-email="' + esc(email) + '" data-dash="' + d.key + '"><option value="">— بدون دسترسی</option>' +
    Object.keys(ROLES).map(function (k) { return '<option value="' + k + '"' + (r === k ? " selected" : "") + '>' + ROLES[k] + '</option>'; }).join("") + '</select>'; }
function pMatrix() {
  var D = X.dash.filter(function (d) { return d.enforced; }), U = allEmails();
  var h = '<div class="gap">هر تغییر فوراً اعمال می‌شود. «مشاهده» فقط خواندن است؛ «ثبت و ویرایش» یعنی ثبت روزانه و تغییر مدل؛ «مدیر» یعنی همه‌چیز. در «کنسول مدیریت»، فقط نقش «مدیر» معنا دارد و اجازهٔ ورود به همین صفحه را می‌دهد.</div>';
  h += '<div class="card" style="margin-bottom:14px"><div class="scroll"><table class="mx"><thead><tr><th>کاربر</th>' + D.map(function (d) { return '<th>' + esc(d.title) + (d.active ? "" : ' <span class="pill p1">غیرفعال</span>') + '</th>'; }).join("") + '</tr></thead><tbody>' +
    U.map(function (u) { return '<tr><td class="who"><b>' + esc(u.name || "—") + (u.reg ? "" : ' <span class="pill p2">هنوز ثبت‌نام نکرده</span>') + '</b><span>' + esc(u.email) + '</span></td>' + D.map(function (d) { return '<td>' + roleSel(u.email, d) + '</td>'; }).join("") + '</tr>'; }).join("") +
    '</tbody></table></div></div>';
  h += '<div class="card"><div class="chead"><div><h3>دادن دسترسی به ایمیل تازه</h3><p class="hint">می‌شود پیش از ثبت‌نام هم دسترسی داد؛ با اولین ورود فعال می‌شود. ساخت حساب کاربری فعلاً از داشبورد مالی انجام می‌شود.</p></div></div>' +
    '<div class="addrow"><input id="nEmail" dir="ltr" placeholder="name@example.com"><select id="nDash">' + D.map(function (d) { return '<option value="' + d.key + '">' + esc(d.title) + '</option>'; }).join("") + '</select><select id="nRole">' +
    Object.keys(ROLES).map(function (k) { return '<option value="' + k + '">' + ROLES[k] + '</option>'; }).join("") + '</select><button class="btn sm" id="nAdd" style="margin:0">ثبت</button></div></div>';
  return h;
}
var FIN = { none: "بدون دسترسی", viewer: "مشاهده", admin: "مدیر" };
function genPw() { var c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789", r = ""; var a = new Uint32Array(12); crypto.getRandomValues(a); for (var i = 0; i < 12; i++) r += c[a[i] % c.length]; return r; }
function pUsers() {
  var U = X.users, D = X.dash.filter(function (d) { return d.enforced && d.key !== "admin" && d.active; });
  var h = '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>افزودن کاربر تازه</h3><p class="hint">حساب فوراً ساخته و تأییدشده است؛ ایمیل و رمز را خودتان به کاربر بدهید.</p></div></div>' +
    '<div class="frm"><div><label>نام و سمت</label><input id="uName" placeholder="مثلاً رضا احمدی — سرپرست تولید"></div><div><label>ایمیل</label><input id="uEmail" dir="ltr" placeholder="name@example.com"></div>' +
    '<div><label>رمز عبور اولیه</label><div style="display:flex;gap:6px"><input id="uPw" dir="ltr" value="' + genPw() + '"><button class="more" id="uGen" type="button">تازه</button></div></div>' +
    D.map(function (d) { return '<div><label>' + esc(d.title) + '</label><select data-ud="' + d.key + '"><option value="">بدون دسترسی</option>' + Object.keys(ROLES).map(function (k) { return '<option value="' + k + '">' + ROLES[k] + '</option>'; }).join("") + '</select></div>'; }).join("") +
    '<div><label>داشبورد مالی پروژه</label><select id="uFin">' + Object.keys(FIN).map(function (k) { return '<option value="' + k + '">' + FIN[k] + '</option>'; }).join("") + '</select></div>' +
    '</div><button class="btn sm" id="uAdd">ساخت حساب</button><div class="note" id="uNote"></div></div>';
  h += '<div class="card"><div class="chead"><div><h3>حساب‌های موجود</h3><p class="hint">' + toFa(U.length) + ' حساب</p></div></div><div class="scroll"><table class="mx"><thead><tr><th>کاربر</th><th>آخرین ورود</th><th>داشبوردها</th><th>داشبورد مالی</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>' +
    U.map(function (u) { var mine = X.acc.filter(function (a) { return a.email === u.email; }), self = u.email === X.me;
      return '<tr><td class="who"><b>' + esc(u.full_name || "—") + '</b><span>' + esc(u.email) + '</span></td><td>' + when(u.last_sign_in) + '</td><td>' +
        (mine.length ? mine.map(function (a) { var d = X.dash.filter(function (x) { return x.key === a.dashboard; })[0]; return '<span class="pill p3">' + esc(d ? d.title : a.dashboard) + ' · ' + ROLES[a.role] + '</span>'; }).join(" ") : "—") + '</td>' +
        '<td><select data-fin="' + esc(u.email) + '">' + Object.keys(FIN).map(function (k) { return '<option value="' + k + '"' + (u.finance === k ? " selected" : "") + '>' + FIN[k] + '</option>'; }).join("") + '</select></td>' +
        '<td>' + (u.disabled ? '<span class="pill p1">غیرفعال</span>' : '<span class="pill p3">فعال</span>') + '</td><td style="white-space:nowrap">' +
        '<button class="more" data-pw="' + esc(u.email) + '">رمز تازه</button> <button class="more" data-ren="' + esc(u.email) + '">نام</button> ' +
        (self ? "" : '<button class="more" data-ban="' + esc(u.email) + '" data-on="' + (u.disabled ? "1" : "") + '">' + (u.disabled ? "فعال کن" : "غیرفعال کن") + '</button>') + '</td></tr>'; }).join("") +
    '</tbody></table></div><p class="hint" style="margin-top:10px">«غیرفعال کن» جلوی ورود به همهٔ داشبوردها را می‌گیرد، بدون اینکه حساب یا سابقه‌اش پاک شود. دسترسی داشبورد مالی از سامانهٔ خود آن داشبورد است و این‌جا تغییرش می‌دهید.</p></div>';
  return h;
}
async function callAdmin(body) {
  var r = await db.functions.invoke("admin-users", { body: body });
  if (r.error) { var m = r.error.message; try { var j = await r.error.context.json(); m = j.error || m; } catch (e) {} throw new Error(m); }
  if (r.data && r.data.error) throw new Error(r.data.error);
  return r.data;
}
async function act(body, okMsg) { try { await callAdmin(body); await load(); render(); toast(okMsg); } catch (e) { toast("انجام نشد: " + e.message); } }
function pDash() {
  var h = X.dash.map(function (d) { var n = X.acc.filter(function (a) { return a.dashboard === d.key; }).length;
    return '<div class="dcard"><div><b>' + esc(d.title) + '</b> <span class="pill ' + (d.active ? "p3" : "p1") + '">' + (d.active ? "فعال" : "غیرفعال") + '</span>' + (d.enforced ? "" : ' <span class="pill p2">دسترسی از سامانهٔ خودش</span>') +
      '<p>' + esc(d.description || "") + ' · کلید: <code>' + esc(d.key) + '</code> · ' + toFa(n) + ' کاربر</p></div><div style="display:flex;gap:6px">' + (d.url ? '<a class="more" href="../' + esc(d.url.replace(/^\.\//, "")) + '">باز کردن</a>' : '') +
      (d.key === "admin" ? "" : '<button class="more" data-tog="' + d.key + '">' + (d.active ? "غیرفعال کن" : "فعال کن") + '</button>') + '</div></div>'; }).join("");
  h += '<div class="card" style="margin-top:14px"><div class="chead"><div><h3>ثبت داشبورد تازه</h3><p class="hint">برای ماژول‌های آینده (مثل کارنما، آزمایشگاه، انبار). کلید انگلیسی و یکتا باشد؛ همان کلیدی که داشبورد برای بررسی دسترسی صدا می‌زند.</p></div></div>' +
    '<div class="addrow"><input id="dKey" dir="ltr" placeholder="key مثل lab"><input id="dTitle" placeholder="عنوان"><input id="dUrl" dir="ltr" placeholder="./lab/"><input id="dDesc" placeholder="توضیح کوتاه"><button class="btn sm" id="dAdd" style="margin:0">افزودن</button></div></div>';
  return h;
}
function pLog() {
  return '<div class="card"><div class="scroll"><table><thead><tr><th>زمان</th><th>توسط</th><th>کاربر</th><th>داشبورد</th><th>تغییر</th></tr></thead><tbody>' +
    (X.log.length ? X.log.map(function (l) { var d = X.dash.filter(function (x) { return x.key === l.dashboard; })[0];
      return '<tr><td>' + when(l.at) + '</td><td dir="ltr" style="text-align:right">' + esc(l.by_email) + '</td><td dir="ltr" style="text-align:right">' + esc(l.email) + '</td><td>' + esc(d ? d.title : l.dashboard) + '</td><td>' + esc(l.action) + '</td></tr>'; }).join("")
      : '<tr><td colspan="5" class="mid" style="color:var(--muted)">هنوز تغییری ثبت نشده.</td></tr>') + '</tbody></table></div></div>';
}

/* ---------- پوسته ---------- */
function nav() { $("nav").innerHTML = '<div class="ngrp"><div class="nhead" style="cursor:default"><span>مدیریت دسترسی</span></div><div class="nbody">' +
  APAGES.map(function (p) { return '<button class="nav' + (X.page === p.k ? " on" : "") + '" data-p="' + p.k + '"><span class="ic">' + icon(p.ic) + '</span>' + p.t + '</button>'; }).join("") + '</div></div>';
  Array.prototype.forEach.call(document.querySelectorAll("[data-p]"), function (b) { b.onclick = function () { X.page = b.dataset.p; $("side").classList.remove("open"); $("scrim").classList.add("hide"); render(); }; }); }
function render() {
  nav(); var p = APAGES.filter(function (x) { return x.k === X.page; })[0];
  $("ptitle").textContent = p.t; $("phint").textContent = p.h;
  $("view").innerHTML = { matrix: pMatrix, users: pUsers, dash: pDash, log: pLog }[p.k]();
  Array.prototype.forEach.call(document.querySelectorAll("select[data-email]"), function (s) { s.onchange = function () { setRole(s.dataset.email, s.dataset.dash, s.value); }; });
  if ($("uGen")) $("uGen").onclick = function () { $("uPw").value = genPw(); };
  if ($("uAdd")) $("uAdd").onclick = async function () {
    var e = $("uEmail").value.trim().toLowerCase(), pw = $("uPw").value.trim(), n = $("uName").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { toast("ایمیل درست نیست."); return; } if (pw.length < 8) { toast("رمز دست‌کم ۸ نویسه."); return; }
    $("uAdd").disabled = true; $("uNote").className = "note"; $("uNote").textContent = "در حال ساخت…";
    try { await callAdmin({ action: "create", email: e, password: pw, full_name: n, finance: $("uFin").value });
      var sels = document.querySelectorAll("[data-ud]");
      for (var i = 0; i < sels.length; i++) if (sels[i].value) { await db.from("app_access").upsert({ email: e, dashboard: sels[i].dataset.ud, role: sels[i].value, updated_at: new Date().toISOString(), updated_by: X.me });
        await db.from("app_access_log").insert({ by_email: X.me, email: e, dashboard: sels[i].dataset.ud, action: "دسترسی: " + ROLES[sels[i].value] }); }
      await load(); render(); $("uNote").className = "note ok"; $("uNote").textContent = "حساب ساخته شد. ایمیل: " + e + " · رمز: " + pw + " — این را به کاربر بدهید.";
    } catch (err) { $("uAdd").disabled = false; $("uNote").className = "note err"; $("uNote").textContent = "ساخته نشد: " + err.message; } };
  Array.prototype.forEach.call(document.querySelectorAll("[data-pw]"), function (b) { b.onclick = function () { var pw = prompt("رمز تازه برای " + b.dataset.pw + " (دست‌کم ۸ نویسه):", genPw()); if (!pw) return; act({ action: "password", email: b.dataset.pw, password: pw }, "رمز تغییر کرد: " + pw); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-ren]"), function (b) { b.onclick = function () { var n = prompt("نام و سمت تازه:"); if (n === null) return; act({ action: "rename", email: b.dataset.ren, full_name: n.trim() }, "نام ثبت شد."); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-ban]"), function (b) { b.onclick = function () { var on = !!b.dataset.on; if (!confirm((on ? "فعال" : "غیرفعال") + " شود؟")) return; act({ action: on ? "enable" : "disable", email: b.dataset.ban }, "ثبت شد."); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-fin]"), function (s) { s.onchange = function () { act({ action: "finance", email: s.dataset.fin, finance: s.value }, "دسترسی داشبورد مالی ثبت شد."); }; });
  if ($("nAdd")) $("nAdd").onclick = function () { var e = $("nEmail").value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { toast("ایمیل درست نیست."); return; } setRole(e, $("nDash").value, $("nRole").value); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-tog]"), function (b) { b.onclick = async function () { var d = X.dash.filter(function (x) { return x.key === b.dataset.tog; })[0];
    if (!confirm((d.active ? "غیرفعال" : "فعال") + " شود؟ با غیرفعال شدن، هیچ‌کس به آن دسترسی ندارد.")) return;
    var r = await db.from("app_dashboards").update({ active: !d.active }).eq("key", d.key); if (r.error) { toast(r.error.message); return; }
    await db.from("app_access_log").insert({ by_email: X.me, dashboard: d.key, action: d.active ? "داشبورد غیرفعال شد" : "داشبورد فعال شد" }); await load(); render(); }; });
  if ($("dAdd")) $("dAdd").onclick = async function () { var k = $("dKey").value.trim().toLowerCase(), t = $("dTitle").value.trim();
    if (!/^[a-z][a-z0-9_-]{1,30}$/.test(k) || !t) { toast("کلید انگلیسی و عنوان لازم است."); return; }
    var r = await db.from("app_dashboards").insert({ key: k, title: t, url: $("dUrl").value.trim() || null, description: $("dDesc").value.trim() || null, sort: 10 + X.dash.length });
    if (r.error) { toast(r.error.message); return; } await setRole(X.me, k, "admin"); };
}
$("burger").onclick = function () { $("side").classList.add("open"); $("scrim").classList.remove("hide"); };
$("scrim").onclick = function () { $("side").classList.remove("open"); $("scrim").classList.add("hide"); };
$("icL").innerHTML = icon("power");
$("logout").onclick = async function () { await ensureDb(); await db.auth.signOut(); location.reload(); };
$("go").onclick = async function () { await ensureDb(); var r = await db.auth.signInWithPassword({ email: $("em").value.trim().toLowerCase(), password: $("pw").value.trim() });
  if (r.error) { $("anote").className = "note err"; $("anote").textContent = "ورود ناموفق — " + r.error.message; return; } start(); };
try { var le = localStorage.getItem("sayanik_email"); if (le) $("em").value = le; } catch (e) {}

async function start() {
  try { await ensureDb(); } catch (e) { $("boot").textContent = "کتابخانه بارگذاری نشد."; return; }
  var s = await db.auth.getSession(); if (!s.data.session) { $("boot").classList.add("hide"); $("auth").classList.remove("hide"); return; }
  X.me = String(s.data.session.user.email || "").toLowerCase(); $("auth").classList.add("hide"); $("boot").classList.remove("hide");
  var a = await db.rpc("is_app_admin");
  if (!a.data) { $("boot").innerHTML = '<div class="empty">حساب ' + esc(X.me) + ' مدیر دسترسی نیست.<br><br><button class="more" id="lo2">خروج</button></div>'; $("lo2").onclick = async function () { await db.auth.signOut(); location.reload(); }; return; }
  await load();
  var me = X.users.filter(function (u) { return u.email === X.me; })[0]; $("meNm").textContent = (me && me.full_name) || X.me; $("meAv").textContent = ((me && me.full_name) || X.me).trim().charAt(0);
  SayaApps.render(db, $("apps"), "admin", "../");
  $("boot").classList.add("hide"); $("app").classList.remove("hide"); render();
}
start();
