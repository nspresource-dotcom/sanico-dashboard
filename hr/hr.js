/* پنل منابع انسانی سایا نیک — مرحلهٔ اول: چارت سازمانی، پرسنل و واحدها.
   افراد از حساب‌هایی انتخاب می‌شوند که در «کنسول مدیریت دسترسی» ساخته شده‌اند.
   مراحل بعد (کارهای ارجاعی، اهداف و عملکرد ماهانه) روی همین چارت سوار می‌شوند. */
var SUPABASE_URL = "https://zlzjzzqrkbsqornnimlx.supabase.co", SUPABASE_ANON_KEY = "sb_publishable_SC84u5DIOQgSgNI43KE6NQ_wWGGTg69";
var $ = function (id) { return document.getElementById(id); }, db = null;
var H = { page: "chart", me: "", role: null, edit: false, units: [], pos: [], people: [], acc: [], log: [], sel: null, form: null };
var HPAGES = [
  { k: "over", t: "نمای کلی", ic: "home", h: "تعداد نفرات، جایگاه‌های خالی و واحدها" },
  { k: "chart", t: "چارت سازمانی", ic: "layers", h: "جایگاه‌ها، گزارش‌دهی و افراد هر جایگاه" },
  { k: "people", t: "پرسنل", ic: "edit", h: "اطلاعات هر نفر: موبایل، تاریخ شروع، نوع همکاری" },
  { k: "units", t: "واحدها", ic: "list", h: "واحدهای سازمانی و رنگ آن‌ها در چارت" },
  { k: "log", t: "گزارش تغییرات", ic: "clock", h: "چه کسی، کی، چه چیزی را تغییر داد" }
];
var NEXT = ["کارها و ارجاع (تخته)", "اهداف ماهانه", "عملکرد ماهانهٔ هر نفر", "ورود با موبایل و کد", "پنل شخصی روی گوشی"];
function esc(s) { return String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function toast(t) { var el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("on"); }, 2600); }
function when(iso) { if (!iso) return "—"; return formatJalali(String(iso).slice(0, 10)) + " " + toFa(new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" })); }
function parseJ(s) { var p = toEn(String(s || "")).split(/[\/\-.]/).map(Number); if (p.length !== 3 || !p[0]) return null; if (p[0] < 100) p[0] += 1400; return jalaliToIso(p[0], p[1], p[2]); }

async function ensureDb() {
  if (db) return db;
  await new Promise(function (res, rej) { var s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
    s.onload = res; s.onerror = function () { var b = document.createElement("script"); b.src = "https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"; b.onload = res; b.onerror = rej; document.head.appendChild(b); }; document.head.appendChild(s); });
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); return db;
}
async function load() {
  var a = await db.from("hr_units").select("*").order("sort"), b = await db.from("hr_positions").select("*").order("sort").order("id"),
      c = await db.from("hr_people").select("*"), d = await db.rpc("hr_accounts"), e = await db.from("hr_log").select("*").order("at", { ascending: false }).limit(200);
  H.units = a.data || []; H.pos = b.data || []; H.people = c.data || []; H.acc = d.data || []; H.log = e.data || [];
}
async function logit(t) { await db.from("hr_log").insert({ action: t }); }
function unitOf(id) { return H.units.filter(function (u) { return u.id === id; })[0] || null; }
function nameOf(email) { var a = H.acc.filter(function (x) { return x.email === email; })[0]; return a ? (a.full_name || a.email) : (email || ""); }
function posOf(email) { return H.pos.filter(function (p) { return p.holder_email === email; }); }
function managerOf(p) { var cur = p, guard = 0; while (cur && cur.parent_id && guard++ < 50) { var par = H.pos.filter(function (x) { return x.id === cur.parent_id; })[0]; if (!par) return null; if (par.holder_email) return par; cur = par; } return null; }
function kids(id) { return H.pos.filter(function (p) { return (p.parent_id || null) === id; }).sort(function (a, b) { return a.sort - b.sort || a.id - b.id; }); }
function kpi(lab, val, unit, foot, cls) { return '<div class="kpi ' + (cls || "") + '"><div class="bd"><div class="hd"><span class="lab">' + lab + '</span></div><div class="val">' + val + (unit ? '<span class="unit">' + unit + '</span>' : '') + '</div></div><div class="ft"><span>' + (foot || "") + '</span></div></div>'; }

/* ---------- نمای کلی ---------- */
function pOver() {
  var filled = H.pos.filter(function (p) { return p.holder_email; }), vac = H.pos.length - filled.length, people = {}, noPos = 0;
  filled.forEach(function (p) { people[p.holder_email] = 1; });
  H.acc.forEach(function (a) { if (!people[a.email] && !a.disabled) noPos++; });
  var h = '<div class="grid g3" style="margin-bottom:14px">' + kpi("نفرات در چارت", toFa(Object.keys(people).length), "نفر", "از " + toFa(H.acc.length) + " حساب کاربری") +
    kpi("جایگاه‌های خالی", toFa(vac), "جایگاه", "از " + toFa(H.pos.length) + " جایگاه", vac ? "warn" : "pos") + kpi("حساب‌های بدون جایگاه", toFa(noPos), "نفر", "در چارت قرار نگرفته‌اند", noPos ? "warn" : "") + '</div>';
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>واحدها</h3></div></div><div class="scroll"><table><thead><tr><th>واحد</th><th class="num">جایگاه</th><th class="num">پرشده</th><th>مدیر واحد</th></tr></thead><tbody>' +
    H.units.map(function (u) { var P = H.pos.filter(function (p) { return p.unit_id === u.id; }), m = P.filter(function (p) { return p.is_manager && p.holder_email; })[0];
      return '<tr><td><span class="chipc" style="background:' + esc(u.color) + '"></span><b>' + esc(u.name) + '</b></td><td class="num">' + toFa(P.length) + '</td><td class="num">' + toFa(P.filter(function (p) { return p.holder_email; }).length) + '</td><td>' + (m ? esc(nameOf(m.holder_email)) : "—") + '</td></tr>'; }).join("") + '</tbody></table></div></div>';
  h += '<div class="card"><div class="chead"><div><h3>مراحل بعد روی همین چارت</h3><p class="hint">چارت که کامل شد، هر نفر مدیرش را دارد و ارجاع کار و عملکرد ماهانه از همین ساختار استفاده می‌کند</p></div></div>' +
    NEXT.map(function (t, i) { return '<div class="task"><span class="tck" style="cursor:default"><span class="pill">' + toFa(i + 1) + '</span> ' + t + '</span></div>'; }).join("") + '</div>';
  return h;
}

/* ---------- چارت ---------- */
function nodeHtml(p) {
  var u = unitOf(p.unit_id), k = kids(p.id);
  return '<li><div class="node' + (H.sel === p.id ? " sel" : "") + '"><div class="bar" style="background:' + esc(u ? u.color : "#9aa") + '"></div><div class="nt">' + (p.is_manager ? '<span class="mgr-tag">مدیر</span>' : '') + esc(p.title) + '</div>' +
    '<div class="nu">' + esc(u ? u.name : "بدون واحد") + '</div><div class="nh' + (p.holder_email ? "" : " vac") + '">' + (p.holder_email ? esc(nameOf(p.holder_email)) : "خالی") + '</div>' +
    (H.edit ? '<div class="na"><button data-child="' + p.id + '">+ زیرمجموعه</button><button data-ed="' + p.id + '">ویرایش</button></div>' : '') + '</div>' +
    (k.length ? '<ul>' + k.map(nodeHtml).join("") + '</ul>' : '') + '</li>';
}
function listHtml(p, d) {
  var u = unitOf(p.unit_id);
  return '<div class="row" style="padding-right:' + (d * 18) + 'px"><span class="bar" style="background:' + esc(u ? u.color : "#9aa") + '"></span><div class="tx"><b>' + (p.is_manager ? '<span class="mgr-tag">مدیر</span>' : '') + esc(p.title) + '</b><span' + (p.holder_email ? '' : ' class="vac"') + '>' + (p.holder_email ? esc(nameOf(p.holder_email)) : "خالی") + '</span><span> · ' + esc(u ? u.name : "بدون واحد") + '</span></div>' +
    (H.edit ? '<button data-child="' + p.id + '">+</button><button data-ed="' + p.id + '">ویرایش</button>' : '') + '</div>' + kids(p.id).map(function (c) { return listHtml(c, d + 1); }).join("");
}
function editorHtml() {
  var f = H.form; if (!f) return "";
  var opts = function (list, val, empty) { return '<option value="">' + empty + '</option>' + list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(val) === String(o[0]) ? " selected" : "") + '>' + esc(o[1]) + '</option>'; }).join(""); };
  var desc = {}; (function mark(id) { desc[id] = 1; kids(id).forEach(function (c) { mark(c.id); }); })(f.id || -1);
  var parents = H.pos.filter(function (p) { return !desc[p.id]; }).map(function (p) { return [p.id, p.title + (p.holder_email ? " — " + nameOf(p.holder_email) : "")]; });
  var accs = H.acc.filter(function (a) { return !a.disabled; }).map(function (a) { var other = posOf(a.email).filter(function (p) { return p.id !== f.id; }).length; return [a.email, (a.full_name || a.email) + (other ? " (جایگاه دیگر هم دارد)" : "")]; });
  return '<div class="card editor" style="margin-bottom:14px"><div class="chead"><div><h3>' + (f.id ? "ویرایش جایگاه" : "جایگاه تازه") + '</h3><p class="hint">فرد از حساب‌های ساخته‌شده در «کنسول مدیریت دسترسی» انتخاب می‌شود. جایگاه بدون فرد یعنی «خالی، نیاز به جذب».</p></div></div><div class="frm">' +
    '<div><label>عنوان جایگاه</label><input id="fTitle" value="' + esc(f.title || "") + '" placeholder="مثلاً سرپرست شیفت"></div>' +
    '<div><label>واحد</label><select id="fUnit">' + opts(H.units.map(function (u) { return [u.id, u.name]; }), f.unit_id, "بدون واحد") + '</select></div>' +
    '<div><label>گزارش به (جایگاه بالادست)</label><select id="fParent">' + opts(parents, f.parent_id, "— بالاترین سطح") + '</select></div>' +
    '<div><label>فرد این جایگاه</label><select id="fHolder">' + opts(accs, f.holder_email, "خالی") + '</select></div>' +
    '<label class="chk"><input type="checkbox" id="fMgr"' + (f.is_manager ? " checked" : "") + '> مدیر واحد است</label>' +
    '<div><label>ترتیب نمایش</label><input id="fSort" class="money" value="' + toFa(f.sort || 0) + '"></div></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn sm" id="fSave" style="margin:0">ذخیره</button><button class="btn sm ghost" id="fCancel" style="margin:0">انصراف</button>' +
    (f.id ? '<button class="del" id="fDel" title="حذف جایگاه" style="width:auto;padding:0 12px">حذف جایگاه</button>' : '') + '</div></div>';
}
function pChart() {
  var roots = kids(null);
  var h = editorHtml();
  h += '<div class="card"><div class="chead"><div><h3>چارت سازمانی</h3><p class="hint">' + toFa(H.pos.length) + ' جایگاه · برای جابه‌جایی یک جایگاه، «گزارش به» را عوض کنید؛ زیرمجموعه‌هایش هم با آن می‌روند.</p></div>' +
    (H.edit ? '<button class="more" id="addRoot">+ جایگاه در بالاترین سطح</button>' : '') + '</div>' +
    (roots.length ? '<div class="org"><ul>' + roots.map(nodeHtml).join("") + '</ul></div><div class="orgl">' + roots.map(function (r) { return listHtml(r, 0); }).join("") + '</div>' : '<div class="empty">هنوز جایگاهی ساخته نشده.</div>') + '</div>';
  return h;
}

/* ---------- پرسنل ---------- */
function pPeople() {
  var P = {}; H.people.forEach(function (x) { P[x.email] = x; });
  return '<div class="gap">برای افزودن نفر تازه، اول در «کنسول مدیریت دسترسی ‹ کاربران» حساب بسازید؛ بعد این‌جا و در چارت دیده می‌شود. شمارهٔ موبایل برای ورود با کد یک‌بارمصرف در مرحلهٔ بعد استفاده می‌شود.</div>' +
    '<div class="card"><div class="scroll"><table class="mx"><thead><tr><th>نام</th><th>جایگاه</th><th>واحد</th><th>مدیر مستقیم</th><th>موبایل</th><th>تاریخ شروع</th><th>نوع همکاری</th><th>وضعیت</th></tr></thead><tbody>' +
    H.acc.map(function (a) { var x = P[a.email] || {}, ps = posOf(a.email), p = ps[0], u = p ? unitOf(p.unit_id) : null, m = p ? managerOf(p) : null, ro = H.edit ? "" : " disabled";
      return '<tr><td class="who"><b>' + esc(a.full_name || "—") + (a.disabled ? ' <span class="pill p1">حساب غیرفعال</span>' : '') + '</b><span>' + esc(a.email) + '</span></td>' +
        '<td>' + (ps.length ? ps.map(function (q) { return esc(q.title); }).join("، ") : '<span class="pill p2">بدون جایگاه</span>') + '</td><td>' + (u ? '<span class="chipc" style="background:' + esc(u.color) + '"></span>' + esc(u.name) : "—") + '</td>' +
        '<td>' + (m ? esc(nameOf(m.holder_email)) : "—") + '</td>' +
        '<td><input data-pf="mobile" data-pe="' + esc(a.email) + '" dir="ltr" placeholder="09xxxxxxxxx" value="' + esc(x.mobile || "") + '"' + ro + ' style="width:130px"></td>' +
        '<td><input data-pf="hire_date" data-pe="' + esc(a.email) + '" placeholder="۱۴۰۵/۰۹/۰۱" value="' + (x.hire_date ? toFa(formatJalali(x.hire_date)) : "") + '"' + ro + ' style="width:110px"></td>' +
        '<td><select data-pf="employment_type" data-pe="' + esc(a.email) + '"' + ro + '>' + ["", "تمام‌وقت", "پاره‌وقت", "قراردادی", "پیمانکار", "مشاور"].map(function (o) { return '<option' + ((x.employment_type || "") === o ? " selected" : "") + '>' + o + '</option>'; }).join("") + '</select></td>' +
        '<td><select data-pf="status" data-pe="' + esc(a.email) + '"' + ro + '>' + ["فعال", "مرخصی", "پایان همکاری"].map(function (o) { return '<option' + ((x.status || "فعال") === o ? " selected" : "") + '>' + o + '</option>'; }).join("") + '</select></td></tr>'; }).join("") +
    '</tbody></table></div></div>';
}
/* ---------- واحدها ---------- */
function pUnits() {
  return '<div class="card" style="margin-bottom:14px"><div class="scroll"><table><thead><tr><th>رنگ</th><th>نام واحد</th><th class="num">جایگاه</th><th class="num">ترتیب</th><th></th></tr></thead><tbody>' +
    H.units.map(function (u) { var n = H.pos.filter(function (p) { return p.unit_id === u.id; }).length, ro = H.edit ? "" : " disabled";
      return '<tr><td><input type="color" data-uf="color" data-uid="' + u.id + '" value="' + esc(u.color) + '"' + ro + ' style="width:44px;height:32px;padding:2px"></td><td><input data-uf="name" data-uid="' + u.id + '" value="' + esc(u.name) + '"' + ro + '></td><td class="num">' + toFa(n) + '</td>' +
        '<td><input data-uf="sort" data-uid="' + u.id + '" value="' + toFa(u.sort) + '"' + ro + ' style="width:70px"></td><td>' + (H.edit && !n ? '<button class="del" data-udel="' + u.id + '">✕</button>' : '') + '</td></tr>'; }).join("") +
    '</tbody></table></div>' + (H.edit ? '<div class="addrow" style="margin-top:12px"><input id="nuName" placeholder="نام واحد تازه"><input type="color" id="nuColor" value="#2f7d6a" style="flex:0 0 52px;min-width:52px;height:42px;padding:2px"><button class="btn sm" id="nuAdd" style="margin:0">افزودن</button></div>' : '') + '</div>';
}
function pLog() {
  return '<div class="card"><div class="scroll"><table><thead><tr><th>زمان</th><th>توسط</th><th>تغییر</th></tr></thead><tbody>' +
    (H.log.length ? H.log.map(function (l) { return '<tr><td>' + when(l.at) + '</td><td dir="ltr" style="text-align:right">' + esc(l.by_email) + '</td><td>' + esc(l.action) + '</td></tr>'; }).join("") : '<tr><td colspan="3" class="mid" style="color:var(--muted)">هنوز تغییری ثبت نشده.</td></tr>') + '</tbody></table></div></div>';
}

/* ---------- پوسته و رویدادها ---------- */
function nav() { $("nav").innerHTML = '<div class="ngrp"><div class="nhead" style="cursor:default"><span>منابع انسانی</span></div><div class="nbody">' +
  HPAGES.map(function (p) { return '<button class="nav' + (H.page === p.k ? " on" : "") + '" data-p="' + p.k + '"><span class="ic">' + icon(p.ic) + '</span>' + p.t + '</button>'; }).join("") +
  '</div></div><div class="ngrp"><div class="nhead" style="cursor:default"><span>به‌زودی</span></div><div class="nbody">' + NEXT.slice(0, 3).map(function (t) { return '<div class="nav" style="opacity:.45;cursor:default"><span class="ic">' + icon("clock") + '</span>' + t + '</div>'; }).join("") + '</div></div>';
  Array.prototype.forEach.call(document.querySelectorAll("[data-p]"), function (b) { b.onclick = function () { H.page = b.dataset.p; H.form = null; $("side").classList.remove("open"); $("scrim").classList.add("hide"); render(); window.scrollTo(0, 0); }; }); }
function render() {
  nav(); var p = HPAGES.filter(function (x) { return x.k === H.page; })[0];
  $("ptitle").textContent = p.t; $("phint").textContent = p.h;
  $("view").innerHTML = { over: pOver, chart: pChart, people: pPeople, units: pUnits, log: pLog }[p.k]();
  bind();
}
async function savePos() {
  var f = H.form, o = { title: $("fTitle").value.trim(), unit_id: +$("fUnit").value || null, parent_id: +$("fParent").value || null, holder_email: $("fHolder").value || null,
    is_manager: $("fMgr").checked, sort: +toEn($("fSort").value) || 0, updated_at: new Date().toISOString() };
  if (!o.title) { toast("عنوان جایگاه را بنویسید."); return; }
  var r = f.id ? await db.from("hr_positions").update(o).eq("id", f.id) : await db.from("hr_positions").insert(o);
  if (r.error) { toast("ذخیره نشد: " + r.error.message); return; }
  await logit((f.id ? "ویرایش جایگاه «" : "جایگاه تازه «") + o.title + "»" + (o.holder_email ? " — " + nameOf(o.holder_email) : " (خالی)"));
  H.form = null; await load(); render(); toast("ذخیره شد.");
}
function bind() {
  if ($("addRoot")) $("addRoot").onclick = function () { H.form = { parent_id: null, sort: 0 }; render(); window.scrollTo(0, 0); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-child]"), function (b) { b.onclick = function () { var par = H.pos.filter(function (p) { return p.id === +b.dataset.child; })[0];
    H.form = { parent_id: par.id, unit_id: par.unit_id, sort: kids(par.id).length }; H.sel = par.id; render(); window.scrollTo(0, 0); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-ed]"), function (b) { b.onclick = function () { var p = H.pos.filter(function (x) { return x.id === +b.dataset.ed; })[0];
    H.form = Object.assign({}, p); H.sel = p.id; render(); window.scrollTo(0, 0); }; });
  if ($("fSave")) $("fSave").onclick = savePos;
  if ($("fCancel")) $("fCancel").onclick = function () { H.form = null; H.sel = null; render(); };
  if ($("fDel")) $("fDel").onclick = async function () { var f = H.form, n = kids(f.id).length;
    if (!confirm("جایگاه «" + f.title + "» حذف شود؟" + (n ? " " + toFa(n) + " زیرمجموعه‌اش به بالاترین سطح می‌روند." : ""))) return;
    var r = await db.from("hr_positions").delete().eq("id", f.id); if (r.error) { toast(r.error.message); return; }
    await logit("حذف جایگاه «" + f.title + "»"); H.form = null; H.sel = null; await load(); render(); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-pe]"), function (el) { el.onchange = async function () {
    var f = el.dataset.pf, v = el.value.trim(), o = { email: el.dataset.pe, updated_at: new Date().toISOString() };
    if (f === "hire_date") { v = v ? parseJ(v) : null; if (el.value.trim() && !v) { toast("تاریخ درست نیست."); return; } }
    if (f === "mobile") { v = toEn(v).replace(/\D/g, ""); if (v && !/^09\d{9}$/.test(v)) { toast("موبایل باید ۱۱ رقم و با ۰۹ شروع شود."); return; } }
    o[f] = v || null; var r = await db.from("hr_people").upsert(o); if (r.error) { toast(r.error.message); return; }
    await logit("پرسنل " + nameOf(el.dataset.pe) + ": " + { mobile: "موبایل", hire_date: "تاریخ شروع", employment_type: "نوع همکاری", status: "وضعیت" }[f]); await load(); toast("ثبت شد."); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-uid]"), function (el) { el.onchange = async function () { var o = {}; o[el.dataset.uf] = el.dataset.uf === "sort" ? (+toEn(el.value) || 0) : el.value.trim();
    var r = await db.from("hr_units").update(o).eq("id", +el.dataset.uid); if (r.error) { toast(r.error.message); return; } await logit("ویرایش واحد"); await load(); render(); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-udel]"), function (b) { b.onclick = async function () { if (!confirm("واحد حذف شود؟")) return;
    await db.from("hr_units").delete().eq("id", +b.dataset.udel); await logit("حذف واحد"); await load(); render(); }; });
  if ($("nuAdd")) $("nuAdd").onclick = async function () { var n = $("nuName").value.trim(); if (!n) return;
    var r = await db.from("hr_units").insert({ name: n, color: $("nuColor").value, sort: H.units.length + 1 }); if (r.error) { toast(r.error.message); return; }
    await logit("واحد تازه «" + n + "»"); await load(); render(); };
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
  H.me = String(s.data.session.user.email || "").toLowerCase(); $("auth").classList.add("hide"); $("boot").classList.remove("hide");
  var r = await db.rpc("dash_role", { p_key: "hr" }); H.role = r.data || null;
  if (!H.role) { $("boot").innerHTML = '<div class="empty">دسترسی ' + esc(H.me) + ' به منابع انسانی فعال نیست.<br><br><button class="more" id="lo2">خروج</button></div>'; $("lo2").onclick = async function () { await db.auth.signOut(); location.reload(); }; return; }
  H.edit = H.role === "editor" || H.role === "admin";
  await load();
  var me = H.acc.filter(function (a) { return a.email === H.me; })[0]; $("meNm").textContent = (me && me.full_name) || H.me; $("meAv").textContent = ((me && me.full_name) || H.me).trim().charAt(0);
  $("meRl").textContent = { admin: "مدیر", editor: "ویرایش", viewer: "مشاهده" }[H.role];
  SayaApps.render(db, $("apps"), "hr", "../");
  $("boot").classList.add("hide"); $("app").classList.remove("hide"); render();
}
start();
