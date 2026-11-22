/* ریسک‌ها و ذخایر — نمای مالی ثبت‌نامهٔ ریسک سیستم مدیریت یکپارچه (ims_risks)
   - مبلغ در معرض خطر، احتمال و ذخیرهٔ تصویب‌شده برای ریسک‌های حقوقی، مالیاتی، تأمین اجتماعی و مالی
   - سناریوی «اگر مطالبه شود»: اثر پرداخت در ماه احتمالی روی کمترین نقد و دورهٔ بازگشت سرمایه
   - ذخایر تصویب‌شده از نقد آزاد «تخصیص مازاد نقد» کم می‌شوند تا آن پول سرمایه‌گذاری نشود.
   ویرایش کامل هر ریسک در سیستم مدیریت یکپارچه انجام می‌شود؛ این صفحه همان داده را نشان می‌دهد. */

PAGES.splice(PAGES.findIndex(function (p) { return p.k === "treasury"; }) + 1, 0,
  { k: "risks", g: "fin", t: "ریسک‌ها و ذخایر", ic: "alert", h: "مبلغ در معرض خطر، زیان مورد انتظار، ذخیره و اثر مطالبه روی نقد و بازگشت سرمایه" });
var RA = { operational: "عملیاتی", legal: "حقوقی و قراردادی", tax_insurance: "مالیات و تأمین اجتماعی", financial: "مالی", market: "بازار", strategic: "راهبردی" };
var RST = { open: "باز", treating: "در حال اقدام", controlled: "کنترل‌شده", closed: "بسته" };
var _loadPlanR = loadPlan;
loadPlan = async function () { await _loadPlanR(); await loadRisks(); };
async function loadRisks() { var r = await db.from("ims_risks").select("*").order("id", { ascending: false }).limit(2000); A.risks = r.data || []; }
function riskOpen(x) { return x.status !== "closed"; }
function finRisks() { return (A.risks || []).filter(function (x) { return riskOpen(x) && (+x.exposure > 0 || ["legal", "tax_insurance", "financial"].indexOf(x.area) >= 0); }); }
function provTotal() { return (A.risks || []).filter(riskOpen).reduce(function (s, x) { return s + (+x.provision || 0); }, 0); }
function expLoss(x) { return +x.exposure > 0 && x.probability !== null && x.probability !== undefined ? +x.exposure * (+x.probability) / 100 : null; }
function extE() {
  var HN = Math.max(+S.g.horizon || 24, 60), ck = JSON.stringify([S.g, A.calc.R.totNet, HN]);
  if (!A._trR || A._trR.key !== ck) { var R0 = simulate(null, HN); A._trR = { key: ck, R: R0, E: equity(R0) }; }
  return A._trR.E;
}
function whatIf(list) {
  var E = extE(), N = E.cum.length - 1, base = E.cum.slice(), hit = E.cum.slice(), add = new Array(N + 1).fill(0);
  list.forEach(function (x) { var m = Math.min(N, Math.max(1, +x.claim_month || 12)); add[m] += +x.exposure || 0; });
  var run = 0; for (var t = 0; t <= N; t++) { run += add[t]; hit[t] = base[t] - run; }
  function pb(c) { if (c[0] >= 0) return 0; for (var t = 1; t <= N; t++) if (c[t] >= 0 && c[t - 1] < 0) return (t - 1) + (-c[t - 1]) / (c[t] - c[t - 1]); return null; }
  function mn(c) { var v = Infinity, i = 1; c.forEach(function (x, k) { if (k > 0 && x < v) { v = x; i = k; } }); return { v: v, m: i }; }
  return { N: N, base: base, hit: hit, pb0: pb(base), pb1: pb(hit), mn0: mn(base), mn1: mn(hit), total: run };
}
function pRisks() {
  var F = finRisks(), all = (A.risks || []).filter(riskOpen), ex = 0, el = 0, pv = provTotal(), missing = 0;
  F.forEach(function (x) { ex += +x.exposure || 0; var e = expLoss(x); if (e !== null) el += e; if (!(+x.exposure > 0)) missing++; });
  var gap = el - pv;
  var h = '<div class="grid g4" style="margin-bottom:14px">' + kpi("مبلغ در معرض خطر", fmtB(ex), uN(), toFa(F.length) + " ریسک مالی، حقوقی و مالیاتی باز", ex ? "warn" : "", "!") +
    kpi("زیان مورد انتظار", fmtB(el), uN(), "مبلغ × احتمال", "", "≈") + kpi("ذخیرهٔ تصویب‌شده", fmtB(pv), uN(), "از نقد آزاد کنار گذاشته می‌شود", "", "▣") +
    kpi("کسری ذخیره", fmtB(Math.max(0, gap)), uN(), gap > 0 ? "ذخیره کمتر از زیان مورد انتظار" : "ذخیره کافی است", gap > 0 ? "neg" : "pos", "Δ") + '</div>';
  if (missing) h += '<div class="gap">' + toFa(missing) + ' ریسک مالی یا حقوقی هنوز مبلغ در معرض خطر ندارد. تا مبلغ و احتمال وارد نشود، ذخیره و اثرش روی نقد قابل حساب نیست.</div>';
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>ریسک‌های مالی، حقوقی و مالیاتی</h3><p class="hint">ذخیره را همین‌جا تصویب کنید؛ بقیهٔ جزئیات و اقدام‌ها در سیستم مدیریت یکپارچه.</p></div><a class="more" href="../ims/">باز کردن در IMS</a></div><div class="scroll"><table><thead><tr><th>ریسک</th><th>حوزه</th><th>طرف حساب / قرارداد</th><th class="num">در معرض خطر</th><th class="num">احتمال</th><th class="num">زیان مورد انتظار</th><th class="num">ذخیرهٔ تصویب‌شده</th><th class="num">ماه مطالبه</th><th>وضعیت</th><th>بازنگری</th></tr></thead><tbody>' +
    (F.length ? F.sort(function (a, b) { return (+b.exposure || 0) - (+a.exposure || 0); }).map(function (x) { var pp = typeof partyById === "function" ? partyById(x.party_id) : null, e = expLoss(x), od = x.review_date && x.review_date < todayIso(), ro = A.admin ? "" : " disabled";
      return '<tr><td><b>' + esc(x.title) + '</b>' + (x.provision_note ? '<br><span class="hint">' + esc(x.provision_note) + '</span>' : '') + '</td><td>' + (RA[x.area] || "—") + '</td><td>' + esc(pp ? pp.name : "—") + (x.contract_ref ? '<br><span class="hint">' + esc(x.contract_ref) + '</span>' : '') + '</td>' +
        '<td class="num"><input class="money" data-rk="' + x.id + '" data-f="exposure" value="' + (x.exposure ? fmt(x.exposure) : "") + '" placeholder="وارد کنید" style="width:130px"' + ro + '></td>' +
        '<td class="num"><input class="money" data-rk="' + x.id + '" data-f="probability" value="' + (x.probability !== null && x.probability !== undefined ? toFa(x.probability) : "") + '" placeholder="٪" style="width:70px"' + ro + '></td>' +
        '<td class="num">' + (e !== null ? fmt(e) : "—") + '</td>' +
        '<td class="num"><input class="money" data-rk="' + x.id + '" data-f="provision" value="' + (x.provision ? fmt(x.provision) : "") + '" placeholder="' + (e !== null ? "پیشنهاد: " + fmt(e) : "") + '" style="width:130px"' + ro + '></td>' +
        '<td class="num"><input class="money" data-rk="' + x.id + '" data-f="claim_month" value="' + (x.claim_month ? toFa(x.claim_month) : "") + '" placeholder="۱۲" style="width:60px"' + ro + '></td>' +
        '<td>' + RST[x.status] + '</td><td' + (od ? ' style="color:var(--rose)"' : '') + '>' + jd(x.review_date) + '</td></tr>'; }).join("") : '<tr><td colspan="10" class="mid" style="color:var(--muted)">ریسک مالی یا حقوقی بازی ثبت نشده.</td></tr>') + '</tbody></table></div></div>';
  /* سناریوی مطالبه */
  var withAmt = F.filter(function (x) { return +x.exposure > 0; });
  if (withAmt.length) { var w = whatIf(withAmt), hz = +S.g.horizon || 24;
    h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>اگر همهٔ این ریسک‌ها مطالبه شوند</h3><p class="hint">پرداخت کامل مبلغ در معرض خطر هر ریسک در «ماه مطالبه» (پیش‌فرض ماه ۱۲)، روی جریان نقد سهامدار مدل</p></div></div>' +
      '<div class="grid g3" style="margin-bottom:10px">' + kpi("کل پرداخت احتمالی", fmtB(w.total), uN(), "", "neg", "−") +
      kpi("بازگشت سرمایه", w.pb1 === null ? "بیش از " + toFa(w.N) : NF1.format(w.pb1), "ماه", "بدون مطالبه: " + (w.pb0 === null ? "—" : NF1.format(w.pb0) + " ماه"), w.pb1 === null || (w.pb0 !== null && w.pb1 > w.pb0 + 1) ? "warn" : "", "↺") +
      kpi("کمترین نقد تجمعی", fmtB(w.mn1.v), uN(), "ماه " + toFa(w.mn1.m) + " · بدون مطالبه: " + fmtB(w.mn0.v), "", "▼") + '</div>' +
      lineChart([{ n: "بدون مطالبه", c: "var(--muted)", v: w.base.slice(1, Math.max(hz, 36) + 1) }, { n: "با مطالبه", c: "var(--rose)", v: w.hit.slice(1, Math.max(hz, 36) + 1) }], { x0: 1 }) + '</div>'; }
  /* ثبت سریع */
  if (A.admin) h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>ثبت ریسک مالی یا حقوقی تازه</h3><p class="hint">جزئیات بیشتر (علت، پیامد، کنترل‌ها، اقدام‌ها) را بعداً در سیستم مدیریت یکپارچه تکمیل کنید.</p></div></div><div class="frm">' +
    '<div style="grid-column:1/-1"><label>عنوان</label><input id="rk_t" placeholder="مثلاً احتمال جریمهٔ مالیات بر ارزش افزوده سال ۱۴۰۴"></div><div><label>حوزه</label><select id="rk_a">' + ["tax_insurance", "legal", "financial", "market", "strategic", "operational"].map(function (k) { return '<option value="' + k + '">' + RA[k] + '</option>'; }).join("") + '</select></div>' +
    '<div><label>طرف حساب</label>' + (typeof partySel === "function" ? partySel("rk_p", "supplier", true) : '') + '</div><div><label>قرارداد</label><input id="rk_c"></div>' +
    '<div><label>مبلغ در معرض خطر</label><input id="rk_e" class="money"></div><div><label>احتمال (٪)</label><input id="rk_pr" class="money"></div><div><label>ماه احتمالی مطالبه</label><input id="rk_m" class="money" placeholder="۱۲"></div></div><button class="btn sm" id="rkAdd">ثبت</button></div>';
  /* ریسک‌های عملیاتی بالا */
  var top = all.filter(function (x) { return F.indexOf(x) < 0 && x.score >= 12; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 8);
  if (top.length) h += '<div class="card"><div class="chead"><div><h3>ریسک‌ها و خطرهای عملیاتی بالا</h3><p class="hint">از ثبت‌نامهٔ IMS، سطح ۱۲ به بالا</p></div></div><table><thead><tr><th>عنوان</th><th class="num">سطح</th><th>وضعیت</th></tr></thead><tbody>' +
    top.map(function (x) { return '<tr><td>' + esc(x.title) + '</td><td class="num"><b>' + toFa(x.score) + '</b></td><td>' + RST[x.status] + '</td></tr>'; }).join("") + '</tbody></table></div>';
  return h;
}
var _bindPlanR = bindPlan;
bindPlan = function () {
  _bindPlanR();
  Array.prototype.forEach.call(document.querySelectorAll("[data-rk]"), function (el) { el.onchange = async function () {
    var f = el.dataset.f, v = el.value.trim() === "" ? null : num(el.value); if (v !== null && (f === "exposure" || f === "provision")) v = v / um();
    if (f === "probability" && v !== null && (v < 0 || v > 100)) { toast("احتمال بین ۰ تا ۱۰۰ باشد."); return; }
    var o = {}; o[f] = f === "claim_month" && v !== null ? Math.max(1, Math.round(v)) : v;
    var r = await db.from("ims_risks").update(o).eq("id", +el.dataset.rk); if (r.error) { toast(r.error.message); return; } await loadRisks(); render(); toast("ثبت شد."); }; });
  if ($("rkAdd")) $("rkAdd").onclick = async function () {
    var t = $("rk_t").value.trim(); if (!t) { toast("عنوان را بنویسید."); return; }
    var pv = $("rk_p") ? $("rk_p").value : "", o = { kind: "risk", area: $("rk_a").value, title: t, standards: ["Q"], likelihood: 3, severity: 3, status: "open", legal_related: ["legal", "tax_insurance"].indexOf($("rk_a").value) >= 0,
      party_id: pv && pv !== "__new" ? pv : null, contract_ref: $("rk_c").value.trim() || null, exposure: $("rk_e").value.trim() ? num($("rk_e").value) / um() : null, probability: $("rk_pr").value.trim() ? num($("rk_pr").value) : null,
      claim_month: $("rk_m").value.trim() ? Math.round(num($("rk_m").value)) : null, owner_email: A.me ? String(A.me.email).toLowerCase() : null, created_by: A.me ? String(A.me.email).toLowerCase() : null, review_date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) };
    var r = await db.from("ims_risks").insert(o); if (r.error) { toast(r.error.message); return; } await loadRisks(); render(); toast("ریسک ثبت شد.");
  };
};
EXTRA_PAGES.risks = pRisks;
