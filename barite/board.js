/* تختهٔ کارهای مدیرعامل (exec_tasks) — فقط برای مدیر داشبورد تصمیم، جدا از تختهٔ کارهای IMS
   هر صفحه می‌تواند با sendToBoard({ title, source, ref_label, risk_id }) کاری به این تخته بفرستد:
   ریسک‌ها و ذخایر، ریسک‌های عملیاتی بالای IMS، پایش ۱۹ بُعد. */

PAGES.splice(PAGES.findIndex(function (p) { return p.k === "home"; }) + 1, 0,
  { k: "board", g: "over", t: "تختهٔ کارهای من", ic: "list", h: "کارهای پیگیری مدیرعامل؛ از ریسک‌ها، پایش و هر جای داشبورد" });
var BSRC = { manual: "دستی", risk: "ریسک", ims_risk: "ریسک عملیاتی IMS", watch: "پایش", gate: "دروازه", cash: "نقدینگی", other: "سایر" };
var BPRI = { high: ["فوری", "p1"], normal: ["عادی", "p3"], low: ["کم‌اهمیت", ""] };
var BCOL = [["todo", "برنامه"], ["doing", "در اجرا"], ["done", "انجام شد"]];
function bPri(t) { return t.priority === "high" ? 0 : t.priority === "low" ? 2 : 1; }
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
  if (A.bEdit === t.id) return '<div class="bcard s-' + t.status + '" style="outline:2px solid var(--deep)"><input id="be_t" value="' + esc(t.title) + '"><textarea id="be_d" placeholder="شرح">' + esc(t.description || "") + '</textarea>' + (t.status === "done" ? '<input id="be_n" placeholder="نتیجه یا شاهد انجام" value="' + esc(t.result_note || "") + '">' : '') +
    '<div style="display:flex;gap:6px"><input id="be_due" value="' + isoToJ(t.due_date) + '" placeholder="مهلت" inputmode="numeric"><select id="be_p">' + Object.keys(BPRI).map(function (k) { return '<option value="' + k + '"' + (t.priority === k ? " selected" : "") + '>' + BPRI[k][0] + '</option>'; }).join("") + '</select></div>' +
    '<div style="display:flex;gap:6px;justify-content:space-between"><button class="btn sm" id="be_s" data-id="' + t.id + '">ذخیره</button><button class="more" id="be_x">انصراف</button><button class="more" id="be_del" data-id="' + t.id + '" style="color:var(--rose)">حذف</button></div></div>';
  return '<div class="bcard s-' + t.status + (late ? ' late' : '') + '" data-bid="' + t.id + '"><div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start"><b style="flex:1' + (t.status === "done" || t.status === "cancelled" ? ';color:var(--muted);text-decoration:line-through' : '') + '">' + esc(t.title) + '</b>' + (t.priority === "high" || t.priority === "low" ? '<span class="pill ' + p[1] + '">' + p[0] + '</span>' : '') + '</div>' +
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
  h += '<p class="hint" style="margin:0 0 8px">کارت‌ها را بکشید و در ستون دیگر رها کنید؛ روی گوشی کارت را کمی نگه دارید تا جابه‌جا شود.</p><div class="bboard" id="bboard">' + BCOL.map(function (c) { var C = show.filter(function (t) { return t.status === c[0]; });
    if (c[0] === "done") C = C.sort(function (a, b) { return (a.sort || 0) - (b.sort || 0) || String(b.done_at || "").localeCompare(String(a.done_at || "")); }).slice(0, 20);
    else C = C.sort(function (a, b) { return (a.sort || 0) - (b.sort || 0) || bPri(a) - bPri(b) || String(a.due_date || "9").localeCompare(String(b.due_date || "9")); });
    return '<div class="bcol c-' + c[0] + '" data-col="' + c[0] + '"><div class="bch"><i></i>' + c[1] + '<span class="bcnt">' + toFa(C.length) + '</span></div><div class="blist">' + C.map(bCard).join("") + '</div></div>'; }).join("") + '</div>';
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
    var r = await db.from("exec_tasks").update({ title: t, description: $("be_d").value.trim() || null, result_note: $("be_n") ? ($("be_n").value.trim() || null) : undefined, due_date: iso, priority: $("be_p").value }).eq("id", +$("be_s").dataset.id); if (r.error) { toast(r.error.message); return; }
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

/* ---------- کشیدن و رها کردن کارت‌ها (موس، لمس و قلم) ---------- */
(function () {
  var D = null, HOLD = 260;
  function cardAt(e) { var el = e.target; if (el.closest("select,button,input,textarea,a")) return null; return el.closest(".bcard[data-bid]"); }
  function colAt(x, y) { var el = document.elementFromPoint(x, y); return el && el.closest ? el.closest(".bcol") : null; }
  function start() {
    var c = D.card, r = c.getBoundingClientRect(), g = c.cloneNode(true);
    g.className += " bghost"; g.style.width = r.width + "px"; g.style.left = r.left + "px"; g.style.top = r.top + "px"; document.body.appendChild(g);
    var ph = document.createElement("div"); ph.className = "bph"; ph.style.height = r.height + "px"; c.parentNode.insertBefore(ph, c); c.style.display = "none";
    D.g = g; D.ph = ph; D.dx = D.x0 - r.left; D.dy = D.y0 - r.top; D.on = true; document.body.classList.add("bdragging");
    if (navigator.vibrate && D.touch) try { navigator.vibrate(15); } catch (e) {}
  }
  function move(x, y) {
    D.g.style.left = (x - D.dx) + "px"; D.g.style.top = (y - D.dy) + "px";
    var col = colAt(x, y); Array.prototype.forEach.call(document.querySelectorAll(".bcol.over"), function (o) { if (o !== col) o.classList.remove("over"); });
    if (col) { col.classList.add("over"); D.g.className = D.g.className.replace(/\bs-\w+/, "s-" + col.dataset.col);
      var list = col.querySelector(".blist"), cards = Array.prototype.filter.call(list.children, function (k) { return k.classList.contains("bcard") && k.style.display !== "none"; }), before = null;
      for (var i = 0; i < cards.length; i++) { var b = cards[i].getBoundingClientRect(); if (y < b.top + b.height / 2) { before = cards[i]; break; } }
      if (before) { if (D.ph.nextSibling !== before) list.insertBefore(D.ph, before); } else if (D.ph.parentNode !== list || D.ph.nextSibling) list.appendChild(D.ph); }
    var vh = window.innerHeight; if (y < 70) window.scrollBy(0, -14); else if (y > vh - 70) window.scrollBy(0, 14);
  }
  async function drop() {
    var list = D.ph.parentNode, col = list.closest(".bcol").dataset.col, id = +D.card.dataset.bid;
    list.insertBefore(D.card, D.ph); D.card.style.display = ""; D.ph.remove(); D.g.remove(); document.body.classList.remove("bdragging");
    Array.prototype.forEach.call(document.querySelectorAll(".bcol.over"), function (o) { o.classList.remove("over"); });
    var t = (A.rtasks || []).filter(function (x) { return x.id === id; })[0]; if (!t) return;
    var ids = Array.prototype.map.call(list.querySelectorAll(".bcard[data-bid]"), function (k) { return +k.dataset.bid; }), ups = [], from = t.status;
    if (from !== col) { t.status = col; if (col === "done") t.done_at = new Date().toISOString(); }
    ids.forEach(function (bid, i) { var x = (A.rtasks || []).filter(function (y) { return y.id === bid; })[0]; if (!x) return; var o = {};
      if ((x.sort || 0) !== (i + 1) * 10) { x.sort = (i + 1) * 10; o.sort = x.sort; } if (bid === id && from !== col) o.status = col;
      if (Object.keys(o).length) ups.push(db.from("exec_tasks").update(o).eq("id", bid)); });
    render();
    var rs = await Promise.all(ups), bad = rs.filter(function (r) { return r && r.error; })[0];
    if (bad) { toast("ثبت نشد: " + bad.error.message); await loadRisks(); render(); return; }
    if (from !== col) toast("«" + t.title + "» → " + TST[col]);
  }
  function end() { if (D && D.timer) clearTimeout(D.timer); var d = D; D = null; return d; }
  document.addEventListener("pointerdown", function (e) {
    if (A.page !== "board" || e.button > 0) return; var c = cardAt(e); if (!c) return;
    D = { card: c, x0: e.clientX, y0: e.clientY, touch: e.pointerType !== "mouse", on: false };
    if (D.touch) D.timer = setTimeout(function () { if (D && !D.on) start(); }, HOLD);
  });
  document.addEventListener("pointermove", function (e) {
    if (!D) return; var dist = Math.abs(e.clientX - D.x0) + Math.abs(e.clientY - D.y0);
    if (!D.on) { if (D.touch) { if (dist > 10) end(); return; } if (dist < 6) return; start(); }
    e.preventDefault(); move(e.clientX, e.clientY);
  });
  document.addEventListener("touchmove", function (e) { if (D && D.on) e.preventDefault(); }, { passive: false });
  document.addEventListener("pointerup", function () { var d = end(); if (d && d.on) { D = d; drop(); D = null; } });
  document.addEventListener("pointercancel", function () { var d = end(); if (d && d.on) { D = d; drop(); D = null; } });
  document.addEventListener("contextmenu", function (e) { if (D && D.on) e.preventDefault(); });
})();
