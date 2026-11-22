/* تختهٔ کارهای مدیرعامل (exec_tasks) — فقط برای مدیر داشبورد تصمیم، جدا از تختهٔ کارهای IMS
   هر صفحه می‌تواند با sendToBoard({ title, source, ref_label, risk_id }) کاری به این تخته بفرستد:
   ریسک‌ها و ذخایر، ریسک‌های عملیاتی بالای IMS، پایش ۱۹ بُعد. */

PAGES.splice(PAGES.findIndex(function (p) { return p.k === "home"; }) + 1, 0,
  { k: "board", g: "over", t: "تختهٔ کارهای من", ic: "list", h: "کارهای پیگیری مدیرعامل؛ از ریسک‌ها، پایش و هر جای داشبورد" });
var BSRC = { manual: "دستی", risk: "ریسک", ims_risk: "ریسک عملیاتی IMS", watch: "پایش", gate: "دروازه", cash: "نقدینگی", other: "سایر" };
var BPRI = { high: ["فوری", "p1"], normal: ["عادی", "p3"], low: ["کم‌اهمیت", ""] };
var BCOL = [["todo", "برنامه"], ["doing", "در اجرا"], ["done", "انجام شد"]];
/* داده همان A.rtasks است که loadRisks (risks.js) می‌خواند */
function bOpen(t) { return t.status === "todo" || t.status === "doing"; }
function bLate(t) { return bOpen(t) && t.due_date && t.due_date < todayIso(); }
function isoPlus(n) { return new Date(Date.now() + n * 864e5).toISOString().slice(0, 10); }
function isoToJ(iso) { if (!iso) return ""; var j = isoToJalali(iso); return toFa(j.jy) + "/" + toFa(pad(j.jm)) + "/" + toFa(pad(j.jd)); }
async function sendToBoard(o) {
  if (!A.admin) { toast("فقط مدیر می‌تواند به تختهٔ کارها بفرستد."); return; }
  var t = prompt("عنوان کار" + (o.ref_label ? " (برای «" + o.ref_label + "»)" : "") + ":", o.title || ""); if (!t || !t.trim()) return;
  var dd = prompt("مهلت چند روز دیگر؟", "۷"); if (dd === null) return;
  var row = { title: t.trim(), source: o.source || "manual", ref_label: o.ref_label || null, risk_id: o.risk_id || null, priority: o.priority || "normal",
    due_date: isoPlus(Math.max(0, Math.round(num(dd) || 7))), created_by: String(A.me.email).toLowerCase() };
  var r = await db.from("exec_tasks").insert(row); if (r.error) { toast(r.error.message); return; }
  await loadRisks(); render(); toast("به تختهٔ کارهای شما رفت.");
}
function bCard(t) {
  var rk = t.risk_id && (A.risks || []).filter(function (x) { return x.id === t.risk_id; })[0], late = bLate(t), p = BPRI[t.priority] || BPRI.normal;
  var ref = rk ? rk.title : t.ref_label;
  if (A.bEdit === t.id) return '<div class="bcard" style="border-color:var(--deep)"><input id="be_t" value="' + esc(t.title) + '"><textarea id="be_d" placeholder="شرح">' + esc(t.description || "") + '</textarea>' +
    '<div style="display:flex;gap:6px"><input id="be_due" value="' + isoToJ(t.due_date) + '" placeholder="مهلت" inputmode="numeric"><select id="be_p">' + Object.keys(BPRI).map(function (k) { return '<option value="' + k + '"' + (t.priority === k ? " selected" : "") + '>' + BPRI[k][0] + '</option>'; }).join("") + '</select></div>' +
    '<div style="display:flex;gap:6px;justify-content:space-between"><button class="btn sm" id="be_s" data-id="' + t.id + '">ذخیره</button><button class="more" id="be_x">انصراف</button><button class="more" id="be_del" data-id="' + t.id + '" style="color:var(--rose)">حذف</button></div></div>';
  return '<div class="bcard' + (late ? ' late' : '') + '"><div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start"><b style="flex:1' + (t.status === "done" || t.status === "cancelled" ? ';color:var(--muted);text-decoration:line-through' : '') + '">' + esc(t.title) + '</b>' + (t.priority === "high" || t.priority === "low" ? '<span class="pill ' + p[1] + '">' + p[0] + '</span>' : '') + '</div>' +
    (ref ? '<div class="hint" style="margin-top:4px">' + (BSRC[t.source] || (t.risk_id ? "ریسک" : "مرتبط")) + ': ' + esc(ref) + '</div>' : '') +
    (t.description ? '<div class="hint" style="margin-top:4px">' + esc(t.description) + '</div>' : '') +
    (t.result_note ? '<div class="hint" style="margin-top:4px">✓ ' + esc(t.result_note) + '</div>' : '') +
    '<div style="display:flex;justify-content:space-between;gap:6px;align-items:center;margin-top:8px"><span style="font-size:.78rem' + (late ? ';color:var(--rose);font-weight:800' : '') + '">' + (t.due_date ? jd(t.due_date) : "بی‌مهلت") + (late ? " · عقب" : "") + '</span>' +
    '<span style="display:flex;gap:6px"><select data-tst="' + t.id + '" style="min-width:92px">' + Object.keys(TST).map(function (k) { return '<option value="' + k + '"' + (t.status === k ? " selected" : "") + '>' + TST[k] + '</option>'; }).join("") + '</select><button class="more" data-bedit="' + t.id + '">ویرایش</button></span></div></div>';
}
function pBoard() {
  if (!A.admin) return '<div class="gap">این تخته فقط برای مدیر داشبورد است.</div>';
  var L = A.rtasks || [], f = A.bFilter || "", show = L.filter(function (t) { return !f || t.source === f; });
  var open = L.filter(bOpen), late = open.filter(bLate), week = open.filter(function (t) { return t.due_date && t.due_date >= todayIso() && t.due_date <= isoPlus(7); });
  var h = '<div class="grid g3" style="margin-bottom:14px">' + kpi("کارهای باز", toFa(open.length), "کار", toFa(open.filter(function (t) { return t.status === "doing"; }).length) + " در اجرا", "", "▤") +
    kpi("عقب‌افتاده", toFa(late.length), "کار", late.length ? "مهلت گذشته" : "همه در مهلت", late.length ? "neg" : "pos", "!") + kpi("مهلت این هفته", toFa(week.length), "کار", "۷ روز آینده", week.length ? "warn" : "", "◷") + '</div>';
  var srcs = Object.keys(BSRC).filter(function (k) { return L.some(function (t) { return t.source === k; }); });
  if (srcs.length > 1) h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">' + [""].concat(srcs).map(function (k) { return '<button class="pill-btn" data-bf="' + k + '"' + (f === k ? ' style="background:var(--deep);color:#fff;border-color:var(--deep)"' : '') + '>' + (k ? BSRC[k] : "همه") + '</button>'; }).join("") + '</div>';
  h += '<div class="bboard">' + BCOL.map(function (c) { var C = show.filter(function (t) { return t.status === c[0]; });
    if (c[0] === "done") C = C.sort(function (a, b) { return String(b.done_at || "").localeCompare(String(a.done_at || "")); }).slice(0, 15);
    else C = C.sort(function (a, b) { var pa = a.priority === "high" ? 0 : a.priority === "low" ? 2 : 1, pb = b.priority === "high" ? 0 : b.priority === "low" ? 2 : 1; return pa - pb || String(a.due_date || "9").localeCompare(String(b.due_date || "9")); });
    return '<div class="bcol"><div class="bch">' + c[1] + ' <span class="hint">(' + toFa(C.length) + ')</span></div>' + (C.length ? C.map(bCard).join("") : '<p class="hint" style="padding:8px">—</p>') + '</div>'; }).join("") + '</div>';
  var canc = show.filter(function (t) { return t.status === "cancelled"; }).length; if (canc) h += '<p class="hint">' + toFa(canc) + ' کار لغوشده پنهان است.</p>';
  h += '<div class="card" style="margin:14px 0"><div class="chead"><div><h3>کار تازه</h3><p class="hint">از صفحه‌های «ریسک‌ها و ذخایر» و «پایش ۱۹ بُعد» هم با دکمهٔ «→ تخته» می‌شود کار فرستاد. کارهای تیم و فرایندها در <a href="../ims/">IMS</a> می‌مانند.</p></div></div><div class="frm">' +
    '<div style="grid-column:1/-1"><label>عنوان</label><input id="bn_t" placeholder="مثلاً پیگیری مفاصا حساب سازندهٔ آسیاب"></div>' +
    '<div><label>مهلت</label><input id="bn_due" value="' + isoToJ(isoPlus(7)) + '" inputmode="numeric"></div><div><label>اولویت</label><select id="bn_p">' + Object.keys(BPRI).map(function (k) { return '<option value="' + k + '"' + (k === "normal" ? " selected" : "") + '>' + BPRI[k][0] + '</option>'; }).join("") + '</select></div>' +
    '<div><label>مربوط به ریسک</label><select id="bn_r"><option value="">—</option>' + (A.risks || []).filter(riskOpen).map(function (x) { return '<option value="' + x.id + '">' + esc(x.title) + '</option>'; }).join("") + '</select></div>' +
    '<div style="grid-column:1/-1"><label>شرح</label><textarea id="bn_d" style="width:100%;min-height:56px;box-sizing:border-box"></textarea></div></div><button class="btn sm" id="bnAdd">افزودن</button></div>';
  return h;
}
var _bindPlanB = bindPlan;
bindPlan = function () {
  _bindPlanB();
  Array.prototype.forEach.call(document.querySelectorAll("[data-send]"), function (b) { b.onclick = function () { try { sendToBoard(JSON.parse(b.dataset.send)); } catch (e) { toast("خطا در ارسال"); } }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-bf]"), function (b) { b.onclick = function () { A.bFilter = b.dataset.bf; render(); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-bedit]"), function (b) { b.onclick = function () { A.bEdit = +b.dataset.bedit; render(); }; });
  if ($("be_x")) $("be_x").onclick = function () { A.bEdit = null; render(); };
  if ($("be_s")) $("be_s").onclick = async function () { var d = $("be_due").value.trim(), iso = d ? parseJ(d) : null; if (d && !iso) { toast("تاریخ درست نیست (مثل ۱۴۰۵/۰۹/۱۰)"); return; }
    var t = $("be_t").value.trim(); if (!t) { toast("عنوان خالی است."); return; }
    var r = await db.from("exec_tasks").update({ title: t, description: $("be_d").value.trim() || null, due_date: iso, priority: $("be_p").value }).eq("id", +$("be_s").dataset.id); if (r.error) { toast(r.error.message); return; }
    A.bEdit = null; await loadRisks(); render(); toast("ذخیره شد."); };
  if ($("be_del")) $("be_del").onclick = async function () { if (!confirm("این کار حذف شود؟ (برای نگه‌داشتن سابقه، «لغو» بهتر است)")) return;
    var r = await db.from("exec_tasks").delete().eq("id", +$("be_del").dataset.id); if (r.error) { toast(r.error.message); return; } A.bEdit = null; await loadRisks(); render(); toast("حذف شد."); };
  if ($("bnAdd")) $("bnAdd").onclick = async function () { var t = $("bn_t").value.trim(); if (!t) { toast("عنوان را بنویسید."); return; }
    var d = $("bn_due").value.trim(), iso = d ? parseJ(d) : null; if (d && !iso) { toast("تاریخ درست نیست (مثل ۱۴۰۵/۰۹/۱۰)"); return; }
    var rid = $("bn_r").value ? +$("bn_r").value : null;
    var r = await db.from("exec_tasks").insert({ title: t, description: $("bn_d").value.trim() || null, due_date: iso, priority: $("bn_p").value, risk_id: rid, source: rid ? "risk" : "manual", created_by: String(A.me.email).toLowerCase() });
    if (r.error) { toast(r.error.message); return; } await loadRisks(); render(); toast("کار اضافه شد."); };
};
EXTRA_PAGES.board = pBoard;
