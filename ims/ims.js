/* سیستم مدیریت یکپارچه (IMS) سایا نیک — ایزو ۹۰۰۱، ۴۵۰۰۱، ۱۴۰۰۱ و مدیریت دانش (۹۰۰۱ بند ۷.۱.۶ / ISO 30401).
   اصول طراحی:
   - هر کار به یک فرایند و یک منشأ وصل است و چرخهٔ PDCA دارد؛ بستن کار با تأییدکنندهٔ طبق چارت است.
   - هیچ امتیاز عددی وجود ندارد: وظیفه، وظیفه است. «فراتر از وظیفه» فقط دیده و قدردانی می‌شود.
   - گزارش شبه‌حادثه و عدم انطباق هرگز جریمه ندارد؛ هدف یادگیری است.
   - قواعد کلیدی (تأیید، مدرک، علت ریشه‌ای، اثربخشی) در پایگاه داده هم اجبار شده‌اند، نه فقط در رابط. */
/* نشانی و کلید از shared/config.js می‌آید */
var $ = function (id) { return document.getElementById(id); }, db = null;
var I = { page: "desk", me: "", role: null, ed: false, proc: [], tasks: [], nc: [], kn: [], org: [], acc: [], log: [], f: { p: "", a: "", s: "", k: "" } };

var PAGES = [
  { k: "desk", g: "daily", t: "میز کار من", ic: "home", h: "کارهای من، منتظر تأیید من، و ثبت سریع" },
  { k: "board", g: "daily", t: "تختهٔ کارها", ic: "list", h: "چرخهٔ PDCA: برنامه ← اجرا ← بررسی ← بسته" },
  { k: "nc", g: "daily", t: "عدم انطباق و اقدام اصلاحی", ic: "alert", h: "ثبت، علت ریشه‌ای، اقدام اصلاحی، بررسی اثربخشی (بند ۱۰.۲)" },
  { k: "know", g: "support", t: "بانک دانش", ic: "layers", h: "دانش سازمانی هر فرایند — ثبت، تأیید، انتقال، بازنگری" },
  { k: "proc", g: "plan", t: "نقشهٔ فرایندها", ic: "value", h: "فرایندهای مدیریتی، اصلی و پشتیبانی و مالک هر کدام (بند ۴.۴)" },
  { k: "over", g: "eval", t: "نمای کلی IMS", ic: "sum", h: "وضعیت کیفیت، ایمنی و محیط زیست در یک نگاه" },
  { k: "log", g: "eval", t: "گزارش تغییرات", ic: "clock", h: "سابقهٔ همهٔ تغییرات" }
];
var GROUPS = [["daily", "کار روزانه"], ["plan", "بافت و برنامه‌ریزی (بند ۴ و ۶)"], ["support", "پشتیبانی و مستندات (بند ۷)"], ["eval", "ارزیابی و بهبود (بند ۹ و ۱۰)"]];
var X = window.IMS_EXT = window.IMS_EXT || { pages: {}, add: [] };
var STD = { Q: "کیفیت", S: "ایمنی", E: "محیط زیست" };
var KIND = { routine: "وظیفهٔ روتین", assigned: "ارجاعی", corrective: "اقدام اصلاحی", improvement: "پیشنهاد بهبود" };
var SRC = { routine: "برنامهٔ روتین", objective: "هدف ماهانه/سالانه", risk: "ریسک یا فرصت", aspect: "جنبهٔ زیست‌محیطی", hazard: "خطر ایمنی", nc: "عدم انطباق", complaint: "شکایت مشتری", audit: "یافتهٔ ممیزی", review: "مصوبهٔ بازنگری مدیریت", legal: "الزام قانونی", suggestion: "پیشنهاد کارکنان", other: "سایر" };
var ST = { todo: "برنامه", doing: "در اجرا", review: "بررسی", done: "بسته شد", cancelled: "لغو" };
var STL = { todo: "P", doing: "D", review: "C", done: "A" };
var NCT = { nc_product: "عدم انطباق محصول", nc_process: "عدم انطباق فرایند", complaint: "شکایت مشتری", incident: "حادثهٔ ایمنی", near_miss: "شبه‌حادثه", env: "رویداد زیست‌محیطی", audit: "یافتهٔ ممیزی", legal: "عدم رعایت الزام قانونی" };
var NCSTD = { nc_product: ["Q"], nc_process: ["Q"], complaint: ["Q"], incident: ["S"], near_miss: ["S"], env: ["E"], audit: ["Q"], legal: ["Q"] };
var NCS = { open: "ثبت شد", analysis: "تحلیل علت", action: "اقدام اصلاحی", verify: "بررسی اثربخشی", closed: "بسته شد" };
var SEV = { minor: "جزئی", major: "عمده", critical: "بحرانی" };
var KK = { lesson: "درس‌آموخته", solution: "راه‌حل یک مشکل", technical: "نکتهٔ فنی تجهیزات", customer: "تجربهٔ مشتری/تأمین‌کننده", howto: "دستورالعمل کاری", safety: "نکتهٔ ایمنی/محیط زیست" };
var PK = { management: "فرایندهای مدیریتی", core: "فرایندهای اصلی", support: "فرایندهای پشتیبانی" };

function esc(s) { return String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function toast(t) { var el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("on"); }, 3200); }
function jd(iso) { return iso ? formatJalali(String(iso).slice(0, 10)) : "—"; }
function when(iso) { if (!iso) return "—"; return jd(iso) + " " + toFa(new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" })); }
function parseJ(s) { var p = toEn(String(s || "")).split(/[\/\-.]/).map(Number); if (p.length !== 3 || !p[0]) return null; if (p[0] < 100) p[0] += 1400; return jalaliToIso(p[0], p[1], p[2]); }
function addDays(iso, n) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function today() { return todayIso(); }
function stdTags(a) { return (a || []).map(function (s) { return '<span class="std ' + s + '">' + STD[s] + '</span>'; }).join(" "); }
function kpi(lab, val, unit, foot, cls) { return '<div class="kpi ' + (cls || "") + '"><div class="bd"><div class="hd"><span class="lab">' + lab + '</span></div><div class="val">' + val + (unit ? '<span class="unit">' + unit + '</span>' : '') + '</div></div><div class="ft"><span>' + (foot || "") + '</span></div></div>'; }
function nameOf(e) { if (!e) return "—"; var a = I.acc.filter(function (x) { return x.email === e; })[0]; return a && a.full_name ? a.full_name : e; }
function procOf(id) { return I.proc.filter(function (p) { return p.id === id; })[0] || null; }
function posById(id) { return I.org.filter(function (p) { return p.id === id; })[0] || null; }
function ownerOf(proc) { var p = proc ? posById(proc.owner_position_id) : null; return p ? p.holder_email : null; }
/* مدیر مستقیم طبق چارت: نزدیک‌ترین جایگاه بالادستِ پرشده */
function managerOf(email) {
  var mine = I.org.filter(function (p) { return p.holder_email === email; })[0]; if (!mine) return null;
  var cur = mine, g = 0; while (cur && cur.parent_id && g++ < 50) { var par = posById(cur.parent_id); if (!par) return null; if (par.holder_email && par.holder_email !== email) return par.holder_email; cur = par; }
  return null;
}
function approverFor(assignee, creator) { return managerOf(assignee) || (creator && creator !== assignee ? creator : assignee); }
function late(t) { return t.due_date && t.status !== "done" && t.status !== "cancelled" && t.due_date < today(); }
function procOpts(val, empty) { return '<option value="">' + (empty || "— فرایند") + '</option>' + I.proc.map(function (p) { return '<option value="' + p.id + '"' + (String(val) === String(p.id) ? " selected" : "") + '>' + esc(p.code + " · " + p.name) + '</option>'; }).join(""); }
function accOpts(val, empty) { return '<option value="">' + (empty || "—") + '</option>' + I.acc.map(function (a) { return '<option value="' + esc(a.email) + '"' + (val === a.email ? " selected" : "") + '>' + esc(a.full_name || a.email) + '</option>'; }).join(""); }
function mapOpts(m, val) { return Object.keys(m).map(function (k) { return '<option value="' + k + '"' + (val === k ? " selected" : "") + '>' + m[k] + '</option>'; }).join(""); }
function stdBoxes(id, arr) { return '<div class="stds" id="' + id + '">' + ["Q", "S", "E"].map(function (s) { return '<label><input type="checkbox" value="' + s + '"' + ((arr || []).indexOf(s) >= 0 ? " checked" : "") + '> ' + STD[s] + '</label>'; }).join("") + '</div>'; }
function stdRead(id) { var r = []; Array.prototype.forEach.call(document.querySelectorAll("#" + id + " input:checked"), function (c) { r.push(c.value); }); return r.length ? r : ["Q"]; }

async function ensureDb() { if (!db) db = await window.sayaClient(); return db; }
async function load() {
  var r = await Promise.all([db.from("ims_processes").select("*").order("sort"), db.from("ims_tasks").select("*").order("id", { ascending: false }).limit(2000),
    db.from("ims_nc").select("*").order("id", { ascending: false }).limit(1000), db.from("ims_knowledge").select("*").order("id", { ascending: false }).limit(2000),
    db.rpc("ims_org"), db.rpc("ims_accounts"), db.from("ims_log").select("*").order("at", { ascending: false }).limit(300)]);
  I.proc = r[0].data || []; I.tasks = r[1].data || []; I.nc = r[2].data || []; I.kn = r[3].data || []; I.org = r[4].data || []; I.acc = r[5].data || []; I.log = r[6].data || [];
  if (X.load) await X.load();
}
async function logit(t) { await db.from("ims_log").insert({ action: t }); }

/* ================= میز کار من ================= */
function taskRow(t) {
  var p = procOf(t.process_id);
  return '<div class="li" data-task="' + t.id + '"><div><b>' + esc(t.title) + '</b><br><span>' + (p ? esc(p.code) + " · " : "") + KIND[t.kind] + " · " + ST[t.status] + (t.status === "review" ? " · از " + esc(nameOf(t.assignee_email)) : "") + '</span></div>' +
    '<span class="' + (late(t) ? "pill p1" : "") + '">' + (t.due_date ? (late(t) ? "عقب: " : "") + jd(t.due_date) : "") + '</span></div>';
}
function pDesk() {
  var me = I.me, mine = I.tasks.filter(function (t) { return t.assignee_email === me && (t.status === "todo" || t.status === "doing"); }),
    rev = I.tasks.filter(function (t) { return t.status === "review" && t.approver_email === me; }),
    eff = I.tasks.filter(function (t) { return t.kind === "corrective" && t.status === "done" && t.effective === null && (t.approver_email === me || I.ed) && (!t.effect_due || t.effect_due <= today()); }),
    kap = I.kn.filter(function (k) { return k.status === "submitted" && (k.approver_email === me || (I.ed && !k.approver_email)) && (k.author_email !== me || I.ed); }),
    myNc = I.nc.filter(function (n) { return n.owner_email === me && n.status !== "closed"; }),
    sent = I.tasks.filter(function (t) { return t.created_by === me && t.assignee_email !== me && t.status !== "done" && t.status !== "cancelled"; });
  var h = '<div class="qa">' +
    '<button data-new="task"><b>+ کار تازه</b><span>ارجاع به خودم یا همکار</span></button>' +
    '<button data-new="nc"><b>+ گزارش عدم انطباق</b><span>محصول، فرایند، شکایت، حادثه، شبه‌حادثه، محیط زیست</span></button>' +
    '<button data-new="know"><b>+ ثبت دانش</b><span>درس‌آموخته، راه‌حل، نکتهٔ فنی</span></button>' +
    '<button data-new="improve"><b>+ پیشنهاد بهبود</b><span>ایده‌ای برای بهتر شدن کار</span></button></div>';
  function block(title, list, fn, emptyTx) { return '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>' + title + ' <span class="pill p3">' + toFa(list.length) + '</span></h3></div></div>' + (list.length ? list.map(fn).join("") : '<p class="hint">' + emptyTx + '</p>') + '</div>'; }
  h += block("کارهای من", mine, taskRow, "کار باز ندارید.");
  if (rev.length || I.ed) h += block("منتظر تأیید من", rev, taskRow, "کاری منتظر تأیید شما نیست.");
  if (eff.length) h += block("بررسی اثربخشی اقدام اصلاحی", eff, taskRow, "");
  if (kap.length) h += block("دانش منتظر تأیید من", kap, function (k) { return '<div class="li" data-kn="' + k.id + '"><div><b>' + esc(k.title) + '</b><br><span>' + esc(nameOf(k.author_email)) + " · " + KK[k.kind] + '</span></div><span>' + jd(k.created_at) + '</span></div>'; }, "");
  if (myNc.length) h += block("عدم انطباق‌هایی که مسئولشان هستم", myNc, ncRow, "");
  if (sent.length) h += block("کارهایی که ارجاع داده‌ام", sent, taskRow, "");
  if (X.desk) h += X.desk(block);
  return h;
}

/* ================= تختهٔ کارها ================= */
function card(t) {
  var p = procOf(t.process_id);
  return '<button class="tc" data-task="' + t.id + '"><b>' + esc(t.title) + '</b><div class="mt">' + (p ? '<span>' + esc(p.code) + '</span>' : '') + '<span class="kd ' + t.kind + '">' + KIND[t.kind] + '</span>' + stdTags(t.standards) + '</div>' +
    '<div class="mt" style="margin-top:6px"><span>' + esc(nameOf(t.assignee_email)) + '</span>' + (t.due_date ? '<span class="due' + (late(t) ? " late" : "") + '">· ' + jd(t.due_date) + '</span>' : '') + (t.needs_evidence ? '<span>· مدرک لازم</span>' : '') + '</div></button>';
}
function pBoard() {
  var f = I.f, list = I.tasks.filter(function (t) { return t.status !== "cancelled" && (!f.p || String(t.process_id) === f.p) && (!f.a || t.assignee_email === f.a) && (!f.s || (t.standards || []).indexOf(f.s) >= 0) && (!f.k || t.kind === f.k); });
  var monthAgo = addDays(today(), -30);
  var h = '<div class="flt"><select id="fP">' + procOpts(f.p, "همهٔ فرایندها") + '</select><select id="fA">' + accOpts(f.a, "همهٔ افراد") + '</select>' +
    '<select id="fS"><option value="">همهٔ استانداردها</option>' + mapOpts(STD, f.s) + '</select><select id="fK"><option value="">همهٔ انواع</option>' + mapOpts(KIND, f.k) + '</select>' +
    '<button class="more" data-new="task">+ کار تازه</button></div><div class="board">';
  ["todo", "doing", "review", "done"].forEach(function (s) {
    var L = list.filter(function (t) { return t.status === s && (s !== "done" || (t.done_at || "") >= monthAgo); });
    h += '<div class="col"><h4>' + ST[s] + ' <small>' + STL[s] + ' · ' + toFa(L.length) + (s === "done" ? " (۳۰ روز اخیر)" : "") + '</small></h4>' + (L.length ? L.map(card).join("") : '<p class="hint" style="padding:6px">—</p>') + '</div>';
  });
  return h + '</div>';
}

/* ================= مودال کار ================= */
function openTask(id, preset) {
  var t = id ? I.tasks.filter(function (x) { return x.id === id; })[0] : Object.assign({ kind: "assigned", source: "routine", standards: ["Q"], status: "todo", assignee_email: I.me, due_date: addDays(today(), 7) }, preset || {});
  var me = I.me, isNew = !t.id, canMeta = isNew || I.ed || t.created_by === me, isAss = t.assignee_email === me, isApp = t.approver_email === me || I.ed;
  var ro = canMeta ? "" : " disabled";
  var flow = ["todo", "doing", "review", "done"].map(function (s) { var i = ["todo", "doing", "review", "done"].indexOf(t.status), j = ["todo", "doing", "review", "done"].indexOf(s); return '<span class="' + (s === t.status ? "on" : j < i ? "ok" : "") + '">' + STL[s] + " · " + ST[s] + '</span>'; }).join("");
  var nc = t.nc_id ? I.nc.filter(function (n) { return n.id === t.nc_id; })[0] : null;
  var h = '<div class="card"><div class="chead"><div><h3>' + (isNew ? (t.kind === "improvement" ? "پیشنهاد بهبود" : t.kind === "corrective" ? "اقدام اصلاحی تازه" : "کار تازه") : "کار #" + toFa(t.id)) + '</h3>' +
    (isNew ? '' : '<div class="flow">' + flow + '</div><p class="hint">ارجاع: ' + esc(nameOf(t.created_by)) + ' · تأییدکننده: ' + esc(nameOf(t.approver_email)) + (t.approved_by ? ' · بسته شده توسط ' + esc(nameOf(t.approved_by)) + ' در ' + jd(t.done_at) : '') + '</p>') +
    (nc ? '<p class="hint">مربوط به عدم انطباق: «' + esc(nc.title) + '»</p>' : '') + '</div><button class="more" id="mX">بستن</button></div>' +
    '<div class="frm"><div style="grid-column:1/-1"><label>عنوان</label><input id="tT" value="' + esc(t.title || "") + '"' + ro + '></div>' +
    '<div style="grid-column:1/-1"><label>شرح</label><textarea id="tD"' + ro + '>' + esc(t.description || "") + '</textarea></div>' +
    '<div><label>نوع</label><select id="tK"' + ro + '>' + mapOpts(KIND, t.kind) + '</select></div>' +
    '<div><label>منشأ</label><select id="tS"' + ro + '>' + mapOpts(SRC, t.source) + '</select></div>' +
    '<div><label>فرایند</label><select id="tP"' + ro + '>' + procOpts(t.process_id) + '</select></div>' +
    '<div><label>مسئول انجام</label><select id="tA"' + ro + '>' + accOpts(t.assignee_email, "انتخاب کنید") + '</select></div>' +
    '<div><label>مهلت</label><input id="tDue" value="' + (t.due_date ? jd(t.due_date) : "") + '" placeholder="۱۴۰۵/۰۹/۱۵"' + ro + '></div>' +
    '<label class="chk"><input type="checkbox" id="tEv"' + (t.needs_evidence ? " checked" : "") + ro + '> سابقهٔ مستند لازم است (بند ۷.۵)</label>' +
    '<div style="grid-column:1/-1"><label>استاندارد مرتبط</label>' + stdBoxes("tStd", t.standards) + '</div></div>';
  if (!isNew) {
    var exec = isAss || isApp || canMeta;
    h += '<div class="frm" style="margin-top:6px"><div style="grid-column:1/-1"><label>نتیجهٔ اجرا' + (t.kind === "corrective" ? " (الزامی برای بستن)" : "") + '</label><textarea id="tR"' + (exec ? "" : " disabled") + '>' + esc(t.result_note || "") + '</textarea></div>' +
      '<div style="grid-column:1/-1"><label>مدرک / سابقه (لینک فایل، شمارهٔ فرم، توضیح)' + (t.needs_evidence ? " — الزامی" : "") + '</label><input id="tE" value="' + esc(t.evidence || "") + '"' + (exec ? "" : " disabled") + '></div>' +
      (t.kind === "corrective" ? '<div><label>تاریخ بررسی اثربخشی</label><input id="tEf" value="' + (t.effect_due ? jd(t.effect_due) : "") + '" placeholder="مثلاً ۳۰ روز بعد"' + (exec ? "" : " disabled") + '></div>' : '') + '</div>';
    if (t.kind === "corrective" && t.status === "done") {
      h += '<div class="gap" style="margin-top:12px">' + (t.effective === null ? 'اثربخشی این اقدام هنوز بررسی نشده.' + (t.effect_due ? ' موعد بررسی: ' + jd(t.effect_due) : '') : t.effective ? '✓ اثربخش بود. ' + esc(t.effect_note || "") : '✕ اثربخش نبود: ' + esc(t.effect_note || "") + ' — اقدام تازه لازم است.') + '</div>';
    }
  }
  h += '<div class="acts">';
  if (isNew) h += '<button class="btn sm" id="tSave">ثبت و ارجاع</button>';
  else {
    if (canMeta || isAss || isApp) h += '<button class="btn sm ghost" id="tSave">ذخیرهٔ تغییرات</button>';
    if (isAss && t.status === "todo") h += '<button class="btn sm" data-go="doing">شروع کار</button>';
    if (isAss && t.status === "doing") h += '<button class="btn sm" data-go="review">انجام شد — ارسال برای بررسی</button>';
    if (isApp && t.status === "review") h += '<button class="btn sm" data-go="done">تأیید و بستن</button><button class="btn sm warn" data-go="doing">برگشت برای اصلاح</button>';
    if (isApp && t.status !== "review" && t.status !== "done" && t.approver_email === me && t.assignee_email === me) h += '<button class="btn sm" data-go="done">بستن</button>';
    if (t.kind === "corrective" && t.status === "done" && t.effective === null && isApp) h += '<button class="btn sm" data-eff="1">اثربخش بود</button><button class="btn sm warn" data-eff="0">اثربخش نبود</button>';
    if (t.status === "done" && (isAss || isApp)) h += '<button class="btn sm ghost" id="tLesson">ثبت درس‌آموخته از این کار</button>';
    if ((canMeta) && t.status !== "done" && t.status !== "cancelled") h += '<button class="btn sm ghost" data-go="cancelled">لغو کار</button>';
  }
  h += '</div></div>';
  modal(h);
  $("tSave").onclick = async function () {
    var o = { title: $("tT").value.trim(), description: $("tD").value.trim() || null, kind: $("tK").value, source: $("tS").value, process_id: +$("tP").value || null,
      assignee_email: $("tA").value || null, standards: stdRead("tStd"), needs_evidence: $("tEv").checked };
    var dv = $("tDue").value.trim(); o.due_date = dv ? parseJ(dv) : null; if (dv && !o.due_date) { toast("تاریخ مهلت درست نیست."); return; }
    if (!o.title) { toast("عنوان را بنویسید."); return; } if (!o.assignee_email) { toast("مسئول انجام را انتخاب کنید."); return; }
    if (!isNew) {
      if (!canMeta) { o = {}; }
      if ($("tR")) o.result_note = $("tR").value.trim() || null; if ($("tE")) o.evidence = $("tE").value.trim() || null;
      if ($("tEf")) { var ev = $("tEf").value.trim(); o.effect_due = ev ? parseJ(ev) : null; }
      if (canMeta && o.assignee_email !== t.assignee_email) o.approver_email = approverFor(o.assignee_email, t.created_by);
      var r = await db.from("ims_tasks").update(o).eq("id", t.id); if (r.error) { toast(r.error.message); return; }
      await logit("ویرایش کار #" + t.id + " «" + (o.title || t.title) + "»");
    } else {
      o.approver_email = approverFor(o.assignee_email, me); o.created_by = me; if (preset && preset.nc_id) o.nc_id = preset.nc_id; if (preset && preset.ref_type) { o.ref_type = preset.ref_type; o.ref_id = preset.ref_id; }
      if (o.kind === "corrective" && !o.effect_due && o.due_date) o.effect_due = addDays(o.due_date, 30);
      var r2 = await db.from("ims_tasks").insert(o); if (r2.error) { toast(r2.error.message); return; }
      await logit("کار تازه «" + o.title + "» برای " + nameOf(o.assignee_email));
    }
    closeModal(); await load(); render(); toast("ثبت شد.");
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-go]"), function (b) { b.onclick = async function () {
    var s = b.dataset.go, o = { status: s };
    if ($("tR")) o.result_note = $("tR").value.trim() || null; if ($("tE")) o.evidence = $("tE").value.trim() || null;
    if ($("tEf")) { var ev = $("tEf").value.trim(); if (ev) o.effect_due = parseJ(ev); }
    if (s === "review" && t.needs_evidence && !o.evidence) { toast("این کار مدرک لازم دارد؛ اول مدرک را ثبت کنید."); return; }
    if (s === "cancelled" && !confirm("کار لغو شود؟")) return;
    var r = await db.from("ims_tasks").update(o).eq("id", t.id); if (r.error) { toast(r.error.message); return; }
    await logit("کار #" + t.id + " ← " + ST[s]); closeModal(); await load(); render(); toast(ST[s]); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-eff]"), function (b) { b.onclick = async function () {
    var ok = b.dataset.eff === "1", note = prompt(ok ? "شواهد اثربخشی (مثلاً تکرار نشد در ۳۰ روز):" : "چرا اثربخش نبود؟", ""); if (note === null) return;
    var r = await db.from("ims_tasks").update({ effective: ok, effect_note: note }).eq("id", t.id); if (r.error) { toast(r.error.message); return; }
    await logit("بررسی اثربخشی کار #" + t.id + ": " + (ok ? "اثربخش" : "اثربخش نبود")); closeModal(); await load(); render();
    if (!ok && t.nc_id) { var n = I.nc.filter(function (x) { return x.id === t.nc_id; })[0]; if (n && I.ed) await db.from("ims_nc").update({ status: "action" }).eq("id", n.id); await load(); render(); toast("عدم انطباق به مرحلهٔ «اقدام اصلاحی» برگشت؛ اقدام تازه تعریف کنید."); } }; });
  if ($("tLesson")) $("tLesson").onclick = function () { openKnow(null, { title: "درس‌آموخته: " + t.title, kind: "lesson", process_id: t.process_id, standards: t.standards, source_task_id: t.id, body: (t.result_note || "") }); };
}
function modal(h) { var m = $("mdl"); if (!m) { m = document.createElement("div"); m.id = "mdl"; m.className = "modal"; document.body.appendChild(m); m.onclick = function (e) { if (e.target === m) closeModal(); }; } m.innerHTML = h; m.style.display = "flex"; if ($("mX")) $("mX").onclick = closeModal; }
function closeModal() { var m = $("mdl"); if (m) { m.style.display = "none"; m.innerHTML = ""; } }

/* ================= عدم انطباق ================= */
function ncRow(n) {
  var acts = I.tasks.filter(function (t) { return t.nc_id === n.id; });
  return '<div class="li" data-nc="' + n.id + '"><div><b>' + esc(n.title) + '</b><br><span>' + NCT[n.type] + " · " + SEV[n.severity] + " · " + stdTags(n.standards) + " · گزارش: " + esc(nameOf(n.reported_by)) + '</span></div>' +
    '<div style="text-align:left"><span class="pill ' + (n.status === "closed" ? "p3" : n.severity === "minor" ? "p2" : "p1") + '">' + NCS[n.status] + '</span><br><span>' + jd(n.reported_at) + (acts.length ? " · " + toFa(acts.length) + " اقدام" : "") + '</span></div></div>';
}
function pNc() {
  var open = I.nc.filter(function (n) { return n.status !== "closed"; }), closed = I.nc.filter(function (n) { return n.status === "closed"; });
  var h = '<div class="gap">گزارش عدم انطباق، حادثه و به‌خصوص شبه‌حادثه کار درستی است و هرگز جریمه ندارد. هدف این بخش پیدا کردن علت و جلوگیری از تکرار است، نه پیدا کردن مقصر.</div>' +
    '<div class="flt"><button class="more" data-new="nc">+ گزارش تازه</button></div>';
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>باز <span class="pill p2">' + toFa(open.length) + '</span></h3><p class="hint">مسیر: ثبت ← تحلیل علت ریشه‌ای ← اقدام اصلاحی ← بررسی اثربخشی ← بسته</p></div></div>' + (open.length ? open.map(ncRow).join("") : '<p class="hint">موردی باز نیست.</p>') + '</div>';
  h += '<div class="card"><div class="chead"><div><h3>بسته‌شده</h3></div></div>' + (closed.length ? closed.slice(0, 50).map(ncRow).join("") : '<p class="hint">—</p>') + '</div>';
  return h;
}
function openNc(id) {
  var isNew = !id, n = isNew ? { type: "nc_process", severity: "minor", standards: ["Q"], status: "open" } : I.nc.filter(function (x) { return x.id === id; })[0];
  var can = isNew || I.ed || n.owner_email === I.me, ro = can ? "" : " disabled";
  var acts = isNew ? [] : I.tasks.filter(function (t) { return t.nc_id === n.id; });
  var flow = Object.keys(NCS).map(function (s) { var ks = Object.keys(NCS); return '<span class="' + (s === n.status ? "on" : ks.indexOf(s) < ks.indexOf(n.status) ? "ok" : "") + '">' + NCS[s] + '</span>'; }).join("");
  var h = '<div class="card"><div class="chead"><div><h3>' + (isNew ? "گزارش عدم انطباق / رویداد" : "عدم انطباق #" + toFa(n.id)) + '</h3>' + (isNew ? '<p class="hint">هر کسی می‌تواند گزارش دهد. مسئول پیگیری به‌طور پیش‌فرض مالک فرایند است.</p>' : '<div class="flow">' + flow + '</div><p class="hint">گزارش: ' + esc(nameOf(n.reported_by)) + ' · ' + when(n.reported_at) + ' · مسئول: ' + esc(nameOf(n.owner_email)) + '</p>') + '</div><button class="more" id="mX">بستن</button></div>' +
    '<div class="frm"><div style="grid-column:1/-1"><label>عنوان</label><input id="nT" value="' + esc(n.title || "") + '"' + (isNew ? "" : ro) + '></div>' +
    '<div><label>نوع</label><select id="nY"' + (isNew ? "" : ro) + '>' + mapOpts(NCT, n.type) + '</select></div>' +
    '<div><label>شدت</label><select id="nS"' + (isNew ? "" : ro) + '>' + mapOpts(SEV, n.severity) + '</select></div>' +
    '<div><label>فرایند</label><select id="nP"' + (isNew ? "" : ro) + '>' + procOpts(n.process_id) + '</select></div>' +
    (isNew ? '' : '<div><label>مسئول پیگیری</label><select id="nO"' + (I.ed ? "" : " disabled") + '>' + accOpts(n.owner_email, "مالک فرایند") + '</select></div>') +
    '<div style="grid-column:1/-1"><label>شرح ماجرا (چه، کجا، کی)</label><textarea id="nD"' + (isNew ? "" : ro) + '>' + esc(n.description || "") + '</textarea></div>' +
    '<div style="grid-column:1/-1"><label>اقدام فوری / اصلاح (Correction)</label><textarea id="nC"' + (isNew ? "" : ro) + '>' + esc(n.correction || "") + '</textarea></div>' +
    '<div style="grid-column:1/-1"><label>استاندارد مرتبط</label>' + stdBoxes("nStd", n.standards) + '</div>';
  if (!isNew) h += '<div style="grid-column:1/-1"><label>علت ریشه‌ای (۵ چرا: چرا رخ داد؟ ← چرا؟ ← … تا رسیدن به علت سیستمی)</label><textarea id="nR"' + ro + '>' + esc(n.root_cause || "") + '</textarea></div>';
  h += '</div>';
  if (!isNew) {
    h += '<div class="sec-h">اقدام‌های اصلاحی</div>' + (acts.length ? acts.map(function (t) { return '<div class="li" data-task="' + t.id + '"><div><b>' + esc(t.title) + '</b><br><span>' + esc(nameOf(t.assignee_email)) + " · " + ST[t.status] + (t.status === "done" ? (t.effective === null ? " · اثربخشی بررسی نشده" : t.effective ? " · اثربخش ✓" : " · اثربخش نبود ✕") : "") + '</span></div><span>' + jd(t.due_date) + '</span></div>'; }).join("") : '<p class="hint">هنوز اقدامی تعریف نشده. بعد از تحلیل علت، اقدامی تعریف کنید که علت را از بین ببرد، نه فقط معلول را.</p>');
  }
  h += '<div class="acts">';
  if (isNew) h += '<button class="btn sm" id="nSave">ثبت گزارش</button>';
  else if (can) {
    h += '<button class="btn sm ghost" id="nSave">ذخیره</button>';
    if (n.status !== "closed") h += '<button class="btn sm" id="nAct">+ اقدام اصلاحی</button>';
    var nx = { open: "analysis", analysis: "action", action: "verify", verify: "closed" }[n.status];
    if (nx) h += '<button class="btn sm" id="nNext">رفتن به «' + NCS[nx] + '»</button>';
    if (n.status === "closed") h += '<button class="btn sm ghost" id="nLesson">ثبت درس‌آموخته</button>';
  }
  h += '</div></div>';
  modal(h);
  $("nY").onchange = function () { if (isNew) Array.prototype.forEach.call(document.querySelectorAll("#nStd input"), function (c) { c.checked = NCSTD[$("nY").value].indexOf(c.value) >= 0; }); };
  if ($("nSave")) $("nSave").onclick = async function () {
    var o = { title: $("nT").value.trim(), type: $("nY").value, severity: $("nS").value, process_id: +$("nP").value || null, description: $("nD").value.trim() || null, correction: $("nC").value.trim() || null, standards: stdRead("nStd") };
    if (!o.title) { toast("عنوان را بنویسید."); return; }
    var r;
    if (isNew) { o.reported_by = I.me; o.owner_email = ownerOf(procOf(o.process_id)) || null; r = await db.from("ims_nc").insert(o); }
    else { if ($("nR")) o.root_cause = $("nR").value.trim() || null; if ($("nO") && I.ed) o.owner_email = $("nO").value || ownerOf(procOf(o.process_id)); r = await db.from("ims_nc").update(o).eq("id", n.id); }
    if (r.error) { toast(r.error.message); return; }
    await logit((isNew ? "گزارش تازه: " : "ویرایش عدم انطباق: ") + NCT[o.type] + " «" + o.title + "»"); closeModal(); await load(); render(); toast(isNew ? "گزارش ثبت شد. ممنون که گزارش دادید." : "ذخیره شد.");
  };
  if ($("nAct")) $("nAct").onclick = function () { openTask(null, { kind: "corrective", source: "nc", nc_id: n.id, process_id: n.process_id, standards: n.standards, needs_evidence: true, title: "اقدام اصلاحی: " + n.title, assignee_email: n.owner_email || I.me, due_date: addDays(today(), 14) }); };
  if ($("nNext")) $("nNext").onclick = async function () {
    var nx = { open: "analysis", analysis: "action", action: "verify", verify: "closed" }[n.status], o = { status: nx };
    if ($("nR")) o.root_cause = $("nR").value.trim() || null;
    if (nx === "action" && !o.root_cause) { toast("اول علت ریشه‌ای را بنویسید."); return; }
    if (nx === "verify" && !acts.length) { toast("هنوز اقدام اصلاحی تعریف نشده."); return; }
    var r = await db.from("ims_nc").update(o).eq("id", n.id); if (r.error) { toast(r.error.message); return; }
    await logit("عدم انطباق #" + n.id + " ← " + NCS[nx]); closeModal(); await load(); render(); toast(NCS[nx]);
    if (nx === "closed" && confirm("عدم انطباق بسته شد. از آن درس‌آموخته ثبت می‌کنید تا تکرار نشود؟")) openKnow(null, { title: "درس‌آموخته: " + n.title, kind: "lesson", process_id: n.process_id, standards: n.standards, source_nc_id: n.id, body: "چه شد: " + (n.description || "") + "\nعلت ریشه‌ای: " + (o.root_cause || n.root_cause || "") + "\nچه کردیم: " + acts.map(function (t) { return t.title; }).join("، ") });
  };
  if ($("nLesson")) $("nLesson").onclick = function () { openKnow(null, { title: "درس‌آموخته: " + n.title, kind: "lesson", process_id: n.process_id, standards: n.standards, source_nc_id: n.id, body: "علت ریشه‌ای: " + (n.root_cause || "") }); };
  bindLinks();
}

/* ================= بانک دانش ================= */
function knowApprover(procId, author) { var o = ownerOf(procOf(procId)); if (o && o !== author) return o; return managerOf(author) || null; }
function kItem(k) {
  var p = procOf(k.process_id), stale = k.review_date && k.review_date < today();
  return '<div class="kb" data-kn="' + k.id + '" style="cursor:pointer"><b>' + (k.critical ? '<span class="pill p1">حیاتی</span> ' : '') + esc(k.title) + '</b><div class="body">' + esc(String(k.body).slice(0, 260)) + (String(k.body).length > 260 ? "…" : "") + '</div>' +
    '<div class="mt"><span>' + KK[k.kind] + '</span>' + (p ? '<span>' + esc(p.code + " · " + p.name) + '</span>' : '') + stdTags(k.standards) + '<span>✍ ' + esc(nameOf(k.author_email)) + '</span>' +
    (k.status !== "approved" ? '<span class="pill p2">' + { draft: "پیش‌نویس", submitted: "منتظر تأیید " + nameOf(k.approver_email), archived: "بایگانی" }[k.status] + '</span>' : '') + (stale ? '<span class="pill p2">نیاز به بازنگری</span>' : '') + '</div></div>';
}
function pKnow() {
  var f = I.f, appr = I.kn.filter(function (k) { return k.status === "approved" && (!f.p || String(k.process_id) === f.p); }), pend = I.kn.filter(function (k) { return k.status === "submitted" || k.status === "draft"; });
  var h = '<div class="flt"><select id="fP">' + procOpts(f.p, "همهٔ فرایندها") + '</select><button class="more" data-new="know">+ ثبت دانش</button></div>';
  if (pend.length) h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>در انتظار تأیید <span class="pill p2">' + toFa(pend.length) + '</span></h3><p class="hint">مالک فرایند صحت دانش را تأیید می‌کند تا قابل اتکا باشد.</p></div></div>' + pend.map(kItem).join("") + '</div>';
  h += '<div class="card"><div class="chead"><div><h3>دانش تأییدشده <span class="pill p3">' + toFa(appr.length) + '</span></h3></div></div>' + (appr.length ? appr.map(kItem).join("") : '<p class="hint">هنوز دانشی تأیید نشده. اولین درس‌آموخته را ثبت کنید.</p>') + '</div>';
  return h;
}
function openKnow(id, preset) {
  var isNew = !id, k = isNew ? Object.assign({ kind: "lesson", standards: ["Q"], position_ids: [] }, preset || {}) : I.kn.filter(function (x) { return x.id === id; })[0];
  var can = isNew || I.ed || k.author_email === I.me, isApp = !isNew && (k.approver_email === I.me || I.ed) && (k.author_email !== I.me || I.ed), ro = can && k.status !== "approved" || I.ed ? "" : " disabled";
  var poss = I.org.map(function (p) { return '<label><input type="checkbox" value="' + p.id + '"' + ((k.position_ids || []).indexOf(p.id) >= 0 ? " checked" : "") + ro + '> ' + esc(p.title) + '</label>'; }).join("");
  var h = '<div class="card"><div class="chead"><div><h3>' + (isNew ? "ثبت دانش" : esc(k.title)) + '</h3><p class="hint">' + (isNew ? "تجربه‌ای که اگر گم شود، کسی دوباره باید با هزینه یادش بگیرد." : "نویسنده: " + esc(nameOf(k.author_email)) + " · " + jd(k.created_at) + (k.approved_at ? " · تأیید: " + jd(k.approved_at) : "")) + '</p></div><button class="more" id="mX">بستن</button></div>' +
    '<div class="frm"><div style="grid-column:1/-1"><label>عنوان</label><input id="kT" value="' + esc(k.title || "") + '"' + ro + '></div>' +
    '<div><label>نوع دانش</label><select id="kK"' + ro + '>' + mapOpts(KK, k.kind) + '</select></div>' +
    '<div><label>فرایند</label><select id="kP"' + ro + '>' + procOpts(k.process_id) + '</select></div>' +
    '<div><label>تاریخ بازنگری</label><input id="kR" value="' + (k.review_date ? jd(k.review_date) : "") + '" placeholder="مثلاً یک سال بعد"' + ro + '></div>' +
    '<label class="chk"><input type="checkbox" id="kC"' + (k.critical ? " checked" : "") + ro + '> دانش حیاتی (نبودش کار را متوقف یا خطرناک می‌کند)</label>' +
    '<div style="grid-column:1/-1"><label>متن</label><textarea id="kB" style="min-height:160px"' + ro + '>' + esc(k.body || "") + '</textarea></div>' +
    '<div style="grid-column:1/-1"><label>استاندارد مرتبط</label>' + stdBoxes("kStd", k.standards) + '</div>' +
    '<div style="grid-column:1/-1"><label>جایگاه‌هایی که باید این را بدانند (برای آموزش و ورود نیروی تازه)</label><div class="stds" id="kPos">' + (poss || '<span class="hint">چارت هنوز جایگاهی ندارد.</span>') + '</div></div></div><div class="acts">';
  if (isNew) h += '<button class="btn sm" id="kSave">ثبت و ارسال برای تأیید</button>';
  else {
    if (ro === "") h += '<button class="btn sm ghost" id="kSave">ذخیره</button>';
    if (isApp && k.status === "submitted") h += '<button class="btn sm" id="kOk">تأیید</button><button class="btn sm warn" id="kBack">برگشت به نویسنده</button>';
    if (I.ed && k.status === "approved") h += '<button class="btn sm ghost" id="kArch">بایگانی (کهنه شده)</button>';
    if (k.author_email === I.me && k.status === "draft") h += '<button class="btn sm" id="kSub">ارسال برای تأیید</button>';
  }
  h += '</div></div>'; modal(h);
  function read() { var o = { title: $("kT").value.trim(), kind: $("kK").value, process_id: +$("kP").value || null, body: $("kB").value.trim(), critical: $("kC").checked, standards: stdRead("kStd"), position_ids: [] };
    Array.prototype.forEach.call(document.querySelectorAll("#kPos input:checked"), function (c) { o.position_ids.push(+c.value); });
    var rv = $("kR").value.trim(); o.review_date = rv ? parseJ(rv) : null; return o; }
  if ($("kSave")) $("kSave").onclick = async function () {
    var o = read(); if (!o.title || !o.body) { toast("عنوان و متن را بنویسید."); return; }
    var r;
    if (isNew) { o.author_email = I.me; o.approver_email = knowApprover(o.process_id, I.me); o.status = "submitted"; if (k.source_task_id) o.source_task_id = k.source_task_id; if (k.source_nc_id) o.source_nc_id = k.source_nc_id; if (!o.review_date) o.review_date = addDays(today(), 365); r = await db.from("ims_knowledge").insert(o); }
    else { if (o.process_id !== k.process_id && k.status !== "approved") o.approver_email = knowApprover(o.process_id, k.author_email); r = await db.from("ims_knowledge").update(o).eq("id", k.id); }
    if (r.error) { toast(r.error.message); return; }
    await logit((isNew ? "ثبت دانش «" : "ویرایش دانش «") + o.title + "»"); closeModal(); await load(); render(); toast(isNew ? "ثبت شد و برای تأیید رفت. ممنون." : "ذخیره شد.");
  };
  async function setS(s, msg) { var r = await db.from("ims_knowledge").update({ status: s }).eq("id", k.id); if (r.error) { toast(r.error.message); return; } await logit(msg + " «" + k.title + "»"); closeModal(); await load(); render(); }
  if ($("kOk")) $("kOk").onclick = function () { setS("approved", "تأیید دانش"); };
  if ($("kBack")) $("kBack").onclick = function () { setS("draft", "برگشت دانش به نویسنده"); };
  if ($("kArch")) $("kArch").onclick = function () { setS("archived", "بایگانی دانش"); };
  if ($("kSub")) $("kSub").onclick = function () { setS("submitted", "ارسال دانش برای تأیید"); };
}

/* ================= نقشهٔ فرایندها ================= */
function pProc() {
  var h = '<div class="gap">نقشهٔ پیشنهادی برای کارخانهٔ باریت است؛ کد، نام و مالک هر فرایند را با مستندات IMS خودتان تطبیق دهید. مالک فرایند از چارت سازمانی انتخاب می‌شود و تأییدکنندهٔ دانش و مسئول پیش‌فرض عدم انطباق‌های آن فرایند است.</div>';
  ["management", "core", "support"].forEach(function (kd) {
    h += '<div class="sec-h">' + PK[kd] + '</div>';
    I.proc.filter(function (p) { return p.kind === kd; }).forEach(function (p) {
      var pos = posById(p.owner_position_id), ot = I.tasks.filter(function (t) { return t.process_id === p.id && t.status !== "done" && t.status !== "cancelled"; }),
        on = I.nc.filter(function (n) { return n.process_id === p.id && n.status !== "closed"; }), kn = I.kn.filter(function (k) { return k.process_id === p.id && k.status === "approved"; });
      h += '<div class="pcard"><div class="h"><div><b><code>' + esc(p.code) + '</code>' + esc(p.name) + '</b> ' + stdTags(p.standards) + '</div>' + (I.ed ? '<button class="more" data-proc="' + p.id + '">ویرایش</button>' : '') + '</div>' +
        '<p>' + esc(p.purpose || "") + (p.kpis ? '<br>شاخص‌ها: ' + esc(p.kpis) : '') + '</p><div class="nums"><span>مالک: <b>' + (pos ? esc(pos.title) + " — " + esc(nameOf(pos.holder_email)) : '<span style="color:var(--amber)">تعیین نشده</span>') + '</b></span>' +
        '<span>کار باز: ' + toFa(ot.length) + '</span><span>عدم انطباق باز: ' + toFa(on.length) + '</span><span>دانش: ' + toFa(kn.length) + '</span></div></div>';
    });
  });
  if (I.ed) h += '<button class="more" data-proc="0" style="margin-top:6px">+ فرایند تازه</button>';
  return h;
}
function openProc(id) {
  var p = id ? procOf(id) : { kind: "core", standards: ["Q"], sort: I.proc.length + 1 };
  var posOpts = '<option value="">— تعیین نشده</option>' + I.org.map(function (o) { return '<option value="' + o.id + '"' + (o.id === p.owner_position_id ? " selected" : "") + '>' + esc(o.title + (o.holder_email ? " — " + nameOf(o.holder_email) : " (خالی)")) + '</option>'; }).join("");
  modal('<div class="card"><div class="chead"><div><h3>' + (id ? "ویرایش فرایند" : "فرایند تازه") + '</h3></div><button class="more" id="mX">بستن</button></div><div class="frm">' +
    '<div><label>کد</label><input id="pC" dir="ltr" value="' + esc(p.code || "") + '"></div><div><label>نام</label><input id="pN" value="' + esc(p.name || "") + '"></div>' +
    '<div><label>نوع</label><select id="pK">' + mapOpts({ management: "مدیریتی", core: "اصلی", support: "پشتیبانی" }, p.kind) + '</select></div><div><label>مالک فرایند (جایگاه)</label><select id="pO">' + posOpts + '</select></div>' +
    '<div style="grid-column:1/-1"><label>هدف و دامنه</label><textarea id="pPu">' + esc(p.purpose || "") + '</textarea></div>' +
    '<div style="grid-column:1/-1"><label>شاخص‌های پایش</label><input id="pKp" value="' + esc(p.kpis || "") + '"></div>' +
    '<div style="grid-column:1/-1"><label>استاندارد</label>' + stdBoxes("pStd", p.standards) + '</div></div><div class="acts"><button class="btn sm" id="pSave">ذخیره</button></div></div>');
  $("pSave").onclick = async function () {
    var o = { code: $("pC").value.trim(), name: $("pN").value.trim(), kind: $("pK").value, owner_position_id: +$("pO").value || null, purpose: $("pPu").value.trim() || null, kpis: $("pKp").value.trim() || null, standards: stdRead("pStd"), updated_at: new Date().toISOString() };
    if (!o.code || !o.name) { toast("کد و نام لازم است."); return; }
    var r = id ? await db.from("ims_processes").update(o).eq("id", id) : await db.from("ims_processes").insert(Object.assign(o, { sort: p.sort }));
    if (r.error) { toast(r.error.message); return; } await logit((id ? "ویرایش فرایند " : "فرایند تازه ") + o.code); closeModal(); await load(); render();
  };
}

/* ================= نمای کلی ================= */
function pOver() {
  var open = I.tasks.filter(function (t) { return t.status !== "done" && t.status !== "cancelled"; }), lt = open.filter(late), rv = open.filter(function (t) { return t.status === "review"; }),
    onc = I.nc.filter(function (n) { return n.status !== "closed"; }), effP = I.tasks.filter(function (t) { return t.kind === "corrective" && t.status === "done" && t.effective === null; }),
    ka = I.kn.filter(function (k) { return k.status === "approved"; }), noOwner = I.proc.filter(function (p) { var pos = posById(p.owner_position_id); return !pos || !pos.holder_email; });
  var h = '<div class="grid g3" style="margin-bottom:14px">' + kpi("کارهای باز", toFa(open.length), "کار", toFa(lt.length) + " عقب از مهلت · " + toFa(rv.length) + " منتظر بررسی", lt.length ? "warn" : "") +
    kpi("عدم انطباق باز", toFa(onc.length), "مورد", toFa(effP.length) + " اقدام منتظر بررسی اثربخشی", onc.length ? "warn" : "pos") + kpi("دانش تأییدشده", toFa(ka.length), "مورد", toFa(I.kn.length - ka.length) + " در انتظار یا پیش‌نویس") + '</div>';
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>به تفکیک استاندارد</h3></div></div><div class="scroll"><table><thead><tr><th>استاندارد</th><th class="num">کار باز</th><th class="num">عقب از مهلت</th><th class="num">عدم انطباق باز</th><th class="num">دانش</th></tr></thead><tbody>' +
    ["Q", "S", "E"].map(function (s) { function has(x) { return (x.standards || []).indexOf(s) >= 0; }
      return '<tr><td>' + stdTags([s]) + ' ' + { Q: "ایزو ۹۰۰۱", S: "ایزو ۴۵۰۰۱", E: "ایزو ۱۴۰۰۱" }[s] + '</td><td class="num">' + toFa(open.filter(has).length) + '</td><td class="num">' + toFa(lt.filter(has).length) + '</td><td class="num">' + toFa(onc.filter(has).length) + '</td><td class="num">' + toFa(ka.filter(has).length) + '</td></tr>'; }).join("") + '</tbody></table></div></div>';
  /* دانش تک‌نفره: جایگاه پرشده‌ای که هیچ دانش تأییدشده‌ای به آن وصل نیست */
  var single = I.org.filter(function (p) { return p.holder_email && !ka.some(function (k) { return (k.position_ids || []).indexOf(p.id) >= 0; }); });
  h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>ریسک دانش تک‌نفره</h3><p class="hint">جایگاه‌هایی که دانش کارشان فقط در ذهن یک نفر است؛ اگر آن نفر نباشد، کار لنگ می‌ماند.</p></div></div>' +
    (single.length ? single.map(function (p) { return '<div class="li"><div><b>' + esc(p.title) + '</b><br><span>' + esc(nameOf(p.holder_email)) + '</span></div><span class="pill p2">دانش مستند ندارد</span></div>'; }).join("") : '<p class="hint">برای همهٔ جایگاه‌های پرشده دانش مستند هست.</p>') + '</div>';
  if (noOwner.length) h += '<div class="gap">' + toFa(noOwner.length) + ' فرایند مالکِ دارای فرد ندارد: ' + noOwner.map(function (p) { return esc(p.code); }).join("، ") + '</div>';
  /* دیده‌شده‌های فراتر از وظیفه — بدون امتیاز، فقط قدردانی */
  var since = addDays(today(), -30), seen = {};
  function add(e, t) { if (!e) return; (seen[e] = seen[e] || []).push(t); }
  I.tasks.forEach(function (t) { if (t.kind === "improvement" && t.created_at >= since) add(t.created_by, "پیشنهاد بهبود: " + t.title); });
  I.nc.forEach(function (n) { if (n.type === "near_miss" && n.reported_at >= since) add(n.reported_by, "گزارش شبه‌حادثه: " + n.title); });
  I.kn.forEach(function (k) { if (k.status === "approved" && (k.approved_at || "") >= since) add(k.author_email, "دانش: " + k.title); });
  var ks = Object.keys(seen);
  h += '<div class="card"><div class="chead"><div><h3>فراتر از وظیفه — ۳۰ روز اخیر</h3><p class="hint">پیشنهاد بهبود، گزارش شبه‌حادثه و دانش ثبت‌شده. امتیاز ندارد؛ برای دیدن و قدردانی در گفت‌وگوی ماهانه است.</p></div></div>' +
    (ks.length ? ks.map(function (e) { return '<div class="kb"><b>' + esc(nameOf(e)) + '</b><div class="mt">' + seen[e].map(function (x) { return '<span>' + esc(x) + '</span>'; }).join(" · ") + '</div></div>'; }).join("") : '<p class="hint">هنوز موردی ثبت نشده.</p>') + '</div>';
  if (X.over) h = X.over() + h;
  return h;
}
function pLog() {
  return '<div class="card"><div class="scroll"><table><thead><tr><th>زمان</th><th>توسط</th><th>تغییر</th></tr></thead><tbody>' +
    (I.log.length ? I.log.map(function (l) { return '<tr><td>' + when(l.at) + '</td><td>' + esc(nameOf(l.by_email)) + '</td><td>' + esc(l.action) + '</td></tr>'; }).join("") : '<tr><td colspan="3" class="mid" style="color:var(--muted)">هنوز تغییری ثبت نشده.</td></tr>') + '</tbody></table></div></div>';
}

/* ================= پوسته ================= */
function nav() {
  var me = I.me, badge = { desk: I.tasks.filter(function (t) { return (t.assignee_email === me && (t.status === "todo" || t.status === "doing")) || (t.status === "review" && t.approver_email === me); }).length, nc: I.nc.filter(function (n) { return n.status !== "closed"; }).length };
  var all = PAGES.filter(function (p) { return p.k !== "log"; }).concat(X.add || [], PAGES.filter(function (p) { return p.k === "log"; }));
  $("nav").innerHTML = GROUPS.map(function (g) {
    var L = all.filter(function (p) { return p.g === g[0]; }); if (!L.length) return "";
    return '<div class="ngrp"><div class="nhead" style="cursor:default"><span>' + g[1] + '</span></div><div class="nbody">' + L.map(function (p) {
      var bd = badge[p.k] || (X.badge && X.badge(p.k)) || 0;
      return '<button class="nav' + (I.page === p.k ? " on" : "") + '" data-p="' + p.k + '"><span class="ic">' + icon(p.ic) + '</span>' + p.t + (bd ? ' <span class="pill p2" style="margin-right:auto">' + toFa(bd) + '</span>' : '') + '</button>'; }).join("") + '</div></div>'; }).join("");
  Array.prototype.forEach.call(document.querySelectorAll("[data-p]"), function (b) { b.onclick = function () { I.page = b.dataset.p; $("side").classList.remove("open"); $("scrim").classList.add("hide"); render(); window.scrollTo(0, 0); }; });
}
function bindLinks() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-task]"), function (b) { b.onclick = function () { openTask(+b.dataset.task); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-nc]"), function (b) { b.onclick = function () { openNc(+b.dataset.nc); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-kn]"), function (b) { b.onclick = function () { openKnow(+b.dataset.kn); }; });
}
function render() {
  nav(); var p = PAGES.concat(X.add || []).filter(function (x) { return x.k === I.page; })[0] || PAGES[0];
  $("ptitle").textContent = p.t; $("phint").textContent = p.h;
  var fn = Object.assign({ desk: pDesk, board: pBoard, nc: pNc, know: pKnow, proc: pProc, over: pOver, log: pLog }, X.pages)[p.k];
  $("view").innerHTML = (p.print ? '<div class="flt noprint" style="justify-content:flex-end"><button class="more" onclick="window.print()">چاپ / PDF</button></div><div class="printh">' + esc(p.t) + ' — سیستم مدیریت یکپارچهٔ سایا نیک — ' + jd(today()) + '</div>' : '') + fn();
  bindLinks(); if (X.bind) X.bind(p.k);
  Array.prototype.forEach.call(document.querySelectorAll("[data-new]"), function (b) { b.onclick = function () {
    var k = b.dataset.new; if (k === "task") openTask(null); else if (k === "nc") openNc(null); else if (k === "know") openKnow(null);
    else if (k === "improve") openTask(null, { kind: "improvement", source: "suggestion", title: "", assignee_email: managerOf(I.me) || I.me }); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-proc]"), function (b) { b.onclick = function () { openProc(+b.dataset.proc || null); }; });
  [["fP", "p"], ["fA", "a"], ["fS", "s"], ["fK", "k"]].forEach(function (x) { if ($(x[0])) $(x[0]).onchange = function () { I.f[x[1]] = $(x[0]).value; render(); }; });
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
  I.me = String(s.data.session.user.email || "").toLowerCase(); $("auth").classList.add("hide"); $("boot").classList.remove("hide");
  var r = await db.rpc("dash_role", { p_key: "ims" }); I.role = r.data || null;
  if (!I.role) { $("boot").innerHTML = '<div class="empty">دسترسی ' + esc(I.me) + ' به سیستم مدیریت یکپارچه فعال نیست.<br><br><button class="more" id="lo2">خروج</button></div>'; $("lo2").onclick = async function () { await db.auth.signOut(); location.reload(); }; return; }
  I.ed = I.role === "editor" || I.role === "admin";
  await load();
  var nm = nameOf(I.me); $("meNm").textContent = nm; $("meAv").textContent = String(nm).trim().charAt(0);
  $("meRl").textContent = { admin: "مدیر", editor: "ویرایش", viewer: "کارکنان" }[I.role];
  SayaApps.render(db, $("apps"), "ims", "../");
  $("boot").classList.add("hide"); $("app").classList.remove("hide"); render();
}
start();
