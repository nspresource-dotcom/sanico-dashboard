/* تخصیص مازاد نقد (خزانه‌داری)
   مدل امکان‌سنجی نقد اضافه را بی‌استفاده نگه می‌دارد. این ماژول روی جریان نقدی سهامدار (E.eq) یک «سیاست مازاد» اعمال می‌کند:
   ۱) ذخیرهٔ احتیاطی (چند ماه هزینهٔ نقدی) دست نمی‌خورد؛  ۲) تقسیم سود (درصدی از سود خالص مثبت ماه)؛
   ۳) بقیه به‌ترتیب اولویت: پر کردن ظرفیت خالی کارخانه ← بازرگانی مادهٔ معدنی ← صندوق درآمد ثابت.
   هنگام کمبود نقد، اول از صندوق، بعد بازرگانی و بعد سرمایهٔ پرکردن ظرفیت برداشت می‌شود.
   بازده‌ها ماهانه و مرکب حساب می‌شوند؛ سود بازرگانی و درآمد مالی جدا از سود عملیاتی کارخانه گزارش می‌شوند.
   بخش دوم: دفتر واقعی واریز و برداشت صندوق، معاملات بازرگانی (به تفکیک محموله) و تقسیم سود. */

PAGES.splice(PAGES.findIndex(function (p) { return p.k === "cash"; }) + 1, 0,
  { k: "treasury", g: "fin", t: "تخصیص مازاد نقد", ic: "diamond", h: "صندوق درآمد ثابت، بازرگانی، پر کردن ظرفیت و تقسیم سود — مدل و ثبت واقعی" });
var TR_KIND = { fund_in: "واریز به صندوق", fund_out: "برداشت از صندوق", fund_yield: "سود صندوق (تقسیمی یا ارزش‌افزوده)", trade_buy: "بازرگانی: خرید", trade_cost: "بازرگانی: هزینهٔ حمل و جانبی", trade_sell: "بازرگانی: فروش", dividend: "تقسیم سود / برداشت شرکا", prepay: "پیش‌پرداخت وام", other_in: "سایر ورودی", other_out: "سایر خروجی" };
var TR_IN = { fund_out: 1, trade_sell: 1, other_in: 1 }, TR_OUT = { fund_in: 1, trade_buy: 1, trade_cost: 1, dividend: 1, prepay: 1, other_out: 1 };

var _loadPlanT = loadPlan;
loadPlan = async function () { await _loadPlanT(); var r = await db.from("bf_treasury").select("*").order("d", { ascending: false }).limit(5000); A.tr = r.data || []; };

function trPol() {
  var p = JSON.parse(JSON.stringify((A.ccfg || {}).treasury_policy || {}));
  p.bufferM = p.bufferM === undefined ? 2 : +p.bufferM; p.divPct = +p.divPct || 0;
  p.fund = Object.assign({ on: true, yield: 0, tax: 0 }, p.fund || {}); p.trade = Object.assign({ on: false, margin: 0, cycle: 2, cap: 0, tax: null }, p.trade || {});
  p.fill = Object.assign({ on: true, cycle: 2, maxT: 0, margin: null }, p.fill || {}); p.order = p.order || ["fill", "trade", "fund"];
  return p;
}
/* حاشیه و نقد لازم هر تن خوراک اضافه از ارزان‌ترین منبع خریدنی مدل (نه موجودی پیش‌خرید) */
function fillEcon() {
  var best = null, g = S.g;
  ["bourse", "mines", "buys"].forEach(function (t) { (S[t] || []).forEach(function (s) { if (s.on === false || !(+s.rec > 0)) return; var b = feedCost(t, s, g);
    var cash = b.cashPerFeed, m = (+s.rec / 100) * g.price + b.wasteRev - cash - (+s.rec / 100) * b.pack;
    if (!best || m / cash > best.m / best.cash) best = { name: s.name, m: m, cash: cash }; }); });
  return best;
}
function simTreasury(pol, mode) {
  /* افق: دست‌کم ۶۰ ماه تا اثر بازسرمایه‌گذاری روی دورهٔ بازگشت دیده شود */
  var HN = Math.max(+S.g.horizon || 24, 60), ck = JSON.stringify([S.g, A.calc.R.totNet, HN]);
  if (!A._trR || A._trR.key !== ck) { var R0 = simulate(null, HN); A._trR = { key: ck, R: R0, E: equity(R0) }; }
  var R = A._trR.R, E = A._trR.E, H = R.rows.length, g = S.g, tax = (+g.tax || 0) / 100;
  var avgOut = 0; R.rows.forEach(function (r) { avgOut += (+r.cost || 0) + (+r.oh || 0) + (+r.tax || 0); }); avgOut /= Math.max(1, H);
  var buffer = pol.bufferM * avgOut, fe = fillEcon();
  var fillMargin = pol.fill.margin !== null && pol.fill.margin !== undefined && pol.fill.margin !== "" ? +pol.fill.margin : fe ? fe.m : 0, fillCash = fe ? fe.cash : 0;
  var rF = Math.pow(1 + (+pol.fund.yield || 0) / 100, 1 / 12) - 1, tF = (+pol.fund.tax || 0) / 100;
  var rT = (+pol.trade.margin || 0) / 100 / Math.max(0.25, +pol.trade.cycle || 1), tT = pol.trade.tax === null || pol.trade.tax === "" || pol.trade.tax === undefined ? tax : +pol.trade.tax / 100;
  var rC = fillCash > 0 ? fillMargin / fillCash / Math.max(0.25, +pol.fill.cycle || 1) : 0;
  /* سرمایه‌گذاری اولیه را سهامداران تأمین کرده‌اند؛ خزانه از نقد آزاد فعلی شروع می‌کند */
  var X = +pol.start || 0, Fd = 0, Tr = 0, Cp = 0, cumInc = 0, cumDiv = 0, out = [], inc = { fund: 0, trade: 0, fill: 0 };
  var use = mode === "idle" ? {} : mode === "fund" ? { fund: 1 } : { fund: pol.fund.on, trade: pol.trade.on, fill: pol.fill.on };
  var order = mode === "fund" ? ["fund"] : pol.order;
  for (var t = 1; t <= H; t++) {
    X += E.eq[t];
    var iF = Fd * rF * (1 - tF), iT = Tr * rT * (1 - tT), iC = Cp * rC * (1 - tax);
    Fd += iF; X += iT + iC; inc.fund += iF; inc.trade += iT; inc.fill += iC; cumInc += iF + iT + iC;
    if (mode !== "idle" && pol.divPct > 0) { var pr = R.rows[t - 1].net + iT + iC; if (pr > 0 && X - buffer > 0) { var dv = Math.min(pr * pol.divPct / 100, X - buffer); X -= dv; cumDiv += dv; } }
    /* کمبود: برداشت از صندوق، بعد بازرگانی، بعد ظرفیت */
    if (X < buffer) { var need = buffer - X, w;
      w = Math.min(need, Fd); Fd -= w; X += w; need -= w;
      w = Math.min(need, Tr); Tr -= w; X += w; need -= w;
      w = Math.min(need, Cp); Cp -= w; X += w; }
    /* مازاد */
    var sur = X - buffer;
    if (sur > 0 && mode !== "idle") order.forEach(function (k) { if (!use[k] || sur <= 0) return; var room = Infinity;
      if (k === "fill") { var spare = Math.max(0, (+g.capacity || 0) - R.rows[t - 1].feed); if (+pol.fill.maxT > 0) spare = Math.min(spare, +pol.fill.maxT); room = Math.max(0, spare * fillCash * (+pol.fill.cycle || 1) - Cp); if (fillMargin <= 0) room = 0; }
      if (k === "trade") { room = +pol.trade.cap > 0 ? Math.max(0, +pol.trade.cap - Tr) : Infinity; if (!(rT > 0)) room = 0; }
      var a = Math.min(sur, room); if (a <= 0) return; if (k === "fund") Fd += a; else if (k === "trade") Tr += a; else Cp += a; X -= a; sur -= a; });
    out.push({ t: t, X: X, Fd: Fd, Tr: Tr, Cp: Cp, inc: cumInc, div: cumDiv, wealth: X + Fd + Tr + Cp + cumDiv, pbv: E.cum[t] + cumInc });
  }
  var pb = null; for (var i = 0; i < out.length; i++) { var w0 = i ? out[i - 1].pbv : E.cum[0]; if (out[i].pbv >= 0 && w0 < 0) { pb = i + (-w0) / (out[i].pbv - w0); break; } } if (E.cum[0] >= 0) pb = 0;
  return { rows: out, inc: inc, buffer: buffer, fe: fe, fillMargin: fillMargin, rC: rC, rT: rT, rF: rF, pb: pb, end: out.length ? out[out.length - 1] : null };
}

/* ---------- دفتر واقعی ---------- */
function trActual() {
  var fund = 0, fundIn = 0, fundOut = 0, fundY = 0, div = 0, pre = 0, oth = 0, lots = {}, M = {};
  (A.tr || []).slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; }).forEach(function (x) { var a = +x.amount || 0, k = jkey(x.d), m = M[k] || (M[k] = { k: k, fy: 0, tp: 0, div: 0 });
    if (x.kind === "fund_in") { fund += a; fundIn += a; } if (x.kind === "fund_out") { fund -= a; fundOut += a; } if (x.kind === "fund_yield") { fund += a; fundY += a; m.fy += a; }
    if (x.kind === "dividend") { div += a; m.div += a; } if (x.kind === "prepay") pre += a; if (x.kind === "other_in") oth += a; if (x.kind === "other_out") oth -= a;
    if (/^trade_/.test(x.kind)) { var L = lots[x.lot || "بدون شمارهٔ محموله"] || (lots[x.lot || "بدون شمارهٔ محموله"] = { lot: x.lot || "بدون شمارهٔ محموله", bT: 0, sT: 0, cost: 0, sale: 0, d0: x.d, d1: x.d, item: x.instrument || "" });
      if (x.kind === "trade_buy") { L.bT += +x.tons || 0; L.cost += a; } if (x.kind === "trade_cost") L.cost += a; if (x.kind === "trade_sell") { L.sT += +x.tons || 0; L.sale += a; L.d1 = x.d; m.tp += 0; }
      if (!L.item && x.instrument) L.item = x.instrument; } });
  var open = 0, real = 0;
  Object.keys(lots).forEach(function (k) { var L = lots[k]; L.avg = L.bT > 0 ? L.cost / L.bT : null; L.cogs = L.avg !== null ? Math.min(L.sT, L.bT) * L.avg : 0; L.profit = L.sale - L.cogs; L.left = L.bT - L.sT; L.inv = L.left > 0 && L.avg !== null ? L.left * L.avg : 0;
    open += L.inv; real += L.sT > 0 ? L.profit : 0;
    if (L.sT > 0) { var mk = jkey(L.d1); (M[mk] || (M[mk] = { k: mk, fy: 0, tp: 0, div: 0 })).tp += L.profit; } });
  var net = 0; (A.tr || []).forEach(function (x) { var a = +x.amount || 0; if (TR_IN[x.kind]) net += a; if (TR_OUT[x.kind]) net -= a; });
  return { fund: fund, fundIn: fundIn, fundOut: fundOut, fundY: fundY, div: div, pre: pre, oth: oth, lots: lots, open: open, real: real, net: net, M: M };
}

function pTreasury() {
  var pol = trPol(), base = simTreasury(pol, "idle"), all = simTreasury(pol, "fund"), mine = simTreasury(pol, "policy"), H = mine.rows.length, ro = A.admin ? "" : " disabled";
  var h = '<div class="gap">مدل امکان‌سنجی مازاد نقد را بی‌استفاده فرض می‌کند. این‌جا سیاست تخصیص را تعیین می‌کنید و اثرش روی ثروت پایان طرح و دورهٔ بازگشت را می‌بینید. ترتیب پیشنهادی: ذخیرهٔ احتیاطی ← پر کردن ظرفیت خالی کارخانه ← بازرگانی فقط اگر بازده تعدیل‌شده با ریسک از صندوق بیشتر است ← صندوق برای نقد پارک‌شده.</div>';
  function sc(nm, s, cls) { return '<tr' + (cls ? ' class="tot"' : '') + '><td>' + nm + '</td><td class="num">' + fmtB(s.end ? s.end.wealth : null) + '</td><td class="num">' + fmtB(s.inc.fill) + '</td><td class="num">' + fmtB(s.inc.trade) + '</td><td class="num">' + fmtB(s.inc.fund) + '</td><td class="num">' + fmtB(s.end ? s.end.div : 0) + '</td><td class="num">' + (s.pb === null ? "—" : NF1.format(s.pb) + " ماه") + '</td></tr>'; }
  var gain = mine.end && base.end ? mine.end.wealth - base.end.wealth : null;
  h += '<div class="grid g3" style="margin-bottom:14px">' + kpi("نقد اضافه در " + toFa(H) + " ماه", fmtB(gain), uN(), "سیاست انتخابی در برابر نگه‌داری نقد", gain > 0 ? "pos" : "", "+") +
    kpi("دورهٔ بازگشت با بازسرمایه‌گذاری", mine.pb === null ? "—" : NF1.format(mine.pb), "ماه", "بدون آن: " + (base.pb === null ? "—" : NF1.format(base.pb) + " ماه"), "", "↺") +
    kpi("ذخیرهٔ احتیاطی", fmtB(mine.buffer), uN(), toFa(pol.bufferM) + " ماه هزینهٔ نقدی", "", "▣") + '</div>';
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>مقایسهٔ سناریوها در ' + toFa(H) + ' ماه</h3><p class="hint">نقد انباشته = نقد آزاد + صندوق + سرمایهٔ در گردش بازرگانی و ظرفیت + سود تقسیم‌شده (بدون سرمایه‌گذاری اولیه). افق دست‌کم ۶۰ ماه است تا اثر روی بازگشت سرمایه دیده شود.</p></div></div><div class="scroll"><table><thead><tr><th>سناریو</th><th class="num">نقد انباشتهٔ پایان دوره</th><th class="num">سود پر کردن ظرفیت</th><th class="num">سود بازرگانی</th><th class="num">درآمد صندوق</th><th class="num">سود تقسیم‌شده</th><th class="num">بازگشت سرمایه</th></tr></thead><tbody>' +
    sc("نگه‌داری نقد (مدل فعلی)", base) + sc("همهٔ مازاد در صندوق", all) + sc("سیاست انتخابی", mine, 1) + '</tbody></table></div>' +
    lineChart([{ n: "نگه‌داری نقد", c: "var(--muted)", v: base.rows.map(function (r) { return r.wealth; }) }, { n: "همه در صندوق", c: "var(--amber)", v: all.rows.map(function (r) { return r.wealth; }) }, { n: "سیاست انتخابی", c: "var(--deep)", v: mine.rows.map(function (r) { return r.wealth; }) }], { x0: 1 }) + '</div>';
  var fe = mine.fe;
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>بازده ماهانهٔ هر گزینه (پس از مالیات)</h3><p class="hint">برای مقایسه با یکدیگر؛ عددهای ورودی را خودتان به‌روز کنید.</p></div></div><table><thead><tr><th>گزینه</th><th class="num">بازده ماهانه</th><th>نقدشوندگی</th><th>ریسک</th><th>توضیح</th></tr></thead><tbody>' +
    '<tr><td>پر کردن ظرفیت خالی</td><td class="num">' + p1(mine.rC * (1 - (+S.g.tax || 0) / 100)) + '</td><td>' + toFa(pol.fill.cycle) + ' ماه</td><td>عملیاتی</td><td>' + (fe ? "خوراک از «" + esc(fe.name) + "»؛ حاشیهٔ هر تن خوراک " + fmt(mine.fillMargin) + "، نقد لازم " + fmt(fe.cash) : "منبع خریدنی در مدل نیست") + '</td></tr>' +
    '<tr><td>بازرگانی مادهٔ معدنی</td><td class="num">' + p1(mine.rT) + '</td><td>' + toFa(pol.trade.cycle) + ' ماه</td><td>بازار و وصول</td><td>حاشیهٔ هر دوره ' + p1((+pol.trade.margin || 0) / 100) + '</td></tr>' +
    '<tr><td>صندوق درآمد ثابت</td><td class="num">' + p1(mine.rF * (1 - (+pol.fund.tax || 0) / 100)) + '</td><td>چند روز</td><td>کم</td><td>بازده سالانه ' + p1((+pol.fund.yield || 0) / 100) + '</td></tr></tbody></table>' +
    (mine.rF === 0 ? '<p class="hint" style="margin-top:8px">بازده صندوق هنوز وارد نشده؛ نرخ روز صندوق مورد نظر را از سایتش بردارید.</p>' : '') + '</div>';
  /* سیاست */
  var oN = { fill: "پر کردن ظرفیت", trade: "بازرگانی", fund: "صندوق" };
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>سیاست مازاد نقد</h3><p class="hint">مبالغ به ' + uN() + '. خالی گذاشتن «حاشیهٔ هر تن خوراک اضافه» یعنی از مدل حساب شود.</p></div></div><div class="frm">' +
    '<div><label>نقد آزاد فعلی برای شروع</label><input id="tp_start" class="money" value="' + fmt(pol.start || 0) + '"' + ro + '></div>' +
    '<div><label>ذخیرهٔ احتیاطی (ماه هزینهٔ نقدی)</label><input id="tp_bufferM" class="money" value="' + toFa(pol.bufferM) + '"' + ro + '></div>' +
    '<div><label>تقسیم سود (٪ سود خالص مثبت هر ماه)</label><input id="tp_divPct" class="money" value="' + toFa(pol.divPct) + '"' + ro + '></div>' +
    '<div><label>اولویت تخصیص</label><select id="tp_order"' + ro + '>' + [["fill", "trade", "fund"], ["fill", "fund", "trade"], ["trade", "fill", "fund"], ["fund", "fill", "trade"]].map(function (o) { var v = o.join(","); return '<option value="' + v + '"' + (pol.order.join(",") === v ? " selected" : "") + '>' + o.map(function (k) { return oN[k]; }).join(" ← ") + '</option>'; }).join("") + '</select></div>' +
    '<label class="chk"><input type="checkbox" id="tp_fill_on"' + (pol.fill.on ? " checked" : "") + ro + '> پر کردن ظرفیت خالی</label>' +
    '<div><label>دورهٔ گردش پول ظرفیت (ماه، از خرید تا وصول)</label><input id="tp_fill_cycle" class="money" value="' + toFa(pol.fill.cycle) + '"' + ro + '></div>' +
    '<div><label>سقف خوراک اضافه (تن در ماه، ۰ = تا ظرفیت)</label><input id="tp_fill_maxT" class="money" value="' + toFa(pol.fill.maxT || 0) + '"' + ro + '></div>' +
    '<div><label>حاشیهٔ هر تن خوراک اضافه</label><input id="tp_fill_margin" class="money" value="' + (pol.fill.margin !== null && pol.fill.margin !== undefined && pol.fill.margin !== "" ? fmt(pol.fill.margin) : "") + '" placeholder="از مدل: ' + fmt(fe ? fe.m : 0) + '"' + ro + '></div>' +
    '<label class="chk"><input type="checkbox" id="tp_trade_on"' + (pol.trade.on ? " checked" : "") + ro + '> بازرگانی مادهٔ معدنی</label>' +
    '<div><label>حاشیهٔ خالص هر دوره (٪)</label><input id="tp_trade_margin" class="money" value="' + toFa(pol.trade.margin) + '"' + ro + '></div>' +
    '<div><label>طول هر دوره (ماه)</label><input id="tp_trade_cycle" class="money" value="' + toFa(pol.trade.cycle) + '"' + ro + '></div>' +
    '<div><label>سقف سرمایهٔ بازرگانی (۰ = بی‌سقف)</label><input id="tp_trade_cap" class="money" value="' + fmt(pol.trade.cap || 0) + '"' + ro + '></div>' +
    '<div><label>مالیات سود بازرگانی (٪، خالی = نرخ مدل)</label><input id="tp_trade_tax" class="money" value="' + (pol.trade.tax === null || pol.trade.tax === undefined ? "" : toFa(pol.trade.tax)) + '"' + ro + '></div>' +
    '<label class="chk"><input type="checkbox" id="tp_fund_on"' + (pol.fund.on ? " checked" : "") + ro + '> صندوق درآمد ثابت</label>' +
    '<div><label>بازده سالانهٔ صندوق (٪)</label><input id="tp_fund_yield" class="money" value="' + toFa(pol.fund.yield) + '"' + ro + '></div>' +
    '<div><label>مالیات سود صندوق (٪)</label><input id="tp_fund_tax" class="money" value="' + toFa(pol.fund.tax) + '"' + ro + '></div></div>' +
    (A.admin ? '<button class="btn sm" id="tpSave">ذخیره و محاسبه</button>' : '') + '</div>';

  /* واقعی */
  var act = trActual(), lots = Object.keys(act.lots).map(function (k) { return act.lots[k]; });
  h += '<div class="grid g4" style="margin-bottom:14px">' + kpi("در صندوق", fmtB(act.fund), uN(), "سود ثبت‌شده: " + fmtB(act.fundY), "", "▤") + kpi("در جنس (بازرگانی)", fmtB(act.open), uN(), toFa(lots.filter(function (l) { return l.left > 0; }).length) + " محمولهٔ باز", "", "▦") +
    kpi("سود بازرگانی تحقق‌یافته", fmtB(act.real), uN(), "جدا از سود کارخانه", act.real < 0 ? "neg" : "pos", "%") + kpi("سود تقسیم‌شده", fmtB(act.div), uN(), act.pre ? "پیش‌پرداخت وام: " + fmtB(act.pre) : "", "", "↗") + '</div>';
  var cs = A.calc.C; h += '<p class="hint" style="margin:-4px 0 14px">اثر خالص این دفتر روی نقد آزاد: ' + fmtB(act.net) + ' ' + uN() + ' (واریز به صندوق و خرید جنس نقد آزاد را کم می‌کند؛ برداشت و فروش زیادش می‌کند).</p>';
  if (A.admin) h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>ثبت حرکت خزانه</h3><p class="hint">برای بازرگانی، همهٔ خرید، هزینه و فروش یک محموله را با یک «شمارهٔ محموله» ثبت کنید تا سودش جدا حساب شود.</p></div></div><div class="frm">' +
    '<div><label>تاریخ</label><input id="tr_d" value="' + todayJ() + '"></div><div><label>نوع</label><select id="tr_k">' + Object.keys(TR_KIND).map(function (k) { return '<option value="' + k + '">' + TR_KIND[k] + '</option>'; }).join("") + '</select></div>' +
    '<div><label>مبلغ</label><input id="tr_a" class="money" inputmode="decimal"></div><div><label>نام صندوق / کالا</label><input id="tr_i" placeholder="مثلاً صندوق … یا باریت خام"></div>' +
    '<div><label>شمارهٔ محموله (بازرگانی)</label><input id="tr_l" list="trLots"><datalist id="trLots">' + lots.map(function (l) { return '<option value="' + esc(l.lot) + '">'; }).join("") + '</datalist></div><div><label>مقدار (تن)</label><input id="tr_t" class="money" inputmode="decimal"></div>' +
    '<div><label>طرف حساب</label>' + (typeof partySel === "function" ? partySel("tr_p", "supplier", true) : '<input id="tr_p">') + '</div><div><label>توضیح</label><input id="tr_n"></div></div><button class="btn sm" id="trAdd">ثبت</button><div class="note" id="trNote"></div></div>';
  if (lots.length) h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>معاملات بازرگانی به تفکیک محموله</h3></div></div><div class="scroll"><table><thead><tr><th>محموله</th><th>کالا</th><th class="num">خرید (تن)</th><th class="num">فروش (تن)</th><th class="num">بهای هر تن</th><th class="num">فروش</th><th class="num">سود تحقق‌یافته</th><th class="num">حاشیه</th><th class="num">ماندهٔ جنس</th><th class="num">روز گردش</th></tr></thead><tbody>' +
    lots.map(function (l) { var days = l.sT > 0 ? Math.round((new Date(l.d1) - new Date(l.d0)) / 864e5) : null; return '<tr><td><b>' + esc(l.lot) + '</b></td><td>' + esc(l.item || "—") + '</td><td class="num">' + tn(l.bT) + '</td><td class="num">' + tn(l.sT) + '</td><td class="num">' + fmt(l.avg) + '</td><td class="num">' + fmt(l.sale) + '</td><td class="num' + (l.profit < 0 && l.sT ? " neg" : "") + '">' + (l.sT ? fmt(l.profit) : "—") + '</td><td class="num">' + (l.sT && l.cogs ? p1(l.profit / l.cogs) : "—") + '</td><td class="num">' + tn(l.left) + '</td><td class="num">' + (days !== null ? toFa(days) : "—") + '</td></tr>'; }).join("") + '</tbody></table></div></div>';
  /* سود به تفکیک منبع (واقعی، ماهانه) */
  var CM = typeof costMonths === "function" ? costMonths() : {}, ks = {}; Object.keys(CM).forEach(function (k) { ks[k] = 1; }); Object.keys(act.M).forEach(function (k) { ks[k] = 1; });
  var kl = Object.keys(ks).map(Number).sort().reverse().slice(0, 12);
  if (kl.length) h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>سود به تفکیک منبع</h3><p class="hint">سود ناخالص کارخانه = فروش پودر − (فروش × بهای ساخت هر تن همان ماه). سه منبع جدا می‌مانند تا بازدهی واقعی کارخانه پنهان نشود.</p></div></div><div class="scroll"><table><thead><tr><th>ماه</th><th class="num">سود ناخالص کارخانه</th><th class="num">سود بازرگانی</th><th class="num">درآمد صندوق</th><th class="num">جمع</th><th class="num">تقسیم سود</th></tr></thead><tbody>' +
    kl.map(function (k) { var c = CM[k], m = act.M[k] || { fy: 0, tp: 0, div: 0 }, op = c && c.unit !== null ? c.salesA - c.salesT * c.unit : null;
      return '<tr><td>' + jlabel(k) + '</td><td class="num' + (op < 0 ? " neg" : "") + '">' + fmt(op) + '</td><td class="num">' + (m.tp ? fmt(m.tp) : "—") + '</td><td class="num">' + (m.fy ? fmt(m.fy) : "—") + '</td><td class="num">' + fmt((op || 0) + m.tp + m.fy) + '</td><td class="num">' + (m.div ? fmt(m.div) : "—") + '</td></tr>'; }).join("") + '</tbody></table></div></div>';
  h += '<div class="card"><div class="chead"><div><h3>حرکت‌های ثبت‌شده</h3><p class="hint">' + toFa((A.tr || []).length) + ' ردیف</p></div></div><div class="scroll"><table><thead><tr><th>تاریخ</th><th>نوع</th><th>صندوق / کالا</th><th>محموله</th><th class="num">تن</th><th class="num">مبلغ</th><th>طرف حساب</th><th>توضیح</th>' + (A.admin ? '<th></th>' : '') + '</tr></thead><tbody>' +
    ((A.tr || []).length ? A.tr.slice(0, 300).map(function (x) { var pp = typeof partyById === "function" ? partyById(x.party_id) : null; return '<tr><td>' + jd(x.d) + '</td><td>' + TR_KIND[x.kind] + '</td><td>' + esc(x.instrument || "—") + '</td><td>' + esc(x.lot || "—") + '</td><td class="num">' + (x.tons ? tn(x.tons) : "—") + '</td><td class="num' + (TR_OUT[x.kind] ? " neg" : "") + '">' + fmt(x.amount) + '</td><td>' + esc(pp ? pp.name : "—") + '</td><td>' + esc(x.note || "") + '</td>' + (A.admin ? '<td><button class="del" data-trdel="' + x.id + '">✕</button></td>' : '') + '</tr>'; }).join("") : '<tr><td colspan="9" class="mid" style="color:var(--muted)">هنوز حرکتی ثبت نشده.</td></tr>') + '</tbody></table></div></div>';
  return h;
}

var _bindPlanT = bindPlan;
bindPlan = function () {
  _bindPlanT();
  if ($("tpSave")) $("tpSave").onclick = async function () {
    function n(id) { var v = $(id).value.trim(); return v === "" ? null : num(v); }
    var p = { start: (n("tp_start") || 0) / um(), bufferM: n("tp_bufferM") || 0, divPct: n("tp_divPct") || 0, order: $("tp_order").value.split(","),
      fill: { on: $("tp_fill_on").checked, cycle: n("tp_fill_cycle") || 1, maxT: n("tp_fill_maxT") || 0, margin: n("tp_fill_margin") === null ? null : n("tp_fill_margin") / um() },
      trade: { on: $("tp_trade_on").checked, margin: n("tp_trade_margin") || 0, cycle: n("tp_trade_cycle") || 1, cap: (n("tp_trade_cap") || 0) / um(), tax: n("tp_trade_tax") },
      fund: { on: $("tp_fund_on").checked, yield: n("tp_fund_yield") || 0, tax: n("tp_fund_tax") || 0 } };
    var r = await db.from("bf_cost_cfg").upsert({ key: "treasury_policy", value: p, updated_at: new Date().toISOString() }); if (r.error) { toast(r.error.message); return; }
    A.ccfg.treasury_policy = p; render(); toast("سیاست ذخیره شد.");
  };
  if ($("trAdd")) $("trAdd").onclick = async function () {
    var d = parseJ($("tr_d").value), a = num($("tr_a").value), k = $("tr_k").value, note = $("trNote");
    if (!d) { note.className = "note err"; note.textContent = "تاریخ درست نیست."; return; } if (!(a > 0)) { note.className = "note err"; note.textContent = "مبلغ را وارد کنید."; return; }
    if (/^trade_/.test(k) && !$("tr_l").value.trim()) { note.className = "note err"; note.textContent = "برای بازرگانی شمارهٔ محموله لازم است."; return; }
    var pv = $("tr_p").value, o = { d: d, kind: k, amount: a / um(), instrument: $("tr_i").value.trim() || null, lot: $("tr_l").value.trim() || null, tons: $("tr_t").value.trim() ? num($("tr_t").value) : null, note: $("tr_n").value.trim() || null, party_id: pv && pv !== "__new" ? pv : null };
    var r = await db.from("bf_treasury").insert(o); if (r.error) { note.className = "note err"; note.textContent = r.error.message; return; }
    var q = await db.from("bf_treasury").select("*").order("d", { ascending: false }).limit(5000); A.tr = q.data || []; render(); toast("ثبت شد.");
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-trdel]"), function (b) { b.onclick = async function () { if (!confirm("حذف شود؟")) return; await db.from("bf_treasury").delete().eq("id", +b.dataset.trdel); var q = await db.from("bf_treasury").select("*").order("d", { ascending: false }).limit(5000); A.tr = q.data || []; render(); }; });
};
EXTRA_PAGES.treasury = pTreasury;
