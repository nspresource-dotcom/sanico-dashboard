/* داشبورد تصمیم‌گیری کارخانهٔ پودر باریت سایا
   داده: Supabase (جدول‌های bf_*) — محاسبه: engine.js (همان منطق فایل امکان‌سنجی)
   همهٔ مبالغ داخلی به تومان ذخیره می‌شوند. */

var BUILD = "۱";
var $ = function (id) { return document.getElementById(id); };
var db = null;
/* نشانی، کلید و بارگذاری کتابخانه: shared/config.js و shared/supa.js */
async function ensureDb() { if (!db) db = await window.sayaClient(); return db; }

/* ---------- وضعیت ---------- */
var A = {
  page: "home", sub: "prod", admin: false, me: null, name: "",
  model: null,          // نسخهٔ ذخیره‌شده در پایگاه داده
  dirty: false,         // مدل در حال ویرایش با نسخهٔ ذخیره‌شده فرق دارد
  prod: [], sales: [], purch: [], exp: [], scen: [], watch: [], tasks: [], mlog: [], rituals: [],
  loadedAt: null
};
var UNIT = "toman";
try { UNIT = localStorage.getItem("bf_unit") || "toman"; } catch (e) {}


/* ---------- قالب‌بندی ---------- */
var NF = new Intl.NumberFormat("fa-IR"), NF1 = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }), NF2 = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });
function um() { return UNIT === "rial" ? 10 : 1; }
function uN() { return UNIT === "rial" ? "ریال" : "تومان"; }
function fmt(v) { if (v === null || v === undefined || !isFinite(v)) return "—"; return NF.format(Math.round(v * um())); }
function fmtB(v) { if (v === null || v === undefined || !isFinite(v)) return "—"; var x = v * um(), a = Math.abs(x);
  if (a >= 1e9) return NF2.format(x / 1e9) + " میلیارد"; if (a >= 1e6) return NF1.format(x / 1e6) + " میلیون"; return NF.format(Math.round(x)); }
function tn(v) { return v === null || v === undefined || !isFinite(v) ? "—" : NF.format(Math.round(v)); }
function p1(v) { return v === null || v === undefined || !isFinite(v) ? "—" : NF1.format(v * 100) + "٪"; }
function esc(s) { return String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function num(s) { var v = parseFloat(toLatin(String(s || "")).replace(/[^0-9.\-]/g, "")); return isFinite(v) ? v : 0; }
function jd(iso) { return iso ? formatJalali(iso) : "—"; }
function jkey(iso) { var j = isoToJalali(iso); return j.jy * 100 + j.jm; }
function jlabel(k) { return MONTH_NAMES[(k % 100) - 1] + " " + toFa(Math.floor(k / 100)); }
function todayJ() { var j = isoToJalali(todayIso()); return toFa(j.jy) + "/" + toFa(pad(j.jm)) + "/" + toFa(pad(j.jd)); }
function parseJ(s) { var p = toLatin(String(s)).split(/[\/\-.]/).map(Number); if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return null;
  if (p[0] < 100) p[0] += 1400; if (p[1] > 12 || p[2] > 31) return null; return jalaliToIso(p[0], p[1], p[2]); }

/* ---------- محاسبهٔ مدل ---------- */
function calc() {
  S.g.unit = UNIT;
  var R = simulate(null), P = paybackInfo(null), E = equity(R), C = cashStats(E.eq, E.cum, S.g.horizon);
  var oh = S.g.overhead * R.H, pbtSum = R.rows.reduce(function (a, r) { return a + r.pbt; }, 0);
  var be = R.totProd > 0 ? S.g.price - pbtSum / R.totProd : null;           // قیمت سربه‌سر عملیاتی
  return { R: R, P: P, E: E, C: C, be: be, oh: oh };
}
function priceForPayback() { // کمترین قیمتی که سرمایه را داخل مدت طرح برمی‌گرداند
  var keep = S.g.price, lo = 0, hi = Math.max(keep * 4, 1e8), H = S.g.horizon;
  function ok(p) { S.g.price = p; var R = simulate(null); return R.end >= 0; }
  if (!ok(hi)) { S.g.price = keep; return null; }
  for (var i = 0; i < 50; i++) { var m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
  S.g.price = keep; return hi;
}
function curMonthIdx() { var sd = S.g.startDate; if (!sd) return null; var a = isoToJalali(sd), b = isoToJalali(todayIso());
  return (b.jy - a.jy) * 12 + (b.jm - a.jm) + 1; }
function monthKeyOfIdx(i) { var a = isoToJalali(S.g.startDate); var m = a.jm - 1 + (i - 1); return (a.jy + Math.floor(m / 12)) * 100 + (m % 12) + 1; }

/* ---------- عملکرد واقعی ---------- */
function actuals() {
  var M = {};
  function m(k) { return M[k] || (M[k] = { feed: 0, prod: 0, waste: 0, down: 0, days: {}, sales: 0, sT: 0, wS: 0, recv: 0, buy: 0, buyT: 0, paid: 0, exp: 0 }); }
  A.prod.forEach(function (r) { var x = m(jkey(r.d)); x.feed += +r.feed_t; x.prod += +r.product_t; x.waste += +r.waste_t; x.down += +r.downtime_h || 0; x.days[r.d] = 1; });
  A.sales.forEach(function (r) { var x = m(jkey(r.d)); if (r.kind === "باطله") x.wS += +r.amount; else { x.sales += +r.amount; x.sT += +r.tons; } x.recv += +r.received; });
  A.purch.forEach(function (r) { var x = m(jkey(r.d)); x.buy += +r.amount + (+r.freight); x.buyT += +r.tons; x.paid += +r.paid; });
  A.exp.forEach(function (r) { var x = m(jkey(r.d)); x.exp += +r.amount; });
  var T = { recv: 0, paid: 0, exp: 0, sales: 0, wS: 0, buy: 0, prod: 0, feed: 0 };
  Object.keys(M).forEach(function (k) { var x = M[k]; for (var f in T) T[f] += x[f]; });
  T.cash = (+S.g.cash0 || 0) + T.recv - T.paid - T.exp;
  T.ar = T.sales + T.wS - T.recv; T.ap = T.buy - T.paid;
  return { M: M, T: T };
}
function planRec() { var R = A.calc.R; return R.totFeed > 0 ? R.totProd / R.totFeed : null; }

/* ---------- نمودار ---------- */
function lineChart(series, opts) {
  opts = opts || {}; var W = 640, H = opts.h || 230, L = 58, Rr = 12, T = 14, B = 26;
  var all = []; series.forEach(function (s) { s.v.forEach(function (v) { if (v !== null && isFinite(v)) all.push(v); }); });
  if (!all.length) return '<div class="empty">داده‌ای برای نمودار نیست.</div>';
  var mn = Math.min(0, Math.min.apply(null, all)), mx = Math.max(0, Math.max.apply(null, all)); if (mx === mn) mx = mn + 1;
  var n = Math.max.apply(null, series.map(function (s) { return s.v.length; }));
  var X = function (i) { return L + (W - L - Rr) * (n <= 1 ? 0 : i / (n - 1)); }, Y = function (v) { return T + (H - T - B) * (1 - (v - mn) / (mx - mn)); };
  var g = "", i;
  for (i = 0; i <= 4; i++) { var v = mn + (mx - mn) * i / 4, y = Y(v);
    g += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)"/>' +
      '<text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + (opts.raw ? NF.format(Math.round(v)) : NF1.format(v * um() / 1e9)) + '</text>'; }
  if (mn < 0 && mx > 0) g += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="var(--ink2)" stroke-dasharray="3 3"/>';
  var step = Math.max(1, Math.ceil(n / 12));
  for (i = 0; i < n; i += step) g += '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + toFa((opts.x0 || 0) + i) + '</text>';
  series.forEach(function (s) {
    if (s.bar) { var bw = Math.max(2, (W - L - Rr) / n * .6);
      s.v.forEach(function (v, i) { if (v === null) return; var y0 = Y(0), y1 = Y(v); g += '<rect x="' + (X(i) - bw / 2) + '" y="' + Math.min(y0, y1) + '" width="' + bw + '" height="' + Math.abs(y1 - y0) + '" rx="2" fill="' + s.c + '" opacity=".85"/>'; });
      return; }
    var d = ""; s.v.forEach(function (v, i) { if (v === null || !isFinite(v)) return; d += (d ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1); });
    g += '<path d="' + d + '" fill="none" stroke="' + s.c + '" stroke-width="' + (s.w || 2.6) + '" stroke-linejoin="round"' + (s.dash ? ' stroke-dasharray="5 4"' : '') + '/>';
  });
  var leg = series.map(function (s) { return '<span><i style="background:' + s.c + '"></i>' + esc(s.n) + '</span>'; }).join("");
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" direction="ltr">' + g + '</svg><div class="legend">' + leg +
    '<span class="u">محور عمودی: ' + (opts.raw || ("میلیارد " + uN())) + ' · محور افقی: ماه</span></div>';
}

/* ---------- پوسته ---------- */
function go(p) { p = PAGE_ALIAS[p] || p; A.page = p; buildNav(); closeSide(); render(); window.scrollTo(0, 0); try { history.replaceState(null, "", "#" + p); } catch (e) {} }
function closeSide() { $("side").classList.remove("open"); $("scrim").classList.add("hide"); }
$("burger").onclick = function () { $("side").classList.add("open"); $("scrim").classList.remove("hide"); };
$("scrim").onclick = closeSide;
$("brandBtn").onclick = function () { go("home"); };
$("theme").onclick = function () { var c = document.documentElement.getAttribute("data-theme"), n = c === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", n); try { localStorage.setItem("bf_theme", n); } catch (e) {} };
try { var th = localStorage.getItem("bf_theme"); if (th) document.documentElement.setAttribute("data-theme", th); } catch (e) {}
$("unit").onclick = function () { UNIT = UNIT === "rial" ? "toman" : "rial"; try { localStorage.setItem("bf_unit", UNIT); } catch (e) {} render(); };
$("reload").onclick = function () { loadAll().then(render); };
$("logout").onclick = async function () { await ensureDb(); await db.auth.signOut(); location.reload(); };

function render() {
  if (!S) return;
  A.calc = calc(); A.act = actuals();
  var p = PAGES.filter(function (x) { return x.k === A.page; })[0] || PAGES[0];
  $("ptitle").textContent = p.t; $("phint").textContent = crumb() + " · " + p.h;
  $("unit").textContent = uN();
  $("stamps").innerHTML = stamps();
  $("promoN").textContent = fmt(A.act.T.cash) + " " + uN();
  var f = { home: pHome, daily: pDaily, pva: pPva, watch: pWatch, gates: pGates, cash: pCash, assume: pAssume, model: pModel, sources: pSources, loans: pLoans, sens: pSens, scen: pScen, guide: pGuide }[p.k] || EXTRA_PAGES[p.k];
  $("view").innerHTML = f();
  bind();
  strip();
}
function stamps() {
  var C = A.calc, s = '<span class="stamp"><b></b>مدل: ' + (A.model && A.model.updated_at ? jd(A.model.updated_at.slice(0, 10)) : "—") + '</span>';
  var last = A.prod.length ? A.prod[0].d : null;
  s += '<span class="stamp' + (last ? "" : " stale") + '"><b></b>آخرین تولید ثبت‌شده: ' + (last ? jd(last) : "هنوز ثبت نشده") + '</span>';
  s += '<span class="stamp"><b></b>مدت طرح ' + toFa(S.g.horizon) + ' ماه</span>';
  if (A.dirty) s += '<span class="stamp stale"><b></b>تغییرات ذخیره‌نشده</span>';
  return s;
}
function strip() {
  var el = $("strip");
  if (!A.dirty) { el.classList.add("hide"); return; }
  el.className = "strip warn";
  el.innerHTML = '<span>مدل تغییر کرده و همهٔ صفحه‌ها با عددهای جدید حساب می‌شوند — هنوز ذخیره نشده.</span><span style="display:flex;gap:8px">' +
    (A.admin ? '<button id="sv">ذخیره</button>' : '') + '<button id="rv">لغو تغییرات</button></span>';
  if ($("sv")) $("sv").onclick = saveModel;
  $("rv").onclick = function () { S = JSON.parse(JSON.stringify(A.model.data)); A.dirty = false; render(); };
}

/* ---------- کارت‌ها ---------- */
function kpi(lab, val, unit, foot, cls, chip, hz) {
  return '<div class="kpi ' + (cls || "") + '"><div class="bd"><div class="hd"><span class="lab">' + lab + (hz ? ' <span class="hz">' + hz + '</span>' : '') +
    '</span><span class="chip">' + chipHtml(chip || "◆") + '</span></div><div class="val">' + val + (unit ? '<span class="unit">' + unit + '</span>' : '') +
    '</div></div><div class="ft"><span>' + (foot || "") + '</span></div></div>';
}
function ins(kind, txt) { var m = { warn: ["d-warn", "!"], bad: ["d-bad", "✕"], good: ["d-good", "✓"], info: ["d-info", "i"] }[kind];
  return '<div class="ins"><span class="dot ' + m[0] + '">' + m[1] + '</span><span>' + txt + '</span></div>'; }

function findings() {
  var C = A.calc, R = C.R, P = C.P, g = S.g, out = [], T = A.act.T;
  if (P.kind === "in") out.push(["good", "سرمایه در ماه " + NF1.format(P.pb) + " برمی‌گردد؛ داخل مدت طرح."]);
  else if (P.pb) out.push(["warn", "بازگشت سرمایه در ماه " + NF1.format(P.pb) + "؛ دیرتر از مدت طرح (" + toFa(g.horizon) + " ماه)."]);
  else out.push(["bad", "با فرض‌های فعلی سرمایه برنمی‌گردد."]);
  if (C.be !== null) out.push([g.price > C.be ? "good" : "bad", "قیمت سربه‌سر عملیاتی " + fmtB(C.be) + " " + uN() + " بر تن است؛ قیمت فعلی " + fmtB(g.price) + "."]);
  var need = A.pp; if (need && need > g.price) out.push(["warn", "برای برگشت سرمایه داخل " + toFa(g.horizon) + " ماه، قیمت فروش باید دست‌کم " + fmtB(need) + " باشد."]);
  R.src.forEach(function (x) { if (x.b.perProductNet > g.price) out.push(["bad", "منبع «" + esc(x.s.name) + "» در هر تن زیان می‌دهد (بهای خالص " + fmtB(x.b.perProductNet) + ")."]); });
  if (R.overM > 0) out.push(["warn", "در " + toFa(R.overM) + " ماه ورود مواد از ظرفیت بیشتر است؛ مازاد در انبار می‌ماند."]);
  if (R.sgP !== null && R.sgP < g.targetSg) out.push(["warn", "عیار میانگین محصول (" + NF2.format(R.sgP) + ") کمتر از هدف " + NF2.format(g.targetSg) + " است."]);
  // عملکرد واقعی
  var last30 = A.prod.filter(function (r) { return (Date.now() - new Date(r.d).getTime()) < 31 * 864e5; });
  if (last30.length) {
    var f = last30.reduce(function (a, r) { return a + (+r.feed_t); }, 0), p = last30.reduce(function (a, r) { return a + (+r.product_t); }, 0), pr = planRec();
    if (f > 0 && pr) { var ar = p / f; out.push([ar >= pr * .97 ? "good" : "bad", "بازیافت واقعی ۳۰ روز اخیر " + p1(ar) + " در برابر " + p1(pr) + " در مدل."]); }
    var dh = last30.reduce(function (a, r) { return a + (+r.downtime_h || 0); }, 0); if (dh > 0) out.push(["info", "توقف خط در ۳۰ روز اخیر: " + NF1.format(dh) + " ساعت."]);
  } else out.push(["info", "هنوز تولیدی ثبت نشده؛ از «ثبت روزانه» شروع کنید تا مقایسه با برنامه فعال شود."]);
  if (T.ar > 0) out.push(["warn", "مطالبات وصول‌نشده از فروش: " + fmtB(T.ar) + " " + uN() + "."]);
  if (!g.startDate) out.push(["info", "تاریخ شروع تولید در «مدل و اهرم‌ها» ثبت نشده؛ بدون آن مقایسهٔ ماه‌به‌ماه ممکن نیست."]);
  return out.concat(planFindings());
}

/* ---------- صفحهٔ خانه ---------- */
function pHome() {
  var C = A.calc, R = C.R, P = C.P, g = S.g, T = A.act.T, ci = curMonthIdx();
  A.pp = priceForPayback();
  var rowNow = ci && ci >= 1 && ci <= R.rows.length ? R.rows[ci - 1] : null, am = ci && ci >= 1 ? A.act.M[monthKeyOfIdx(ci)] : null;
  var h = '<div class="hero"><div class="wel"><h3>سلام' + (A.name ? "، " + esc(A.name.split(" ")[0]) : "") + '!</h3><p>وضعیت برنامه و عملکرد کارخانهٔ پودر باریت سایا. عددهای برنامه از مدل امکان‌سنجی و عددهای واقعی از ثبت روزانه می‌آیند.</p>' +
    '<p style="margin-top:10px"><span class="tag ' + (P.kind === "in" ? "up" : P.pb ? "warn" : "down") + '">' + (P.kind === "in" ? "اقتصادی در مدت طرح" : P.pb ? "برگشت دیرتر از مدت طرح" : "برنمی‌گردد") + '</span></p></div><div class="trio">' +
    kpi("موجودی نقد", fmt(T.cash), uN(), "نقد اولیه + وصولی − پرداختی‌ها", T.cash < 0 ? "neg" : "pos", "₪") +
    kpi("تولید این ماه", am ? tn(am.prod) : "۰", "تن", rowNow ? "برنامه: " + tn(rowNow.prod) + " تن" : "تاریخ شروع ثبت نشده", "", "▤", ci ? "ماه " + toFa(ci) : "") +
    kpi("فروش این ماه", am ? fmt(am.sales + am.wS) : "۰", uN(), rowNow ? "برنامه: " + fmtB(rowNow.rev) : "—", "", "↗") +
    '</div></div>';
  h += '<div class="grid g3" style="margin-bottom:14px">' +
    kpi("دورهٔ بازگشت سرمایه", P.pb ? NF1.format(P.pb) : "—", "ماه", P.kind === "in" ? "داخل مدت طرح" : "مدت طرح " + toFa(g.horizon) + " ماه", P.kind === "in" ? "pos" : "warn", "⏱") +
    kpi("خالص ارزش فعلی (NPV)", fmtB(R.npv), uN(), "تنزیل " + toFa(g.disc) + "٪ در مدت طرح", R.npv >= 0 ? "pos" : "neg", "≈") +
    kpi("نرخ بازده داخلی سالانه", R.irr === null ? "—" : p1(R.irr), "", "در مدت طرح", R.irr !== null && R.irr * 100 >= g.disc ? "pos" : "neg", "%") +
    kpi("قیمت سربه‌سر عملیاتی", fmtB(C.be), uN() + " بر تن", "قیمت فعلی " + fmtB(g.price), C.be !== null && g.price > C.be ? "pos" : "neg", "⚖") +
    kpi("قیمت لازم برای برگشت در مدت طرح", A.pp ? fmtB(A.pp) : "—", uN() + " بر تن", A.pp && A.pp > g.price ? "فاصله: " + fmtB(A.pp - g.price) : "قیمت فعلی کافی است", A.pp && A.pp > g.price ? "warn" : "pos", "⇡") +
    kpi("بیشترین نقدینگی موردنیاز", fmtB(C.C.peak), uN(), "ماه اوج: " + toFa(C.C.peakM), "", "▼") +
    '</div>';
  h += '<div class="grid g2" style="margin-bottom:14px"><div class="panel"><h3>یافته‌های سیستم</h3>' + findings().map(function (f) { return ins(f[0], f[1]); }).join("") + '</div>' +
    '<div class="card"><div class="chead"><div><h3>جریان نقدی تجمعی</h3><p class="hint">برنامه در برابر واقعی</p></div><button class="more" data-go="cash">جزئیات</button></div>' +
    lineChart(homeSeries()) + '</div></div>';
  h += '<div class="card"><div class="chead"><div><h3>سهم منابع خوراک</h3><p class="hint">حاشیهٔ هر تن پودر و سود ماهانهٔ هر منبع فعال</p></div><button class="more" data-go="sources">ویرایش</button></div>' + srcBars() + '</div>';
  return h;
}
function homeSeries() {
  var C = A.calc, s = [{ n: "برنامهٔ طرح", c: "var(--deep)", v: C.E.cum.slice(0, S.g.horizon + 1) }];
  if (S.g.startDate && Object.keys(A.act.M).length) {
    var ci = Math.max(0, Math.min(curMonthIdx() || 0, S.g.horizon)), cum = -S.g.invest, v = [cum];
    for (var i = 1; i <= ci; i++) { var x = A.act.M[monthKeyOfIdx(i)]; if (x) cum += x.recv - x.paid - x.exp; v.push(cum); }
    s.push({ n: "واقعی", c: "var(--amber)", v: v });
  }
  return s;
}
function srcBars() {
  var R = A.calc.R, g = S.g; if (!R.src.length) return '<div class="empty">منبع فعالی نیست.</div>';
  var mx = Math.max.apply(null, R.src.map(function (x) { return Math.abs(g.price - x.b.perProductNet); })) || 1;
  return R.src.map(function (x) { var m = g.price - x.b.perProductNet, monthly = x.s.tons * (x.s.rec / 100) * m;
    return '<div class="brow"><span class="nm">' + esc(x.s.name) + ' <span class="cnt">' + TYPE_FA[x.type] + '</span></span><span class="track"><span class="fill' + (m < 0 ? " neg" : "") + '" style="width:' + Math.min(100, Math.abs(m) / mx * 100) + '%"></span></span><span class="vl">' + fmtB(m) + ' / تن · ' + fmtB(monthly) + ' در ماه</span></div>'; }).join("");
}

/* ---------- ثبت روزانه ---------- */
var FORMS = {
  prod: { t: "bf_production", title: "تولید", list: "prod", f: [["d", "تاریخ", "date"], ["source", "منبع خوراک", "src"], ["feed_t", "خوراک فراوری‌شده (تن)", "n"], ["product_t", "پودر تولیدشده (تن)", "n"], ["waste_t", "باطله (تن)", "n"], ["sg", "عیار محصول (وزن مخصوص)", "n"], ["planned_h", "ساعت کار برنامه‌ریزی‌شده", "n"], ["downtime_h", "توقف خط (ساعت)", "n"], ["offspec_t", "خارج از مشخصه (تن)", "n"], ["note", "توضیح", "t"]],
    cols: [["d", "تاریخ", "date"], ["source", "منبع"], ["feed_t", "خوراک", "t"], ["product_t", "پودر", "t"], ["_rec", "بازیافت", "p"], ["sg", "عیار"], ["planned_h", "ساعت برنامه", "t"], ["downtime_h", "توقف", "t"], ["offspec_t", "خارج از مشخصه", "t"], ["note", "توضیح"]] },
  sales: { t: "bf_sales", title: "فروش", list: "sales", f: [["d", "تاریخ", "date"], ["kind", "نوع", "sel", ["پودر", "باطله"]], ["customer", "خریدار", "t"], ["tons", "مقدار (تن)", "n"], ["price_t", "قیمت هر تن", "m"], ["amount", "مبلغ کل (خالی = مقدار × قیمت)", "m"], ["received", "وصول‌شده تا کنون", "m"], ["returned_t", "مرجوعی (تن)", "n"], ["note", "توضیح", "t"]],
    cols: [["d", "تاریخ", "date"], ["kind", "نوع"], ["customer", "خریدار"], ["tons", "تن", "t"], ["price_t", "قیمت هر تن", "m"], ["amount", "مبلغ", "m"], ["received", "وصولی", "m"], ["_ar", "مانده", "m"], ["returned_t", "مرجوعی", "t"]] },
  purch: { t: "bf_purchases", title: "خرید خوراک", list: "purch", f: [["d", "تاریخ", "date"], ["source", "منبع", "src"], ["tons", "مقدار (تن)", "n"], ["amount", "مبلغ خرید با کارمزد", "m"], ["freight", "کرایه حمل کل", "m"], ["paid", "پرداخت‌شده تا کنون", "m"], ["grade", "عیار BaSO₄ (٪)", "n"], ["sg", "وزن مخصوص خوراک", "n"], ["moisture", "رطوبت (٪)", "n"], ["lot", "شمارهٔ محموله/بارنامه", "t"], ["note", "توضیح", "t"]],
    cols: [["d", "تاریخ", "date"], ["source", "منبع"], ["tons", "تن", "t"], ["amount", "مبلغ", "m"], ["freight", "حمل", "m"], ["_pt", "هر تن تحویلی", "m"], ["grade", "عیار"], ["sg", "و.م"], ["paid", "پرداختی", "m"], ["note", "توضیح"]] },
  exp: { t: "bf_expenses", title: "هزینه", list: "exp", f: [["d", "تاریخ", "date"], ["category", "دسته", "sel", ["حقوق و دستمزد", "برق و انرژی", "بسته‌بندی", "تعمیر و نگهداری", "حمل فروش", "اجاره", "مالیات و عوارض", "اداری و سربار", "سایر"]], ["amount", "مبلغ", "m"], ["note", "توضیح", "t"]],
    cols: [["d", "تاریخ", "date"], ["category", "دسته"], ["amount", "مبلغ", "m"], ["note", "توضیح"]] }
};
function pDaily() {
  var F = FORMS[A.sub], rows = A[F.list];
  var h = '<div class="sub-nav">' + [["prod", "تولید"], ["sales", "فروش"], ["purch", "خرید خوراک"], ["exp", "هزینه‌ها"]].map(function (x) {
    return '<button data-sub="' + x[0] + '" class="' + (A.sub === x[0] ? "on" : "") + '">' + x[1] + '</button>'; }).join("") + '</div>';
  if (A.admin && A.sub === "prod" && typeof prodForm === "function") h += prodForm();
  else if (A.admin) {
    h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>ثبت ' + F.title + '</h3><p class="hint">مبالغ به ' + uN() + ' · تاریخ شمسی مثل ۱۴۰۵/۰۸/۲۹</p></div></div><div class="frm">' +
      F.f.map(function (f) { return '<div><label>' + f[1] + '</label>' + inputFor(f) + '</div>'; }).join("") +
      '</div><button class="btn sm" id="addRow">ثبت</button><div class="note" id="fnote"></div></div>';
  }
  h += monthBoxes(A.sub);
  h += '<div class="card"><div class="chead"><div><h3>' + F.title + '‌های ثبت‌شده</h3><p class="hint">' + toFa(rows.length) + ' ردیف</p></div></div><div class="scroll"><table><thead><tr>' +
    F.cols.map(function (c) { return '<th' + (c[2] && c[2] !== "date" ? ' class="num"' : '') + '>' + c[1] + '</th>'; }).join("") + (A.admin ? '<th></th>' : '') + '</tr></thead><tbody>' +
    (rows.length ? rows.slice(0, 200).map(function (r) {
      return '<tr>' + F.cols.map(function (c) { var v = r[c[0]];
        if (c[0] === "_rec") v = +r.feed_t > 0 ? r.product_t / r.feed_t : null;
        if (c[0] === "_ar") v = r.amount - r.received;
        if (c[0] === "_pt") v = +r.tons > 0 ? (+r.amount + (+r.freight)) / r.tons : null;
        if (c[2] === "date") return '<td>' + jd(v) + '</td>';
        if (c[2] === "m") return '<td class="num">' + fmt(v) + '</td>';
        if (c[2] === "t") return '<td class="num">' + (v === null || v === undefined ? "—" : NF1.format(v)) + '</td>';
        if (c[2] === "p") return '<td class="num">' + p1(v) + '</td>';
        return '<td>' + esc(v === null || v === undefined ? "—" : (typeof v === "number" ? NF2.format(v) : v)) + '</td>'; }).join("") +
        (A.admin ? '<td><button class="del" data-del="' + r.id + '" title="حذف">✕</button></td>' : '') + '</tr>'; }).join("")
      : '<tr><td colspan="9" class="mid" style="color:var(--muted)">هنوز ردیفی ثبت نشده است.</td></tr>') + '</tbody></table></div></div>';
  return h;
}
function inputFor(f) {
  var id = "f_" + f[0];
  if (f[2] === "date") return '<input id="' + id + '" value="' + todayJ() + '" inputmode="numeric">';
  if (f[2] === "sel") return '<select id="' + id + '">' + f[3].map(function (o) { return '<option>' + o + '</option>'; }).join("") + '</select>';
  if (f[2] === "src") { var names = []; TYPES.forEach(function (t) { S[t].forEach(function (s) { names.push(s.name); }); });
    return '<select id="' + id + '">' + names.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join("") + '<option>سایر</option></select>'; }
  if (f[2] === "m") return '<input id="' + id + '" class="money" inputmode="decimal" placeholder="۰">';
  if (f[2] === "n") return '<input id="' + id + '" class="money" inputmode="decimal" placeholder="۰">';
  return '<input id="' + id + '">';
}
function monthBoxes(sub) {
  var M = A.act.M, ks = Object.keys(M).map(Number).sort().reverse().slice(0, 12); if (!ks.length) return "";
  var h = '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>جمع ماهانه</h3></div></div><div class="mgrid">';
  ks.forEach(function (k) { var x = M[k], v, u, s = "";
    if (sub === "prod") { v = tn(x.prod); u = "تن پودر"; s = "خوراک " + tn(x.feed) + " · بازیافت " + (x.feed ? p1(x.prod / x.feed) : "—"); }
    if (sub === "sales") { v = fmtB(x.sales + x.wS); u = uN(); s = tn(x.sT) + " تن · وصول " + fmtB(x.recv); }
    if (sub === "purch") { v = fmtB(x.buy); u = uN(); s = tn(x.buyT) + " تن · پرداخت " + fmtB(x.paid); }
    if (sub === "exp") { v = fmtB(x.exp); u = uN(); }
    h += '<div class="mbx"><div class="mtop"><span class="mnm">' + jlabel(k) + '</span></div><span class="mvl">' + v + '</span><span class="mun">' + u + '</span>' + (s ? '<span class="mnt">' + s + '</span>' : '') + '</div>'; });
  return h + '</div></div>';
}
async function addRow() {
  if (A.sub === "prod" && typeof addProd === "function") return addProd();
  var F = FORMS[A.sub], o = {}, bad = null;
  F.f.forEach(function (f) { var el = $("f_" + f[0]); if (!el) return; var v = el.value;
    if (f[2] === "date") { o[f[0]] = parseJ(v); if (!o[f[0]]) bad = "تاریخ درست نیست (مثل ۱۴۰۵/۰۸/۲۹)"; }
    else if (f[2] === "m") o[f[0]] = v.trim() === "" ? null : num(v) / um();
    else if (f[2] === "n") o[f[0]] = v.trim() === "" ? null : num(v);
    else o[f[0]] = v.trim() || null; });
  if (A.sub === "sales") { if (o.amount === null) o.amount = (o.tons || 0) * (o.price_t || 0); if (o.received === null) o.received = 0; if (o.returned_t === null) o.returned_t = 0; if (o.price_t === null) o.price_t = o.tons ? o.amount / o.tons : 0; }
  if (A.sub === "prod" && !o.feed_t && !o.product_t) bad = "مقدار خوراک یا پودر را وارد کنید.";
  if (A.sub === "purch") { o.amount = o.amount || 0; o.freight = o.freight || 0; o.paid = o.paid || 0; }
  if (A.sub === "exp" && !o.amount) bad = "مبلغ را وارد کنید.";
  Object.keys(o).forEach(function (k) { if (o[k] === null) delete o[k]; });
  if (bad) { $("fnote").className = "note err"; $("fnote").textContent = bad; return; }
  $("addRow").disabled = true;
  var r = await db.from(F.t).insert(o);
  $("addRow").disabled = false;
  if (r.error) { $("fnote").className = "note err"; $("fnote").textContent = "ثبت نشد: " + r.error.message; return; }
  await loadTable(A.sub); render(); toast("ثبت شد.");
}
async function delRow(id) {
  if (!confirm("این ردیف حذف شود؟")) return;
  var F = FORMS[A.sub], r = await db.from(F.t).delete().eq("id", id);
  if (r.error) { toast("حذف نشد: " + r.error.message); return; }
  await loadTable(A.sub); render();
}

/* ---------- برنامه در برابر واقعی ---------- */
function pPva() {
  var R = A.calc.R, g = S.g;
  if (!g.startDate) return '<div class="gap">برای مقایسه، تاریخ شروع تولید (ماه ۱ مدل) را در صفحهٔ «مدل و اهرم‌ها» ثبت کنید.</div>' + pvaPlanOnly();
  var ci = curMonthIdx(), n = Math.max(1, Math.min(R.rows.length, Math.max(ci || 1, 1)));
  var h = '<div class="card"><div class="chead"><div><h3>ماه‌به‌ماه تا امروز</h3><p class="hint">ماه ۱ = ' + jlabel(monthKeyOfIdx(1)) + '</p></div></div><div class="scroll"><table><thead><tr><th>ماه</th><th class="num">خوراک برنامه</th><th class="num">خوراک واقعی</th><th class="num">پودر برنامه</th><th class="num">پودر واقعی</th><th class="num">بازیافت واقعی</th><th class="num">درآمد برنامه</th><th class="num">فروش واقعی</th><th class="num">خالص برنامه</th><th class="num">خالص نقدی واقعی</th><th class="mid">وضعیت</th></tr></thead><tbody>';
  for (var i = 1; i <= n; i++) { var r = R.rows[i - 1], x = A.act.M[monthKeyOfIdx(i)] || { feed: 0, prod: 0, sales: 0, wS: 0, recv: 0, paid: 0, exp: 0 };
    var net = x.recv - x.paid - x.exp, ratio = r.prod > 0 ? x.prod / r.prod : null;
    var pill = ratio === null ? '<span class="pill">—</span>' : ratio >= .95 ? '<span class="pill p3">طبق برنامه</span>' : ratio >= .75 ? '<span class="pill p2">عقب</span>' : '<span class="pill p1">خیلی عقب</span>';
    h += '<tr><td>' + toFa(i) + ' · ' + jlabel(monthKeyOfIdx(i)) + '</td><td class="num">' + tn(r.feed) + '</td><td class="num">' + tn(x.feed) + '</td><td class="num">' + tn(r.prod) + '</td><td class="num">' + tn(x.prod) + '</td><td class="num">' + (x.feed ? p1(x.prod / x.feed) : "—") + '</td><td class="num">' + fmtB(r.rev) + '</td><td class="num">' + fmtB(x.sales + x.wS) + '</td><td class="num">' + fmtB(r.net) + '</td><td class="num' + (net < 0 ? " neg" : "") + '">' + fmtB(net) + '</td><td class="mid">' + pill + '</td></tr>'; }
  return h + '</tbody></table></div><p class="hint" style="margin-top:10px">خالص نقدی واقعی = وصولی فروش − پرداخت خرید − هزینه‌ها. خالص برنامه سربار ماهانه را هم کسر کرده است.</p></div>';
}
function pvaPlanOnly() { return '<div class="card"><div class="chead"><div><h3>برنامهٔ ماهانهٔ تولید</h3></div></div>' + lineChart([{ n: "پودر (تن)", c: "var(--deep)", bar: 1, v: A.calc.R.rows.map(function (r) { return r.prod; }) }, { n: "خوراک فراوری‌شده (تن)", c: "var(--amber)", v: A.calc.R.rows.map(function (r) { return r.feed; }) }], { x0: 1, raw: "تن" }) + '</div>'; }

/* ---------- جریان نقدی ---------- */
function pCash() {
  var C = A.calc, R = C.R, E = C.E, H = S.g.horizon;
  var h = '<div class="grid g3" style="margin-bottom:14px">' +
    kpi("بیشترین نقدینگی موردنیاز", fmtB(C.C.peak), uN(), "ماه اوج " + toFa(C.C.peakM), "", "▼") +
    kpi("جریان تجمعی پایان طرح", fmtB(C.C.endCum), uN(), "ماه " + toFa(H), C.C.endCum < 0 ? "neg" : "pos", "Σ") +
    kpi("ماه‌های با جریان منفی", toFa(C.C.neg), "ماه", C.C.firstNeg ? "اولین: ماه " + toFa(C.C.firstNeg) : "هیچ ماه منفی‌ای نیست", C.C.neg ? "warn" : "pos", "!") + '</div>' + dsoCard() + forecast13();
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>جریان نقدی ماهانه و تجمعی</h3><p class="hint">ستون‌ها: خالص هر ماه · خط: تجمعی سهامدار</p></div></div>' +
    lineChart([{ n: "خالص ماهانه", c: "var(--mint)", bar: 1, v: E.eq.slice(1, H + 1) }, { n: "تجمعی", c: "var(--deep)", v: E.cum.slice(1, H + 1) }], { x0: 1 }) + '</div>';
  h += '<div class="card"><div class="scroll"><table><thead><tr><th>ماه</th><th class="num">ورود مواد (تن)</th><th class="num">فراوری (تن)</th><th class="num">انبار (تن)</th><th class="num">پودر (تن)</th><th class="num">درآمد</th><th class="num">هزینه</th><th class="num">سربار</th><th class="num">مالیات</th><th class="num">تسهیلات</th><th class="num">خالص</th><th class="num">تجمعی</th></tr></thead><tbody>' +
    '<tr><td>۰</td><td colspan="9" style="color:var(--muted)">سرمایه‌گذاری ثابت' + (E.fin[0] ? " و دریافت وام" : "") + '</td><td class="num neg">' + fmt(E.eq[0]) + '</td><td class="num neg">' + fmt(E.cum[0]) + '</td></tr>' +
    R.rows.map(function (r, i) { var t = i + 1; return '<tr><td>' + toFa(t) + '</td><td class="num">' + tn(r.arrive) + '</td><td class="num">' + tn(r.feed) + '</td><td class="num">' + tn(r.backlog) + '</td><td class="num">' + tn(r.prod) + '</td><td class="num">' + fmt(r.rev) + '</td><td class="num">' + fmt(r.cost) + '</td><td class="num">' + fmt(r.oh) + '</td><td class="num">' + fmt(r.tax) + '</td><td class="num">' + fmt(E.fin[t] + E.shield[t]) + '</td><td class="num' + (E.eq[t] < 0 ? " neg" : "") + '">' + fmt(E.eq[t]) + '</td><td class="num' + (E.cum[t] < 0 ? " neg" : "") + '">' + fmt(E.cum[t]) + '</td></tr>'; }).join("") +
    '</tbody></table></div><p class="hint" style="margin-top:10px">مبالغ به ' + uN() + '.</p></div>';
  return h;
}

/* ---------- مدل ---------- */
function fieldHtml(path, f, obj) {
  var k = f[0], v = obj[k], lab = f[1].replace("(تومان)", "(" + uN() + ")"), ro = A.admin ? "" : " disabled";
  if (f[2] === "c") return '<label class="chk"><input type="checkbox" data-path="' + path + '" data-k="' + k + '" data-t="c"' + (v ? " checked" : "") + ro + '> ' + lab + '</label>';
  if (f[2] === "s") return '<div><label>' + lab + '</label><select data-path="' + path + '" data-k="' + k + '" data-t="s"' + ro + '>' + f[3].map(function (o) { return '<option value="' + o[0] + '"' + (v === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("") + '</select></div>';
  if (f[2] === "t") return '<div><label>' + lab + '</label><input data-path="' + path + '" data-k="' + k + '" data-t="t" value="' + esc(v) + '"' + ro + '></div>';
  var shown = f[2] === "m" ? (+v || 0) * um() : v;
  return '<div><label>' + lab + '</label><input class="money" inputmode="decimal" data-path="' + path + '" data-k="' + k + '" data-t="' + f[2] + '" value="' + fmtIn(shown) + '"' + ro + '></div>';
}
function liveBar() { var C = A.calc, P = C.P, R = C.R;
  return '<div class="live"><span>بازگشت سرمایه <b>' + (P.pb ? NF1.format(P.pb) + " ماه" : "—") + '</b></span><span>NPV <b>' + fmtB(R.npv) + '</b></span><span>IRR <b>' + (R.irr === null ? "—" : p1(R.irr)) + '</b></span><span>بهای خالص هر تن <b>' + fmtB(R.avgCost) + '</b></span><span>سربه‌سر <b>' + fmtB(C.be) + '</b></span><span>سود ماهانه <b>' + fmtB(R.totNet / R.H) + '</b></span></div>'; }
function pModel() {
  var g = S.g;
  var h = liveBar() + (A.admin ? "" : '<div class="gap">دسترسی شما فقط خواندنی است.</div>');
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>فرض‌های اصلی</h3><p class="hint">هر تغییر فوراً همهٔ صفحه‌ها را دوباره حساب می‌کند؛ برای ماندگاری «ذخیره» بزنید.</p></div></div><div class="frm">' +
    G_FIELDS.map(function (f) { return fieldHtml("g", f, g); }).join("") + '</div></div>';
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>راه‌اندازی و نقدینگی</h3></div></div><div class="frm">' +
    '<div><label>تاریخ شروع تولید (ماه ۱ مدل)</label><input id="sdate" value="' + (g.startDate ? toFa(formatJalali(g.startDate)) : "") + '" placeholder="مثل ۱۴۰۵/۱۰/۰۱"' + (A.admin ? "" : " disabled") + '></div>' +
    fieldHtml("g", ["cash0", "موجودی نقد در شروع (تومان)", "m"], g) + fieldHtml("g", ["dso", "دورهٔ وصول مطالبات (روز) — برای پیش‌بینی نقد", "n"], g) + '</div></div>';
  if (A.admin) h += '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sm" id="saveM">ذخیرهٔ مدل</button><button class="btn sm ghost" id="saveS">ذخیره به‌عنوان سناریو</button></div>';
  return h;
}
function pSources() {
  var h = liveBar();
  TYPES.forEach(function (t) {
    h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>' + TYPE_FA[t] + '</h3><p class="hint">' + toFa(S[t].length) + ' ردیف</p></div>' + (A.admin ? '<button class="more" data-add="' + t + '">+ افزودن</button>' : '') + '</div>';
    if (!S[t].length) h += '<div class="empty">ردیفی نیست.</div>';
    S[t].forEach(function (s, i) { var b = feedCost(t, s, S.g), m = S.g.price - b.perProductNet;
      h += '<div class="srow"><div class="shead"><b>' + esc(s.name) + '</b><span class="tag ' + (s.on === false ? "" : m >= 0 ? "up" : "down") + '">' + (s.on === false ? "غیرفعال" : "حاشیه هر تن " + fmtB(m)) + '</span>' +
        (A.admin ? '<button class="del" data-rm="' + t + ':' + i + '" title="حذف">✕</button>' : '') + '</div><div class="frm">' +
        fieldHtml(t + ":" + i, ["on", "فعال", "c"], s) + FIELDS[t].map(function (f) { return fieldHtml(t + ":" + i, f, s); }).join("") + '</div>' +
        '<p class="hint">بهای هر تن خوراک ' + fmtB(b.perFeed) + ' · بهای خالص هر تن پودر ' + fmtB(b.perProductNet) + '</p></div>'; });
    h += '</div>'; });
  if (A.admin) h += '<button class="btn sm" id="saveM">ذخیرهٔ مدل</button>';
  return h;
}
function pLoans() {
  var h = liveBar() + '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>تسهیلات</h3><p class="hint">' + (S.loans.length ? "" : "فعلاً هیچ تسهیلاتی ثبت نشده؛ همهٔ نیاز از آوردهٔ سهامدار است.") + '</p></div>' + (A.admin ? '<button class="more" data-add="loans">+ افزودن وام</button>' : '') + '</div>';
  S.loans.forEach(function (l, i) { var sc = loanSchedule(l);
    h += '<div class="srow"><div class="shead"><b>' + esc(l.name) + '</b>' + (sc ? '<span class="tag up">قسط ' + fmtB(sc.inst) + ' · سود کل ' + fmtB(sc.totInt) + ' · نرخ مؤثر ' + (sc.eff === null ? "—" : p1(sc.eff)) + '</span>' : '') +
      (A.admin ? '<button class="del" data-rm="loans:' + i + '">✕</button>' : '') + '</div><div class="frm">' + FIELDS.loans.map(function (f) { return fieldHtml("loans:" + i, f, l); }).join("") + '</div></div>'; });
  h += '</div>' + (A.admin ? '<button class="btn sm" id="saveM">ذخیرهٔ مدل</button>' : '');
  return h;
}

/* ---------- حساسیت ---------- */
function pSens() {
  var base = JSON.parse(JSON.stringify(S)), C0 = A.calc;
  function run(mut) { S = JSON.parse(JSON.stringify(base)); mut(S); var R = simulate(null), P = paybackInfo(null); S = base; return { pb: P.pb, npv: R.npv, end: R.end }; }
  function allSrc(fn) { return function (x) { TYPES.forEach(function (t) { x[t].forEach(fn); }); }; }
  var L = [
    ["قیمت فروش پودر ±۱۰٪", function (x) { x.g.price *= .9; }, function (x) { x.g.price *= 1.1; }],
    ["بازیافت همهٔ منابع ±۱۰٪ نسبی", allSrc(function (s) { s.rec *= .9; }), allSrc(function (s) { s.rec *= 1.1; })],
    ["تناژ ماهانهٔ بورس ±۲۰٪", function (x) { x.bourse.forEach(function (s) { s.tons *= .8; }); }, function (x) { x.bourse.forEach(function (s) { s.tons *= 1.2; }); }],
    ["قیمت خرید بورس ±۱۰٪", function (x) { x.bourse.forEach(function (s) { s.priceRial *= 1.1; }); }, function (x) { x.bourse.forEach(function (s) { s.priceRial *= .9; }); }],
    ["قیمت خوراک همهٔ منابع ±۵٪", allSrc(function (s) { if (s.price) s.price *= 1.05; if (s.priceRial) s.priceRial *= 1.05; if (s.contract) s.contract *= 1.05; }), allSrc(function (s) { if (s.price) s.price *= .95; if (s.priceRial) s.priceRial *= .95; if (s.contract) s.contract *= .95; })],
    ["قیمت فروش باطله ±۵۰٪", allSrc(function (s) { s.wprice = (+s.wprice || 0) * .5; }), allSrc(function (s) { s.wprice = (+s.wprice || 0) * 1.5; })],
    ["سربار ماهانه ±۲۰٪", function (x) { x.g.overhead *= 1.2; }, function (x) { x.g.overhead *= .8; }],
    ["هزینهٔ فراوری ±۲۰٪", function (x) { x.g.proc *= 1.2; }, function (x) { x.g.proc *= .8; }],
    ["سرمایهٔ ثابت ±۱۰٪", function (x) { x.g.invest *= 1.1; }, function (x) { x.g.invest *= .9; }]
  ].map(function (l) { var a = run(l[1]), b = run(l[2]); return { n: l[0], a: a, b: b, sw: Math.abs(b.npv - a.npv) }; }).sort(function (x, y) { return y.sw - x.sw; });
  var mx = L[0] ? L[0].sw : 1, n0 = C0.R.npv;
  var h = '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>اثر هر متغیر روی NPV و بازگشت سرمایه</h3><p class="hint">هر سطر فقط همان متغیر را بدتر/بهتر می‌کند؛ مرتب‌شده از پراثرترین. NPV پایه: ' + fmtB(n0) + '</p></div></div>';
  L.forEach(function (r) { var w = r.sw / mx * 100;
    h += '<div class="tor"><div class="tn">' + r.n + '</div><div class="tb"><span class="lo">' + fmtB(r.a.npv) + '</span><span class="track"><span class="fill" style="width:' + w + '%"></span></span><span class="hi">' + fmtB(r.b.npv) + '</span></div><div class="tp">بازگشت سرمایه: بدترین ' + (r.a.pb ? NF1.format(r.a.pb) : "—") + ' · بهترین ' + (r.b.pb ? NF1.format(r.b.pb) : "—") + ' ماه</div></div>'; });
  h += '</div>';
  A.pp = priceForPayback();
  h += '<div class="card"><h3>نقطه‌های تصمیم</h3><div class="grid g3" style="margin-top:12px">' +
    kpi("قیمت سربه‌سر عملیاتی", fmtB(C0.be), uN() + " بر تن", "زیر این، زیان نقدی ماهانه", "", "⚖") +
    kpi("قیمت لازم برای برگشت در مدت طرح", A.pp ? fmtB(A.pp) : "—", uN() + " بر تن", "مدت طرح " + toFa(S.g.horizon) + " ماه", "", "⇡") +
    kpi("بهای خالص میانگین هر تن", fmtB(C0.R.avgCost), uN(), "پس از کسر فروش باطله", "", "◆") + '</div></div>';
  h += valueTree();
  return h;
}

/* ---------- سناریوها ---------- */
function pScen() {
  var keep = S, h = '<div class="card"><div class="chead"><div><h3>سناریوهای ذخیره‌شده</h3><p class="hint">«بارگذاری» سناریو را در مدل می‌آورد؛ تا «ذخیره» نزنید مدل اصلی عوض نمی‌شود.</p></div></div><div class="scroll"><table><thead><tr><th>نام</th><th>تاریخ</th><th class="num">قیمت</th><th class="num">بازگشت (ماه)</th><th class="num">NPV</th><th>توضیح</th><th></th></tr></thead><tbody>';
  A.scen.forEach(function (s) { S = JSON.parse(JSON.stringify(s.data)); var R = simulate(null), P = paybackInfo(null), pr = S.g.price; S = keep;
    h += '<tr><td><b>' + esc(s.name) + '</b></td><td>' + jd(s.created_at.slice(0, 10)) + '</td><td class="num">' + fmtB(pr) + '</td><td class="num">' + (P.pb ? NF1.format(P.pb) : "—") + '</td><td class="num' + (R.npv < 0 ? " neg" : "") + '">' + fmtB(R.npv) + '</td><td>' + esc(s.note || "") + '</td><td style="white-space:nowrap"><button class="more" data-load="' + s.id + '">بارگذاری</button> ' + (A.admin ? '<button class="del" data-sdel="' + s.id + '">✕</button>' : '') + '</td></tr>'; });
  if (!A.scen.length) h += '<tr><td colspan="7" class="mid">سناریویی ذخیره نشده.</td></tr>';
  return h + '</tbody></table></div></div>';
}
function pGuide() {
  return '<div class="card guide"><h3>این داشبورد چطور کار می‌کند</h3>' +
    '<p><b>دو نوع عدد داریم.</b> «برنامه» از مدل امکان‌سنجی حساب می‌شود (همان منطق فایل امکان‌سنجی و گوگل‌شیت). «واقعی» از چیزهایی می‌آید که در «ثبت روزانه» وارد می‌کنید.</p>' +
    '<p><b>کار روزانه بعد از شروع تولید:</b> هر روز تولید (خوراک، پودر، عیار، توقف) را ثبت کنید؛ هر فروش و هر خرید خوراک و هر هزینه را هم. صفحهٔ «وضعیت کارخانه» و «برنامه در برابر واقعی» خودکار به‌روز می‌شوند.</p>' +
    '<p><b>تصمیم‌گیری:</b> در «مدل و اهرم‌ها»، «منابع خوراک» و «تسهیلات» هر عددی را عوض کنید؛ همهٔ صفحه‌ها فوراً با عدد جدید حساب می‌شوند. اگر خواستید نگه دارید «ذخیره» یا «ذخیره به‌عنوان سناریو» بزنید؛ وگرنه «لغو تغییرات».</p>' +
    '<p><b>تحلیل حساسیت</b> نشان می‌دهد کدام متغیر بیشترین اثر را روی ارزش طرح دارد تا تمرکز مدیریتی را همان‌جا بگذارید.</p>' +
    '<p><b>واحد پول:</b> دکمهٔ بالای صفحه بین تومان و ریال جابه‌جا می‌کند. همه‌چیز به تومان ذخیره می‌شود.</p>' +
    '<p><b>داده‌ها</b> در Supabase (جدول‌های bf_model، bf_scenarios، bf_production، bf_sales، bf_purchases، bf_expenses) و فقط برای کاربران واردشده قابل دیدن است. نسخه ' + BUILD + '.</p></div>';
}

/* ---------- اتصال رویدادها ---------- */
function bind() {
  bindPlan(); bindAssume();
  Array.prototype.forEach.call(document.querySelectorAll("[data-go]"), function (b) { b.onclick = function () { go(b.dataset.go); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-sub]"), function (b) { b.onclick = function () { A.sub = b.dataset.sub; buildNav(); render(); }; });
  Array.prototype.forEach.call(document.querySelectorAll("input.money"), function (el) { el.addEventListener("input", function () { reformat(el); }); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-del]"), function (b) { b.onclick = function () { delRow(+b.dataset.del); }; });
  if ($("addRow")) $("addRow").onclick = addRow;
  Array.prototype.forEach.call(document.querySelectorAll("[data-path]"), function (el) {
    el.addEventListener("change", function () {
      var p = el.dataset.path, k = el.dataset.k, t = el.dataset.t, obj = p === "g" ? S.g : S[p.split(":")[0]][+p.split(":")[1]];
      var v = t === "c" ? el.checked : t === "s" || t === "t" ? el.value : num(el.value);
      if (t === "m") v = v / um();
      obj[k] = v; A.dirty = true; render(); });
  });
  if ($("sdate")) $("sdate").onchange = function () { var v = $("sdate").value.trim(); S.g.startDate = v ? parseJ(v) || "" : ""; A.dirty = true; render(); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-add]"), function (b) { b.onclick = function () { var t = b.dataset.add;
    var tpl = t === "loans" ? { name: "وام جدید", amount: 0, rate: 23, use: "wc", start: 1, grace: 0, graceMode: "pay", term: 12, method: "annuity", fee: 0, dep: 0, on: true }
      : JSON.parse(JSON.stringify(DEFAULTS[t][0])); tpl.id = nid(); if (t !== "loans") { tpl.name = TYPE_FA[t] + " جدید"; tpl.on = true; }
    S[t].push(tpl); A.dirty = true; render(); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-rm]"), function (b) { b.onclick = function () { var p = b.dataset.rm.split(":");
    if (!confirm("این ردیف از مدل حذف شود؟")) return; S[p[0]].splice(+p[1], 1); A.dirty = true; render(); }; });
  Array.prototype.forEach.call(document.querySelectorAll("#saveM"), function (b) { b.onclick = saveModel; });
  if ($("saveS")) $("saveS").onclick = saveScenario;
  Array.prototype.forEach.call(document.querySelectorAll("[data-load]"), function (b) { b.onclick = function () {
    var s = A.scen.filter(function (x) { return x.id === b.dataset.load; })[0]; S = JSON.parse(JSON.stringify(s.data)); A.dirty = true; go("home"); toast("سناریو «" + s.name + "» بارگذاری شد — هنوز ذخیره نشده."); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-sdel]"), function (b) { b.onclick = async function () {
    if (!confirm("سناریو حذف شود؟")) return; await db.from("bf_scenarios").delete().eq("id", b.dataset.sdel); await loadScen(); render(); }; });
}
async function saveModel() {
  var diff = modelDiff(A.model.data || {}, S);
  var r = await db.from("bf_model").upsert({ id: 1, data: S, updated_at: new Date().toISOString() }).select().single();
  if (r.error) { toast("ذخیره نشد: " + r.error.message); return; }
  if (diff.length) await db.from("bf_model_log").insert(diff.map(function (d) { return { by_name: A.name, item: d[0], old_value: d[1], new_value: d[2] }; }));
  await loadLog(); A.model = r.data; A.dirty = false; render(); toast("ذخیره شد" + (diff.length ? " — " + toFa(diff.length) + " تغییر در تاریخچه" : "") + ".");
}
async function saveScenario() {
  var n = prompt("نام سناریو:"); if (!n) return; var note = prompt("توضیح کوتاه (اختیاری):") || null;
  var r = await db.from("bf_scenarios").insert({ name: n, note: note, data: S });
  if (r.error) { toast("ذخیره نشد: " + r.error.message); return; }
  await loadScen(); toast("سناریو ذخیره شد.");
}
function toast(t) { var el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("on"); }, 2600); }

/* ---------- بارگذاری داده ---------- */
var TBL = { prod: "bf_production", sales: "bf_sales", purch: "bf_purchases", exp: "bf_expenses" };
async function loadTable(k) { var r = await db.from(TBL[k]).select("*").order("d", { ascending: false }).order("id", { ascending: false }).limit(5000); A[k] = r.data || []; }
async function loadScen() { var r = await db.from("bf_scenarios").select("*").order("created_at", { ascending: false }); A.scen = r.data || []; }
async function loadAll() {
  var r = await db.from("bf_model").select("*").eq("id", 1).maybeSingle();
  if (r.error) throw r.error;
  A.model = r.data || { data: fresh() };
  if (!A.dirty) S = JSON.parse(JSON.stringify(A.model.data));
  ["loans", "fg", "stock", "mines", "buys", "bourse"].forEach(function (k) { if (!S[k]) S[k] = []; });
  await Promise.all([loadTable("prod"), loadTable("sales"), loadTable("purch"), loadTable("exp"), loadScen(), loadPlan(), loadLog()]);
  A.loadedAt = new Date();
}

/* ---------- ورود ---------- */
function anote(t, k) { var n = $("anote"); n.textContent = t; n.className = "note " + k; }
$("go").onclick = async function () {
  var b = $("go"); b.disabled = true; b.textContent = "در حال ورود…";
  try { await ensureDb(); } catch (e) { b.disabled = false; b.textContent = "ورود"; anote("کتابخانهٔ برنامه بارگذاری نشد — اینترنت را بررسی کنید.", "err"); return; }
  var r = await db.auth.signInWithPassword({ email: $("em").value.trim().toLowerCase(), password: $("pw").value.trim() });
  b.disabled = false; b.textContent = "ورود";
  if (r.error) { anote(/Invalid login/i.test(r.error.message) ? "ایمیل یا رمز عبور درست نیست." : "ورود ناموفق — " + r.error.message, "err"); return; }
  try { localStorage.setItem("sayanik_email", $("em").value.trim().toLowerCase()); } catch (e) {}
  start();
};
$("pw").addEventListener("keydown", function (e) { if (e.key === "Enter") $("go").click(); });
try { var le = localStorage.getItem("sayanik_email"); if (le) $("em").value = le; } catch (e) {}

async function start() {
  await ensureDb();
  var s = await db.auth.getSession(); if (!s.data.session) { $("auth").classList.remove("hide"); $("boot").classList.add("hide"); return; }
  A.me = s.data.session.user;
  $("auth").classList.add("hide"); $("boot").classList.remove("hide");
  var dr = await db.rpc("dash_role", { p_key: "barite" }), role = dr.data || null;
  if (!role) { $("boot").innerHTML = '<div class="empty">دسترسی شما (' + esc(A.me.email) + ') به داشبورد تصمیم کارخانه فعال نیست. از مدیر بخواهید در «کنسول مدیریت دسترسی» برایتان فعال کند.<br><br><button class="more" id="lo2">خروج و ورود با حساب دیگر</button></div>';
    $("lo2").onclick = async function () { await db.auth.signOut(); location.reload(); }; return; }
  A.role = role; A.admin = role === "editor" || role === "admin";
  var p = await db.from("profiles").select("full_name").eq("id", A.me.id).maybeSingle();
  A.name = (p.data && p.data.full_name) || A.me.email;
  SayaApps.render(db, $("apps"), "barite", "../");
  $("meNm").textContent = A.name; $("meRl").textContent = { admin: "مدیر", editor: "ویرایش", viewer: "مشاهده" }[role]; $("meAv").textContent = (A.name || "؟").trim().charAt(0);
  try { await loadAll(); } catch (e) { $("boot").innerHTML = '<div class="empty">داده بارگذاری نشد: ' + esc(e.message || e) + '</div>'; return; }
  var h = (location.hash || "").slice(1); h = PAGE_ALIAS[h] || h; if (PAGES.some(function (x) { return x.k === h; })) A.page = h;
  $("boot").classList.add("hide"); $("app").classList.remove("hide");
  buildNav(); render();
}
start().catch(function () { $("auth").classList.remove("hide"); $("boot").classList.add("hide"); });
