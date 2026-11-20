/* پایش برنامهٔ رشد ۵ ساله (۱۴۰۶–۱۴۱۰): ۱۹ بُعد هشدار زودهنگام، دروازه‌ها و اقدام‌ها،
   درخت محرک‌های ارزش، پیش‌بینی نقدی ۱۳ هفته‌ای و اثر دورهٔ وصول.
   به app.js تکیه دارد (A، S، fmt، fmtB، ...). */

/* ---------- ابزار ---------- */
function daysAgo(iso) { return (Date.now() - new Date(iso).getTime()) / 864e5; }
function within(rows, days) { return rows.filter(function (r) { return daysAgo(r.d) <= days; }); }
function sum(rows, f) { return rows.reduce(function (a, r) { return a + (+(typeof f === "function" ? f(r) : r[f]) || 0); }, 0); }
function shareTop(rows, key, val) {
  var m = {}, tot = 0; rows.forEach(function (r) { var k = r[key] || "نامشخص", v = +(typeof val === "function" ? val(r) : r[val]) || 0; m[k] = (m[k] || 0) + v; tot += v; });
  var best = null; Object.keys(m).forEach(function (k) { if (!best || m[k] > m[best]) best = k; });
  return tot > 0 ? { name: best, share: m[best] / tot, n: Object.keys(m).length } : null;
}
/* سهم هر منبع از کل خوراک مدل در مدت طرح */
function planSourceShare() {
  var H = S.g.horizon, tot = 0, list = [];
  TYPES.forEach(function (t) { if (t === "fg") return; S[t].forEach(function (s) { if (s.on === false || !(+s.tons > 0)) return;
    var months = Math.max(0, H - (+s.start || 1) + 1); if (!isInv(t) && +s.dur > 0) months = Math.min(months, +s.dur);
    var q = isInv(t) ? Math.min(+s.qty || 0, s.tons * months) : s.tons * months; tot += q; list.push({ name: s.name, q: q }); }); });
  list.sort(function (a, b) { return b.q - a.q; });
  return tot > 0 && list.length ? { name: list[0].name, share: list[0].q / tot } : null;
}
/* موجودی خوراک در انبار = موجودی اولیهٔ مدل + خرید ثبت‌شده − خوراک فراوری‌شده */
function feedOnHand() {
  var init = 0; (S.stock || []).forEach(function (s) { if (s.on !== false) init += +s.qty || 0; });
  return init + sum(A.purch, "tons") - sum(A.prod, "feed_t");
}
function monthlyUtil() { // [{k, util}] ماه‌های ثبت‌شده، قدیمی به جدید
  return Object.keys(A.act.M).map(Number).sort().map(function (k) { return { k: k, u: S.g.capacity > 0 ? A.act.M[k].feed / S.g.capacity : null }; });
}

/* ---------- اثر دورهٔ وصول بر نقدینگی ---------- */
function withDso(days) {
  var R = A.calc.R, E = A.calc.E, lag = Math.max(0, +days || 0) / 30, n = R.rows.length;
  var rev = R.rows.map(function (r) { return r.rev; });
  function cashRev(i) { var a = Math.floor(lag), f = lag - a, x = 0; // درآمد ماه i با تأخیر lag ماه وصول می‌شود
    if (i - a >= 0) x += rev[i - a] * (1 - f); if (f > 0 && i - a - 1 >= 0) x += rev[i - a - 1] * f; return x; }
  var eq = [E.eq[0]], cum = [E.cum[0]], c = E.cum[0];
  for (var t = 1; t <= n; t++) { var v = E.eq[t] - rev[t - 1] + cashRev(t - 1); eq.push(v); c += v; cum.push(c); }
  return cashStats(eq, cum, S.g.horizon);
}

/* ---------- ۱۹ بُعد ---------- */
var DIMS = [
  { k: "feed", n: "خوراک", ind: "سهم بزرگ‌ترین منبع؛ روزهای پوشش انبار", it: "بیش از ۵۰٪ از یک منبع ← قرارداد با معدن‌های کوچک", auto: function () {
      var a = shareTop(within(A.prod, 90), "source", "feed_t"), p = planSourceShare(), oh = feedOnHand(), d30 = sum(within(A.prod, 30), "feed_t") / 30;
      var sh = a ? a.share : p ? p.share : null, cover = d30 > 0 ? oh / d30 : null;
      var st = sh === null ? "na" : sh > .5 ? "bad" : sh > .4 ? "warn" : "ok"; if (cover !== null && cover < 15) st = "bad"; else if (cover !== null && cover < 30 && st === "ok") st = "warn";
      return { st: st, v: (sh === null ? "—" : p1(sh) + " از «" + esc(a ? a.name : p.name) + "»" + (a ? "" : " (برنامه)")) + (cover === null ? "" : " · پوشش انبار " + tn(cover) + " روز") }; } },
  { k: "market", n: "بازار و مشتری", ind: "سهم بزرگ‌ترین مشتری؛ سفارش‌های قطعی آینده", it: "سفارش قطعی بیش از ظرفیت ← ظرفیت جدید", auto: function () {
      var a = shareTop(within(A.sales.filter(function (r) { return r.kind !== "باطله"; }), 90), "customer", "amount");
      if (!a) return { st: "na", v: "فروشی در ۹۰ روز اخیر ثبت نشده" };
      return { st: a.share > .5 ? "bad" : a.share > .3 ? "warn" : "ok", v: p1(a.share) + " از «" + esc(a.name) + "» · " + toFa(a.n) + " مشتری" }; } },
  { k: "quality", n: "کیفیت", ind: "انطباق با API 13A؛ درصد مرجوعی", it: "هر مرجوعی ← ریشه‌یابی در همان هفته", auto: function () {
      var p = within(A.prod, 30).filter(function (r) { return r.sg !== null && r.sg !== undefined && r.sg !== ""; }), ok = p.filter(function (r) { return +r.sg >= S.g.targetSg; }).length;
      var s90 = within(A.sales, 90), ret = sum(s90, "returned_t"), sold = sum(s90, "tons");
      if (!p.length && !sold) return { st: "na", v: "دادهٔ کیفیت ثبت نشده" };
      var c = p.length ? ok / p.length : null, rr = sold ? ret / sold : 0;
      return { st: rr > 0 ? "bad" : c !== null && c < .95 ? "warn" : "ok", v: (c === null ? "" : "انطباق عیار " + p1(c)) + " · مرجوعی " + p1(rr) }; } },
  { k: "capacity", n: "ظرفیت", ind: "درصد بهره‌برداری آسیاب", it: "۳ ماه پیاپی بالای ۷۰٪ ← پروندهٔ وام آسیاب بعدی", auto: function () {
      var u = monthlyUtil(), R = A.calc.R, plan = R.totFeed / (S.g.capacity * R.H);
      if (!u.length) return { st: plan < .7 ? "ok" : "warn", v: "برنامه: میانگین " + p1(plan) + " — آسیاب دوم با این مدل توجیه ندارد" };
      var last = u.slice(-3), run = last.length === 3 && last.every(function (x) { return x.u > .7; });
      return { st: run ? "warn" : "ok", v: "ماه آخر " + p1(u[u.length - 1].u) + " · برنامه " + p1(plan) + (run ? " — سه ماه بالای ۷۰٪: وقت پروندهٔ آسیاب دوم" : "") }; } },
  { k: "finance", n: "مالی", ind: "چرخهٔ تبدیل نقد؛ مطالبات معوق؛ هفته‌های پوشش نقد", it: "خط اعتباری پیش از نیاز باز شود", auto: function () {
      var T = A.act.T, s90 = sum(within(A.sales, 90), "amount"), dso = s90 > 0 ? T.ar / (s90 / 90) : null;
      var out90 = sum(within(A.purch, 90), "paid") + sum(within(A.exp, 90), "amount"), wk = out90 > 0 ? T.cash / (out90 / 13) : null;
      if (dso === null && wk === null) return { st: "na", v: "هنوز گردش نقدی ثبت نشده" };
      var st = wk !== null && wk < 8 ? "bad" : (dso !== null && dso > 60) || (wk !== null && wk < 13) ? "warn" : "ok";
      return { st: st, v: (dso === null ? "" : "دورهٔ وصول " + tn(dso) + " روز") + (wk === null ? "" : " · پوشش نقد " + NF1.format(wk) + " هفته") }; } },
  { k: "people", n: "نیرو و سازمان", ind: "فرایندهای مستند؛ جانشین نقش‌های حساس", it: "پیش از افزایش ظرفیت، نفر دوم آماده باشد" },
  { k: "legal", n: "حقوقی و مجوز", ind: "تاریخ انقضا؛ مالیات و بیمه", it: "تقویم تمدید؛ پرونده‌ها همیشه بسته" },
  { k: "chain", n: "زنجیرهٔ ارزش", ind: "سهم ما از ارزش معدن تا مصرف", it: "هر مرحله شرط ورود مکتوب داشته باشد" },
  { k: "energy", n: "انرژی", ind: "ساعت محدودیت برق؛ سهم برق در بهای تمام‌شده", it: "پیش از تابستان انبار پر شود", auto: function () {
      var p = within(A.prod, 30); if (!p.length) return { st: "na", v: "تولیدی ثبت نشده" };
      var h = sum(p, "downtime_h"); return { st: h > 72 ? "bad" : h > 24 ? "warn" : "ok", v: "توقف ۳۰ روز اخیر: " + NF1.format(h) + " ساعت" }; } },
  { k: "logistics", n: "لجستیک", ind: "هزینهٔ حمل هر تن", it: "افزایش پایدار ← انبار میانی یا ریل", auto: function () {
      var p = within(A.purch, 90), t = sum(p, "tons"); var mf = 0, mt = 0; A.calc.R.src.forEach(function (x) { mf += (+x.s.freight || 0) * x.s.tons; mt += +x.s.tons; });
      var plan = mt ? mf / mt : null; if (!t) return { st: "na", v: "برنامه: " + fmtB(plan) + " هر تن" };
      var a = sum(p, "freight") / t; return { st: plan && a > plan * 1.15 ? "warn" : "ok", v: "واقعی " + fmtB(a) + " · برنامه " + fmtB(plan) + " هر تن" }; } },
  { k: "rivals", n: "رقبا", ind: "ظرفیت، منبع خوراک و قیمت پیشنهادی رقبا", it: "رقیب در تنگنا ← فرصت خرید یا ادغام" },
  { k: "policy", n: "سیاست‌گذاری", ind: "بورس کالا، حقوق دولتی، عوارض صادرات", it: "پایش هفتگی توسط یک مسئول" },
  { k: "macro", n: "ارز و کلان", ind: "فاصلهٔ قیمت داخلی و صادراتی؛ تورم هزینه", it: "قرارداد با بند تعدیل قیمت" },
  { k: "tech", n: "فناوری", ind: "تن در ساعت به ازای کیلووات؛ ضایعات", it: "پایلوت فرآوری سنگ کم‌عیار" },
  { k: "service", n: "خدمات فنی گل حفاری", ind: "مراجعهٔ فنی مشتری؛ قرارداد تکراری", it: "فروش پودر ← همراهی فنی" },
  { k: "hse", n: "HSE", ind: "گردوغبار، حادثه، اخطار محیط زیست", it: "غبارگیر؛ ایزو ۱۴۰۰۱ و ۴۵۰۰۱" },
  { k: "gov", n: "حاکمیت", ind: "شفافیت نقش‌ها و سهم‌ها؛ سرعت تصمیم", it: "پیش از وام یا شریک، همه‌چیز مکتوب" },
  { k: "brand", n: "برند و اعتبار", ind: "حضور در وندور لیست؛ معرفی مشتریان", it: "ثبت در وندور لیست از همین امروز" },
  { k: "know", n: "دانش و آموزش", ind: "دانش مکتوب در برابر دانش در ذهن افراد", it: "دوره‌های آکادمی برای اپراتور و QC" }
];
var ST = { ok: ["p3", "خوب"], warn: ["p2", "هشدار"], bad: ["p1", "خطر"], na: ["", "بدون داده"] };
function watchRow(k) { return A.watch.filter(function (w) { return w.key === k; })[0] || null; }
function dimState(d) { var a = d.auto ? d.auto() : null, m = watchRow(d.k);
  var st = m && m.status !== "na" ? m.status : a ? a.st : "na";
  if (a && m && m.status !== "na" && rank(a.st) > rank(m.status)) st = a.st; // خودکار بدتر را پنهان نکند
  return { st: st, v: a ? a.v : (m && m.value) || "", m: m }; }
function rank(s) { return { na: 0, ok: 1, warn: 2, bad: 3 }[s] || 0; }

function pWatch() {
  var all = DIMS.map(function (d) { return { d: d, s: dimState(d) }; }), c = { ok: 0, warn: 0, bad: 0, na: 0 };
  all.forEach(function (x) { c[x.s.st]++; });
  var h = '<div class="grid g3" style="margin-bottom:14px">' +
    kpi("بُعدهای در خطر", toFa(c.bad), "از ۱۹", "نیاز به اقدام همین ماه", c.bad ? "neg" : "pos", "✕") +
    kpi("بُعدهای در هشدار", toFa(c.warn), "از ۱۹", "در جلسهٔ ماهانه بررسی شود", c.warn ? "warn" : "pos", "!") +
    kpi("بُعدهای بدون داده", toFa(c.na), "از ۱۹", "«کجا ممکن است نابینا باشیم؟»", "", "?") + '</div>';
  h += '<div class="gap">آستانه‌ها پیشنهادی برنامهٔ ۵ ساله‌اند و باید در سال اول با دادهٔ واقعی تنظیم شوند. ۹ بُعد از ثبت روزانه و مدل خودکار حساب می‌شوند؛ بقیه را مسئول هر بُعد ماهانه به‌روز می‌کند.</div>';
  h += '<div class="wgrid">' + all.map(function (x, i) { var d = x.d, s = x.s;
    return '<div class="wcard ' + s.st + '"><div class="wh"><span class="wn">' + toFa(i + 1) + '</span><b>' + d.n + '</b><span class="pill ' + ST[s.st][0] + '">' + ST[s.st][1] + '</span>' + (d.auto ? '<span class="auto">خودکار</span>' : '') + '</div>' +
      '<p class="wi">شاخص: ' + d.ind + '</p>' + (s.v ? '<p class="wv">' + s.v + '</p>' : '') + '<p class="wt">اگر/آنگاه: ' + d.it + '</p>' +
      (s.m && s.m.note ? '<p class="wnote">' + esc(s.m.note) + ' <span>· ' + jd(String(s.m.updated_at).slice(0, 10)) + '</span></p>' : '') +
      (A.admin ? '<div class="wedit"><select data-wst="' + d.k + '">' + ["na", "ok", "warn", "bad"].map(function (o) { return '<option value="' + o + '"' + (s.m && s.m.status === o ? " selected" : "") + '>' + (o === "na" ? (d.auto ? "خودکار" : "بدون ارزیابی") : ST[o][1]) + '</option>'; }).join("") + '</select>' +
        '<input data-wnote="' + d.k + '" placeholder="یادداشت یا عدد این ماه" value="' + esc(s.m && s.m.note || "") + '"><button class="more" data-wsave="' + d.k + '">ثبت</button></div>' : '') + '</div>'; }).join("") + '</div>';
  return h;
}
async function saveWatch(k) {
  var o = { key: k, status: document.querySelector('[data-wst="' + k + '"]').value, note: document.querySelector('[data-wnote="' + k + '"]').value.trim() || null, updated_at: new Date().toISOString() };
  var r = await db.from("bf_watch").upsert(o); if (r.error) { toast("ثبت نشد: " + r.error.message); return; }
  await loadPlan(); render(); toast("ثبت شد.");
}

/* ---------- دروازه‌ها و اقدام‌ها ---------- */
var GRP_ORDER = ["۹۰ روز اول", "سال اول ۱۴۰۶", "فرض‌های مدل مالی", "فرض‌های برنامه"];
function pGates() {
  var g = {}; A.tasks.forEach(function (t) { (g[t.grp] = g[t.grp] || []).push(t); });
  var keys = Object.keys(g).sort(function (a, b) { var x = GRP_ORDER.indexOf(a), y = GRP_ORDER.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
  var h = '<div class="gap">از سند «نقشهٔ راه رشد ۵ ساله». هر سال یک دروازه دارد؛ تا شرط‌های آن برقرار نشود، تعهدهای بزرگ مرحلهٔ بعد شروع نمی‌شود. فرض‌ها هر سال در کارگاه گره اصلی مرور شوند.</div>';
  keys.forEach(function (k) { var L = g[k], done = L.filter(function (t) { return t.done; }).length;
    h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>' + esc(k) + '</h3><p class="hint">' + toFa(done) + ' از ' + toFa(L.length) + (k.indexOf("فرض") === 0 ? ' تأییدشده' : ' انجام‌شده') + '</p></div>' +
      (A.admin ? '<button class="more" data-tadd="' + esc(k) + '">+ افزودن</button>' : '') + '</div><div class="ptn" style="padding:0;border:0;box-shadow:none"><div class="meter"><i style="width:' + (L.length ? done / L.length * 100 : 0) + '%"></i></div></div>';
    h += L.map(function (t) { return '<div class="task' + (t.done ? " done" : "") + '"><label class="tck"><input type="checkbox" data-tdone="' + t.id + '"' + (t.done ? " checked" : "") + (A.admin ? "" : " disabled") + '><span class="tk ' + (t.kind === "دروازه" ? "gate" : t.kind === "فرض" ? "asm" : "") + '">' + esc(t.kind) + '</span>' + esc(t.title) + '</label>' +
      '<div class="tmeta">' + (A.admin ? '<input data-towner="' + t.id + '" placeholder="مسئول" value="' + esc(t.owner || "") + '"><input data-tdue="' + t.id + '" placeholder="موعد ۱۴۰۶/۰۱/۳۱" value="' + (t.due ? toFa(formatJalali(t.due)) : "") + '">' :
        (t.owner ? '<span>' + esc(t.owner) + '</span>' : '') + (t.due ? '<span>' + jd(t.due) + '</span>' : '')) +
      (t.due && !t.done && t.due < todayIso() ? '<span class="pill p1">دیر شده</span>' : '') + '</div></div>'; }).join("") + '</div>'; });
  return h;
}
async function taskUpd(id, o) { o.updated_at = new Date().toISOString(); var r = await db.from("bf_tasks").update(o).eq("id", id); if (r.error) { toast("ثبت نشد: " + r.error.message); return false; } await loadPlan(); render(); return true; }

/* ---------- درخت محرک‌های ارزش ---------- */
function valueTree() {
  var base = JSON.parse(JSON.stringify(S)), R0 = A.calc.R, P0 = A.calc.P;
  function run(mut) { S = JSON.parse(JSON.stringify(base)); mut(S); var R = simulate(null), P = paybackInfo(null); S = base; return { npv: R.npv, pb: P.pb }; }
  function feed(fn) { return function (x) { TYPES.forEach(function (t) { x[t].forEach(fn); }); }; }
  var dso0 = +S.g.dso || 0, c0 = withDso(dso0), c15 = withDso(Math.max(0, dso0 - 15));
  var D = [
    ["قیمت و ترکیب گرید", "مدیر فروش", "قیمت فروش ۵٪ بیشتر (گرید تضمینی)", run(function (x) { x.g.price *= 1.05; })],
    ["هزینهٔ خوراک هر تن", "تأمین", "خوراک همهٔ منابع ۵٪ ارزان‌تر (پیش‌خرید)", run(feed(function (s) { if (s.price) s.price *= .95; if (s.priceRial) s.priceRial *= .95; if (s.contract) s.contract *= .95; }))],
    ["بازیافت و فرآوری", "تولید", "بازیافت یک واحد درصد بیشتر", run(feed(function (s) { if (s.rec) s.rec += 1; }))],
    ["برق و فراوری هر تن", "تولید و لجستیک", "هزینهٔ فراوری ۱۰٪ کمتر", run(function (x) { x.g.proc *= .9; })],
    ["نیرو و سربار", "مدیرعامل", "سربار ماهانه ۱۰٪ کمتر", run(function (x) { x.g.overhead *= .9; })],
    ["فروش باطله", "مدیر فروش", "قیمت باطله ۱۰٪ بیشتر", run(feed(function (s) { s.wprice = (+s.wprice || 0) * 1.1; }))]
  ];
  var h = '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>درخت محرک‌های ارزش</h3><p class="hint">هر مدیر بداند عدد او چطور روی ارزش اثر می‌گذارد — از فصل ارزش‌گذاری برنامهٔ ۵ ساله</p></div></div><div class="scroll"><table><thead><tr><th>محرک</th><th>مسئول</th><th>گام بهبود</th><th class="num">اثر بر NPV</th><th class="num">بازگشت سرمایه (ماه)</th></tr></thead><tbody>' +
    D.map(function (d) { return '<tr><td><b>' + d[0] + '</b></td><td>' + d[1] + '</td><td>' + d[2] + '</td><td class="num">+' + fmtB(d[3].npv - R0.npv) + '</td><td class="num">' + (P0.pb ? NF1.format(P0.pb) : "—") + ' ← ' + (d[3].pb ? NF1.format(d[3].pb) : "—") + '</td></tr>'; }).join("") +
    '<tr><td><b>دورهٔ وصول مطالبات</b></td><td>مالی</td><td>۱۵ روز وصول سریع‌تر</td><td class="num">اوج نیاز نقد −' + fmtB(c0.peak - c15.peak) + '</td><td class="num">—</td></tr>' +
    '</tbody></table></div><p class="hint" style="margin-top:10px">بازده سرمایه (IRR در مدت طرح) ' + (R0.irr === null ? "—" : p1(R0.irr)) + ' در برابر هزینهٔ سرمایه ' + toFa(S.g.disc) + '٪: ' + (R0.irr !== null && R0.irr * 100 >= S.g.disc ? "رشد ارزش‌ساز است." : "طبق قاعدهٔ دروازهٔ سالانه، تا اصلاح بازده، رشد بیشتر مجاز نیست.") + '</p></div>';
  return h;
}

/* ---------- پیش‌بینی ۱۳ هفته‌ای ---------- */
function forecast13() {
  var R = A.calc.R, E = A.calc.E, ci = curMonthIdx(), T = A.act.T, dso = +S.g.dso || 0;
  var startIdx = ci && ci >= 1 ? ci : 1, cash = T.cash, rows = [], k = 4.345;
  var arWeekly = T.ar > 0 ? T.ar / Math.max(1, Math.ceil((dso || 30) / 7)) : 0, arLeft = T.ar;
  for (var w = 1; w <= 13; w++) {
    var mi = Math.min(R.rows.length, startIdx + Math.floor((w - 1) / k)), r = R.rows[mi - 1];
    var lagW = Math.round(dso / 7), revIn = w > lagW ? r.rev / k : 0, col = Math.min(arLeft, arWeekly); arLeft -= col;
    var out = (r.cost + r.oh + r.tax) / k - (E.fin[mi] || 0) / k, inn = revIn + col, open = cash; cash += inn - out;
    rows.push([w, mi, open, inn, out, cash]);
  }
  var low = Math.min.apply(null, rows.map(function (x) { return x[5]; })), firstNeg = rows.filter(function (x) { return x[5] < 0; })[0];
  return '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>پیش‌بینی نقدی ۱۳ هفته‌ای</h3><p class="hint">از موجودی نقد امروز؛ ورودی و خروجی هفتگی از ماه جاری مدل؛ دورهٔ وصول ' + toFa(dso) + ' روز</p></div>' +
    '<span class="pill ' + (firstNeg ? "p1" : low < T.cash * .3 ? "p2" : "p3") + '">' + (firstNeg ? "منفی از هفتهٔ " + toFa(firstNeg[0]) : "بدون کسری") + '</span></div><div class="scroll"><table><thead><tr><th>هفته</th><th>ماه مدل</th><th class="num">ابتدای هفته</th><th class="num">ورودی</th><th class="num">خروجی</th><th class="num">پایان هفته</th></tr></thead><tbody>' +
    rows.map(function (x) { return '<tr><td>' + toFa(x[0]) + '</td><td>' + toFa(x[1]) + '</td><td class="num">' + fmtB(x[2]) + '</td><td class="num">' + fmtB(x[3]) + '</td><td class="num">' + fmtB(x[4]) + '</td><td class="num' + (x[5] < 0 ? " neg" : "") + '">' + fmtB(x[5]) + '</td></tr>'; }).join("") +
    '</tbody></table></div><p class="hint" style="margin-top:10px">اگر هفتهٔ نهم منفی شود، دو ماه وقت دارید، نه دو روز (فصل هشدار زودهنگام).</p></div>';
}
function dsoCard() {
  var d = +S.g.dso || 0, cur = withDso(d), d60 = withDso(60), base = A.calc.C;
  return '<div class="grid g3" style="margin-bottom:14px">' +
    kpi("اوج نیاز نقد با فروش نقد", fmtB(base.peak), uN(), "فرض فعلی مدل", "", "▼") +
    kpi("اوج نیاز نقد با وصول " + toFa(d || 60) + " روزه", fmtB((d ? cur : d60).peak), uN(), "تجمعی پایان طرح " + fmtB((d ? cur : d60).endCum), "warn", "⏳") +
    kpi("پول اضافهٔ درگیر در مطالبات", fmtB((d ? cur : d60).peak - base.peak), uN(), "منبع: خط اعتباری پیش از نیاز", "warn", "₪") + '</div>';
}

/* ---------- یافته‌های برنامه برای صفحهٔ خانه ---------- */
function planFindings() {
  var out = [];
  DIMS.forEach(function (d) { var s = dimState(d); if (s.st === "bad") out.push(["bad", "بُعد «" + d.n + "»: " + (s.v || "در خطر") + " ← " + d.it]); });
  var p = planSourceShare(); if (p && p.share > .5 && !A.prod.length) out.push(["warn", "در مدل " + p1(p.share) + " خوراک از «" + esc(p.name) + "» می‌آید؛ دروازهٔ سال اول می‌گوید هیچ منبعی بیش از ۵۰٪ نباشد."]);
  var late = A.tasks.filter(function (t) { return t.due && !t.done && t.due < todayIso(); }).length; if (late) out.push(["warn", toFa(late) + " اقدام از موعدش گذشته — «دروازه‌ها و اقدام‌ها»."]);
  return out;
}
async function loadPlan() {
  var a = await db.from("bf_watch").select("*"), b = await db.from("bf_tasks").select("*").order("grp").order("sort").order("id");
  A.watch = a.data || []; A.tasks = b.data || [];
}
function bindPlan() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-wsave]"), function (b) { b.onclick = function () { saveWatch(b.dataset.wsave); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-tdone]"), function (el) { el.onchange = function () { taskUpd(+el.dataset.tdone, { done: el.checked }); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-towner]"), function (el) { el.onchange = function () { taskUpd(+el.dataset.towner, { owner: el.value.trim() || null }); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-tdue]"), function (el) { el.onchange = function () { var v = el.value.trim(), iso = v ? parseJ(v) : null;
    if (v && !iso) { toast("تاریخ درست نیست."); return; } taskUpd(+el.dataset.tdue, { due: iso }); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-tadd]"), function (b) { b.onclick = async function () { var t = prompt("عنوان:"); if (!t) return;
    var g = b.dataset.tadd, kind = g.indexOf("فرض") === 0 ? "فرض" : "اقدام";
    var r = await db.from("bf_tasks").insert({ grp: g, title: t, kind: kind, sort: 100 }); if (r.error) { toast(r.error.message); return; } await loadPlan(); render(); }; });
}
