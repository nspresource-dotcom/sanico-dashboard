/* ماژول‌های تکمیلی برنامهٔ ۵ ساله: اقتصاد هر تن، کارایی آسیاب (OEE)، مشتریان و پارتو،
   نسبت‌های مالی بانک‌پسند و تقویم مدیریتی. به app.js، plan.js و nav.js تکیه دارد. */

PAGES.splice(PAGES.findIndex(function (p) { return p.k === "pva"; }) + 1, 0,
  { k: "oee", g: "ops", t: "کارایی آسیاب (OEE)", ic: "factory", h: "دسترس‌پذیری × عملکرد × کیفیت" });
PAGES.splice(PAGES.findIndex(function (p) { return p.k === "gates"; }) + 1, 0,
  { k: "rituals", g: "plan", t: "تقویم مدیریتی", ic: "clock", h: "آیین‌های هفتگی تا سالانهٔ برنامه" });
PAGES.splice(PAGES.findIndex(function (p) { return p.k === "loans"; }) + 1, 0,
  { k: "ratios", g: "fin", t: "نسبت‌های مالی", ic: "scale", h: "عددهایی که بانک پیش از خط اعتباری می‌سنجد" });
PAGES.splice(PAGES.findIndex(function (p) { return p.k === "assume"; }) + 1, 0,
  { k: "unit", g: "model", t: "اقتصاد هر تن", ic: "tag", h: "بهای تمام‌شده و حاشیهٔ هر تن پودر، به تفکیک" });
PAGES.splice(PAGES.findIndex(function (p) { return p.k === "scen"; }), 0,
  { k: "cust", g: "dec", t: "مشتریان و پارتو", ic: "percent", h: "کدام مشتری‌ها بیشتر سود را می‌سازند" });
GRP_ORDER.splice(2, 0, "آمادگی: قابل وام، شراکت و فروش");

function ratedTph() { var g = S.g; return +g.ratedTph > 0 ? +g.ratedTph : (+g.capacity || 0) / 600; }
function ohPerTon() { var R = A.calc.R; return R.totProd > 0 ? S.g.overhead * R.H / R.totProd : 0; }
function pill(st, t) { return '<span class="pill ' + ({ ok: "p3", warn: "p2", bad: "p1" }[st] || "") + '">' + t + '</span>'; }

/* ---------- اقتصاد هر تن ---------- */
function pUnit() {
  var g = S.g, src = A.calc.R.src.filter(function (x) { return x.type !== "fg"; }), oh = ohPerTon();
  if (!src.length) return '<div class="empty">منبع فعالی نیست.</div>';
  var rows = [
    ["سنگ خوراک", function (b, r) { return b.material / r; }],
    ["کارمزد بورس", function (b, r) { return b.comm / r; }],
    ["ارزش افزودهٔ غیرقابل کسر", function (b, r) { return b.vat / r; }],
    ["حمل تا کارخانه", function (b, r) { return b.freight / r; }],
    ["فراوری (برق، نیرو، استهلاک قطعات)", function (b, r) { return b.proc / r; }],
    ["هزینهٔ مالی پول درگیر", function (b, r) { return b.loan / r; }],
    ["بسته‌بندی", function (b) { return b.pack; }],
    ["کسر: فروش باطله", function (b, r) { return -b.wasteRev / r; }],
    ["سربار ثابت (میانگین مدت طرح)", function () { return oh; }]
  ];
  var cols = src.map(function (x) { return { n: x.s.name, b: x.b, r: x.s.rec / 100, rec: x.s.rec }; });
  var h = '<div class="gap">اولین اقدام ۹۰ روز اول برنامه: «عدد واقعی اقتصاد هر تن روی میز باشد». بیشترین بخش بهای هر تن پودر، خوراک تقسیم بر بازیافت است؛ برای همین هر یک واحد درصد بازیافت این‌قدر اثر دارد.</div>';
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>بهای هر تن پودر طبق مدل</h3><p class="hint">به ' + uN() + ' بر تن محصول؛ هر قلم خوراک تقسیم بر بازیافت همان منبع شده</p></div></div><div class="scroll"><table><thead><tr><th>قلم هزینه</th>' +
    cols.map(function (c) { return '<th class="num">' + esc(c.n) + '<br><span class="hint">بازیافت ' + toFa(c.rec) + '٪</span></th>'; }).join("") + '</tr></thead><tbody>';
  rows.forEach(function (row) { h += '<tr><td>' + row[0] + '</td>' + cols.map(function (c) { var v = c.r > 0 ? row[1](c.b, c.r) : null; return '<td class="num' + (v < 0 ? " pos" : "") + '">' + (v ? fmt(v) : "—") + '</td>'; }).join("") + '</tr>'; });
  var tot = cols.map(function (c) { return c.r > 0 ? c.b.perProductNet + oh : null; });
  h += '<tr class="tot"><td><b>بهای تمام‌شدهٔ کامل</b></td>' + tot.map(function (v) { return '<td class="num"><b>' + fmt(v) + '</b></td>'; }).join("") + '</tr>';
  h += '<tr><td>قیمت فروش</td>' + cols.map(function () { return '<td class="num">' + fmt(g.price) + '</td>'; }).join("") + '</tr>';
  h += '<tr class="tot"><td><b>سود هر تن</b></td>' + tot.map(function (v) { var m = g.price - v; return '<td class="num ' + (m < 0 ? "neg" : "pos") + '"><b>' + fmt(m) + '</b></td>'; }).join("") + '</tr>';
  h += '</tbody></table></div><p class="hint" style="margin-top:10px">میانگین وزنی بهای خالص بدون سربار در مدل: ' + fmt(A.calc.R.avgCost) + ' · سربار هر تن: ' + fmt(oh) + ' ' + uN() + '.</p></div>';
  h += unitActual();
  return h;
}
function unitActual() {
  var pf = sum(A.prod, "feed_t"), pp = sum(A.prod, "product_t"), bt = sum(A.purch, "tons"), bc = sum(A.purch, function (r) { return +r.amount + (+r.freight); });
  var pw = A.sales.filter(function (r) { return r.kind !== "باطله"; }), ws = A.sales.filter(function (r) { return r.kind === "باطله"; });
  var st = sum(pw, "tons"), sa = sum(pw, "amount"), ex = sum(A.exp, "amount");
  if (!pp) return '<div class="card"><h3>بهای واقعی هر تن</h3><div class="empty">بعد از ثبت تولید، خرید خوراک، فروش و هزینه‌ها، این‌جا بهای واقعی هر تن کنار مدل می‌آید.</div></div>';
  var rec = pf > 0 ? pp / pf : null, feedT = bt > 0 ? bc / bt : null, feedPer = feedT !== null && rec ? feedT / rec : null, exPer = ex / pp, wPer = sum(ws, "amount") / pp;
  var cost = (feedPer || 0) + exPer - wPer, price = st > 0 ? sa / st : null;
  var L = [["بازیافت واقعی", rec === null ? "—" : p1(rec), "مدل: " + p1(planRec())], ["بهای هر تن خوراک تحویلی (خرید + حمل)", fmt(feedT), ""], ["خوراک در هر تن پودر", fmt(feedPer), "بهای خوراک ÷ بازیافت"],
    ["هزینه‌های ثبت‌شده در هر تن پودر", fmt(exPer), "حقوق، برق، بسته‌بندی، تعمیرات و…"], ["کسر: فروش باطله در هر تن پودر", fmt(-wPer), ""],
    ["بهای تمام‌شدهٔ واقعی", fmt(cost), "مدل با سربار: " + fmt(A.calc.R.avgCost + ohPerTon())], ["میانگین قیمت فروش واقعی", fmt(price), "مدل: " + fmt(S.g.price)],
    ["سود واقعی هر تن", price === null ? "—" : fmt(price - cost), ""]];
  return '<div class="card"><div class="chead"><div><h3>بهای واقعی هر تن (از ثبت روزانه)</h3><p class="hint">کل دورهٔ ثبت‌شده؛ تقریبی تا وقتی موجودی انبار هم ثبت شود</p></div></div><div class="scroll"><table><tbody>' +
    L.map(function (r) { return '<tr><td><b>' + r[0] + '</b></td><td class="num">' + r[1] + '</td><td class="hint">' + r[2] + '</td></tr>'; }).join("") + '</tbody></table></div></div>';
}

/* ---------- کارایی آسیاب ---------- */
function pOee() {
  var rated = ratedTph(), M = {};
  A.prod.forEach(function (r) { var k = jkey(r.d), x = M[k] || (M[k] = { pl: 0, dn: 0, feed: 0, prod: 0, off: 0, n: 0 });
    if (+r.planned_h > 0) { x.pl += +r.planned_h; x.dn += +r.downtime_h || 0; x.feed += +r.feed_t; x.prod += +r.product_t; x.off += +r.offspec_t || 0; x.n++; } });
  function oee(x) { var run = x.pl - x.dn, a = x.pl > 0 ? run / x.pl : null, p = run > 0 && rated > 0 ? x.feed / (run * rated) : null, q = x.prod > 0 ? (x.prod - x.off) / x.prod : null;
    return { a: a, p: p, q: q, o: a !== null && p !== null && q !== null ? a * Math.min(p, 1.2) * q : null, run: run }; }
  var ks = Object.keys(M).map(Number).sort();
  var h = '<div class="gap">برنامه می‌گوید پیش از خرید آسیاب دوم ببینید بالا بردن OEE آسیاب فعلی چقدر ظرفیت پنهان آزاد می‌کند. نمونهٔ برنامه: دسترس‌پذیری ۸۵٪ × عملکرد ۸۰٪ × کیفیت ۹۵٪ ≈ ۶۵٪. برای محاسبه، در ثبت تولید «ساعت کار برنامه‌ریزی‌شده» و «خارج از مشخصه» را هم وارد کنید. ظرفیت اسمی آسیاب (' + NF1.format(rated) + ' تن خوراک در ساعت) در «مفروضات» تنظیم می‌شود.</div>';
  if (!ks.length) return h + '<div class="card"><div class="empty">هنوز تولیدی با «ساعت کار برنامه‌ریزی‌شده» ثبت نشده.</div></div>';
  var last = oee(M[ks[ks.length - 1]]), lx = M[ks[ks.length - 1]], hidden = last.o ? (last.o < .85 ? lx.feed * (.85 / last.o - 1) : 0) : null;
  h += '<div class="grid g3" style="margin-bottom:14px">' +
    kpi("OEE ماه آخر", last.o === null ? "—" : p1(last.o), "", jlabel(ks[ks.length - 1]), last.o >= .65 ? "pos" : "warn", "%") +
    kpi("دسترس‌پذیری · عملکرد · کیفیت", [last.a, last.p, last.q].map(function (v) { return v === null ? "—" : NF.format(Math.round(v * 100)); }).join(" · "), "٪", "ضرب این سه = OEE", "", "≈") +
    kpi("ظرفیت پنهان تا OEE ۸۵٪", hidden ? tn(hidden) : "—", "تن خوراک در ماه", "بدون خرید آسیاب جدید", "", "⇡") + '</div>';
  h += '<div class="card"><div class="scroll"><table><thead><tr><th>ماه</th><th class="num">ساعت برنامه</th><th class="num">توقف</th><th class="num">ساعت کار</th><th class="num">خوراک (تن)</th><th class="num">دسترس‌پذیری</th><th class="num">عملکرد</th><th class="num">کیفیت</th><th class="num">OEE</th></tr></thead><tbody>' +
    ks.slice().reverse().map(function (k) { var x = M[k], o = oee(x); return '<tr><td>' + jlabel(k) + '</td><td class="num">' + tn(x.pl) + '</td><td class="num">' + tn(x.dn) + '</td><td class="num">' + tn(o.run) + '</td><td class="num">' + tn(x.feed) + '</td><td class="num">' + p1(o.a) + '</td><td class="num">' + p1(o.p) + '</td><td class="num">' + p1(o.q) + '</td><td class="num"><b>' + p1(o.o) + '</b></td></tr>'; }).join("") +
    '</tbody></table></div></div>';
  return h;
}

/* ---------- مشتریان و پارتو ---------- */
function pCust() {
  var cost = A.calc.R.avgCost + ohPerTon(), m = {};
  A.sales.filter(function (r) { return r.kind !== "باطله"; }).forEach(function (r) { var k = r.customer || "نامشخص", x = m[k] || (m[k] = { n: k, t: 0, a: 0, rcv: 0, ret: 0, c: 0, last: r.d });
    x.t += +r.tons; x.a += +r.amount; x.rcv += +r.received; x.ret += +r.returned_t || 0; x.c++; if (r.d > x.last) x.last = r.d; });
  var L = Object.keys(m).map(function (k) { var x = m[k]; x.pr = x.t ? x.a / x.t : 0; x.mg = x.a - x.t * cost; return x; }).sort(function (a, b) { return b.mg - a.mg; });
  var h = '<div class="gap">قانون پارتو: معمولاً بخش کوچکی از مشتری‌ها بیشتر سود را می‌سازند. سود هر مشتری اینجا با بهای تمام‌شدهٔ مدل (' + fmt(cost) + ' ' + uN() + ' بر تن، با سربار) حساب شده؛ دروازهٔ سال سوم: هیچ مشتری‌ای بیش از ۳۰٪ فروش نباشد.</div>';
  if (!L.length) return h + '<div class="card"><div class="empty">فروشی با نام خریدار ثبت نشده.</div></div>';
  var totA = L.reduce(function (s, x) { return s + x.a; }, 0), totM = L.reduce(function (s, x) { return s + Math.max(0, x.mg); }, 0), cum = 0, n80 = null;
  L.forEach(function (x, i) { cum += Math.max(0, x.mg); x.cum = totM > 0 ? cum / totM : 0; if (n80 === null && x.cum >= .8) n80 = i + 1; });
  var top = L.slice().sort(function (a, b) { return b.a - a.a; })[0];
  h += '<div class="grid g3" style="margin-bottom:14px">' + kpi("تعداد مشتری", toFa(L.length), "", "با فروش ثبت‌شده", "", "◆") +
    kpi("سهم بزرگ‌ترین مشتری از فروش", p1(top.a / totA), "", esc(top.n), top.a / totA > .5 ? "neg" : top.a / totA > .3 ? "warn" : "pos", "!") +
    kpi("مشتری‌هایی که ۸۰٪ سود را می‌دهند", n80 ? toFa(n80) : "—", "مشتری", "از " + toFa(L.length) + " مشتری", "", "%") + '</div>';
  h += '<div class="card"><div class="scroll"><table><thead><tr><th>مشتری</th><th class="num">تن</th><th class="num">فروش</th><th class="num">سهم فروش</th><th class="num">قیمت میانگین</th><th class="num">سود تقریبی</th><th class="num">تجمعی سود</th><th class="num">مانده مطالبات</th><th class="num">مرجوعی</th><th>آخرین خرید</th></tr></thead><tbody>' +
    L.map(function (x) { return '<tr><td><b>' + esc(x.n) + '</b></td><td class="num">' + tn(x.t) + '</td><td class="num">' + fmtB(x.a) + '</td><td class="num">' + p1(x.a / totA) + '</td><td class="num">' + fmt(x.pr) + '</td><td class="num' + (x.mg < 0 ? " neg" : "") + '">' + fmtB(x.mg) + '</td><td class="num">' + p1(x.cum) + '</td><td class="num">' + fmtB(x.a - x.rcv) + '</td><td class="num">' + (x.ret ? tn(x.ret) + " تن" : "—") + '</td><td>' + jd(x.last) + '</td></tr>'; }).join("") +
    '</tbody></table></div><p class="hint" style="margin-top:10px">مشتری با سود منفی یا مطالبات بالا، کاندید «هرس مشتری‌های زیان‌ده» در بازبینی شش‌ماهه است.</p></div>';
  return h;
}

/* ---------- نسبت‌های مالی ---------- */
function pRatios() {
  var C = A.calc, R = C.R, E = C.E, g = S.g, H = R.H, T = A.act.T;
  var debt = S.loans.filter(function (l) { return l.on !== false; }).reduce(function (s, l) { return s + (+l.amount || 0); }, 0);
  var equity = Math.max(1, C.C.peak - debt), rev = R.rows.reduce(function (s, r) { return s + r.rev; }, 0), cost = R.rows.reduce(function (s, r) { return s + r.cost; }, 0);
  var pbt = R.rows.reduce(function (s, r) { return s + r.pbt; }, 0), intr = 0, svc = 0;
  for (var t = 1; t <= H; t++) { intr += E.intr ? (E.intr[t] || 0) : 0; if (E.fin[t] < 0) svc += -E.fin[t]; }
  var ebit = pbt + intr, opCash = R.rows.reduce(function (s, r) { return s + r.net; }, 0) + intr;
  var s90 = sum(within(A.sales, 90), "amount"), dso = s90 > 0 ? T.ar / (s90 / 90) : null, d30 = sum(within(A.prod, 30), "feed_t") / 30, cover = d30 > 0 ? feedOnHand() / d30 : null;
  var L = [
    ["توان بازپرداخت", "نسبت بدهی به آورده", debt ? NF2.format(debt / equity) : "بدون بدهی", debt / equity > 2 ? "bad" : debt / equity > 1 ? "warn" : "ok", "کمتر از ۱ خوب؛ بالای ۲ بانک محتاط می‌شود", "بدهی فعال ÷ (اوج نیاز نقد − بدهی)"],
    ["توان بازپرداخت", "پوشش بهره", intr > 0 ? NF1.format(ebit / intr) + " برابر" : "بدون بهره", intr > 0 ? (ebit / intr < 1.5 ? "bad" : ebit / intr < 3 ? "warn" : "ok") : "ok", "بالای ۳ برابر خوب", "سود عملیاتی ÷ سود تسهیلات در مدت طرح"],
    ["توان بازپرداخت", "پوشش خدمت بدهی (DSCR)", svc > 0 ? NF2.format(opCash / svc) : "بدون قسط", svc > 0 ? (opCash / svc < 1.1 ? "bad" : opCash / svc < 1.3 ? "warn" : "ok") : "ok", "بالای ۱٫۳ معمولاً شرط بانک", "جریان نقد عملیاتی ÷ اصل و سود اقساط"],
    ["سودآوری", "حاشیهٔ سود ناخالص", rev ? p1((rev - cost) / rev) : "—", rev && (rev - cost) / rev < .15 ? "warn" : "ok", "روند مهم‌تر از عدد", "(درآمد − هزینهٔ مستقیم) ÷ درآمد"],
    ["سودآوری", "حاشیهٔ سود خالص", rev ? p1(R.totNet / rev) : "—", rev && R.totNet / rev < .05 ? "warn" : "ok", "", "سود خالص ÷ درآمد در مدت طرح"],
    ["سودآوری", "بازده سرمایه در برابر هزینهٔ سرمایه", R.irr === null ? "—" : p1(R.irr) + " در برابر " + toFa(g.disc) + "٪", R.irr !== null && R.irr * 100 >= g.disc ? "ok" : "bad", "شرط دروازهٔ سالانه برای رشد بیشتر", "IRR مدت طرح در برابر نرخ تنزیل"],
    ["کارایی", "دورهٔ وصول مطالبات", dso === null ? "—" : tn(dso) + " روز", dso === null ? "" : dso > 60 ? "bad" : dso > 45 ? "warn" : "ok", "برنامه: از ۶۰ به ۳۰ روز", "مانده مطالبات ÷ فروش روزانهٔ ۹۰ روز اخیر"],
    ["کارایی", "روزهای پوشش خوراک", cover === null ? "—" : tn(cover) + " روز", cover === null ? "" : cover < 15 ? "bad" : cover < 30 ? "warn" : "ok", "بر اساس طولانی‌ترین وقفهٔ محتمل تأمین", "موجودی خوراک ÷ مصرف روزانهٔ ۳۰ روز اخیر"],
    ["کارایی", "بهره‌برداری از ظرفیت", p1(R.totFeed / (g.capacity * H)), R.totFeed / (g.capacity * H) < .5 ? "warn" : "ok", "سه ماه بالای ۷۰٪ ← پروندهٔ آسیاب دوم", "خوراک مدل ÷ ظرفیت"]
  ];
  var grp = null, h = '<div class="gap">از فصل «مالی، داده و ریسک» برنامه: بانک پیش از دادن خط اعتباری همین نسبت‌ها را می‌سنجد. عددها از مدل (مدت طرح) و، جایی که داده هست، از ثبت روزانه می‌آیند. آستانه‌ها تقریبی‌اند و با بانک خودتان تطبیق دهید.</div><div class="card"><div class="scroll"><table><thead><tr><th>نسبت</th><th class="num">مقدار</th><th class="mid">وضعیت</th><th>معیار</th><th>محاسبه</th></tr></thead><tbody>';
  L.forEach(function (x) { if (x[0] !== grp) { grp = x[0]; h += '<tr class="grp"><td colspan="5"><b>' + grp + '</b></td></tr>'; }
    h += '<tr><td>' + x[1] + '</td><td class="num"><b>' + x[2] + '</b></td><td class="mid">' + (x[3] ? pill(x[3], ST[x[3]][1]) : '<span class="pill">بدون داده</span>') + '</td><td class="hint">' + x[4] + '</td><td class="hint">' + x[5] + '</td></tr>'; });
  return h + '</tbody></table></div></div>';
}

/* ---------- تقویم مدیریتی ---------- */
var FREQ = { weekly: ["هفتگی", 7], monthly: ["ماهانه", 31], quarterly: ["فصلی", 92], semiannual: ["شش‌ماهه", 183], annual: ["سالانه", 366] };
function ritualState(r) { if (!r.last_done) return { st: "warn", t: "هنوز انجام نشده", next: null };
  var next = new Date(new Date(r.last_done).getTime() + FREQ[r.freq][1] * 864e5).toISOString().slice(0, 10), left = (new Date(next) - new Date(todayIso())) / 864e5;
  return left < 0 ? { st: "bad", t: "عقب افتاده", next: next } : left <= 3 ? { st: "warn", t: "نزدیک", next: next } : { st: "ok", t: "به‌موقع", next: next }; }
function pRituals() {
  var late = A.rituals.filter(function (r) { return ritualState(r).st === "bad"; }).length;
  var h = '<div class="gap">آیین‌های ثابتی که برنامه را زنده نگه می‌دارند. «انجام شد» را بزنید تا موعد بعدی خودکار حساب شود. ' + (late ? "<b>" + toFa(late) + " آیین عقب افتاده است.</b>" : "") + '</div>';
  Object.keys(FREQ).forEach(function (f) { var L = A.rituals.filter(function (r) { return r.freq === f; }); if (!L.length && !A.admin) return;
    h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>' + FREQ[f][0] + '</h3></div>' + (A.admin ? '<button class="more" data-radd="' + f + '">+ افزودن</button>' : '') + '</div>' +
      L.map(function (r) { var s = ritualState(r); return '<div class="task"><div class="tck" style="cursor:default">' + pill(s.st, s.t) + ' ' + esc(r.title) + '</div><div class="tmeta">' +
        (A.admin ? '<input data-rowner="' + r.id + '" placeholder="مسئول" value="' + esc(r.owner || "") + '">' : '<span>' + esc(r.owner || "") + '</span>') +
        '<span>آخرین: ' + (r.last_done ? jd(r.last_done) : "—") + '</span><span>بعدی: ' + (s.next ? jd(s.next) : "—") + '</span>' +
        (A.admin ? '<button class="more" data-rdone="' + r.id + '">انجام شد</button>' : '') + '</div></div>'; }).join("") + '</div>'; });
  return h;
}
async function ritualUpd(id, o) { o.updated_at = new Date().toISOString(); var r = await db.from("bf_rituals").update(o).eq("id", id); if (r.error) { toast(r.error.message); return; } await loadPlan(); render(); }

/* ---------- اتصال ---------- */
var _loadPlan0 = loadPlan;
loadPlan = async function () { await _loadPlan0(); var r = await db.from("bf_rituals").select("*").order("freq").order("sort").order("id"); A.rituals = r.data || []; };
var _bindPlan0 = bindPlan;
bindPlan = function () { _bindPlan0();
  Array.prototype.forEach.call(document.querySelectorAll("[data-rdone]"), function (b) { b.onclick = function () { ritualUpd(+b.dataset.rdone, { last_done: todayIso() }); toast("ثبت شد."); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-rowner]"), function (el) { el.onchange = function () { ritualUpd(+el.dataset.rowner, { owner: el.value.trim() || null }); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-radd]"), function (b) { b.onclick = async function () { var t = prompt("عنوان آیین:"); if (!t) return;
    var r = await db.from("bf_rituals").insert({ freq: b.dataset.radd, title: t, sort: 100 }); if (r.error) { toast(r.error.message); return; } await loadPlan(); render(); }; });
};
var _planFindings0 = planFindings;
planFindings = function () { var out = _planFindings0(), late = (A.rituals || []).filter(function (r) { return ritualState(r).st === "bad"; }).length;
  if (late) out.push(["warn", toFa(late) + " آیین مدیریتی عقب افتاده — «تقویم مدیریتی»."]); return out; };
var EXTRA_PAGES = { oee: pOee, rituals: pRituals, ratios: pRatios, unit: pUnit, cust: pCust };
