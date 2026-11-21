/* بهای تمام‌شدهٔ واقعی و BOM تولید
   - هر ثبت تولید می‌تواند از چند منبع خوراک (معدن، بورس، انبار) با قیمت‌های مختلف تغذیه شود؛ بهای هر خط با میانگین موزون
     «قیمت تحویل در کارخانه» آن منبع تا تاریخ تولید حساب و همان لحظه ثبت می‌شود تا بعداً با خرید تازه عوض نشود.
   - مصرف مواد (کیسه، برق، گازوئیل، قطعات سایشی…) در برابر استاندارد هر تن (BOM) سنجیده می‌شود.
   - هزینه‌های تبدیل از «هزینه‌ها»ی واقعی ماه می‌آید (بدون ثبت دوباره) و طبق دسته به بهای ساخت، فروش یا اداری تخصیص می‌یابد.
   - فروش باطله و ریزدانه به‌عنوان محصول فرعی از بهای ساخت کسر می‌شود؛ هزینهٔ تولید خارج از مشخصه روی پودر سالم می‌نشیند.
   به app.js، plan.js، extra.js و engine.js تکیه دارد. */

PAGES.splice(PAGES.findIndex(function (p) { return p.k === "oee"; }) + 1, 0,
  { k: "cost", g: "ops", t: "بهای تمام‌شدهٔ واقعی", ic: "tag", h: "بهای هر تن پودر از خوراک چندمنبعی، مواد، تبدیل و استهلاک؛ مقایسهٔ معادن" });
/* داده‌ها در loadCost پر می‌شوند (A در app.js تعریف می‌شود) */
var CAT_KIND = { prod: "بهای ساخت", sell: "فروش و توزیع", admin: "اداری و دوره‌ای" };
var CI_KIND = { material: "مواد و بسته‌بندی", energy: "انرژی و سوخت", labor: "نیروی کار", maintenance: "نگهداری و قطعات", other: "سایر" };
var CI_SUG = [["کیسهٔ ۵۰ کیلویی", "material", "عدد", 20, "بسته‌بندی"], ["جامبوبگ", "material", "عدد", null, "بسته‌بندی"], ["برق آسیاب و سنگ‌شکن", "energy", "کیلووات‌ساعت", null, "برق و انرژی"],
  ["گازوئیل لودر و لیفتراک", "energy", "لیتر", null, "برق و انرژی"], ["نیروی کار مستقیم", "labor", "نفر-ساعت", null, "حقوق و دستمزد"], ["قطعات سایشی آسیاب", "maintenance", "عدد/کیلو", null, "تعمیر و نگهداری"], ["روغن و گریس", "maintenance", "لیتر", null, "تعمیر و نگهداری"]];

var _loadPlanC = loadPlan;
loadPlan = async function () { await _loadPlanC(); await loadCost(); };
async function loadCost() {
  var r = await Promise.all([db.from("bf_prod_feed").select("*").limit(20000), db.from("bf_prod_mat").select("*").limit(20000), db.from("bf_cost_items").select("*").order("sort").order("id"), db.from("bf_cost_cfg").select("*")]);
  A.cfeed = r[0].data || []; A.cmat = r[1].data || []; A.citems = r[2].data || []; A.ccfg = {}; (r[3].data || []).forEach(function (x) { A.ccfg[x.key] = x.value; });
}
function catMap() { return A.ccfg.categories || {}; }
function depM() { return +A.ccfg.depreciation_month || 0; }

/* ---------- قیمت تحویل هر منبع ---------- */
function modelSrc(name) { var hit = null; TYPES.forEach(function (t) { (S[t] || []).forEach(function (s) { if (s.name === name) hit = { t: t, s: s }; }); }); return hit; }
function avgCost(src, d) {
  var P = A.purch.filter(function (p) { return p.source === src && +p.tons > 0; }), b = P.filter(function (p) { return !d || p.d <= d; });
  var L = b.length ? b : P;
  if (L.length) { var t = 0, a = 0; L.forEach(function (p) { t += +p.tons; a += (+p.amount || 0) + (+p.freight || 0); }); return { cost: a / t, from: b.length ? "خرید" : "خرید بعدی" }; }
  var m = modelSrc(src); if (m && m.t !== "fg") { var f = feedCost(m.t, m.s, S.g); return { cost: f.material + f.comm + f.vat + f.freight, from: "برآورد مدل" }; }
  return { cost: null, from: "نامشخص" };
}
function feedLines(r) {
  var L = A.cfeed.filter(function (l) { return l.production_id === r.id; });
  if (L.length) return L;
  return +r.feed_t > 0 ? [{ source: r.source || "نامشخص", tons: +r.feed_t, unit_cost: null, legacy: true }] : [];
}
function lineCost(l, d) { var c = l.unit_cost !== null && l.unit_cost !== undefined ? +l.unit_cost : avgCost(l.source, d).cost; return c === null ? null : c * +l.tons; }

/* ---------- محاسبهٔ ماهانه ---------- */
function costMonths() {
  var M = {}, cm = catMap(), dep = depM();
  function m(k) { return M[k] || (M[k] = { k: k, feedT: 0, prodT: 0, offT: 0, wasteT: 0, feedC: 0, unknown: 0, src: {}, cat: {}, conv: 0, sell: 0, admin: 0, dep: dep, credit: 0, salesT: 0, salesA: 0, mat: {}, matBaseT: 0 }); }
  A.prod.forEach(function (r) { var x = m(jkey(r.d));
    x.prodT += +r.product_t || 0; x.offT += +r.offspec_t || 0; x.wasteT += +r.waste_t || 0;
    feedLines(r).forEach(function (l) { x.feedT += +l.tons; var c = lineCost(l, r.d); var s = x.src[l.source] || (x.src[l.source] = { t: 0, c: 0 }); s.t += +l.tons; if (c === null) x.unknown += +l.tons; else { x.feedC += c; s.c += c; } });
    var mq = A.cmat.filter(function (q) { return q.production_id === r.id; }); if (mq.length) x.matBaseT += +r.product_t || 0;
    mq.forEach(function (q) { x.mat[q.item_id] = (x.mat[q.item_id] || 0) + (+q.qty || 0); }); });
  A.exp.forEach(function (e) { var x = m(jkey(e.d)), k = cm[e.category] || "prod", a = +e.amount || 0; x.cat[e.category] = (x.cat[e.category] || 0) + a; if (k === "prod") x.conv += a; else if (k === "sell") x.sell += a; else x.admin += a; });
  A.sales.forEach(function (s) { var x = m(jkey(s.d)); if (s.kind === "باطله") x.credit += +s.amount || 0; else { x.salesT += (+s.tons || 0) - (+s.returned_t || 0); x.salesA += +s.amount || 0; } });
  Object.keys(M).forEach(function (k) { var x = M[k]; x.good = x.prodT - x.offT; x.gross = x.feedC + x.conv + x.dep; x.manuf = x.gross - x.credit; x.full = x.manuf + x.sell + x.admin;
    x.unit = x.good > 0 ? x.manuf / x.good : null; x.unitAll = x.prodT > 0 ? x.manuf / x.prodT : null; x.unitFull = x.good > 0 ? x.full / x.good : null;
    x.feedPerT = x.good > 0 ? x.feedC / x.good : null; x.price = x.salesT > 0 ? x.salesA / x.salesT : null; x.rec = x.feedT > 0 ? x.prodT / x.feedT : null; });
  return M;
}
function planUnit() { var R = A.calc.R, c = 0, p = 0; R.rows.forEach(function (r) { c += (+r.cost || 0) + (+r.oh || 0); p += +r.prod || 0; }); return p > 0 ? c / p : null; }

/* ---------- مقایسهٔ منابع (معادن) ---------- */
function sourceStats() {
  var O = {};
  function o(n) { return O[n] || (O[n] = { n: n, buyT: 0, buyA: 0, gT: 0, gS: 0, sgT: 0, sgS: 0, useT: 0, domF: 0, domP: 0 }); }
  A.purch.forEach(function (p) { var x = o(p.source || "نامشخص"); x.buyT += +p.tons || 0; x.buyA += (+p.amount || 0) + (+p.freight || 0); if (+p.grade > 0) { x.gT += +p.tons; x.gS += +p.grade * +p.tons; } if (+p.sg > 0) { x.sgT += +p.tons; x.sgS += +p.sg * +p.tons; } });
  A.prod.forEach(function (r) { var L = feedLines(r), tot = 0; L.forEach(function (l) { tot += +l.tons; o(l.source).useT += +l.tons; });
    L.forEach(function (l) { if (tot > 0 && l.tons / tot >= 0.8) { var x = o(l.source); x.domF += tot; x.domP += +r.product_t || 0; } }); });
  return Object.keys(O).map(function (k) { var x = O[k], ac = avgCost(k, null), m = modelSrc(k);
    x.cost = ac.cost; x.from = ac.from; x.grade = x.gT ? x.gS / x.gT : null; x.sg = x.sgT ? x.sgS / x.sgT : null; x.rec = x.domF > 0 ? x.domP / x.domF : null;
    x.planRec = m && +m.s.rec > 0 ? +m.s.rec / 100 : null; var rr = x.rec || x.planRec;
    x.eff = x.cost !== null && rr ? x.cost / rr : null; x.effFrom = x.rec ? "بازیابی واقعی" : x.planRec ? "بازیابی مدل" : "";
    x.perBa = x.cost !== null && x.grade ? x.cost / (x.grade / 100) : null; x.stock = x.buyT - x.useT; return x; });
}

/* ---------- صفحهٔ بهای تمام‌شده ---------- */
function pCost() {
  var M = costMonths(), ks = Object.keys(M).map(Number).sort().reverse(), sel = A.costM && M[A.costM] ? A.costM : ks[0], x = sel ? M[sel] : null, pu = planUnit();
  var h = '';
  if (!x || (!x.prodT && !x.feedT)) h += '<div class="gap">هنوز تولیدی ثبت نشده. پس از ثبت تولید در «ثبت روزانه ‹ تولید» (با منابع خوراک و مصرف مواد)، بهای تمام‌شدهٔ هر ماه این‌جا ساخته می‌شود. تا آن زمان می‌توانید BOM استاندارد و تنظیمات را آماده کنید.</div>';
  if (x) {
    h += '<div class="flt" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"><select id="cM" style="width:auto">' + ks.map(function (k) { return '<option value="' + k + '"' + (k === sel ? " selected" : "") + '>' + jlabel(k) + '</option>'; }).join("") + '</select></div>';
    var vs = x.unit !== null && pu ? x.unit / pu - 1 : null;
    h += '<div class="grid g4" style="margin-bottom:14px">' +
      kpi("بهای ساخت هر تن پودر سالم", fmt(x.unit), uN(), pu ? "مدل: " + fmt(pu) + (vs !== null ? " · " + (vs > 0 ? "+" : "") + p1(vs) : "") : "", vs !== null ? (vs > 0.05 ? "neg" : vs < -0.02 ? "pos" : "") : "", "₪") +
      kpi("سهم خوراک", x.gross > 0 ? p1(x.feedC / x.gross) : "—", "", fmt(x.feedPerT) + " " + uN() + " در هر تن", "", "▤") +
      kpi("بهای کامل هر تن", fmt(x.unitFull), uN(), "با فروش و اداری", "", "Σ") +
      kpi("حاشیهٔ ناخالص هر تن", x.price !== null && x.unit !== null ? fmt(x.price - x.unit) : "—", uN(), x.price !== null ? "میانگین فروش " + fmt(x.price) : "فروش پودری ثبت نشده", x.price !== null && x.unit !== null && x.price < x.unit ? "neg" : "pos", "%") + '</div>';
    if (x.unknown > 0) h += '<div class="gap">' + tn(x.unknown) + ' تن خوراک این ماه منبعی بدون قیمت دارد (نه خرید ثبت‌شده، نه منبع هم‌نام در مدل). خریدش را در «خرید خوراک» ثبت کنید تا بها کامل شود.</div>';
    /* ساختار بها */
    var rows = [["خوراک", x.feedC, true]];
    Object.keys(x.cat).forEach(function (c) { if ((catMap()[c] || "prod") === "prod") rows.push([c, x.cat[c]]); });
    rows.push(["استهلاک ماهانه", x.dep]); if (x.credit) rows.push(["کسر: فروش باطله و ریزدانه (محصول فرعی)", -x.credit]);
    h += '<div class="grid g2" style="margin-bottom:14px"><div class="card"><div class="chead"><div><h3>ساختار بهای ساخت — ' + jlabel(sel) + '</h3><p class="hint">' + tn(x.prodT) + ' تن پودر (' + tn(x.offT) + ' خارج از مشخصه) از ' + tn(x.feedT) + ' تن خوراک · بازیابی ' + p1(x.rec) + '</p></div></div><table><thead><tr><th>جزء</th><th class="num">مبلغ</th><th class="num">هر تن سالم</th><th class="num">سهم</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="num' + (r[1] < 0 ? " neg" : "") + '">' + fmt(r[1]) + '</td><td class="num">' + (x.good > 0 ? fmt(r[1] / x.good) : "—") + '</td><td class="num">' + (x.gross > 0 && r[1] > 0 ? p1(r[1] / x.gross) : "—") + '</td></tr>'; }).join("") +
      '<tr class="tot"><td>بهای ساخت (خالص)</td><td class="num">' + fmt(x.manuf) + '</td><td class="num">' + fmt(x.unit) + '</td><td class="num"></td></tr>' +
      '<tr><td>فروش و توزیع</td><td class="num">' + fmt(x.sell) + '</td><td class="num">' + (x.good > 0 ? fmt(x.sell / x.good) : "—") + '</td><td></td></tr><tr><td>اداری و دوره‌ای</td><td class="num">' + fmt(x.admin) + '</td><td class="num">' + (x.good > 0 ? fmt(x.admin / x.good) : "—") + '</td><td></td></tr>' +
      '<tr class="tot"><td>بهای کامل</td><td class="num">' + fmt(x.full) + '</td><td class="num">' + fmt(x.unitFull) + '</td><td></td></tr></tbody></table>' +
      (x.offT > 0 && x.good > 0 ? '<p class="hint" style="margin-top:8px">هزینهٔ ' + tn(x.offT) + ' تن خارج از مشخصه روی پودر سالم نشسته: ' + fmt(x.manuf / x.good - x.manuf / x.prodT) + ' ' + uN() + ' در هر تن.</p>' : '') + '</div>';
    /* خوراک به تفکیک منبع */
    var sk = Object.keys(x.src);
    h += '<div class="card"><div class="chead"><div><h3>خوراک مصرفی به تفکیک منبع</h3><p class="hint">BOM خوراک این ماه</p></div></div><table><thead><tr><th>منبع</th><th class="num">تن</th><th class="num">سهم</th><th class="num">بهای هر تن</th><th class="num">مبلغ</th></tr></thead><tbody>' +
      (sk.length ? sk.map(function (s) { var v = x.src[s]; return '<tr><td>' + esc(s) + '</td><td class="num">' + tn(v.t) + '</td><td class="num">' + p1(x.feedT ? v.t / x.feedT : null) + '</td><td class="num">' + (v.t ? fmt(v.c / v.t) : "—") + '</td><td class="num">' + fmt(v.c) + '</td></tr>'; }).join("") : '<tr><td colspan="5" class="mid" style="color:var(--muted)">—</td></tr>') + '</tbody></table></div></div>';
    /* مصرف مواد در برابر استاندارد */
    var items = A.citems.filter(function (i) { return i.active; });
    if (items.length) h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>مصرف مواد در برابر استاندارد (BOM)</h3><p class="hint">مصرف استاندارد = مقدار هر تن × ' + tn(x.matBaseT) + ' تن پودرِ ثبت‌هایی که مصرف مواد دارند</p></div></div><div class="scroll"><table><thead><tr><th>قلم</th><th>واحد</th><th class="num">استاندارد هر تن</th><th class="num">مصرف استاندارد</th><th class="num">مصرف واقعی</th><th class="num">انحراف</th><th class="num">اثر ریالی انحراف</th></tr></thead><tbody>' +
      items.map(function (i) { var std = +i.std_per_t > 0 && x.matBaseT > 0 ? +i.std_per_t * x.matBaseT : null, act = x.mat[i.id] || 0, dv = std ? act / std - 1 : null, money = std !== null && +i.unit_cost > 0 ? (act - std) * +i.unit_cost : null;
        return '<tr><td>' + esc(i.name) + '</td><td>' + esc(i.unit || "") + '</td><td class="num">' + (i.std_per_t !== null ? NF2.format(i.std_per_t) : "—") + '</td><td class="num">' + (std !== null ? NF1.format(std) : "—") + '</td><td class="num">' + (act ? NF1.format(act) : "—") + '</td><td class="num' + (dv !== null && dv > 0.05 ? " neg" : "") + '">' + (dv !== null && act ? (dv > 0 ? "+" : "") + p1(dv) : "—") + '</td><td class="num' + (money > 0 ? " neg" : "") + '">' + (money !== null && act ? fmt(money) : "—") + '</td></tr>'; }).join("") + '</tbody></table></div><p class="hint" style="margin-top:8px">هزینهٔ این اقلام در بهای ساخت از «هزینه‌ها»ی واقعی ماه می‌آید؛ این جدول فقط مصرف را کنترل می‌کند تا هزینه دو بار حساب نشود.</p></div>';
  }
  /* روند ماهانه */
  if (ks.length) h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>روند بهای تمام‌شده</h3><p class="hint">' + (pu ? "بهای مدل امکان‌سنجی: " + fmt(pu) + " " + uN() + " در هر تن" : "") + '</p></div></div><div class="scroll"><table><thead><tr><th>ماه</th><th class="num">پودر سالم (تن)</th><th class="num">بازیابی</th><th class="num">خوراک هر تن</th><th class="num">تبدیل و استهلاک هر تن</th><th class="num">کسر محصول فرعی</th><th class="num">بهای ساخت هر تن</th><th class="num">بهای کامل هر تن</th><th class="num">قیمت فروش</th><th class="num">حاشیه</th></tr></thead><tbody>' +
    ks.slice(0, 12).map(function (k) { var y = M[k]; return '<tr><td>' + jlabel(k) + '</td><td class="num">' + tn(y.good) + '</td><td class="num">' + p1(y.rec) + '</td><td class="num">' + fmt(y.feedPerT) + '</td><td class="num">' + (y.good > 0 ? fmt((y.conv + y.dep) / y.good) : "—") + '</td><td class="num">' + (y.good > 0 && y.credit ? fmt(-y.credit / y.good) : "—") + '</td><td class="num">' + fmt(y.unit) + '</td><td class="num">' + fmt(y.unitFull) + '</td><td class="num">' + fmt(y.price) + '</td><td class="num' + (y.price !== null && y.unit !== null && y.price < y.unit ? " neg" : "") + '">' + (y.price !== null && y.unit !== null ? fmt(y.price - y.unit) : "—") + '</td></tr>'; }).join("") + '</tbody></table></div></div>';
  /* مقایسهٔ معادن */
  var ss = sourceStats().sort(function (a, b) { return (a.eff === null) - (b.eff === null) || a.eff - b.eff; });
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>کدام منبع خوراک واقعاً ارزان‌تر است؟</h3><p class="hint">قیمت ارزان‌تر هر تن سنگ کافی نیست؛ «بهای خوراک در هر تن پودر» = قیمت تحویل ÷ بازیابی. بازیابی واقعی از روزهایی حساب می‌شود که دست‌کم ۸۰٪ خوراک از همان منبع بوده.</p></div></div><div class="scroll"><table><thead><tr><th>منبع</th><th class="num">خرید (تن)</th><th class="num">قیمت تحویل هر تن</th><th class="num">عیار BaSO₄</th><th class="num">وزن مخصوص</th><th class="num">هر تن BaSO₄ خالص</th><th class="num">بازیابی</th><th class="num">خوراک در هر تن پودر</th><th class="num">موجودی (تن)</th><th class="num">ارزش موجودی</th></tr></thead><tbody>' +
    (ss.length ? ss.map(function (s, i) { return '<tr><td><b>' + esc(s.n) + '</b>' + (i === 0 && s.eff !== null && ss.length > 1 ? ' <span class="pill p3">بهترین</span>' : '') + (s.from !== "خرید" ? '<br><span class="hint">' + s.from + '</span>' : '') + '</td><td class="num">' + tn(s.buyT) + '</td><td class="num">' + fmt(s.cost) + '</td><td class="num">' + (s.grade ? NF1.format(s.grade) + "٪" : "—") + '</td><td class="num">' + (s.sg ? NF2.format(s.sg) : "—") + '</td><td class="num">' + fmt(s.perBa) + '</td><td class="num">' + p1(s.rec || s.planRec) + (s.rec ? "" : s.planRec ? '<br><span class="hint">مدل</span>' : "") + '</td><td class="num"><b>' + fmt(s.eff) + '</b></td><td class="num' + (s.stock < 0 ? " neg" : "") + '">' + tn(s.stock) + '</td><td class="num">' + (s.cost !== null && s.stock > 0 ? fmtB(s.stock * s.cost) : "—") + '</td></tr>'; }).join("") : '<tr><td colspan="10" class="mid" style="color:var(--muted)">هنوز خرید یا مصرفی ثبت نشده.</td></tr>') + '</tbody></table></div>' +
    '<p class="hint" style="margin-top:8px">عیار و وزن مخصوص هر محموله را هنگام ثبت «خرید خوراک» وارد کنید. موجودی منفی یعنی مصرف ثبت‌شده بیشتر از خرید ثبت‌شده است.</p></div>';
  /* موجودی پودر */
  var gT = 0, sT = 0; A.prod.forEach(function (r) { gT += (+r.product_t || 0) - (+r.offspec_t || 0); }); A.sales.forEach(function (s) { if (s.kind !== "باطله") sT += (+s.tons || 0) - (+s.returned_t || 0); });
  if (x) h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>موجودی پودر</h3></div></div><p>' + tn(gT) + ' تن پودر سالم تولید − ' + tn(sT) + ' تن فروش خالص = <b>' + tn(gT - sT) + ' تن</b> در انبار، به ارزش تقریبی <b>' + fmtB((gT - sT) * (x.unit || 0)) + ' ' + uN() + '</b> (با بهای ساخت ' + jlabel(sel) + ').</p></div>';
  h += costSettings();
  return h;
}

/* ---------- تنظیمات و BOM استاندارد ---------- */
function costSettings() {
  var cm = catMap(), cats = FORMS.exp.f.filter(function (f) { return f[0] === "category"; })[0][3];
  var h = '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>BOM استاندارد هر تن پودر</h3><p class="hint">مقدار مصرف استاندارد هر قلم برای یک تن پودر و قیمت واحد. در فرم تولید، مصرف واقعی همین اقلام ثبت می‌شود.</p></div></div><div class="scroll"><table><thead><tr><th>قلم</th><th>نوع</th><th>واحد</th><th class="num">استاندارد هر تن</th><th class="num">قیمت واحد (' + uN() + ')</th><th class="num">بهای استاندارد هر تن</th><th>فعال</th>' + (A.admin ? '<th></th>' : '') + '</tr></thead><tbody>' +
    (A.citems.length ? A.citems.map(function (i) { var ro = A.admin ? "" : " disabled";
      return '<tr><td><input data-ci="' + i.id + '" data-f="name" value="' + esc(i.name) + '"' + ro + '></td><td><select data-ci="' + i.id + '" data-f="kind"' + ro + '>' + Object.keys(CI_KIND).map(function (k) { return '<option value="' + k + '"' + (i.kind === k ? " selected" : "") + '>' + CI_KIND[k] + '</option>'; }).join("") + '</select></td>' +
        '<td><input data-ci="' + i.id + '" data-f="unit" value="' + esc(i.unit || "") + '" style="width:110px"' + ro + '></td><td><input class="money" data-ci="' + i.id + '" data-f="std_per_t" value="' + (i.std_per_t !== null ? toFa(i.std_per_t) : "") + '" style="width:90px"' + ro + '></td>' +
        '<td><input class="money" data-ci="' + i.id + '" data-f="unit_cost" value="' + (i.unit_cost !== null ? fmt(i.unit_cost) : "") + '" style="width:120px"' + ro + '></td><td class="num">' + (+i.std_per_t > 0 && +i.unit_cost > 0 ? fmt(i.std_per_t * i.unit_cost) : "—") + '</td>' +
        '<td><input type="checkbox" data-ci="' + i.id + '" data-f="active"' + (i.active ? " checked" : "") + ro + '></td>' + (A.admin ? '<td><button class="del" data-cidel="' + i.id + '">✕</button></td>' : '') + '</tr>'; }).join("") : '<tr><td colspan="8" class="mid" style="color:var(--muted)">قلمی تعریف نشده.</td></tr>') +
    '</tbody></table></div>';
  var stdT = 0; A.citems.forEach(function (i) { if (i.active && +i.std_per_t > 0 && +i.unit_cost > 0) stdT += i.std_per_t * i.unit_cost; });
  if (stdT) h += '<p class="hint" style="margin-top:8px">بهای استاندارد تبدیل (اقلام بالا) برای هر تن: <b>' + fmt(stdT) + ' ' + uN() + '</b></p>';
  if (A.admin) h += '<div class="addrow" style="margin-top:10px"><input id="ciN" placeholder="قلم تازه، مثلاً «پالت»"><input id="ciU" placeholder="واحد" style="flex:0 0 110px;min-width:110px"><button class="btn sm" id="ciAdd" style="margin:0">افزودن</button>' + (A.citems.length ? '' : '<button class="more" id="ciSug">+ اقلام پیشنهادی</button>') + '</div>';
  h += '</div>';
  h += '<div class="card"><div class="chead"><div><h3>تنظیمات تخصیص هزینه</h3><p class="hint">هر دستهٔ «هزینه‌ها» کجا حساب شود. بهای ساخت فقط دسته‌های «بهای ساخت» را می‌گیرد؛ بهای کامل همه را.</p></div></div><div class="frm">' +
    cats.map(function (c) { return '<div><label>' + esc(c) + '</label><select data-cat="' + esc(c) + '"' + (A.admin ? "" : " disabled") + '>' + Object.keys(CAT_KIND).map(function (k) { return '<option value="' + k + '"' + ((cm[c] || "prod") === k ? " selected" : "") + '>' + CAT_KIND[k] + '</option>'; }).join("") + '</select></div>'; }).join("") +
    '<div><label>استهلاک ماهانهٔ ماشین‌آلات و ساختمان (' + uN() + ')</label><input id="cDep" class="money" value="' + (depM() ? fmt(depM()) : "") + '"' + (A.admin ? "" : " disabled") + '></div></div>' +
    (A.admin ? '<button class="btn sm" id="cCfg">ذخیرهٔ تنظیمات</button>' : '') + '<p class="hint" style="margin-top:8px">استهلاک نقدی نیست ولی بخشی از بهای واقعی است؛ بدون آن قیمت‌گذاری زیر بها ممکن می‌شود. نمونه: سرمایه‌گذاری ماشین‌آلات ÷ عمر مفید به ماه.</p></div>';
  return h;
}

/* ---------- فرم تولید با BOM ---------- */
function srcNames() { var n = {}; TYPES.forEach(function (t) { (S[t] || []).forEach(function (s) { n[s.name] = 1; }); }); A.purch.forEach(function (p) { if (p.source) n[p.source] = 1; }); n["سایر"] = 1; return Object.keys(n); }
function feedRow(i) { return '<div class="addrow" style="margin-bottom:6px" data-fl="' + i + '"><select class="flS">' + srcNames().map(function (s) { return '<option>' + esc(s) + '</option>'; }).join("") + '</select><input class="flT money" inputmode="decimal" placeholder="تن" style="flex:0 0 120px;min-width:120px"><span class="flC hint" style="flex:0 0 170px;min-width:170px"></span></div>'; }
function prodForm() {
  var items = A.citems.filter(function (i) { return i.active; });
  return '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>ثبت تولید</h3><p class="hint">خوراک می‌تواند از چند منبع باشد؛ بهای هر منبع با میانگین قیمت تحویل خریدهای ثبت‌شده حساب و ثبت می‌شود.</p></div></div>' +
    '<div class="frm"><div><label>تاریخ</label><input id="f_d" value="' + todayJ() + '" inputmode="numeric"></div></div>' +
    '<div style="margin:10px 0 4px"><label>خوراک مصرفی (BOM خوراک)</label></div><div id="flBox">' + feedRow(0) + '</div><button class="more" id="flAdd" type="button">+ منبع دیگر</button>' +
    '<div class="frm" style="margin-top:12px">' + [["product_t", "پودر تولیدشده (تن)"], ["offspec_t", "از آن خارج از مشخصه (تن)"], ["waste_t", "باطله و ریزدانه (تن)"], ["sg", "وزن مخصوص محصول"], ["planned_h", "ساعت کار برنامه‌ریزی‌شده"], ["downtime_h", "توقف خط (ساعت)"]].map(function (f) { return '<div><label>' + f[1] + '</label><input id="f_' + f[0] + '" class="money" inputmode="decimal" placeholder="۰"></div>'; }).join("") + '</div>' +
    (items.length ? '<div style="margin:12px 0 4px"><label>مصرف مواد و انرژی (اختیاری — برای کنترل در برابر BOM)</label></div><div class="frm">' + items.map(function (i) { return '<div><label>' + esc(i.name) + (i.unit ? " (" + esc(i.unit) + ")" : "") + '</label><input data-mat="' + i.id + '" class="money" inputmode="decimal" placeholder="' + (+i.std_per_t > 0 ? "استاندارد: " + toFa(i.std_per_t) + " در هر تن" : "") + '"></div>'; }).join("") + '</div>' : '<p class="hint">برای کنترل مصرف کیسه، برق و قطعات، اقلام BOM را در صفحهٔ «بهای تمام‌شدهٔ واقعی» تعریف کنید.</p>') +
    '<div class="frm"><div style="grid-column:1/-1"><label>توضیح</label><input id="f_note"></div></div>' +
    '<div class="gap" id="flSum" style="margin-top:10px">مقدار خوراک و پودر را وارد کنید تا برآورد بها نمایش داده شود.</div>' +
    '<button class="btn sm" id="addRow">ثبت</button><div class="note" id="fnote"></div></div>';
}
function readFeed() { var out = []; Array.prototype.forEach.call(document.querySelectorAll("#flBox [data-fl]"), function (r) { var t = num(r.querySelector(".flT").value); if (t > 0) out.push({ source: r.querySelector(".flS").value, tons: t }); }); return out; }
function prodPreview() {
  var d = parseJ($("f_d").value) || todayIso(), L = readFeed(), tot = 0, c = 0, unk = false;
  Array.prototype.forEach.call(document.querySelectorAll("#flBox [data-fl]"), function (r) { var ac = avgCost(r.querySelector(".flS").value, d); r.querySelector(".flC").textContent = ac.cost !== null ? fmt(ac.cost) + " " + uN() + "/تن · " + ac.from : "قیمت نامشخص"; });
  L.forEach(function (l) { tot += l.tons; var ac = avgCost(l.source, d).cost; if (ac === null) unk = true; else c += ac * l.tons; });
  var p = num($("f_product_t").value), off = num($("f_offspec_t").value), g = p - off;
  $("flSum").innerHTML = tot ? 'خوراک کل <b>' + tn(tot) + '</b> تن · بهای خوراک <b>' + fmtB(c) + ' ' + uN() + '</b>' + (unk ? " (بخشی بدون قیمت)" : "") + (p ? ' · بازیابی <b>' + p1(p / tot) + '</b>' : '') + (g > 0 ? ' · خوراک در هر تن پودر سالم <b>' + fmt(c / g) + '</b>' : '') : "مقدار خوراک را وارد کنید.";
}
async function addProd() {
  var d = parseJ($("f_d").value), L = readFeed(), note = $("fnote");
  function bad(t) { note.className = "note err"; note.textContent = t; }
  if (!d) return bad("تاریخ درست نیست (مثل ۱۴۰۵/۰۸/۲۹)");
  var p = num($("f_product_t").value); if (!L.length && !p) return bad("خوراک یا پودر را وارد کنید.");
  var tot = 0, by = {}; L.forEach(function (l) { tot += l.tons; by[l.source] = (by[l.source] || 0) + l.tons; });
  var names = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; });
  var o = { d: d, source: names.join(" + ") || null, feed_t: tot, product_t: p, offspec_t: num($("f_offspec_t").value), waste_t: num($("f_waste_t").value), sg: $("f_sg").value.trim() ? num($("f_sg").value) : null,
    planned_h: $("f_planned_h").value.trim() ? num($("f_planned_h").value) : null, downtime_h: num($("f_downtime_h").value), note: $("f_note").value.trim() || null };
  if (o.offspec_t > o.product_t) return bad("خارج از مشخصه نمی‌تواند از کل پودر بیشتر باشد.");
  if (tot && p > tot) return bad("پودر از خوراک بیشتر است؛ مقادیر را بررسی کنید.");
  Object.keys(o).forEach(function (k) { if (o[k] === null) delete o[k]; });
  $("addRow").disabled = true;
  var r = await db.from("bf_production").insert(o).select("id").single();
  if (r.error) { $("addRow").disabled = false; return bad("ثبت نشد: " + r.error.message); }
  var id = r.data.id;
  var fl = names.map(function (s) { var ac = avgCost(s, d).cost; return { production_id: id, source: s, tons: by[s], unit_cost: ac }; });
  var ml = []; Array.prototype.forEach.call(document.querySelectorAll("[data-mat]"), function (i) { var q = num(i.value); if (q > 0) ml.push({ production_id: id, item_id: +i.dataset.mat, qty: q }); });
  var e1 = fl.length ? await db.from("bf_prod_feed").insert(fl) : {}, e2 = ml.length ? await db.from("bf_prod_mat").insert(ml) : {};
  $("addRow").disabled = false;
  if (e1.error || e2.error) { await db.from("bf_production").delete().eq("id", id); return bad("ثبت BOM نشد، ثبت تولید برگشت خورد: " + (e1.error || e2.error).message); }
  await loadTable("prod"); await loadCost(); render(); toast("تولید و BOM ثبت شد.");
}

/* ---------- رویدادها ---------- */
var _bindPlanC = bindPlan;
bindPlan = function () {
  _bindPlanC();
  if ($("flBox")) {
    var n = 1;
    var wire = function () { Array.prototype.forEach.call(document.querySelectorAll("#flBox select, #flBox input, #f_product_t, #f_offspec_t, #f_d"), function (el) { el.oninput = prodPreview; el.onchange = prodPreview; }); prodPreview(); };
    $("flAdd").onclick = function () { $("flBox").insertAdjacentHTML("beforeend", feedRow(n++)); wire(); };
    wire();
  }
  if ($("cM")) $("cM").onchange = function () { A.costM = +$("cM").value; render(); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-ci]"), function (el) { el.onchange = async function () {
    var f = el.dataset.f, v = f === "active" ? el.checked : f === "std_per_t" ? (el.value.trim() ? num(el.value) : null) : f === "unit_cost" ? (el.value.trim() ? num(el.value) / um() : null) : el.value.trim();
    var o = {}; o[f] = v; var r = await db.from("bf_cost_items").update(o).eq("id", +el.dataset.ci); if (r.error) { toast(r.error.message); return; } await loadCost(); render(); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-cidel]"), function (b) { b.onclick = async function () { if (!confirm("این قلم حذف شود؟ مصرف‌های ثبت‌شده‌اش بی‌قلم می‌مانند.")) return; await db.from("bf_cost_items").delete().eq("id", +b.dataset.cidel); await loadCost(); render(); }; });
  if ($("ciAdd")) $("ciAdd").onclick = async function () { var n = $("ciN").value.trim(); if (!n) return; var r = await db.from("bf_cost_items").insert({ name: n, unit: $("ciU").value.trim() || null, sort: A.citems.length }); if (r.error) { toast(r.error.message); return; } await loadCost(); render(); };
  if ($("ciSug")) $("ciSug").onclick = async function () { if (!confirm("اقلام رایج افزوده شود؟ مقدار استاندارد و قیمت را خودتان تکمیل کنید (فقط کیسهٔ ۵۰ کیلویی مقدار ثابت ۲۰ عدد در تن دارد).")) return;
    var r = await db.from("bf_cost_items").insert(CI_SUG.map(function (c, i) { return { name: c[0], kind: c[1], unit: c[2], std_per_t: c[3], expense_category: c[4], sort: i }; })); if (r.error) { toast(r.error.message); return; } await loadCost(); render(); };
  if ($("cCfg")) $("cCfg").onclick = async function () { var m = {}; Array.prototype.forEach.call(document.querySelectorAll("[data-cat]"), function (s) { m[s.dataset.cat] = s.value; });
    var r = await db.from("bf_cost_cfg").upsert([{ key: "categories", value: m, updated_at: new Date().toISOString() }, { key: "depreciation_month", value: num($("cDep").value) / um(), updated_at: new Date().toISOString() }]);
    if (r.error) { toast(r.error.message); return; } await loadCost(); render(); toast("تنظیمات ذخیره شد."); };
};
EXTRA_PAGES.cost = pCost;
