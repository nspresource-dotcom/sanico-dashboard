/* IMS — مرحلهٔ دوم: بافت سازمان و ذی‌نفعان (۴.۱، ۴.۲)، خط‌مشی و دامنه (۴.۳، ۵.۲)، ریسک/فرصت، جنبه و خطر (۶.۱)،
   الزامات قانونی و ارزیابی انطباق (۶.۱.۳، ۹.۱.۲)، اهداف (۶.۲)، کنترل مستندات (۷.۵)، ممیزی داخلی (۹.۲)، بازنگری مدیریت (۹.۳)
   و «آمادگی ممیزی» خودکار.
   این فایل پیش از ims.js بارگذاری می‌شود و فقط از راه window.IMS_EXT به آن وصل است؛ توابع ims.js را هنگام اجرا صدا می‌زند. */
(function () {
  var X = window.IMS_EXT = window.IMS_EXT || { pages: {}, add: [] };
  X.add = [
    { k: "policy", g: "plan", t: "خط‌مشی و دامنه", ic: "flag", h: "خط‌مشی یکپارچه و دامنهٔ سیستم (بندهای ۴.۳ و ۵.۲)", print: true },
    { k: "context", g: "plan", t: "بافت و ذی‌نفعان", ic: "radar", h: "مسائل درونی و بیرونی، طرف‌های ذی‌نفع و تغییر اقلیم (۴.۱، ۴.۲ — اصلاحیهٔ ۲۰۲۴)", print: true },
    { k: "risk", g: "plan", t: "ریسک، جنبه و خطر", ic: "scale", h: "ریسک و فرصت، جنبه‌های زیست‌محیطی، خطرات ایمنی — احتمال × شدت (بند ۶.۱)", print: true },
    { k: "legal", g: "plan", t: "الزامات قانونی", ic: "bank", h: "قوانین، مجوزها و الزامات مشتری و ارزیابی دوره‌ای انطباق (۶.۱.۳، ۹.۱.۲)", print: true },
    { k: "obj", g: "plan", t: "اهداف", ic: "up", h: "اهداف قابل اندازه‌گیری، برنامهٔ دستیابی و پایش ماهانه (بند ۶.۲)", print: true },
    { k: "docs", g: "support", t: "کنترل مستندات", ic: "copy", h: "فهرست اصلی مستندات، ویرایش، تأیید و بازنگری (بند ۷.۵)", print: true },
    { k: "audit", g: "eval", t: "ممیزی داخلی", ic: "receipt", h: "برنامه، چک‌لیست بند به بند و یافته‌ها (بند ۹.۲)", print: true },
    { k: "review", g: "eval", t: "بازنگری مدیریت", ic: "compare", h: "ورودی‌های خودکار، مصوبات و صورت‌جلسهٔ نهایی (بند ۹.۳)", print: true }
  ];
  var RK = { risk: "ریسک", opportunity: "فرصت", aspect: "جنبهٔ زیست‌محیطی", hazard: "خطر ایمنی" };
  var RS = { open: "باز", treating: "در حال اقدام", controlled: "کنترل‌شده", closed: "بسته" };
  var COND = { normal: "عادی", abnormal: "غیرعادی", emergency: "اضطراری" };
  var CK = { internal: "مسئلهٔ درونی", external: "مسئلهٔ بیرونی", party: "طرف ذی‌نفع" };
  var LK = { law: "قانون", regulation: "آیین‌نامه/ضابطه", permit: "مجوز/پروانه", standard: "استاندارد/الزام مشتری", contract: "قرارداد", other: "سایر" };
  var LR = { compliant: "منطبق", partial: "انطباق جزئی", noncompliant: "نامنطبق", na: "غیرقابل‌اعمال" };
  var DK = { policy: "خط‌مشی", manual: "راهنما/نظام‌نامه", procedure: "روش اجرایی", instruction: "دستورالعمل", form: "فرم", plan: "طرح/برنامه", record: "سابقه", external: "مستند برون‌سازمانی" };
  var DS = { draft: "پیش‌نویس", review: "در انتظار تأیید", approved: "تأییدشده", obsolete: "منسوخ" };
  var AR = { pending: "بررسی نشده", conform: "منطبق", obs: "مشاهده", ofi: "فرصت بهبود", minor: "عدم انطباق جزئی", major: "عدم انطباق عمده", na: "غیرقابل‌اعمال" };
  var tab = { risk: "", context: "internal" }, objYear = null;

  function lvl(sc) { return sc >= 15 ? 3 : sc >= 5 ? 2 : 1; }
  function scB(l, s) { if (!l || !s) return "—"; var v = l * s; return '<span class="sc lv' + lvl(v) + '">' + toFa(v) + '</span>'; }
  function jy() { return isoToJalali(today()).jy; }
  function jPer(iso) { var j = isoToJalali(iso); return j.jy + "/" + (j.jm < 10 ? "0" : "") + j.jm; }
  function prevPer() { var j = isoToJalali(today()); var y = j.jy, m = j.jm - 1; if (m < 1) { m = 12; y--; } return y + "/" + (m < 10 ? "0" : "") + m; }
  function addMonths(iso, n) { var d = new Date(iso + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); }
  function nextEval(l) { return l.last_eval ? addMonths(l.last_eval, l.eval_months || 12) : null; }
  function legalFlag(l) { var t = today(), ne = nextEval(l); if (l.last_result === "noncompliant") return [3, "نامنطبق"]; if (l.valid_until && l.valid_until < t) return [3, "مجوز منقضی شده"]; if (!l.last_eval) return [2, "ارزیابی نشده"]; if (ne && ne < t) return [2, "ارزیابی سررسید شده"]; if (l.valid_until && l.valid_until < addDays(t, 60)) return [2, "انقضا تا ۶۰ روز"]; if (l.last_result === "partial") return [2, "انطباق جزئی"]; return [1, "منطبق"]; }
  function pill(lv, tx) { return '<span class="pill ' + ({ 1: "p3", 2: "p2", 3: "p1" }[lv]) + '">' + esc(tx) + '</span>'; }
  function S(k) { return (I.set || {})[k] || ""; }
  async function setS(k, v) { var r = await db.from("ims_settings").upsert({ key: k, value: v, updated_at: new Date().toISOString(), updated_by: I.me }); if (r.error) throw r.error; I.set[k] = v; }
  function err(r) { if (r && r.error) { toast(r.error.message); return true; } return false; }
  async function refresh(msg) { closeModal(); await load(); render(); if (msg) toast(msg); }

  /* ---------- فرم‌ساز کوچک ---------- */
  function F(spec, o, ro) {
    var dis = ro ? " disabled" : "";
    return '<div class="frm">' + spec.map(function (f) {
      var v = o[f.k], id = "x_" + f.k, full = f.full ? ' style="grid-column:1/-1"' : '';
      if (f.t === "chk") return '<label class="chk"' + full + '><input type="checkbox" id="' + id + '"' + (v ? " checked" : "") + dis + '> ' + f.l + '</label>';
      var inp;
      if (f.t === "area") inp = '<textarea id="' + id + '"' + dis + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + '>' + esc(v || "") + '</textarea>';
      else if (f.t === "sel") inp = '<select id="' + id + '"' + dis + '>' + (f.empty ? '<option value="">' + f.empty + '</option>' : '') + Object.keys(f.o).map(function (k) { return '<option value="' + k + '"' + (String(v) === k ? " selected" : "") + '>' + f.o[k] + '</option>'; }).join("") + '</select>';
      else if (f.t === "proc") inp = '<select id="' + id + '"' + dis + '>' + procOpts(v) + '</select>';
      else if (f.t === "acc") inp = '<select id="' + id + '"' + dis + '>' + accOpts(v, f.empty || "—") + '</select>';
      else if (f.t === "std") return '<div' + full + '><label>' + f.l + '</label>' + stdBoxes(id, v) + '</div>';
      else if (f.t === "date") inp = '<input id="' + id + '" value="' + (v ? jd(v) : "") + '" placeholder="۱۴۰۵/۰۹/۱۵"' + dis + '>';
      else if (f.t === "lv") inp = '<select id="' + id + '"' + dis + '>' + (f.empty ? '<option value="">' + f.empty + '</option>' : '') + [1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (Number(v) === n ? " selected" : "") + '>' + toFa(n) + " — " + f.o[n - 1] + '</option>'; }).join("") + '</select>';
      else inp = '<input id="' + id + '" value="' + esc(v === null || v === undefined ? "" : (f.t === "num" ? toFa(v) : v)) + '"' + dis + (f.ltr ? ' dir="ltr"' : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + '>';
      return '<div' + full + '><label>' + f.l + '</label>' + inp + '</div>';
    }).join("") + '</div>';
  }
  function FR(spec) {
    var o = {}, bad = null;
    spec.forEach(function (f) {
      var el = $("x_" + f.k); if (!el && f.t !== "std") return;
      if (f.t === "chk") o[f.k] = el.checked;
      else if (f.t === "std") o[f.k] = stdRead("x_" + f.k);
      else if (f.t === "proc" || f.t === "lv") o[f.k] = +el.value || null;
      else if (f.t === "num") { var t = toEn(el.value).replace(/,/g, "").trim(); o[f.k] = t === "" ? null : Number(t); if (t !== "" && isNaN(o[f.k])) bad = f.l; }
      else if (f.t === "date") { var dv = el.value.trim(); o[f.k] = dv ? parseJ(dv) : null; if (dv && !o[f.k]) bad = f.l; }
      else o[f.k] = el.value.trim() || null;
      if (f.req && (o[f.k] === null || o[f.k] === "")) bad = bad || f.l;
    });
    if (bad) { toast("«" + bad + "» را درست وارد کنید."); return null; }
    return o;
  }
  function linkedTasks(type, id) {
    var L = I.tasks.filter(function (t) { return t.ref_type === type && t.ref_id === id; });
    return '<div class="sec-h">اقدام‌ها و کارهای مرتبط</div>' + (L.length ? L.map(function (t) { return '<div class="li" data-task="' + t.id + '"><div><b>' + esc(t.title) + '</b><br><span>' + esc(nameOf(t.assignee_email)) + " · " + ({ todo: "برنامه", doing: "در اجرا", review: "بررسی", done: "بسته شد", cancelled: "لغو" })[t.status] + '</span></div><span>' + jd(t.due_date) + '</span></div>'; }).join("") : '<p class="hint">هنوز اقدامی تعریف نشده.</p>');
  }
  function rebind() { Array.prototype.forEach.call(document.querySelectorAll("#mdl [data-task]"), function (b) { b.onclick = function () { openTask(+b.dataset.task); }; }); }

  /* ---------- بارگذاری ---------- */
  X.load = async function () {
    var r = await Promise.all(["ims_settings", "ims_context", "ims_risks", "ims_legal", "ims_legal_evals", "ims_objectives", "ims_objective_vals", "ims_docs", "ims_doc_revs", "ims_audits", "ims_audit_items", "ims_reviews"].map(function (t) {
      var q = db.from(t).select("*"); return t === "ims_settings" ? q : q.order("id", { ascending: t === "ims_audit_items" || t === "ims_objective_vals" }).limit(3000); }));
    I.set = {}; (r[0].data || []).forEach(function (x) { I.set[x.key] = x.value; });
    I.ctx = r[1].data || []; I.risks = r[2].data || []; I.legal = r[3].data || []; I.levals = r[4].data || []; I.objs = r[5].data || []; I.ovals = r[6].data || [];
    I.docs = r[7].data || []; I.drevs = r[8].data || []; I.audits = r[9].data || []; I.aitems = r[10].data || []; I.reviews = r[11].data || [];
  };
  X.badge = function (k) {
    if (k === "risk") return I.risks ? I.risks.filter(function (x) { return x.score >= 15 && (x.status === "open"); }).length : 0;
    if (k === "legal") return I.legal ? I.legal.filter(function (l) { return legalFlag(l)[0] >= 2; }).length : 0;
    return 0;
  };

  /* ================= خط‌مشی و دامنه ================= */
  X.pages.policy = function () {
    var ap = S("policy_status") === "approved";
    return '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>خط‌مشی سیستم مدیریت یکپارچه</h3><p class="hint">' + (ap ? "تأییدشده · ویرایش " + toFa(S("policy_version")) + " · " + jd(S("policy_date")) + " · " + esc(nameOf(S("policy_by"))) : "پیش‌نویس — نیازمند بازبینی و تأیید مدیرعامل") + '</p></div>' + (ap ? pill(1, "ابلاغ‌شده") : pill(2, "پیش‌نویس")) + '</div>' +
      (I.ed && !ap ? '<textarea id="polT" class="noprint" style="min-height:360px">' + esc(S("policy")) + '</textarea><div class="pol printonly">' + esc(S("policy")) + '</div>' : '<div class="pol">' + esc(S("policy")) + '</div>') +
      '<div class="card" style="margin:14px 0 0;box-shadow:none;border:1px solid var(--line)"><h3 style="margin:0 0 8px">دامنهٔ سیستم (بند ۴.۳)</h3>' + (I.ed && !ap ? '<textarea id="scT" class="noprint">' + esc(S("scope")) + '</textarea><div class="pol printonly">' + esc(S("scope")) + '</div>' : '<div class="pol">' + esc(S("scope")) + '</div>') + '</div>' +
      (I.ed ? '<div class="acts noprint">' + (ap ? '<button class="btn sm ghost" id="polRev">بازنگری (ویرایش تازه)</button>' : '<button class="btn sm ghost" id="polSave">ذخیرهٔ پیش‌نویس</button><button class="btn sm" id="polOk">تأیید و ابلاغ</button>') + '</div>' : '') + '</div>' +
      '<div class="gap">خط‌مشی را پس از تأیید چاپ و امضا کنید، در محل کار نصب کنید و در جلسه به کارکنان ابلاغ کنید. سابقهٔ ابلاغ (فهرست حاضران) را نگه دارید. دست‌کم سالی یک بار در بازنگری مدیریت مرور شود.</div>';
  };
  /* ================= بافت و ذی‌نفعان ================= */
  var CTX_SUG = [
    ["external", "نوسان نرخ ارز و تحریم‌ها", "روی قیمت فروش صادراتی، تأمین قطعات و تجهیزات اثر دارد", null, false, "QSE"],
    ["external", "وابستگی تقاضای باریت به فعالیت حفاری نفت و گاز", "افت حفاری یعنی افت فروش؛ تنوع بازار لازم است", null, false, "Q"],
    ["external", "محدودیت و قطعی برق صنایع در تابستان", "موج‌های گرمای شدیدتر (مرتبط با تغییر اقلیم) سهمیهٔ برق را کم می‌کند و تولید آسیاب را متوقف می‌کند", null, true, "QE"],
    ["external", "کم‌آبی و تنش آبی در یزد", "اثر تغییر اقلیم؛ مصرف آب برای کنترل غبار و بهداشت باید مدیریت شود", null, true, "E"],
    ["external", "سخت‌تر شدن ضوابط انتشار گرد و غبار", "نیاز به غبارگیر کارآمد و پایش منظم", null, false, "SE"],
    ["internal", "کارخانهٔ نوپا بدون سابقهٔ عملیاتی", "فرایندها هنوز تثبیت نشده‌اند؛ ثبت دانش و درس‌آموخته حیاتی است", null, false, "QSE"],
    ["internal", "تیم کوچک و دانش متمرکز در چند نفر", "ریسک دانش تک‌نفره؛ نیاز به مستندسازی و جانشین", null, false, "Q"],
    ["internal", "منابع مالی محدود و وابستگی به سرمایه‌گذار", "اولویت‌بندی سرمایه‌گذاری‌های ایمنی و زیست‌محیطی لازم است", null, false, "QSE"],
    ["party", "مشتریان (شرکت‌های حفاری و خدمات گل حفاری)", "", "محصول منطبق با API 13A، تحویل به‌موقع، گواهی آزمون", false, "Q"],
    ["party", "کارکنان و پیمانکاران", "", "محیط کار ایمن، پرداخت به‌موقع، آموزش، مشارکت در تصمیم‌های ایمنی", false, "SQ"],
    ["party", "سهامداران و سرمایه‌گذاران", "", "بازگشت سرمایه، شفافیت مالی، رعایت قانون", false, "Q"],
    ["party", "همسایگان و جامعهٔ محلی", "", "نبود غبار و صدای آزاردهنده، اشتغال محلی", true, "E"],
    ["party", "سازمان حفاظت محیط زیست", "", "رعایت حدود انتشار و مدیریت پسماند", true, "E"],
    ["party", "ادارهٔ کار و مرکز بهداشت", "", "رعایت آیین‌نامه‌های حفاظتی، معاینات شغلی، پایش عوامل زیان‌آور", false, "S"],
    ["party", "تأمین‌کنندگان خوراک باریت", "", "پرداخت به‌موقع، مشخصات روشن خوراک", false, "Q"]
  ];
  X.pages.context = function () {
    var L = I.ctx.filter(function (c) { return c.kind === tab.context; });
    var h = '<div class="tabs noprint">' + Object.keys(CK).map(function (k) { return '<button data-ctab="' + k + '"' + (tab.context === k ? ' class="on"' : '') + '>' + CK[k] + " (" + toFa(I.ctx.filter(function (c) { return c.kind === k; }).length) + ')</button>'; }).join("") + '</div>';
    h += '<div class="flt noprint">' + (I.ed ? '<button class="more" id="ctxNew">+ ثبت</button>' + (I.ctx.length ? '' : '<button class="more" id="ctxSug">+ فهرست پیشنهادی برای کارخانهٔ باریت</button>') : '') + '</div>';
    h += '<div class="card"><div class="scroll"><table><thead><tr><th>' + (tab.context === "party" ? "طرف ذی‌نفع" : "مسئله") + '</th><th>' + (tab.context === "party" ? "نیازها و انتظارات" : "شرح و اثر") + '</th><th>پاسخ ما</th><th>اقلیم</th><th>استاندارد</th></tr></thead><tbody>' +
      (L.length ? L.map(function (c) { return '<tr data-ctx="' + c.id + '" style="cursor:pointer"><td><b>' + esc(c.title) + '</b></td><td>' + esc(tab.context === "party" ? c.needs : c.detail) + '</td><td>' + esc(c.response || "—") + '</td><td>' + (c.climate ? pill(2, "مرتبط") : "—") + '</td><td>' + stdTags(c.standards) + '</td></tr>'; }).join("") : '<tr><td colspan="5" class="mid" style="color:var(--muted)">موردی ثبت نشده.</td></tr>') + '</tbody></table></div></div>';
    h += '<div class="gap" style="margin-top:12px">اصلاحیهٔ ۱:۲۰۲۴ ایزوهای ۹۰۰۱، ۱۴۰۰۱ و ۴۵۰۰۱ می‌خواهد سازمان تعیین کند آیا تغییر اقلیم موضوع مرتبطی است و ذی‌نفعان ممکن است الزامات مرتبط با اقلیم داشته باشند. ستون «اقلیم» همین را نشان می‌دهد.</div>';
    return h;
  };
  var CTX_F = [{ k: "kind", l: "نوع", t: "sel", o: CK }, { k: "title", l: "عنوان", req: 1 }, { k: "detail", l: "شرح و اثر بر سازمان", t: "area", full: 1 }, { k: "needs", l: "نیازها و انتظارات (برای ذی‌نفع)", t: "area", full: 1 },
    { k: "response", l: "پاسخ یا اقدام ما", t: "area", full: 1 }, { k: "climate", l: "مرتبط با تغییر اقلیم", t: "chk" }, { k: "process_id", l: "فرایند مرتبط", t: "proc" }, { k: "owner_email", l: "مسئول پایش", t: "acc" }, { k: "review_date", l: "تاریخ بازنگری", t: "date" }, { k: "standards", l: "استاندارد", t: "std", full: 1 }];
  function openCtx(id) {
    var c = id ? I.ctx.filter(function (x) { return x.id === id; })[0] : { kind: tab.context, standards: ["Q", "S", "E"] };
    modal('<div class="card"><div class="chead"><div><h3>' + (id ? esc(c.title) : "ثبت " + CK[c.kind]) + '</h3></div><button class="more" id="mX">بستن</button></div>' + F(CTX_F, c, !I.ed) +
      (I.ed ? '<div class="acts"><button class="btn sm" id="cSave">ذخیره</button>' + (id ? '<button class="btn sm ghost" id="cDel">حذف</button>' : '') + '</div>' : '') + '</div>');
    if ($("cSave")) $("cSave").onclick = async function () { var o = FR(CTX_F); if (!o) return; var r = id ? await db.from("ims_context").update(o).eq("id", id) : await db.from("ims_context").insert(o); if (err(r)) return; await logit((id ? "ویرایش " : "ثبت ") + CK[o.kind] + " «" + o.title + "»"); refresh("ذخیره شد."); };
    if ($("cDel")) $("cDel").onclick = async function () { if (!confirm("حذف شود؟")) return; if (err(await db.from("ims_context").delete().eq("id", id))) return; await logit("حذف «" + c.title + "»"); refresh(); };
  }

  /* ================= ریسک، جنبه، خطر ================= */
  var LIK = ["بسیار نادر", "نادر", "ممکن", "محتمل", "تقریباً قطعی"], SEVL = ["ناچیز", "جزئی", "متوسط", "شدید", "فاجعه‌بار"];
  var RISK_SUG = [
    ["hazard", "گرد و غبار قابل استنشاق در آسیاب و بسته‌بندی (احتمال سیلیس آزاد همراه خوراک)", "آسیاب و بسته‌بندی", "normal", "بیماری‌های ریوی", 4, 5, "S"],
    ["hazard", "صدای بالای آسیاب و سنگ‌شکن", "سنگ‌شکنی و آسیاب", "normal", "افت شنوایی", 4, 3, "S"],
    ["hazard", "گیر کردن در قطعات متحرک نوار نقاله، سنگ‌شکن و الواتور", "انتقال مواد", "normal", "قطع عضو، مرگ", 3, 5, "S"],
    ["hazard", "حمل دستی کیسه‌های ۵۰ کیلویی", "بسته‌بندی و بارگیری", "normal", "آسیب اسکلتی‌عضلانی", 4, 3, "S"],
    ["hazard", "تردد لیفتراک و لودر در محوطه", "انبار و بارگیری", "normal", "برخورد و له‌شدگی", 3, 5, "S"],
    ["hazard", "تعمیرات بدون قفل و برچسب (راه‌اندازی ناخواسته)", "نگهداری و تعمیرات", "abnormal", "قطع عضو، مرگ", 3, 5, "S"],
    ["hazard", "برق‌گرفتگی در تابلوها و موتورها", "برق و تعمیرات", "abnormal", "مرگ", 2, 5, "S"],
    ["hazard", "کار در ارتفاع روی سیلو و مخازن", "نگهداری", "abnormal", "سقوط", 2, 5, "S"],
    ["hazard", "آتش‌سوزی در تابلو برق یا انبار کیسه", "کل کارخانه", "emergency", "سوختگی، خسارت", 2, 4, "SE"],
    ["hazard", "تنش گرمایی در تابستان", "کار در فضای باز و سالن", "normal", "گرمازدگی", 3, 3, "S"],
    ["aspect", "انتشار گرد و غبار از غبارگیر و انبار روباز خوراک", "تولید و انبار خوراک", "normal", "آلودگی هوا، شکایت همسایگان", 4, 4, "E"],
    ["aspect", "مصرف برق آسیاب‌ها", "تولید", "normal", "مصرف منابع و انتشار غیرمستقیم گازهای گلخانه‌ای", 5, 3, "E"],
    ["aspect", "پسماند ریزدانه، محصول خارج از مشخصه و کیسه‌های آسیب‌دیده", "تولید و بسته‌بندی", "normal", "اشغال زمین، آلودگی", 3, 3, "E"],
    ["aspect", "نشت روغن هیدرولیک و گریس تجهیزات", "نگهداری", "abnormal", "آلودگی خاک", 3, 3, "E"],
    ["aspect", "صدای کارخانه در محیط اطراف", "تولید", "normal", "آزار جامعهٔ محلی", 3, 2, "E"],
    ["aspect", "مصرف سوخت ماشین‌آلات و حمل‌ونقل", "حمل خوراک و محصول", "normal", "انتشار گازهای گلخانه‌ای", 4, 2, "E"],
    ["risk", "نوسان عیار و وزن مخصوص خوراک باریت", "پذیرش خوراک", null, "محصول خارج از مشخصهٔ API 13A و شکایت مشتری", 4, 4, "Q"],
    ["risk", "وابستگی به یک منبع خوراک (بورس یا یک معدن)", "تأمین خوراک", null, "توقف تولید یا افت کیفیت", 3, 4, "Q"],
    ["risk", "قطعی برق تابستانی و محدودیت سهمیهٔ برق صنایع", "تولید", null, "عقب افتادن از برنامهٔ تولید و تعهد به مشتری", 4, 4, "QE"],
    ["risk", "کمبود نیروی ماهر آسیاب و آزمایشگاه", "منابع انسانی", null, "خطای تولید و آزمون", 3, 3, "Q"],
    ["risk", "تأخیر در وصول مطالبات", "فروش", null, "کمبود نقدینگی", 3, 4, "Q"],
    ["opportunity", "فروش ریزدانه و ضایعات به صنایع دیگر", "فروش", null, "درآمد اضافه و کاهش پسماند", 3, 3, "QE"],
    ["opportunity", "تولید گریدهای غیرحفاری (رنگ، پلاستیک، کاغذ)", "فروش و تولید", null, "تنوع بازار و کاهش وابستگی به حفاری", 2, 4, "Q"],
    ["opportunity", "صادرات به بازارهای منطقه", "فروش", null, "درآمد ارزی", 2, 4, "Q"]
  ];
  X.pages.risk = function () {
    var L = I.risks.filter(function (x) { return !tab.risk || x.kind === tab.risk; });
    var grid = {}; L.forEach(function (x) { if (x.status !== "closed") { var k = x.likelihood + "_" + x.severity; grid[k] = (grid[k] || 0) + 1; } });
    var mx = '<div class="mx5"><div class="ax"></div>' + [1, 2, 3, 4, 5].map(function (s) { return '<div class="ax">ش' + toFa(s) + '</div>'; }).join("");
    for (var l = 5; l >= 1; l--) { mx += '<div class="ax">ا' + toFa(l) + '</div>'; for (var s = 1; s <= 5; s++) mx += '<div class="lv' + lvl(l * s) + '">' + (grid[l + "_" + s] ? toFa(grid[l + "_" + s]) : "") + '</div>'; }
    mx += '</div>';
    var h = '<div class="tabs noprint"><button data-rtab=""' + (!tab.risk ? ' class="on"' : '') + '>همه (' + toFa(I.risks.length) + ')</button>' + Object.keys(RK).map(function (k) { return '<button data-rtab="' + k + '"' + (tab.risk === k ? ' class="on"' : '') + '>' + RK[k] + " (" + toFa(I.risks.filter(function (x) { return x.kind === k; }).length) + ')</button>'; }).join("") + '</div>';
    h += '<div class="flt noprint"><button class="more" id="rNew">+ ثبت</button>' + (I.ed && !I.risks.length ? '<button class="more" id="rSug">+ فهرست پیشنهادی برای کارخانهٔ باریت</button>' : '') + '</div>';
    h += '<div class="grid g2" style="margin-bottom:14px"><div class="card"><div class="chead"><div><h3>نقشهٔ حرارتی</h3><p class="hint">احتمال (ا) × شدت (ش) — موارد باز</p></div></div>' + mx + '</div><div class="card"><div class="chead"><div><h3>معیار سطح</h3></div></div><p>' + pill(1, "۱ تا ۴: کم") + ' قابل‌قبول با کنترل جاری</p><p>' + pill(2, "۵ تا ۱۲: متوسط") + ' اقدام کنترلی برنامه‌ریزی‌شده</p><p>' + pill(3, "۱۵ تا ۲۵: زیاد") + ' اقدام فوری؛ کار بدون کنترل مجاز نیست</p><p class="hint">برای خطرات ایمنی، کنترل‌ها به ترتیب سلسله‌مراتب: حذف، جایگزینی، کنترل مهندسی، کنترل مدیریتی، تجهیزات حفاظت فردی.</p></div></div>';
    h += '<div class="card"><div class="scroll"><table><thead><tr><th>نوع</th><th>عنوان</th><th>فرایند</th><th>شرایط</th><th class="num">سطح</th><th class="num">باقیمانده</th><th>مسئول</th><th>وضعیت</th><th>بازنگری</th></tr></thead><tbody>' +
      (L.length ? L.slice().sort(function (a, b) { return b.score - a.score; }).map(function (x) { var p = procOf(x.process_id), od = x.review_date && x.review_date < today();
        return '<tr data-risk="' + x.id + '" style="cursor:pointer"><td>' + RK[x.kind] + '</td><td><b>' + esc(x.title) + '</b>' + (x.climate ? ' ' + pill(2, "اقلیم") : '') + '</td><td>' + (p ? esc(p.code) : "—") + '</td><td>' + (x.condition ? COND[x.condition] : "—") + '</td><td class="num">' + scB(x.likelihood, x.severity) + '</td><td class="num">' + scB(x.residual_l, x.residual_s) + '</td><td>' + esc(nameOf(x.owner_email)) + '</td><td>' + RS[x.status] + '</td><td' + (od ? ' style="color:var(--rose)"' : '') + '>' + jd(x.review_date) + '</td></tr>'; }).join("") : '<tr><td colspan="9" class="mid" style="color:var(--muted)">موردی ثبت نشده.</td></tr>') + '</tbody></table></div></div>';
    return h;
  };
  var RISK_F = [{ k: "kind", l: "نوع", t: "sel", o: RK }, { k: "title", l: "عنوان", req: 1 }, { k: "process_id", l: "فرایند", t: "proc" }, { k: "activity", l: "فعالیت / محل" },
    { k: "condition", l: "شرایط", t: "sel", o: COND, empty: "—" }, { k: "cause", l: "علت / منبع", t: "area" }, { k: "consequence", l: "پیامد", t: "area" },
    { k: "likelihood", l: "احتمال", t: "lv", o: LIK }, { k: "severity", l: "شدت", t: "lv", o: SEVL }, { k: "controls", l: "کنترل‌های موجود و برنامه‌ریزی‌شده", t: "area", full: 1 },
    { k: "residual_l", l: "احتمال پس از کنترل", t: "lv", o: LIK, empty: "—" }, { k: "residual_s", l: "شدت پس از کنترل", t: "lv", o: SEVL, empty: "—" },
    { k: "owner_email", l: "مسئول", t: "acc" }, { k: "review_date", l: "تاریخ بازنگری", t: "date" }, { k: "status", l: "وضعیت", t: "sel", o: RS },
    { k: "legal_related", l: "الزام قانونی مرتبط دارد", t: "chk" }, { k: "climate", l: "مرتبط با تغییر اقلیم", t: "chk" }, { k: "standards", l: "استاندارد", t: "std", full: 1 }];
  function openRisk(id) {
    var x = id ? I.risks.filter(function (r) { return r.id === id; })[0] : { kind: tab.risk || "hazard", likelihood: 3, severity: 3, status: "open", standards: tab.risk === "aspect" ? ["E"] : tab.risk === "hazard" || !tab.risk ? ["S"] : ["Q"], review_date: addMonths(today(), 12) };
    var can = !id || I.ed || x.owner_email === I.me || x.created_by === I.me;
    modal('<div class="card"><div class="chead"><div><h3>' + (id ? RK[x.kind] + " — سطح " + scB(x.likelihood, x.severity) : "ثبت ریسک، فرصت، جنبه یا خطر") + '</h3><p class="hint">' + (id ? "ثبت: " + esc(nameOf(x.created_by)) + " · " + jd(x.created_at) : "هر کسی می‌تواند خطر یا جنبه‌ای را که می‌بیند ثبت کند.") + '</p></div><button class="more" id="mX">بستن</button></div>' +
      F(RISK_F, x, !can) + (id ? linkedTasks("risk", id) : '') +
      '<div class="acts">' + (can ? '<button class="btn sm" id="rSave">ذخیره</button>' : '') + (id ? '<button class="btn sm ghost" id="rAct">+ اقدام کنترلی</button>' : '') + (id && I.ed ? '<button class="btn sm ghost" id="rDel">حذف</button>' : '') + '</div></div>');
    if ($("rSave")) $("rSave").onclick = async function () { var o = FR(RISK_F); if (!o) return; if (!id) o.created_by = I.me; var r = id ? await db.from("ims_risks").update(o).eq("id", id) : await db.from("ims_risks").insert(o); if (err(r)) return; await logit((id ? "ویرایش " : "ثبت ") + RK[o.kind] + " «" + o.title + "»"); refresh("ذخیره شد."); };
    if ($("rAct")) $("rAct").onclick = function () { openTask(null, { kind: "assigned", source: x.kind === "aspect" ? "aspect" : x.kind === "hazard" ? "hazard" : "risk", ref_type: "risk", ref_id: x.id, title: "کنترل: " + x.title, process_id: x.process_id, standards: x.standards, assignee_email: x.owner_email || I.me, due_date: addDays(today(), x.score >= 15 ? 7 : 30) }); };
    if ($("rDel")) $("rDel").onclick = async function () { if (!confirm("حذف شود؟")) return; if (err(await db.from("ims_risks").delete().eq("id", id))) return; await logit("حذف «" + x.title + "»"); refresh(); };
    rebind();
  }

  /* ================= الزامات قانونی ================= */
  var LEGAL_SUG = [
    ["law", "قانون کار — فصل چهارم: حفاظت فنی و بهداشت کار", "قانون کار جمهوری اسلامی ایران", "وزارت تعاون، کار و رفاه اجتماعی", "تأمین وسایل حفاظتی و رعایت آیین‌نامه‌های حفاظتی", "S", 12],
    ["law", "معاینات سلامت شغلی پیش از استخدام و دوره‌ای", "قانون کار، مادهٔ ۹۲", "وزارت بهداشت", "معاینهٔ سالانهٔ همهٔ کارکنان و نگهداری پرونده", "S", 12],
    ["regulation", "آیین‌نامه‌های حفاظتی (ماشین‌آلات، برق، وسایل حفاظت فردی)", "مصوبات شورای عالی حفاظت فنی", "وزارت تعاون، کار و رفاه اجتماعی", "حفاظ ماشین‌آلات، ارت تابلوها، تأمین و استفادهٔ PPE", "S", 12],
    ["regulation", "حدود مجاز مواجهه شغلی با عوامل زیان‌آور (گرد و غبار، صدا)", "ضوابط مرکز سلامت محیط و کار", "وزارت بهداشت", "اندازه‌گیری دوره‌ای غبار و صدا در محیط کار", "S", 12],
    ["law", "قانون حفاظت و بهسازی محیط زیست", "", "سازمان حفاظت محیط زیست", "پیشگیری از آلودگی و رعایت ضوابط", "E", 12],
    ["law", "قانون نحوهٔ جلوگیری از آلودگی هوا و ضوابط انتشار منابع ثابت", "", "سازمان حفاظت محیط زیست", "کنترل و پایش انتشار غبار از دودکش و محوطه", "E", 6],
    ["law", "قانون مدیریت پسماندها و آیین‌نامهٔ اجرایی", "", "سازمان حفاظت محیط زیست", "تفکیک، نگهداری و دفع مجاز پسماند", "E", 12],
    ["permit", "پروانهٔ بهره‌برداری", "", "مرجع صادرکنندهٔ پروانه", "نگهداری پروانهٔ معتبر و رعایت شرایط آن", "QSE", 12],
    ["regulation", "مقررات پیشگیری و ایمنی در برابر حریق", "", "سازمان آتش‌نشانی", "تجهیزات اطفا، شارژ دوره‌ای، تأییدیهٔ ایمنی", "S", 12],
    ["standard", "مشخصات باریت حفاری — API Spec 13A / ISO 13500", "API 13A", "مشتری / API", "آزمون و ترخیص هر بچ پیش از ارسال", "Q", 12]
  ];
  X.pages.legal = function () {
    var h = '<div class="flt noprint">' + (I.ed ? '<button class="more" id="lNew">+ ثبت الزام</button>' + (I.legal.length ? '' : '<button class="more" id="lSug">+ فهرست پیشنهادی</button>') : '') + '</div>';
    if (!I.legal.length) h += '<div class="gap">فهرست پیشنهادی فقط نقطهٔ شروع است. مصداق دقیق مواد، پیوست‌ها و مجوزهای خاص کارخانه را با کارشناس HSE یا حقوقی تطبیق دهید.</div>';
    h += '<div class="card"><div class="scroll"><table><thead><tr><th>الزام</th><th>نوع</th><th>مرجع</th><th>مسئول</th><th>اعتبار تا</th><th>آخرین ارزیابی</th><th>ارزیابی بعدی</th><th>وضعیت</th></tr></thead><tbody>' +
      (I.legal.length ? I.legal.map(function (l) { var f = legalFlag(l);
        return '<tr data-legal="' + l.id + '" style="cursor:pointer"><td><b>' + esc(l.title) + '</b><br><span class="hint">' + esc(l.reference || "") + '</span></td><td>' + LK[l.kind] + '</td><td>' + esc(l.authority || "—") + '</td><td>' + esc(nameOf(l.owner_email)) + '</td><td>' + jd(l.valid_until) + '</td><td>' + (l.last_eval ? jd(l.last_eval) + " · " + LR[l.last_result] : "—") + '</td><td>' + jd(nextEval(l)) + '</td><td>' + pill(f[0], f[1]) + '</td></tr>'; }).join("") : '<tr><td colspan="8" class="mid" style="color:var(--muted)">موردی ثبت نشده.</td></tr>') + '</tbody></table></div></div>';
    return h;
  };
  var LEGAL_F = [{ k: "title", l: "عنوان الزام", req: 1, full: 1 }, { k: "kind", l: "نوع", t: "sel", o: LK }, { k: "reference", l: "شماره/ماده/مرجع سند" }, { k: "authority", l: "مرجع ناظر" },
    { k: "process_id", l: "فرایند", t: "proc" }, { k: "requirement", l: "خلاصهٔ الزام برای ما", t: "area", full: 1 }, { k: "compliance_method", l: "روش رعایت و شاهد", t: "area", full: 1 },
    { k: "owner_email", l: "مسئول", t: "acc" }, { k: "valid_until", l: "اعتبار تا (برای مجوز)", t: "date" }, { k: "eval_months", l: "دورهٔ ارزیابی (ماه)", t: "num" }, { k: "standards", l: "استاندارد", t: "std", full: 1 }];
  function openLegal(id) {
    var l = id ? I.legal.filter(function (x) { return x.id === id; })[0] : { kind: "law", eval_months: 12, standards: ["S", "E"] };
    var can = I.ed || (id && l.owner_email === I.me), ev = id ? I.levals.filter(function (e) { return e.legal_id === id; }) : [];
    modal('<div class="card"><div class="chead"><div><h3>' + (id ? esc(l.title) : "ثبت الزام") + '</h3>' + (id ? '<p class="hint">' + pill(legalFlag(l)[0], legalFlag(l)[1]) + '</p>' : '') + '</div><button class="more" id="mX">بستن</button></div>' +
      F(LEGAL_F, l, !can) +
      (id ? '<div class="sec-h">سابقهٔ ارزیابی انطباق (بند ۹.۱.۲)</div>' + (ev.length ? ev.map(function (e) { return '<div class="li" style="cursor:default"><div><b>' + LR[e.result] + '</b><br><span>' + esc(e.note || "") + '</span></div><span>' + jd(e.eval_date) + " · " + esc(nameOf(e.evaluator)) + '</span></div>'; }).join("") : '<p class="hint">هنوز ارزیابی نشده.</p>') +
        (can ? '<div class="frm"><div><label>نتیجهٔ ارزیابی امروز</label><select id="leR">' + mapOpts(LR, "compliant") + '</select></div><div style="grid-column:1/-1"><label>شواهد و توضیح</label><input id="leN" placeholder="مثلاً گزارش اندازه‌گیری غبار شمارهٔ ..."></div></div>' : '') + linkedTasks("legal", id) : '') +
      '<div class="acts">' + (can ? '<button class="btn sm ghost" id="lSave">ذخیره</button>' : '') + (id && can ? '<button class="btn sm" id="lEval">ثبت ارزیابی انطباق</button><button class="btn sm ghost" id="lAct">+ اقدام</button>' : '') + (id && I.ed ? '<button class="btn sm ghost" id="lDel">حذف</button>' : '') + '</div></div>');
    if ($("lSave")) $("lSave").onclick = async function () { var o = FR(LEGAL_F); if (!o) return; if (!o.eval_months) o.eval_months = 12; var r = id ? await db.from("ims_legal").update(o).eq("id", id) : await db.from("ims_legal").insert(o); if (err(r)) return; await logit((id ? "ویرایش" : "ثبت") + " الزام «" + o.title + "»"); refresh("ذخیره شد."); };
    if ($("lEval")) $("lEval").onclick = async function () { var res = $("leR").value, note = $("leN").value.trim(); if (!note && res !== "na") { toast("شاهد ارزیابی را بنویسید."); return; }
      if (err(await db.from("ims_legal_evals").insert({ legal_id: id, result: res, note: note || null, evaluator: I.me }))) return; await logit("ارزیابی انطباق «" + l.title + "»: " + LR[res]);
      if (res === "noncompliant" || res === "partial") { await refresh(); if (confirm("برای این عدم انطباق قانونی، گزارش عدم انطباق ثبت شود؟")) { openNc(null); $("nT").value = "عدم رعایت: " + l.title; $("nY").value = "legal"; $("nS").value = res === "noncompliant" ? "major" : "minor"; $("nD").value = note; } return; }
      refresh("ثبت شد."); };
    if ($("lAct")) $("lAct").onclick = function () { openTask(null, { source: "legal", ref_type: "legal", ref_id: id, title: "انطباق: " + l.title, process_id: l.process_id, standards: l.standards, assignee_email: l.owner_email || I.me, needs_evidence: true }); };
    if ($("lDel")) $("lDel").onclick = async function () { if (!confirm("حذف شود؟")) return; if (err(await db.from("ims_legal").delete().eq("id", id))) return; await logit("حذف الزام «" + l.title + "»"); refresh(); };
    rebind();
  }

  /* ================= اهداف ================= */
  function objLatest(o) { var v = I.ovals.filter(function (x) { return x.objective_id === o.id; }).sort(function (a, b) { return a.period < b.period ? 1 : -1; }); return v[0] || null; }
  function objPct(o) { var v = objLatest(o); if (!v || o.target === null || o.baseline === null || Number(o.target) === Number(o.baseline)) return null; return Math.max(0, Math.min(1, (Number(v.value) - Number(o.baseline)) / (Number(o.target) - Number(o.baseline)))); }
  X.pages.obj = function () {
    var y = objYear || jy(), L = I.objs.filter(function (o) { return o.year === y; }), years = {}; I.objs.forEach(function (o) { years[o.year] = 1; }); years[jy()] = 1;
    var h = '<div class="flt noprint"><select id="oY">' + Object.keys(years).sort().reverse().map(function (k) { return '<option value="' + k + '"' + (+k === y ? " selected" : "") + '>سال ' + toFa(k) + '</option>'; }).join("") + '</select>' + (I.ed ? '<button class="more" id="oNew">+ هدف تازه</button>' : '') + '</div>';
    if (!L.length) return h + '<div class="empty">برای سال ' + toFa(y) + ' هدفی تعریف نشده. هدف باید با خط‌مشی سازگار، قابل اندازه‌گیری، دارای مسئول، منابع و مهلت باشد.</div>';
    return h + L.map(function (o) { var v = objLatest(o), pc = objPct(o), p = procOf(o.process_id);
      return '<div class="pcard" data-obj="' + o.id + '" style="cursor:pointer"><div class="h"><div><b>' + esc(o.title) + '</b> ' + stdTags(o.standards) + '</div>' + pill(o.status === "achieved" ? 1 : o.status === "missed" ? 3 : 2, { active: "فعال", achieved: "محقق شد", missed: "محقق نشد", cancelled: "لغو" }[o.status]) + '</div>' +
        '<p>شاخص: ' + esc(o.kpi || "—") + (p ? ' · فرایند ' + esc(p.code) : '') + ' · مسئول: ' + esc(nameOf(o.owner_email)) + ' · مهلت: ' + jd(o.due_date) + '</p>' +
        '<div class="nums"><span>پایه: <b>' + (o.baseline === null ? "—" : toFa(o.baseline)) + '</b></span><span>هدف: <b>' + (o.target === null ? "—" : toFa(o.target)) + " " + esc(o.unit || "") + '</b></span><span>آخرین: <b>' + (v ? toFa(v.value) + " (" + toFa(v.period) + ")" : "ثبت نشده") + '</b></span>' + (pc !== null ? '<span>پیشرفت: <b>' + toFa(Math.round(pc * 100)) + '٪</b></span>' : '') + '</div>' +
        (pc !== null ? '<div class="bar2"><i style="width:' + Math.round(pc * 100) + '%"></i></div>' : '') + '</div>'; }).join("");
  };
  var OBJ_F = [{ k: "title", l: "هدف", req: 1, full: 1 }, { k: "year", l: "سال", t: "num", req: 1 }, { k: "process_id", l: "فرایند", t: "proc" }, { k: "kpi", l: "شاخص اندازه‌گیری" }, { k: "unit", l: "واحد" },
    { k: "baseline", l: "مقدار پایه", t: "num" }, { k: "target", l: "مقدار هدف", t: "num" }, { k: "direction", l: "جهت مطلوب", t: "sel", o: { up: "افزایش", down: "کاهش" } },
    { k: "owner_email", l: "مسئول", t: "acc" }, { k: "due_date", l: "مهلت", t: "date" }, { k: "resources", l: "منابع لازم", t: "area" }, { k: "method", l: "روش ارزیابی نتایج", t: "area" },
    { k: "status", l: "وضعیت", t: "sel", o: { active: "فعال", achieved: "محقق شد", missed: "محقق نشد", cancelled: "لغو" } }, { k: "standards", l: "استاندارد", t: "std", full: 1 }];
  function openObj(id) {
    var o = id ? I.objs.filter(function (x) { return x.id === id; })[0] : { year: objYear || jy(), direction: "up", status: "active", standards: ["Q"] };
    var can = I.ed || (id && o.owner_email === I.me), vals = id ? I.ovals.filter(function (v) { return v.objective_id === id; }) : [];
    modal('<div class="card"><div class="chead"><div><h3>' + (id ? esc(o.title) : "هدف تازه") + '</h3></div><button class="more" id="mX">بستن</button></div>' + F(OBJ_F, o, !I.ed) +
      (id ? '<div class="sec-h">پایش ماهانه</div>' + (vals.length ? '<table><thead><tr><th>دوره</th><th class="num">مقدار</th><th>توضیح</th><th>ثبت</th></tr></thead><tbody>' + vals.map(function (v) { return '<tr><td>' + toFa(v.period) + '</td><td class="num">' + toFa(v.value) + '</td><td>' + esc(v.note || "") + '</td><td>' + esc(nameOf(v.by_email)) + '</td></tr>'; }).join("") + '</tbody></table>' : '<p class="hint">هنوز مقداری ثبت نشده.</p>') +
        (can ? '<div class="frm"><div><label>دوره (سال/ماه)</label><input id="ovP" value="' + toFa(prevPer()) + '"></div><div><label>مقدار</label><input id="ovV"></div><div><label>توضیح</label><input id="ovN"></div></div>' : '') + linkedTasks("objective", id) : '') +
      '<div class="acts">' + (I.ed ? '<button class="btn sm ghost" id="oSave">ذخیره</button>' : '') + (id && can ? '<button class="btn sm" id="oVal">ثبت مقدار</button><button class="btn sm ghost" id="oAct">+ اقدام برنامهٔ دستیابی</button>' : '') + (id && I.ed ? '<button class="btn sm ghost" id="oDel">حذف</button>' : '') + '</div></div>');
    if ($("oSave")) $("oSave").onclick = async function () { var n = FR(OBJ_F); if (!n) return; var r = id ? await db.from("ims_objectives").update(n).eq("id", id) : await db.from("ims_objectives").insert(n); if (err(r)) return; await logit((id ? "ویرایش" : "ثبت") + " هدف «" + n.title + "»"); refresh("ذخیره شد."); };
    if ($("oVal")) $("oVal").onclick = async function () { var per = toEn($("ovP").value.trim()).replace(/\s/g, ""), val = Number(toEn($("ovV").value.trim()).replace(/,/g, ""));
      if (!/^\d{4}\/\d{2}$/.test(per)) { toast("دوره را به شکل ۱۴۰۵/۰۸ بنویسید."); return; } if ($("ovV").value.trim() === "" || isNaN(val)) { toast("مقدار عددی بنویسید."); return; }
      if (err(await db.from("ims_objective_vals").upsert({ objective_id: id, period: per, value: val, note: $("ovN").value.trim() || null, by_email: I.me }, { onConflict: "objective_id,period" }))) return; await logit("پایش هدف «" + o.title + "» " + per); refresh("ثبت شد."); };
    if ($("oAct")) $("oAct").onclick = function () { openTask(null, { source: "objective", ref_type: "objective", ref_id: id, title: "برای هدف: " + o.title, process_id: o.process_id, standards: o.standards, assignee_email: o.owner_email || I.me, due_date: o.due_date || addDays(today(), 30) }); };
    if ($("oDel")) $("oDel").onclick = async function () { if (!confirm("حذف شود؟")) return; if (err(await db.from("ims_objectives").delete().eq("id", id))) return; await logit("حذف هدف «" + o.title + "»"); refresh(); };
    rebind();
  }

  /* ================= کنترل مستندات ================= */
  var DOC_SUG = [["PL-01", "خط‌مشی سیستم مدیریت یکپارچه", "policy", "MP-01"], ["MN-01", "راهنمای سیستم مدیریت یکپارچه (دامنه، فرایندها، ارتباطات)", "manual", "MP-01"],
    ["PR-01", "کنترل اطلاعات مستند", "procedure", "MP-04"], ["PR-02", "ممیزی داخلی", "procedure", "MP-03"], ["PR-03", "عدم انطباق، رویداد و اقدام اصلاحی", "procedure", "MP-03"], ["PR-04", "بازنگری مدیریت", "procedure", "MP-01"],
    ["PR-05", "شناسایی خطر و ارزیابی ریسک", "procedure", "MP-02"], ["PR-06", "شناسایی و ارزیابی جنبه‌های زیست‌محیطی", "procedure", "MP-02"], ["PR-07", "شناسایی و ارزیابی انطباق با الزامات قانونی", "procedure", "MP-02"],
    ["PR-08", "آمادگی و واکنش در شرایط اضطراری", "procedure", "SP-03"], ["PR-09", "آموزش، صلاحیت و آگاهی", "procedure", "SP-01"], ["PR-10", "خرید و ارزیابی تأمین‌کنندگان", "procedure", "SP-05"],
    ["PR-11", "کنترل تجهیزات پایش و اندازه‌گیری (کالیبراسیون)", "procedure", "CP-05"], ["PR-12", "کنترل محصول نامنطبق و ترخیص محصول", "procedure", "CP-05"], ["PR-13", "مشاوره و مشارکت کارکنان", "procedure", "SP-03"],
    ["PR-14", "مدیریت تغییر", "procedure", "MP-01"], ["PR-15", "مدیریت دانش سازمانی", "procedure", "MP-04"], ["PR-16", "بازنگری الزامات و قرارداد مشتری", "procedure", "CP-01"],
    ["WI-01", "دستورالعمل راهبری آسیاب و کلاسیفایر", "instruction", "CP-04"], ["WI-02", "نمونه‌برداری و آزمون باریت طبق API 13A", "instruction", "CP-05"], ["WI-03", "قفل و برچسب (LOTO)", "instruction", "SP-02"], ["WI-04", "پذیرش و نمونه‌برداری خوراک", "instruction", "CP-02"],
    ["PLN-01", "طرح واکنش در شرایط اضطراری", "plan", "SP-03"], ["PLN-02", "برنامهٔ پایش محیط کار و محیط زیست", "plan", "SP-04"], ["PLN-03", "برنامهٔ نگهداری و تعمیرات پیشگیرانه", "plan", "SP-02"]];
  X.pages.docs = function () {
    var t = today(), h = '<div class="flt noprint">' + (I.ed ? '<button class="more" id="dNew">+ سند تازه</button>' + (I.docs.length ? '' : '<button class="more" id="dSug">+ فهرست پیشنهادی مستندات IMS</button>') : '') + '</div>';
    var ap = I.docs.filter(function (d) { return d.status === "approved"; }).length;
    h += '<div class="grid g3" style="margin-bottom:14px">' + kpi("کل مستندات", toFa(I.docs.length), "سند", "") + kpi("تأییدشده", toFa(ap), "سند", toFa(I.docs.length - ap) + " پیش‌نویس یا در انتظار", ap < I.docs.length ? "warn" : "pos") + kpi("بازنگری سررسید", toFa(I.docs.filter(function (d) { return d.review_date && d.review_date < t && d.status !== "obsolete"; }).length), "سند", "") + '</div>';
    h += '<div class="card"><div class="scroll"><table><thead><tr><th>کد</th><th>عنوان</th><th>نوع</th><th>ویرایش</th><th>وضعیت</th><th>مسئول</th><th>تأیید</th><th>بازنگری</th><th>محل نگهداری</th></tr></thead><tbody>' +
      (I.docs.length ? I.docs.slice().sort(function (a, b) { return a.code < b.code ? -1 : 1; }).map(function (d) { var od = d.review_date && d.review_date < t && d.status !== "obsolete";
        return '<tr data-doc="' + d.id + '" style="cursor:pointer' + (d.status === "obsolete" ? ";opacity:.5" : "") + '"><td dir="ltr" style="text-align:right"><b>' + esc(d.code) + '</b></td><td>' + esc(d.title) + '</td><td>' + DK[d.kind] + '</td><td class="num">' + toFa(d.version) + '</td><td>' + pill(d.status === "approved" ? 1 : d.status === "obsolete" ? 1 : 2, DS[d.status]) + '</td><td>' + esc(nameOf(d.owner_email)) + '</td><td>' + (d.approved_at ? jd(d.approved_at) : "—") + '</td><td' + (od ? ' style="color:var(--rose)"' : '') + '>' + jd(d.review_date) + '</td><td>' + (d.location ? (/^https?:/.test(d.location) ? '<a href="' + esc(d.location) + '" target="_blank" rel="noopener">باز کردن</a>' : esc(d.location)) : "—") + '</td></tr>'; }).join("") : '<tr><td colspan="9" class="mid" style="color:var(--muted)">سندی ثبت نشده.</td></tr>') + '</tbody></table></div></div>';
    return h;
  };
  var DOC_F = [{ k: "code", l: "کد", req: 1, ltr: 1 }, { k: "title", l: "عنوان", req: 1 }, { k: "kind", l: "نوع", t: "sel", o: DK }, { k: "process_id", l: "فرایند", t: "proc" },
    { k: "version", l: "شمارهٔ ویرایش", req: 1 }, { k: "owner_email", l: "مسئول (تهیه‌کننده)", t: "acc" }, { k: "review_date", l: "تاریخ بازنگری بعدی", t: "date" },
    { k: "location", l: "محل نگهداری (لینک فایل یا محل فیزیکی)", full: 1 }, { k: "change_note", l: "شرح تغییر این ویرایش", t: "area", full: 1 }, { k: "standards", l: "استاندارد", t: "std", full: 1 }];
  function openDoc(id) {
    var d = id ? I.docs.filter(function (x) { return x.id === id; })[0] : { kind: "procedure", version: "0", status: "draft", standards: ["Q", "S", "E"], review_date: addMonths(today(), 12) };
    var can = I.ed || (id && d.owner_email === I.me), revs = id ? I.drevs.filter(function (r) { return r.doc_id === id; }) : [];
    modal('<div class="card"><div class="chead"><div><h3>' + (id ? esc(d.code + " — " + d.title) : "سند تازه") + '</h3>' + (id ? '<p class="hint">' + pill(d.status === "approved" ? 1 : 2, DS[d.status]) + (d.approved_by ? " تأیید: " + esc(nameOf(d.approved_by)) + " · " + jd(d.approved_at) : "") + '</p>' : '') + '</div><button class="more" id="mX">بستن</button></div>' +
      F(DOC_F, d, !can) + '<p class="hint">تغییر شمارهٔ ویرایش یک سند تأییدشده، آن را دوباره به «در انتظار تأیید» می‌برد. همهٔ ویرایش‌ها در سابقه می‌ماند.</p>' +
      (revs.length ? '<div class="sec-h">سابقهٔ ویرایش‌ها</div>' + revs.map(function (r) { return '<div class="li" style="cursor:default"><div><b>ویرایش ' + toFa(r.version) + " · " + DS[r.status] + '</b><br><span>' + esc(r.change_note || "") + '</span></div><span>' + jd(r.at) + " · " + esc(nameOf(r.by_email)) + '</span></div>'; }).join("") : '') +
      '<div class="acts">' + (can ? '<button class="btn sm ghost" id="dSave">ذخیره</button>' : '') + (id && can && d.status === "draft" ? '<button class="btn sm" data-ds="review">ارسال برای تأیید</button>' : '') + (id && I.ed && (d.status === "review" || d.status === "draft") ? '<button class="btn sm" data-ds="approved">تأیید سند</button>' : '') + (id && I.ed && d.status !== "obsolete" ? '<button class="btn sm ghost" data-ds="obsolete">منسوخ</button>' : '') + '</div></div>');
    if ($("dSave")) $("dSave").onclick = async function () { var o = FR(DOC_F); if (!o) return; var r = id ? await db.from("ims_docs").update(o).eq("id", id) : await db.from("ims_docs").insert(o); if (err(r)) return; await logit((id ? "ویرایش" : "ثبت") + " سند " + o.code); refresh("ذخیره شد."); };
    Array.prototype.forEach.call(document.querySelectorAll("[data-ds]"), function (b) { b.onclick = async function () { var s = b.dataset.ds; if (s === "obsolete" && !confirm("سند منسوخ شود؟ نسخهٔ منسوخ باید از محل کار جمع شود.")) return;
      if (err(await db.from("ims_docs").update({ status: s }).eq("id", id))) return; await logit("سند " + d.code + " ← " + DS[s]); refresh(DS[s]); }; });
  }

  /* ================= ممیزی داخلی ================= */
  var CHECK = [["۴.۱", "آیا مسائل درونی و بیرونی، از جمله تغییر اقلیم، تعیین و پایش می‌شوند؟", "QSE"], ["۴.۲", "آیا طرف‌های ذی‌نفع و الزامات مرتبطشان تعیین شده‌اند؟", "QSE"], ["۴.۳", "آیا دامنهٔ سیستم مدون و در دسترس است؟", "QSE"],
    ["۴.۴", "آیا فرایندها، ورودی و خروجی، مالک و شاخص‌هایشان تعیین شده‌اند؟", "QSE"], ["۵.۱", "آیا مدیریت ارشد در بازنگری‌ها و تأمین منابع مشارکت فعال دارد؟", "QSE"], ["۵.۲", "آیا خط‌مشی تأییدشده، ابلاغ‌شده و در دسترس است؟", "QSE"],
    ["۵.۳", "آیا نقش‌ها و اختیارات تعیین و ابلاغ شده‌اند؟", "QSE"], ["۵.۴", "آیا کارکنان در شناسایی خطر و تعیین کنترل‌ها مشارکت داده می‌شوند؟", "S"], ["۶.۱", "آیا ریسک‌ها و فرصت‌ها شناسایی و برایشان اقدام برنامه‌ریزی شده است؟", "QSE"],
    ["۶.۱.۲", "آیا جنبه‌های زیست‌محیطی در شرایط عادی، غیرعادی و اضطراری شناسایی و ارزیابی شده‌اند؟", "E"], ["۶.۱.۲", "آیا خطرات ایمنی ارزیابی و سلسله‌مراتب کنترل رعایت شده است؟", "S"], ["۶.۱.۳", "آیا الزامات قانونی شناسایی و در دسترس هستند؟", "SE"],
    ["۶.۲", "آیا اهداف قابل اندازه‌گیری با مسئول، منابع و مهلت تعیین و پایش می‌شوند؟", "QSE"], ["۷.۱.۵", "آیا تجهیزات اندازه‌گیری کالیبره و شناسنامه‌دار هستند؟", "Q"], ["۷.۱.۶", "آیا دانش لازم فرایندها شناسایی، نگهداری و در دسترس است؟", "Q"],
    ["۷.۲", "آیا صلاحیت افراد تعیین و سوابق آموزش نگهداری می‌شود؟", "QSE"], ["۷.۳", "آیا کارکنان از خط‌مشی، سهم خود و پیامد عدم انطباق آگاه‌اند؟ (مصاحبه)", "QSE"], ["۷.۵", "آیا مستندات کنترل ویرایش، تأیید و توزیع دارند؟", "QSE"],
    ["۸.۱", "آیا عملیات طبق دستورالعمل‌ها و معیارهای تعیین‌شده انجام می‌شود؟ (مشاهده در محل)", "QSE"], ["۸.۲", "آیا الزامات مشتری پیش از تعهد بازنگری می‌شوند؟", "Q"], ["۸.۲", "آیا طرح واکنش اضطراری تهیه و مانور اجرا شده است؟", "SE"],
    ["۸.۴", "آیا تأمین‌کنندگان ارزیابی و پایش می‌شوند؟", "QSE"], ["۸.۵", "آیا ردیابی خوراک تا محصول ممکن است؟", "Q"], ["۸.۶", "آیا محصول پیش از ارسال آزمون و ترخیص می‌شود؟", "Q"], ["۸.۷", "آیا محصول نامنطبق شناسایی و کنترل می‌شود؟", "Q"],
    ["۹.۱", "آیا شاخص‌ها پایش و تحلیل می‌شوند؟", "QSE"], ["۹.۱.۲", "آیا انطباق با الزامات قانونی ارزیابی شده است؟", "SE"], ["۹.۱.۲", "آیا رضایت مشتری سنجیده می‌شود؟", "Q"],
    ["۹.۳", "آیا بازنگری مدیریت با همهٔ ورودی‌های الزامی انجام شده است؟", "QSE"], ["۱۰.۲", "آیا عدم انطباق‌ها علت‌یابی و اثربخشی اقدام‌ها بررسی می‌شود؟", "QSE"], ["۱۰.۲", "آیا حوادث و شبه‌حوادث گزارش و بررسی می‌شوند؟", "S"]];
  X.pages.audit = function () {
    var y = jy(), h = '<div class="flt noprint">' + (I.ed ? '<button class="more" id="aNew">+ ممیزی تازه</button>' : '') + '</div>';
    var done = I.audits.filter(function (a) { return a.status === "done"; }).length;
    h += '<div class="grid g3" style="margin-bottom:14px">' + kpi("ممیزی‌های برنامه‌ریزی‌شده", toFa(I.audits.filter(function (a) { return a.status === "planned"; }).length), "", "") + kpi("انجام‌شده", toFa(done), "", "") +
      kpi("یافته‌های عدم انطباق", toFa(I.aitems.filter(function (i) { return i.result === "minor" || i.result === "major"; }).length), "یافته", toFa(I.aitems.filter(function (i) { return (i.result === "minor" || i.result === "major") && !i.nc_id; }).length) + " بدون ثبت عدم انطباق") + '</div>';
    h += '<div class="card"><div class="scroll"><table><thead><tr><th>ممیزی</th><th>تاریخ</th><th>فرایندها</th><th>ممیز</th><th>ممیزی‌شونده</th><th>یافته‌ها</th><th>وضعیت</th></tr></thead><tbody>' +
      (I.audits.length ? I.audits.slice().sort(function (a, b) { return (a.plan_date || "") < (b.plan_date || "") ? -1 : 1; }).map(function (a) { var it = I.aitems.filter(function (i) { return i.audit_id === a.id; }), f = it.filter(function (i) { return i.result === "minor" || i.result === "major"; }).length;
        return '<tr data-audit="' + a.id + '" style="cursor:pointer"><td><b>' + esc(a.title) + '</b> ' + stdTags(a.standards) + '</td><td>' + jd(a.plan_date) + '</td><td>' + (a.process_ids || []).map(function (id) { var p = procOf(id); return p ? esc(p.code) : ""; }).join("، ") + '</td><td>' + esc(nameOf(a.auditor_email)) + '</td><td>' + esc(nameOf(a.auditee_email)) + '</td><td>' + (it.length ? toFa(f) + " از " + toFa(it.length) : "—") + '</td><td>' + pill(a.status === "done" ? 1 : 2, { planned: "برنامه‌ریزی‌شده", done: "انجام شد", cancelled: "لغو" }[a.status]) + '</td></tr>'; }).join("") : '<tr><td colspan="7" class="mid" style="color:var(--muted)">ممیزی‌ای برنامه‌ریزی نشده. برنامهٔ سالانه باید همهٔ فرایندها و بندها را دست‌کم یک بار پوشش دهد.</td></tr>') + '</tbody></table></div></div>';
    var cov = {}; I.audits.forEach(function (a) { if (a.status !== "cancelled") (a.process_ids || []).forEach(function (id) { cov[id] = 1; }); });
    var un = I.proc.filter(function (p) { return !cov[p.id]; });
    if (un.length) h += '<div class="gap" style="margin-top:12px">فرایندهایی که در هیچ ممیزی برنامه‌ریزی نشده‌اند: ' + un.map(function (p) { return esc(p.code); }).join("، ") + '</div>';
    return h;
  };
  var AUD_F = [{ k: "title", l: "عنوان", req: 1, full: 1 }, { k: "plan_date", l: "تاریخ", t: "date" }, { k: "auditor_email", l: "ممیز", t: "acc" }, { k: "auditee_email", l: "ممیزی‌شونده", t: "acc" }, { k: "clauses", l: "بندها / دامنهٔ ممیزی", full: 1 }, { k: "standards", l: "استاندارد", t: "std", full: 1 }];
  function openAudit(id) {
    var a = id ? I.audits.filter(function (x) { return x.id === id; })[0] : { standards: ["Q", "S", "E"], process_ids: [], plan_date: addDays(today(), 14) };
    var can = I.ed || (id && a.auditor_email === I.me), items = id ? I.aitems.filter(function (i) { return i.audit_id === id; }).sort(function (x, y) { return x.sort - y.sort || x.id - y.id; }) : [];
    var own = (a.process_ids || []).filter(function (pid) { return ownerOf(procOf(pid)) && ownerOf(procOf(pid)) === a.auditor_email; });
    var h = '<div class="card"><div class="chead"><div><h3>' + (id ? esc(a.title) : "ممیزی تازه") + '</h3>' + (a.status === "done" ? '<p class="hint">انجام شد ' + jd(a.done_date) + '</p>' : '') + '</div><button class="more" id="mX">بستن</button></div>' + F(AUD_F, a, !I.ed || a.status === "done") +
      '<div><label>فرایندهای مشمول</label><div class="stds" id="aPr">' + I.proc.map(function (p) { return '<label><input type="checkbox" value="' + p.id + '"' + ((a.process_ids || []).indexOf(p.id) >= 0 ? " checked" : "") + (!I.ed || a.status === "done" ? " disabled" : "") + '> ' + esc(p.code) + '</label>'; }).join("") + '</div></div>' +
      (own.length ? '<div class="gap" style="margin-top:10px">ممیز مالک بعضی از فرایندهای مشمول است. بند ۹.۲.۲ بی‌طرفی ممیز را می‌خواهد؛ ممیز دیگری انتخاب کنید.</div>' : '');
    if (id) {
      h += '<div class="sec-h">چک‌لیست و یافته‌ها</div>' + (items.length ? items.map(function (i) {
        return '<div class="kb"><b>' + esc(i.clause || "") + '</b> ' + esc(i.question) + '<div class="frm" style="margin-top:4px"><div><select data-ai="' + i.id + '" data-f="result"' + (can && a.status !== "done" ? "" : " disabled") + '>' + mapOpts(AR, i.result) + '</select></div><div style="grid-column:span 2"><input data-ai="' + i.id + '" data-f="evidence" placeholder="شاهد: سند، مصاحبه، مشاهده" value="' + esc(i.evidence || "") + '"' + (can && a.status !== "done" ? "" : " disabled") + '></div></div>' +
          ((i.result === "minor" || i.result === "major") ? (i.nc_id ? '<span class="pill p3" data-nc="' + i.nc_id + '" style="cursor:pointer">عدم انطباق #' + toFa(i.nc_id) + ' ثبت شد</span>' : (can ? '<button class="more" data-ainc="' + i.id + '">ثبت عدم انطباق</button>' : '')) : '') + '</div>'; }).join("") : '<p class="hint">چک‌لیست خالی است.</p>');
      if (can && a.status !== "done") h += '<div class="addrow" style="margin-top:8px"><input id="aiC" placeholder="بند" style="flex:0 0 90px;min-width:90px"><input id="aiQ" placeholder="پرسش یا موضوع بررسی"><button class="btn sm ghost" id="aiAdd" style="margin:0">افزودن</button></div>';
      h += '<div class="frm"><div style="grid-column:1/-1"><label>خلاصهٔ ممیزی و نتیجه‌گیری</label><textarea id="aSum"' + (can && a.status !== "done" ? "" : " disabled") + '>' + esc(a.summary || "") + '</textarea></div></div>';
    }
    h += '<div class="acts">' + (I.ed && a.status !== "done" ? '<button class="btn sm ghost" id="aSave">ذخیره</button>' : '') + (id && can && a.status !== "done" && !items.length ? '<button class="btn sm" id="aChk">بارگذاری چک‌لیست پایه</button>' : '') + (id && can && a.status === "planned" ? '<button class="btn sm" id="aDone">اتمام ممیزی</button>' : '') + (id && I.ed && a.status === "planned" ? '<button class="btn sm ghost" id="aDel">حذف</button>' : '') + '</div></div>';
    modal(h);
    if ($("aSave")) $("aSave").onclick = async function () { var o = FR(AUD_F); if (!o) return; o.process_ids = []; Array.prototype.forEach.call(document.querySelectorAll("#aPr input:checked"), function (c) { o.process_ids.push(+c.value); });
      if ($("aSum")) o.summary = $("aSum").value.trim() || null; var r = id ? await db.from("ims_audits").update(o).eq("id", id) : await db.from("ims_audits").insert(o); if (err(r)) return; await logit((id ? "ویرایش" : "برنامه‌ریزی") + " ممیزی «" + o.title + "»"); refresh("ذخیره شد."); };
    if ($("aChk")) $("aChk").onclick = async function () { var rows = CHECK.filter(function (c) { return c[2].split("").some(function (s) { return (a.standards || []).indexOf(s) >= 0; }); }).map(function (c, i) { return { audit_id: id, clause: c[0], question: c[1], sort: i }; });
      if (err(await db.from("ims_audit_items").insert(rows))) return; await logit("چک‌لیست ممیزی «" + a.title + "»"); await load(); openAudit(id); };
    if ($("aiAdd")) $("aiAdd").onclick = async function () { var q = $("aiQ").value.trim(); if (!q) return; if (err(await db.from("ims_audit_items").insert({ audit_id: id, clause: $("aiC").value.trim() || null, question: q, sort: items.length }))) return; await load(); openAudit(id); };
    Array.prototype.forEach.call(document.querySelectorAll("[data-ai]"), function (el) { el.onchange = async function () { var o = {}; o[el.dataset.f] = el.value.trim() || (el.dataset.f === "result" ? "pending" : null);
      if (err(await db.from("ims_audit_items").update(o).eq("id", +el.dataset.ai))) return; await load(); if (el.dataset.f === "result") openAudit(id); }; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-ainc]"), function (b) { b.onclick = async function () { var it = items.filter(function (i) { return i.id === +b.dataset.ainc; })[0];
      var r = await db.from("ims_nc").insert({ title: "یافتهٔ ممیزی " + (it.clause || "") + ": " + it.question.slice(0, 120), type: "audit", severity: it.result === "major" ? "major" : "minor", process_id: (a.process_ids || [])[0] || null, standards: a.standards, description: it.evidence || null, reported_by: I.me, owner_email: a.auditee_email || ownerOf(procOf((a.process_ids || [])[0])) || null }).select("id").single();
      if (err(r)) return; await db.from("ims_audit_items").update({ nc_id: r.data.id }).eq("id", it.id); await logit("یافتهٔ ممیزی ← عدم انطباق #" + r.data.id); await load(); openAudit(id); toast("عدم انطباق ثبت شد و در گردش اقدام اصلاحی است."); }; });
    if ($("aDone")) $("aDone").onclick = async function () { var pend = items.filter(function (i) { return i.result === "pending"; }).length, noNc = items.filter(function (i) { return (i.result === "minor" || i.result === "major") && !i.nc_id; }).length;
      if (noNc) { toast("برای همهٔ یافته‌های عدم انطباق، گزارش عدم انطباق ثبت کنید."); return; }
      if (pend && !confirm(toFa(pend) + " پرسش بررسی نشده است. ممیزی بسته شود؟")) return;
      if (err(await db.from("ims_audits").update({ status: "done", done_date: today(), summary: $("aSum") ? $("aSum").value.trim() || null : a.summary }).eq("id", id))) return; await logit("اتمام ممیزی «" + a.title + "»"); refresh("ممیزی بسته شد."); };
    if ($("aDel")) $("aDel").onclick = async function () { if (!confirm("حذف شود؟")) return; if (err(await db.from("ims_audits").delete().eq("id", id))) return; await logit("حذف ممیزی «" + a.title + "»"); refresh(); };
    Array.prototype.forEach.call(document.querySelectorAll("#mdl [data-nc]"), function (b) { b.onclick = function () { openNc(+b.dataset.nc); }; });
  }

  /* ================= بازنگری مدیریت ================= */
  var MRI = [["a", "وضعیت اقدام‌های بازنگری‌های قبلی"], ["b", "تغییر در مسائل درونی و بیرونی، از جمله تغییر اقلیم، و نیازهای ذی‌نفعان"], ["c", "میزان دستیابی به اهداف"],
    ["d", "عملکرد فرایندها، انطباق محصول و رضایت و بازخورد مشتری"], ["e", "عدم انطباق‌ها، رویدادها، شبه‌حوادث و اقدام‌های اصلاحی"], ["f", "نتایج پایش و اندازه‌گیری و ارزیابی انطباق با الزامات قانونی"],
    ["g", "نتایج ممیزی‌ها"], ["h", "عملکرد تأمین‌کنندگان بیرونی"], ["i", "کفایت منابع"], ["j", "اثربخشی اقدام‌ها برای ریسک‌ها و فرصت‌ها"], ["k", "مشاوره و مشارکت کارکنان"], ["l", "فرصت‌های بهبود و دانش سازمانی"]];
  function autoInputs() {
    var t = today(), revT = I.tasks.filter(function (x) { return x.source === "review"; }), oNc = I.nc.filter(function (n) { return n.status !== "closed"; }), cNc = I.nc.filter(function (n) { return n.status === "closed"; });
    var eff = I.tasks.filter(function (x) { return x.kind === "corrective" && x.status === "done"; }), effOk = eff.filter(function (x) { return x.effective === true; }).length, effNo = eff.filter(function (x) { return x.effective === false; }).length;
    var objs = I.objs.filter(function (o) { return o.year === jy(); }), hi = I.risks.filter(function (r) { return r.score >= 15 && r.status !== "closed"; });
    var leg = I.legal.map(legalFlag), aud = I.audits.filter(function (a) { return a.status === "done"; });
    var cnt = function (arr, f) { return arr.filter(f).length; };
    return {
      a: revT.length ? toFa(revT.length) + " مصوبه از بازنگری‌های قبلی: " + toFa(cnt(revT, function (x) { return x.status === "done"; })) + " بسته، " + toFa(cnt(revT, function (x) { return x.status !== "done" && x.status !== "cancelled"; })) + " باز." : "بازنگری قبلی وجود ندارد (نخستین بازنگری).",
      b: toFa(I.ctx.filter(function (c) { return c.kind !== "party"; }).length) + " مسئلهٔ درونی و بیرونی و " + toFa(cnt(I.ctx, function (c) { return c.kind === "party"; })) + " طرف ذی‌نفع ثبت است؛ " + toFa(cnt(I.ctx, function (c) { return c.climate; })) + " مورد مرتبط با تغییر اقلیم. تغییرات از بازنگری قبلی: …",
      c: objs.length ? objs.map(function (o) { var v = objLatest(o), pc = objPct(o); return "• " + o.title + ": " + (v ? toFa(v.value) + " " + (o.unit || "") + " در برابر هدف " + toFa(o.target) + (pc !== null ? " (" + toFa(Math.round(pc * 100)) + "٪)" : "") : "مقدار ثبت نشده"); }).join("\n") : "برای سال جاری هدفی ثبت نشده.",
      d: "از داشبورد تصمیم: تولید، بازیابی، OEE، فروش و برگشتی. شکایات مشتری ثبت‌شده: " + toFa(cnt(I.nc, function (n) { return n.type === "complaint"; })) + ".",
      e: toFa(I.nc.length) + " مورد ثبت (" + toFa(oNc.length) + " باز، " + toFa(cNc.length) + " بسته): " + ["incident", "near_miss", "nc_product", "nc_process", "env", "complaint"].map(function (k) { var n = cnt(I.nc, function (x) { return x.type === k; }); return n ? { incident: "حادثه", near_miss: "شبه‌حادثه", nc_product: "محصول", nc_process: "فرایند", env: "محیط زیست", complaint: "شکایت" }[k] + " " + toFa(n) : ""; }).filter(Boolean).join("، ") + ". اقدام اصلاحی بسته‌شده: " + toFa(eff.length) + " (اثربخش " + toFa(effOk) + "، نااثربخش " + toFa(effNo) + ").",
      f: toFa(I.legal.length) + " الزام قانونی: " + toFa(cnt(leg, function (f) { return f[0] === 1; })) + " منطبق، " + toFa(cnt(leg, function (f) { return f[0] === 2; })) + " نیازمند توجه، " + toFa(cnt(leg, function (f) { return f[0] === 3; })) + " نامنطبق یا منقضی.",
      g: aud.length ? toFa(aud.length) + " ممیزی انجام شد؛ یافتهٔ عدم انطباق: " + toFa(I.aitems.filter(function (i) { return i.result === "minor" || i.result === "major"; }).length) + "، مشاهده و فرصت بهبود: " + toFa(I.aitems.filter(function (i) { return i.result === "obs" || i.result === "ofi"; }).length) + "." : "ممیزی داخلی انجام‌شده‌ای ثبت نیست.",
      h: "خریدها و عملکرد تأمین‌کنندگان از داشبورد تصمیم: …",
      i: "جایگاه‌های خالی چارت و وضعیت نقدینگی از داشبورد مالی: …",
      j: toFa(I.risks.length) + " ریسک/فرصت/جنبه/خطر ثبت؛ " + toFa(hi.length) + " مورد سطح زیاد باز. اقدام‌های کنترلی: " + toFa(cnt(I.tasks, function (x) { return x.ref_type === "risk"; })) + " (" + toFa(cnt(I.tasks, function (x) { return x.ref_type === "risk" && x.status === "done"; })) + " انجام‌شده).",
      k: "گزارش‌های شبه‌حادثه: " + toFa(cnt(I.nc, function (n) { return n.type === "near_miss"; })) + "؛ پیشنهادهای بهبود کارکنان: " + toFa(cnt(I.tasks, function (x) { return x.kind === "improvement"; })) + "؛ خطرات ثبت‌شده توسط کارکنان: " + toFa(cnt(I.risks, function (r) { return r.kind === "hazard" && r.created_by !== I.me; })) + ".",
      l: "دانش تأییدشده: " + toFa(cnt(I.kn, function (k) { return k.status === "approved"; })) + "؛ پیشنهادهای بهبود باز: " + toFa(cnt(I.tasks, function (x) { return x.kind === "improvement" && x.status !== "done" && x.status !== "cancelled"; })) + "."
    };
  }
  X.pages.review = function () {
    var h = '<div class="flt noprint">' + (I.ed ? '<button class="more" id="mrNew">+ بازنگری تازه</button>' : '') + '</div>';
    h += '<div class="card"><div class="scroll"><table><thead><tr><th>تاریخ</th><th>عنوان</th><th>حاضران</th><th>مصوبات</th><th>وضعیت</th></tr></thead><tbody>' +
      (I.reviews.length ? I.reviews.map(function (r) { var d = I.tasks.filter(function (t) { return t.ref_type === "review" && t.ref_id === r.id; });
        return '<tr data-rev="' + r.id + '" style="cursor:pointer"><td>' + jd(r.review_date) + '</td><td><b>' + esc(r.title) + '</b></td><td>' + esc(r.attendees || "—") + '</td><td>' + toFa(d.length) + " (" + toFa(d.filter(function (t) { return t.status === "done"; }).length) + ' بسته)</td><td>' + pill(r.status === "final" ? 1 : 2, r.status === "final" ? "نهایی" : "پیش‌نویس") + '</td></tr>'; }).join("") : '<tr><td colspan="5" class="mid" style="color:var(--muted)">بازنگری‌ای ثبت نشده. دست‌کم سالی یک بار لازم است.</td></tr>') + '</tbody></table></div></div>';
    return h;
  }
  function openRev(id) {
    var r = id ? I.reviews.filter(function (x) { return x.id === id; })[0] : null;
    if (!r) { r = { title: "بازنگری مدیریت " + toFa(jy()), review_date: today(), inputs: autoInputs(), status: "draft" }; }
    var ro = !I.ed || r.status === "final", inp = r.inputs || {}, dec = id ? I.tasks.filter(function (t) { return t.ref_type === "review" && t.ref_id === id; }) : [];
    var h = '<div class="card"><div class="chead"><div><h3>' + esc(r.title) + '</h3><p class="hint">' + (r.status === "final" ? "صورت‌جلسهٔ نهایی — قابل تغییر نیست" : "ورودی‌ها خودکار از سامانه پر شده‌اند؛ تکمیل و ویرایش کنید") + '</p></div><button class="more" id="mX">بستن</button></div>' +
      '<div class="frm"><div><label>عنوان</label><input id="mrT" value="' + esc(r.title) + '"' + (ro ? " disabled" : "") + '></div><div><label>تاریخ جلسه</label><input id="mrD" value="' + jd(r.review_date) + '"' + (ro ? " disabled" : "") + '></div><div style="grid-column:1/-1"><label>حاضران</label><input id="mrA" value="' + esc(r.attendees || "") + '"' + (ro ? " disabled" : "") + '></div></div>' +
      '<div class="sec-h">ورودی‌های بازنگری (بند ۹.۳.۲)</div>' + MRI.map(function (m) { return '<div style="margin-bottom:8px"><label>' + m[1] + '</label><textarea data-mri="' + m[0] + '"' + (ro ? " disabled" : "") + '>' + esc(inp[m[0]] || "") + '</textarea></div>'; }).join("") +
      '<div class="sec-h">خروجی‌ها و تصمیم‌ها (بند ۹.۳.۳)</div><textarea id="mrDec"' + (ro ? " disabled" : "") + ' placeholder="فرصت‌های بهبود، نیاز به تغییر در سیستم، نیاز به منابع، پیامد برای راهبرد">' + esc(r.decisions || "") + '</textarea>' +
      (id ? '<div class="sec-h">مصوبات (کار ارجاعی)</div>' + (dec.length ? dec.map(function (t) { return '<div class="li" data-task="' + t.id + '"><div><b>' + esc(t.title) + '</b><br><span>' + esc(nameOf(t.assignee_email)) + '</span></div><span>' + jd(t.due_date) + '</span></div>'; }).join("") : '<p class="hint">هنوز مصوبه‌ای ثبت نشده.</p>') : '') +
      '<div class="acts">' + (!ro ? '<button class="btn sm ghost" id="mrSave">ذخیرهٔ پیش‌نویس</button>' : '') + (!ro && id ? '<button class="btn sm ghost" id="mrAuto">به‌روزرسانی ورودی‌های خودکار</button>' : '') + (id && I.ed ? '<button class="btn sm ghost" id="mrTask">+ مصوبه</button>' : '') + (!ro && id ? '<button class="btn sm" id="mrFin">نهایی کردن صورت‌جلسه</button>' : '') + '</div></div>';
    modal(h);
    function read() { var o = { title: $("mrT").value.trim(), review_date: parseJ($("mrD").value) || today(), attendees: $("mrA").value.trim() || null, decisions: $("mrDec").value.trim() || null, inputs: {} };
      Array.prototype.forEach.call(document.querySelectorAll("[data-mri]"), function (t) { o.inputs[t.dataset.mri] = t.value; }); return o; }
    if ($("mrSave")) $("mrSave").onclick = async function () { var o = read(); var q = id ? await db.from("ims_reviews").update(o).eq("id", id) : await db.from("ims_reviews").insert(Object.assign(o, { created_by: I.me })).select("id").single();
      if (err(q)) return; await logit((id ? "ویرایش" : "ثبت") + " بازنگری مدیریت"); await load(); render(); openRev(id || q.data.id); toast("ذخیره شد."); };
    if ($("mrAuto")) $("mrAuto").onclick = function () { var a = autoInputs(); Array.prototype.forEach.call(document.querySelectorAll("[data-mri]"), function (t) { t.value = a[t.dataset.mri]; }); toast("ورودی‌ها از دادهٔ امروز پر شد؛ ذخیره را بزنید."); };
    if ($("mrTask")) $("mrTask").onclick = function () { openTask(null, { source: "review", ref_type: "review", ref_id: id, title: "", assignee_email: I.me, due_date: addDays(today(), 30), standards: ["Q", "S", "E"] }); };
    if ($("mrFin")) $("mrFin").onclick = async function () { if (!confirm("پس از نهایی شدن، صورت‌جلسه قابل تغییر نیست. ادامه می‌دهید؟")) return; var o = read(); o.status = "final";
      o.snapshot = { at: new Date().toISOString(), tasks: I.tasks.length, nc_open: I.nc.filter(function (n) { return n.status !== "closed"; }).length, risks_high: I.risks.filter(function (x) { return x.score >= 15 && x.status !== "closed"; }).length, legal: I.legal.length, docs_approved: I.docs.filter(function (d) { return d.status === "approved"; }).length, audits_done: I.audits.filter(function (a) { return a.status === "done"; }).length };
      if (err(await db.from("ims_reviews").update(o).eq("id", id))) return; await logit("نهایی شدن صورت‌جلسهٔ بازنگری «" + o.title + "»"); refresh("صورت‌جلسه نهایی شد."); };
    rebind();
  }

  /* ================= آمادگی ممیزی (روی نمای کلی) ================= */
  X.over = function () {
    var t = today(), n = function (arr, f) { return arr.filter(f).length; };
    var C = [
      ["۴.۱", "مسائل درونی و بیرونی (با اقلیم)", n(I.ctx, function (c) { return c.kind !== "party"; }) > 0 && n(I.ctx, function (c) { return c.climate; }) > 0, "context"],
      ["۴.۲", "طرف‌های ذی‌نفع", n(I.ctx, function (c) { return c.kind === "party"; }) > 0, "context"],
      ["۴.۳ / ۵.۲", "خط‌مشی و دامنهٔ تأییدشده", S("policy_status") === "approved", "policy"],
      ["۴.۴", "مالک فرایندها (غیر از مدیرعامل برای همه)", (function () { var o = {}; I.proc.forEach(function (p) { var e = ownerOf(p); if (e) o[e] = 1; }); return Object.keys(o).length > 1; })(), "proc"],
      ["۶.۱", "ریسک و فرصت", n(I.risks, function (r) { return r.kind === "risk" || r.kind === "opportunity"; }) > 0, "risk"],
      ["۶.۱.۲", "جنبه‌های زیست‌محیطی و خطرات ایمنی", n(I.risks, function (r) { return r.kind === "aspect"; }) > 0 && n(I.risks, function (r) { return r.kind === "hazard"; }) > 0, "risk"],
      ["۶.۱.۳", "الزامات قانونی", I.legal.length > 0, "legal"],
      ["۹.۱.۲", "ارزیابی انطباق انجام‌شده", I.legal.length > 0 && n(I.legal, function (l) { return !!l.last_eval; }) === I.legal.length, "legal"],
      ["۶.۲", "اهداف سال جاری", n(I.objs, function (o) { return o.year === jy(); }) > 0, "obj"],
      ["۷.۱.۶", "دانش سازمانی تأییدشده", n(I.kn, function (k) { return k.status === "approved"; }) > 0, "know"],
      ["۷.۵", "مستندات تأییدشده", I.docs.length > 0 && n(I.docs, function (d) { return d.status === "approved"; }) >= Math.ceil(I.docs.length * 0.8), "docs"],
      ["۹.۲", "ممیزی داخلی انجام‌شده", n(I.audits, function (a) { return a.status === "done"; }) > 0, "audit"],
      ["۹.۳", "بازنگری مدیریت نهایی‌شده", n(I.reviews, function (r) { return r.status === "final"; }) > 0, "review"],
      ["۱۰.۲", "گردش عدم انطباق استفاده شده", I.nc.length > 0, "nc"]
    ];
    var ok = n(C, function (c) { return c[2]; });
    return '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>آمادگی ممیزی — ' + toFa(ok) + ' از ' + toFa(C.length) + '</h3><p class="hint">خودکار از داده‌های سامانه. هر ردیف را بزنید تا به همان بخش بروید.</p></div></div><div class="bar2" style="margin-bottom:10px"><i style="width:' + Math.round(ok / C.length * 100) + '%"></i></div>' +
      C.map(function (c) { return '<div class="li" data-go="' + c[3] + '"><div><b>' + c[0] + '</b> ' + c[1] + '</div>' + (c[2] ? pill(1, "✓ آماده") : pill(2, "باقی‌مانده")) + '</div>'; }).join("") + '</div>';
  };

  /* ================= میز کار: موارد سررسید من ================= */
  X.desk = function (block) {
    var me = I.me, t = today(), h = "";
    var rk = I.risks.filter(function (r) { return r.owner_email === me && r.status !== "closed" && ((r.review_date && r.review_date <= t) || (r.score >= 15 && r.status === "open")); });
    if (rk.length) h += block("ریسک و خطرهای نیازمند توجه من", rk, function (r) { return '<div class="li" data-risk="' + r.id + '"><div><b>' + esc(r.title) + '</b><br><span>' + RK[r.kind] + '</span></div>' + scB(r.likelihood, r.severity) + '</div>'; }, "");
    var lg = I.legal.filter(function (l) { return (l.owner_email === me || (I.ed && !l.owner_email)) && legalFlag(l)[0] >= 2; });
    if (lg.length) h += block("الزامات قانونی نیازمند ارزیابی یا تمدید", lg, function (l) { var f = legalFlag(l); return '<div class="li" data-legal="' + l.id + '"><div><b>' + esc(l.title) + '</b></div>' + pill(f[0], f[1]) + '</div>'; }, "");
    var dc = I.docs.filter(function (d) { return d.status !== "obsolete" && ((d.owner_email === me && ((d.review_date && d.review_date <= t) || d.status === "draft")) || (I.ed && d.status === "review")); });
    if (dc.length) h += block("مستندات نیازمند اقدام من", dc, function (d) { return '<div class="li" data-doc="' + d.id + '"><div><b>' + esc(d.code + " — " + d.title) + '</b></div><span>' + DS[d.status] + '</span></div>'; }, "");
    var au = I.audits.filter(function (a) { return a.auditor_email === me && a.status === "planned"; });
    if (au.length) h += block("ممیزی‌هایی که ممیز آن هستم", au, function (a) { return '<div class="li" data-audit="' + a.id + '"><div><b>' + esc(a.title) + '</b></div><span>' + jd(a.plan_date) + '</span></div>'; }, "");
    var pp = prevPer(), ob = I.objs.filter(function (o) { return o.owner_email === me && o.status === "active" && !I.ovals.some(function (v) { return v.objective_id === o.id && v.period === pp; }); });
    if (ob.length) h += block("اهدافی که مقدار ماه گذشته‌شان ثبت نشده", ob, function (o) { return '<div class="li" data-obj="' + o.id + '"><div><b>' + esc(o.title) + '</b></div><span>' + toFa(pp) + '</span></div>'; }, "");
    return h;
  };

  /* ================= اتصال رویدادها ================= */
  X.bind = function (page) {
    function on(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
    on("[data-risk]", function (b) { b.onclick = function () { openRisk(+b.dataset.risk); }; });
    on("[data-legal]", function (b) { b.onclick = function () { openLegal(+b.dataset.legal); }; });
    on("[data-obj]", function (b) { b.onclick = function () { openObj(+b.dataset.obj); }; });
    on("[data-doc]", function (b) { b.onclick = function () { openDoc(+b.dataset.doc); }; });
    on("[data-audit]", function (b) { b.onclick = function () { openAudit(+b.dataset.audit); }; });
    on("[data-rev]", function (b) { b.onclick = function () { openRev(+b.dataset.rev); }; });
    on("[data-ctx]", function (b) { b.onclick = function () { openCtx(+b.dataset.ctx); }; });
    on("[data-go]", function (b) { if (b.closest("#mdl")) return; b.onclick = function () { I.page = b.dataset.go; render(); window.scrollTo(0, 0); }; });
    on("[data-rtab]", function (b) { b.onclick = function () { tab.risk = b.dataset.rtab; render(); }; });
    on("[data-ctab]", function (b) { b.onclick = function () { tab.context = b.dataset.ctab; render(); }; });
    if ($("oY")) $("oY").onchange = function () { objYear = +$("oY").value; render(); };
    var click = { rNew: function () { openRisk(null); }, lNew: function () { openLegal(null); }, oNew: function () { openObj(null); }, dNew: function () { openDoc(null); }, aNew: function () { openAudit(null); }, mrNew: function () { openRev(null); }, ctxNew: function () { openCtx(null); } };
    Object.keys(click).forEach(function (k) { if ($(k)) $(k).onclick = click[k]; });
    async function bulk(table, rows, msg) { if (!confirm(msg + "\nاین موارد پیشنهاد اولیه‌اند و باید بازبینی، اصلاح و تکمیل شوند. افزوده شوند؟")) return; if (err(await db.from(table).insert(rows))) return; await logit("افزودن فهرست پیشنهادی به " + table + " (" + rows.length + " مورد)"); refresh("افزوده شد؛ لطفاً بازبینی کنید."); }
    if ($("rSug")) $("rSug").onclick = function () { var nx = addMonths(today(), 12); bulk("ims_risks", RISK_SUG.map(function (r) { return { kind: r[0], title: r[1], activity: r[2], condition: r[3], consequence: r[4], likelihood: r[5], severity: r[6], standards: r[7].split(""), climate: /اقلیم|گلخانه|برق/.test(r[1] + r[4]) && r[0] !== "hazard", review_date: nx, created_by: I.me, description: "پیشنهاد اولیه — بازبینی شود" }; }), toFa(RISK_SUG.length) + " ریسک، فرصت، جنبه و خطر رایج در کارخانهٔ خردایش باریت"); };
    if ($("lSug")) $("lSug").onclick = function () { bulk("ims_legal", LEGAL_SUG.map(function (l) { return { kind: l[0], title: l[1], reference: l[2] || null, authority: l[3], requirement: l[4], standards: l[5].split(""), eval_months: l[6] }; }), toFa(LEGAL_SUG.length) + " الزام قانونی و الزام مشتری رایج"); };
    if ($("dSug")) $("dSug").onclick = function () { var nx = addMonths(today(), 12), pc = {}; I.proc.forEach(function (p) { pc[p.code] = p.id; });
      bulk("ims_docs", DOC_SUG.map(function (d) { return { code: d[0], title: d[1], kind: d[2], process_id: pc[d[3]] || null, version: "0", status: "draft", review_date: nx }; }), toFa(DOC_SUG.length) + " سند پایهٔ IMS به‌صورت پیش‌نویس"); };
    if ($("ctxSug")) $("ctxSug").onclick = function () { bulk("ims_context", CTX_SUG.map(function (c) { return { kind: c[0], title: c[1], detail: c[2] || null, needs: c[3], climate: c[4], standards: c[5].split("") }; }), toFa(CTX_SUG.length) + " مسئله و طرف ذی‌نفع برای کارخانهٔ باریت"); };
    if (page === "policy") {
      if ($("polSave")) $("polSave").onclick = async function () { try { await setS("policy", $("polT").value); await setS("scope", $("scT").value); await logit("ویرایش پیش‌نویس خط‌مشی"); toast("ذخیره شد."); } catch (e) { toast(e.message); } };
      if ($("polOk")) $("polOk").onclick = async function () { if (!confirm("خط‌مشی و دامنه تأیید و ابلاغ شود؟")) return; try { await setS("policy", $("polT").value); await setS("scope", $("scT").value); await setS("policy_version", String((+S("policy_version") || 0) + 1)); await setS("policy_date", today()); await setS("policy_by", I.me); await setS("policy_status", "approved"); await logit("تأیید و ابلاغ خط‌مشی، ویرایش " + S("policy_version")); render(); toast("تأیید شد."); } catch (e) { toast(e.message); } };
      if ($("polRev")) $("polRev").onclick = async function () { if (!confirm("خط‌مشی برای بازنگری به پیش‌نویس برگردد؟")) return; try { await setS("policy_status", "draft"); await logit("بازنگری خط‌مشی آغاز شد"); render(); } catch (e) { toast(e.message); } };
    }
  };
})();
