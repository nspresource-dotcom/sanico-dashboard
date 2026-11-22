/* اشخاص و شرکت‌ها — فهرست واحد طرف‌حساب‌ها برای همهٔ سامانه‌های سایا نیک.
   روی جدول counterparties (همان فهرست داشبورد مالی) ساخته شده؛ داشبورد تصمیم و سیستم مدیریت یکپارچه از همین فهرست انتخاب می‌کنند.
   - نام‌ها با یکسان‌سازی ی/ک، فاصله و نیم‌فاصله و نام‌های مستعار تطبیق داده می‌شوند (party_key در پایگاه داده).
   - تغییر نام در یک جا همه‌جا اعمال می‌شود و نام قدیمی مستعار می‌ماند؛ تکراری‌ها با «ادغام» یکی می‌شوند. */
var $ = function (id) { return document.getElementById(id); }, db = null;
var P = { me: "", role: null, edit: false, admin: false, list: [], use: {}, q: "", r: "", inactive: false, modelNames: [] };
var ROLES = { feed: "تأمین خوراک / معدن", supplier: "تأمین کالا و خدمات", contractor: "پیمانکار", customer: "خریدار / مشتری", partner: "شریک / سرمایه‌گذار", bank: "بانک / مالی", gov: "دولتی / نهاد", staff: "پرسنل", other: "سایر" };
var PT = { legal: "حقوقی", person: "حقیقی" };
function esc(s) { return String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function toast(t) { var el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("on"); }, 3000); }
function key(t) { return String(t || "").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[ةۀ]/g, "ه").replace(/[أإآ]/g, "ا").replace(/[\s‌‏\-_.,،()«»"']+/g, "").toLowerCase(); }
function chips(rs) { return (rs || []).map(function (r) { return '<span class="kd">' + (ROLES[r] || r) + '</span>'; }).join(" "); }
function fmtM(v) { if (!v) return "—"; var b = v / 1e9; return toFa(b >= 1 ? b.toFixed(1) + " میلیارد" : Math.round(v / 1e6) + " میلیون"); }
async function ensureDb() { if (!db) db = await window.sayaClient(); return db; }
async function load() {
  var r = await Promise.all([db.from("counterparties").select("*").order("name"), db.rpc("party_usage"), db.from("bf_model").select("data").eq("id", 1).maybeSingle()]);
  P.list = r[0].data || []; P.use = {}; (r[1].data || []).forEach(function (u) { P.use[u.id] = u; });
  P.modelNames = []; var d = r[2] && r[2].data && r[2].data.data;
  if (d) ["stock", "bourse", "mines", "buys", "fg"].forEach(function (t) { (d[t] || []).forEach(function (s) { if (s.name) P.modelNames.push(s.name); }); });
}
function byKey() { var m = {}; P.list.forEach(function (p) { m[key(p.name)] = p; (p.aliases || []).forEach(function (a) { m[key(a)] = m[key(a)] || p; }); }); return m; }
function dupGroups() {
  var g = [], seen = {};
  P.list.forEach(function (a, i) { if (seen[a.id]) return; var ka = key(a.name), grp = [a];
    P.list.slice(i + 1).forEach(function (b) { var kb = key(b.name); if (seen[b.id] || ka.length < 4 || kb.length < 4) return; if (ka === kb || ka.indexOf(kb) >= 0 || kb.indexOf(ka) >= 0) { grp.push(b); seen[b.id] = 1; } });
    if (grp.length > 1) { seen[a.id] = 1; g.push(grp); } });
  return g;
}

function render() {
  $("ptitle").textContent = "اشخاص و شرکت‌ها"; $("phint").textContent = "فهرست واحد تأمین‌کنندگان، معادن، خریداران، پیمانکاران و سایر طرف‌حساب‌ها — در همهٔ داشبوردها";
  $("nav").innerHTML = '<div class="ngrp"><div class="nhead" style="cursor:default"><span>اطلاعات پایه</span></div><div class="nbody"><button class="nav on"><span class="ic">' + icon("list") + '</span>اشخاص و شرکت‌ها</button></div></div>';
  var q = key(P.q), L = P.list.filter(function (p) { return (P.inactive || p.is_active !== false) && (!P.r || (P.r === "_none" ? !(p.roles || []).length : (p.roles || []).indexOf(P.r) >= 0)) &&
    (!q || key(p.name).indexOf(q) >= 0 || (p.aliases || []).some(function (a) { return key(a).indexOf(q) >= 0; }) || key(p.contact).indexOf(q) >= 0 || key(p.city).indexOf(q) >= 0); });
  var cnt = function (r) { return P.list.filter(function (p) { return p.is_active !== false && (r === "_none" ? !(p.roles || []).length : (p.roles || []).indexOf(r) >= 0); }).length; };
  var h = '<div class="flt"><input id="pq" placeholder="جست‌وجوی نام، نام مستعار، شخص رابط یا شهر" value="' + esc(P.q) + '" style="flex:1;min-width:220px">' + (P.edit ? '<button class="more" id="pNew">+ شخص یا شرکت تازه</button>' : '') + '</div>';
  h += '<div class="tabs"><button data-r=""' + (!P.r ? ' class="on"' : '') + '>همه (' + toFa(P.list.filter(function (p) { return p.is_active !== false; }).length) + ')</button>' + Object.keys(ROLES).map(function (r) { var c = cnt(r); return c ? '<button data-r="' + r + '"' + (P.r === r ? ' class="on"' : '') + '>' + ROLES[r] + " (" + toFa(c) + ')</button>' : ''; }).join("") +
    (cnt("_none") ? '<button data-r="_none"' + (P.r === "_none" ? ' class="on"' : '') + '>بدون نقش (' + toFa(cnt("_none")) + ')</button>' : '') + '<label class="chk" style="margin:0 8px"><input type="checkbox" id="pIn"' + (P.inactive ? " checked" : "") + '> غیرفعال‌ها هم</label></div>';
  var dg = dupGroups(); if (dg.length && P.admin) h += '<div class="gap">' + toFa(dg.length) + ' گروه نام احتمالاً تکراری: ' + dg.slice(0, 6).map(function (g) { return g.map(function (p) { return '<a href="#" data-pid="' + p.id + '">' + esc(p.name) + '</a>'; }).join(" / "); }).join(" · ") + (dg.length > 6 ? " …" : "") + '. روی یکی بزنید و «ادغام» کنید.</div>';
  var km = byKey(), miss = P.modelNames.filter(function (n, i, a) { return a.indexOf(n) === i && !km[key(n)]; });
  if (miss.length && P.edit) h += '<div class="gap">منابع مدل امکان‌سنجی که در فهرست نیستند: ' + miss.map(function (n) { return '<button class="more" data-addm="' + esc(n) + '" style="margin:2px">+ ' + esc(n) + '</button>'; }).join("") + '</div>';
  h += '<div class="card"><div class="scroll"><table><thead><tr><th>نام</th><th>نقش‌ها</th><th>نوع</th><th>رابط / تلفن</th><th>شهر</th><th class="num">مالی</th><th class="num">خرید خوراک</th><th class="num">فروش</th></tr></thead><tbody>' +
    (L.length ? L.map(function (p) { var u = P.use[p.id] || {};
      return '<tr data-pid="' + p.id + '" style="cursor:pointer' + (p.is_active === false ? ';opacity:.5' : '') + '"><td><b>' + esc(p.name) + '</b>' + ((p.aliases || []).length ? '<br><span class="hint">مستعار: ' + esc(p.aliases.join("، ")) + '</span>' : '') + '</td><td>' + chips(p.roles) + '</td><td>' + (PT[p.ptype] || "—") + '</td><td>' + esc(p.contact || "") + (p.mobile || p.phone ? '<br><span dir="ltr">' + esc(p.mobile || p.phone) + '</span>' : (p.contact ? "" : "—")) + '</td><td>' + esc(p.city || "—") + '</td>' +
        '<td class="num">' + (+u.fin ? toFa(u.fin) : "—") + '</td><td class="num">' + (+u.buys ? toFa(u.buys) + '<br><span class="hint">' + fmtM(+u.buy_amount) + '</span>' : "—") + '</td><td class="num">' + (+u.sales ? toFa(u.sales) + '<br><span class="hint">' + fmtM(+u.sale_amount) + '</span>' : "—") + '</td></tr>'; }).join("")
      : '<tr><td colspan="8" class="mid" style="color:var(--muted)">موردی پیدا نشد.</td></tr>') + '</tbody></table></div></div>';
  h += '<p class="hint" style="margin-top:10px">ستون «مالی» تعداد تراکنش‌ها و تعهدات داشبورد مالی است و ستون‌های خرید و فروش از داشبورد تصمیم می‌آیند. مبالغ به همان واحد ثبت در داشبورد تصمیم‌اند.</p>';
  $("view").innerHTML = h; bind();
}
function openP(id) {
  var p = id ? P.list.filter(function (x) { return x.id === id; })[0] : { roles: P.r && P.r !== "_none" ? [P.r] : [], is_active: true, aliases: [] };
  var ro = P.edit ? "" : " disabled", u = id ? P.use[id] || {} : {};
  var others = P.list.filter(function (x) { return x.id !== id; });
  var h = '<div class="card"><div class="chead"><div><h3>' + (id ? esc(p.name) : "شخص یا شرکت تازه") + '</h3>' + (id ? '<p class="hint">در مالی ' + toFa(+u.fin || 0) + ' · خرید ' + toFa(+u.buys || 0) + ' · فروش ' + toFa(+u.sales || 0) + ' · تولید ' + toFa(+u.feed || 0) + ' مورد' + (p.updated_by ? ' · آخرین تغییر: ' + esc(p.updated_by) : '') + '</p>' : '<p class="hint">اگر نامی شبیه این از قبل باشد (حتی با ی/ک یا فاصلهٔ متفاوت)، همان رکورد باز می‌شود و تکراری ساخته نمی‌شود.</p>') + '</div><button class="more" id="mX">بستن</button></div>' +
    '<div class="frm"><div style="grid-column:1/-1"><label>نام</label><input id="pN" value="' + esc(p.name || "") + '"' + ro + '></div>' +
    '<div style="grid-column:1/-1"><label>نقش‌ها</label><div class="stds" id="pR">' + Object.keys(ROLES).map(function (r) { return '<label><input type="checkbox" value="' + r + '"' + ((p.roles || []).indexOf(r) >= 0 ? " checked" : "") + ro + '> ' + ROLES[r] + '</label>'; }).join("") + '</div></div>' +
    '<div><label>نوع</label><select id="pT"' + ro + '><option value="">—</option>' + Object.keys(PT).map(function (k) { return '<option value="' + k + '"' + (p.ptype === k ? " selected" : "") + '>' + PT[k] + '</option>'; }).join("") + '</select></div>' +
    '<div><label>شخص رابط</label><input id="pC" value="' + esc(p.contact || "") + '"' + ro + '></div>' +
    '<div><label>موبایل</label><input id="pM" dir="ltr" value="' + esc(p.mobile || "") + '"' + ro + '></div><div><label>تلفن</label><input id="pP" dir="ltr" value="' + esc(p.phone || "") + '"' + ro + '></div>' +
    '<div><label>شناسهٔ ملی / کد ملی</label><input id="pI" dir="ltr" value="' + esc(p.national_id || "") + '"' + ro + '></div><div><label>کد اقتصادی</label><input id="pE" dir="ltr" value="' + esc(p.economic_code || "") + '"' + ro + '></div>' +
    '<div><label>شهر</label><input id="pCi" value="' + esc(p.city || "") + '"' + ro + '></div><div><label>محل معدن / انبار</label><input id="pL" value="' + esc(p.location || "") + '"' + ro + '></div>' +
    '<div style="grid-column:1/-1"><label>نشانی</label><input id="pA" value="' + esc(p.address || "") + '"' + ro + '></div>' +
    '<div style="grid-column:1/-1"><label>نام‌های مستعار (با ویرگول جدا کنید؛ نام‌هایی که در سوابق قدیمی به‌کار رفته)</label><input id="pAl" value="' + esc((p.aliases || []).join("، ")) + '"' + ro + '></div>' +
    '<div style="grid-column:1/-1"><label>یادداشت</label><textarea id="pNo"' + ro + '>' + esc(p.notes || "") + '</textarea></div>' +
    '<label class="chk"><input type="checkbox" id="pAc"' + (p.is_active !== false ? " checked" : "") + ro + '> فعال (غیرفعال‌ها در فرم‌ها نمایش داده نمی‌شوند ولی سوابقشان می‌ماند)</label></div>';
  if (id && P.admin && others.length) h += '<div class="sec-h">ادغام رکورد تکراری</div><div class="addrow"><select id="pMg"><option value="">این رکورد را ادغام کن در…</option>' + others.map(function (o) { return '<option value="' + o.id + '">' + esc(o.name) + '</option>'; }).join("") + '</select><button class="btn sm warn" id="pMgo" style="margin:0">ادغام</button></div><p class="hint">همهٔ سوابق این رکورد در داشبورد مالی و داشبورد تصمیم به رکورد انتخاب‌شده منتقل می‌شود، نامش مستعار آن رکورد می‌شود و این رکورد حذف می‌شود.</p>';
  h += P.edit ? '<div class="acts"><button class="btn sm" id="pSave">ذخیره</button></div>' : '';
  h += '</div>';
  var m = $("mdl"); if (!m) { m = document.createElement("div"); m.id = "mdl"; m.className = "modal"; document.body.appendChild(m); m.onclick = function (e) { if (e.target === m) m.style.display = "none"; }; }
  m.innerHTML = h; m.style.display = "flex"; $("mX").onclick = function () { m.style.display = "none"; };
  if ($("pSave")) $("pSave").onclick = async function () {
    var name = $("pN").value.trim(); if (!name) { toast("نام را بنویسید."); return; }
    var roles = []; Array.prototype.forEach.call(document.querySelectorAll("#pR input:checked"), function (c) { roles.push(c.value); });
    var al = $("pAl").value.split(/[,،]/).map(function (s) { return s.trim(); }).filter(Boolean);
    var o = { roles: roles, ptype: $("pT").value || null, contact: $("pC").value.trim() || null, mobile: $("pM").value.trim() || null, phone: $("pP").value.trim() || null, national_id: $("pI").value.trim() || null,
      economic_code: $("pE").value.trim() || null, city: $("pCi").value.trim() || null, location: $("pL").value.trim() || null, address: $("pA").value.trim() || null, aliases: al, notes: $("pNo").value.trim() || null, is_active: $("pAc").checked, updated_by: P.me };
    var pid = id;
    if (!id) { var r1 = await db.rpc("party_upsert", { p_name: name, p_roles: roles }); if (r1.error) { toast(r1.error.message); return; } pid = r1.data; }
    else o.name = name;
    var r = await db.from("counterparties").update(o).eq("id", pid); if (r.error) { toast(r.error.message.indexOf("duplicate") >= 0 ? "این نام از قبل هست؛ از «ادغام» استفاده کنید." : r.error.message); return; }
    m.style.display = "none"; await load(); render(); toast(id ? "ذخیره شد." : "ثبت شد.");
  };
  if ($("pMgo")) $("pMgo").onclick = async function () { var to = $("pMg").value; if (!to) return; var t = P.list.filter(function (x) { return x.id === to; })[0];
    if (!confirm("«" + p.name + "» در «" + t.name + "» ادغام شود؟ این کار برگشت‌پذیر نیست.")) return;
    var r = await db.rpc("party_merge", { p_from: id, p_into: to }); if (r.error) { toast(r.error.message); return; } m.style.display = "none"; await load(); render(); toast("ادغام شد."); };
}
function bind() {
  $("pq").oninput = function () { P.q = $("pq").value; var pos = $("pq").selectionStart; render(); $("pq").focus(); $("pq").setSelectionRange(pos, pos); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-r]"), function (b) { b.onclick = function () { P.r = b.dataset.r; render(); }; });
  if ($("pIn")) $("pIn").onchange = function () { P.inactive = $("pIn").checked; render(); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-pid]"), function (b) { b.onclick = function (e) { e.preventDefault(); openP(b.dataset.pid); }; });
  if ($("pNew")) $("pNew").onclick = function () { openP(null); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-addm]"), function (b) { b.onclick = async function () { var r = await db.rpc("party_upsert", { p_name: b.dataset.addm, p_roles: ["feed"] }); if (r.error) { toast(r.error.message); return; } await load(); render(); toast("افزوده شد."); }; });
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
  P.me = String(s.data.session.user.email || "").toLowerCase(); $("auth").classList.add("hide"); $("boot").classList.remove("hide");
  var r = await Promise.all([db.rpc("dash_role", { p_key: "parties" }), db.rpc("parties_edit"), db.rpc("is_app_admin")]);
  P.role = r[0].data || null;
  if (!P.role) { $("boot").innerHTML = '<div class="empty">دسترسی ' + esc(P.me) + ' به این بخش فعال نیست.<br><br><button class="more" id="lo2">خروج</button></div>'; $("lo2").onclick = async function () { await db.auth.signOut(); location.reload(); }; return; }
  P.edit = !!r[1].data; P.admin = !!r[2].data;
  await load();
  $("meNm").textContent = P.me; $("meAv").textContent = P.me.charAt(0).toUpperCase(); $("meRl").textContent = { admin: "مدیر", editor: "ویرایش", viewer: "مشاهده" }[P.role];
  SayaApps.render(db, $("apps"), "parties", "../");
  $("boot").classList.add("hide"); $("app").classList.remove("hide"); render();
}
start();
