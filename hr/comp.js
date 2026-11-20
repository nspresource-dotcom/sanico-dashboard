/* صلاحیت و آموزش (ایزو ۹۰۰۱/۱۴۰۰۱/۴۵۰۰۱ بند ۷.۲ و ۷.۳) — ماتریس صلاحیت جایگاه‌ها، سوابق آموزش با تاریخ اعتبار، فهرست صلاحیت‌ها.
   پیش از hr.js بارگذاری می‌شود؛ از راه window.HR_EXT وصل است. */
(function () {
  var X = window.HR_EXT = { pages: {}, add: [
    { k: "comp", t: "ماتریس صلاحیت", ic: "layers", h: "صلاحیت لازم هر جایگاه در برابر سوابق فرد (بند ۷.۲)" },
    { k: "train", t: "سوابق آموزش", ic: "receipt", h: "دوره‌ها، گواهی‌ها، تاریخ اعتبار و اثربخشی آموزش" },
    { k: "catalog", t: "فهرست صلاحیت‌ها", ic: "list", h: "آموزش‌ها و گواهی‌های تعریف‌شده و دورهٔ اعتبار هر کدام" }] };
  var CK = { training: "آموزش", education: "تحصیلات", experience: "سابقهٔ کار", license: "گواهی/پروانه", skill: "مهارت" };
  var SUG = [["آموزش عمومی ایمنی و بهداشت (بدو ورود)", "training", 1, 12], ["آگاهی از خط‌مشی و سیستم مدیریت یکپارچه", "training", 0, 24], ["کمک‌های اولیه", "training", 1, 24], ["اطفای حریق و واکنش در شرایط اضطراری", "training", 1, 12],
    ["قفل و برچسب (LOTO)", "training", 1, 24], ["کار در ارتفاع", "training", 1, 24], ["گواهینامهٔ رانندگی لیفتراک", "license", 1, null], ["کار با آسیاب و کلاسیفایر", "skill", 0, null],
    ["نمونه‌برداری و آزمون باریت طبق API 13A", "training", 0, 24], ["کالیبراسیون و کار با تجهیزات آزمایشگاه", "training", 0, 24], ["گواهی صلاحیت برق صنعتی", "license", 1, null], ["ممیزی داخلی سیستم مدیریت یکپارچه", "training", 0, 36],
    ["حفاظت تنفسی و شنوایی (استفادهٔ درست از ماسک و گوشی)", "training", 1, 12]];
  var C = { comp: [], reqs: [], tr: [] }, selE = "";
  function t0() { return todayIso(); }
  function addD(iso, n) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function jd(iso) { return iso ? formatJalali(String(iso).slice(0, 10)) : "—"; }
  function pJ(s) { var p = toEn(String(s || "")).split(/[\/\-.]/).map(Number); if (p.length !== 3 || !p[0]) return null; if (p[0] < 100) p[0] += 1400; return jalaliToIso(p[0], p[1], p[2]); }
  function compOf(id) { return C.comp.filter(function (c) { return c.id === id; })[0]; }
  /* وضعیت یک نفر برای یک صلاحیت: ok / soon / exp / miss */
  function st(email, cid) {
    var L = C.tr.filter(function (t) { return t.email === email && t.competency_id === cid; }).sort(function (a, b) { return (b.done_date || "") < (a.done_date || "") ? -1 : 1; });
    if (!L.length) return ["miss", null]; var last = L[0];
    if (last.valid_until && last.valid_until < t0()) return ["exp", last];
    if (last.valid_until && last.valid_until < addD(t0(), 30)) return ["soon", last];
    return ["ok", last];
  }
  var ICN = { ok: '<span class="pill p3">✓</span>', soon: '<span class="pill p2">رو به انقضا</span>', exp: '<span class="pill p1">منقضی</span>', miss: '<span class="pill p1">ندارد</span>' };
  X.load = async function () {
    var r = await Promise.all([db.from("hr_competencies").select("*").order("sort").order("id"), db.from("hr_position_reqs").select("*"), db.from("hr_trainings").select("*").order("done_date", { ascending: false }).limit(3000)]);
    C.comp = r[0].data || []; C.reqs = r[1].data || []; C.tr = r[2].data || [];
  };
  X.stats = function () { var gaps = 0, soon = 0; H.pos.forEach(function (p) { if (!p.holder_email) return; C.reqs.filter(function (q) { return q.position_id === p.id; }).forEach(function (q) { var s = st(p.holder_email, q.competency_id)[0]; if (s === "miss" || s === "exp") gaps++; if (s === "soon") soon++; }); }); return { gaps: gaps, soon: soon, reqs: C.reqs.length }; };

  X.pages.comp = function () {
    if (!C.comp.length) return '<div class="empty">اول در «فهرست صلاحیت‌ها» آموزش‌ها و گواهی‌های لازم را تعریف کنید.</div>';
    var s = X.stats();
    var h = '<div class="grid g3" style="margin-bottom:14px">' + kpi("کمبود صلاحیت", toFa(s.gaps), "مورد", "ندارد یا منقضی شده", s.gaps ? "warn" : "pos") + kpi("رو به انقضا", toFa(s.soon), "مورد", "تا ۳۰ روز آینده", s.soon ? "warn" : "") + kpi("الزامات تعریف‌شده", toFa(s.reqs), "مورد", "جایگاه × صلاحیت") + '</div>';
    h += '<div class="card"><div class="chead"><div><h3>جایگاه × صلاحیت</h3><p class="hint">' + (H.edit ? "روی خانه بزنید تا الزام برای آن جایگاه روشن یا خاموش شود. " : "") + 'خانهٔ خالی یعنی برای آن جایگاه لازم نیست.</p></div></div><div class="scroll"><table class="mx"><thead><tr><th>جایگاه / فرد</th>' +
      C.comp.map(function (c) { return '<th style="white-space:normal;min-width:90px;font-size:.7rem">' + esc(c.title) + (c.safety ? ' <span class="std" style="background:var(--rose-s);color:var(--rose)">ایمنی</span>' : '') + '</th>'; }).join("") + '</tr></thead><tbody>' +
      H.pos.map(function (p) { return '<tr><td class="who"><b>' + esc(p.title) + '</b><span>' + (p.holder_email ? esc(nameOf(p.holder_email)) : "خالی") + '</span></td>' + C.comp.map(function (c) {
        var req = C.reqs.some(function (q) { return q.position_id === p.id && q.competency_id === c.id; });
        var cell = req ? (p.holder_email ? ICN[st(p.holder_email, c.id)[0]] : '<span class="pill">لازم</span>') : '<span style="color:var(--line)">·</span>';
        return '<td class="mid"' + (H.edit ? ' data-req="' + p.id + '_' + c.id + '" style="cursor:pointer;text-align:center"' : ' style="text-align:center"') + '>' + cell + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table></div></div>';
    return h;
  };
  X.pages.train = function () {
    var L = C.tr.filter(function (t) { return !selE || t.email === selE; });
    var h = '<div class="flt"><select id="trF">' + '<option value="">همهٔ افراد</option>' + H.acc.map(function (a) { return '<option value="' + esc(a.email) + '"' + (selE === a.email ? " selected" : "") + '>' + esc(a.full_name || a.email) + '</option>'; }).join("") + '</select></div>';
    if (H.edit) h += '<div class="card" style="margin-bottom:14px"><div class="chead"><div><h3>ثبت آموزش یا گواهی</h3><p class="hint">اگر صلاحیت دورهٔ اعتبار داشته باشد، تاریخ اعتبار خودکار حساب می‌شود.</p></div></div><div class="frm">' +
      '<div><label>فرد</label><select id="trE">' + H.acc.map(function (a) { return '<option value="' + esc(a.email) + '"' + (selE === a.email ? " selected" : "") + '>' + esc(a.full_name || a.email) + '</option>'; }).join("") + '</select></div>' +
      '<div><label>صلاحیت</label><select id="trC"><option value="">— آموزش آزاد</option>' + C.comp.map(function (c) { return '<option value="' + c.id + '">' + esc(c.title) + '</option>'; }).join("") + '</select></div>' +
      '<div><label>عنوان دوره</label><input id="trT"></div><div><label>برگزارکننده</label><input id="trP"></div><div><label>تاریخ</label><input id="trD" value="' + jd(t0()) + '"></div><div><label>ساعت</label><input id="trH"></div>' +
      '<div><label>اعتبار تا (اختیاری)</label><input id="trV" placeholder="خودکار"></div><div style="grid-column:1/-1"><label>مدرک (شمارهٔ گواهی یا لینک)</label><input id="trEv"></div>' +
      '<div style="grid-column:1/-1"><label>ارزیابی اثربخشی (بند ۷.۲ پ)</label><input id="trEf" placeholder="مثلاً آزمون عملی قبول شد / مشاهدهٔ سرپرست پس از یک ماه"></div></div><button class="btn sm" id="trSave">ثبت</button></div>';
    h += '<div class="card"><div class="scroll"><table><thead><tr><th>فرد</th><th>دوره</th><th>برگزارکننده</th><th>تاریخ</th><th class="num">ساعت</th><th>اعتبار تا</th><th>مدرک</th><th>اثربخشی</th>' + (H.edit ? '<th></th>' : '') + '</tr></thead><tbody>' +
      (L.length ? L.map(function (t) { var ex = t.valid_until && t.valid_until < t0(); return '<tr><td>' + esc(nameOf(t.email)) + '</td><td><b>' + esc(t.title) + '</b></td><td>' + esc(t.provider || "—") + '</td><td>' + jd(t.done_date) + '</td><td class="num">' + (t.hours ? toFa(t.hours) : "—") + '</td><td' + (ex ? ' style="color:var(--rose)"' : '') + '>' + jd(t.valid_until) + '</td><td>' + esc(t.evidence || "—") + '</td><td>' + esc(t.effectiveness || "—") + '</td>' + (H.edit ? '<td><button class="del" data-trdel="' + t.id + '">✕</button></td>' : '') + '</tr>'; }).join("") : '<tr><td colspan="9" class="mid" style="color:var(--muted)">سابقه‌ای ثبت نشده.</td></tr>') + '</tbody></table></div></div>';
    return h;
  };
  X.pages.catalog = function () {
    var h = H.edit ? '<div class="card" style="margin-bottom:14px"><div class="addrow"><input id="cT" placeholder="عنوان صلاحیت، مثلاً «کار با لیفتراک»"><select id="cK">' + Object.keys(CK).map(function (k) { return '<option value="' + k + '">' + CK[k] + '</option>'; }).join("") + '</select><input id="cV" placeholder="اعتبار (ماه)" style="flex:0 0 120px;min-width:120px"><label class="chk" style="margin:0;padding:0"><input type="checkbox" id="cS"> ایمنی</label><button class="btn sm" id="cAdd" style="margin:0">افزودن</button></div>' +
      (C.comp.length ? '' : '<button class="more" id="cSug" style="margin-top:10px">+ فهرست پیشنهادی برای کارخانهٔ باریت</button>') + '</div>' : '';
    h += '<div class="card"><div class="scroll"><table><thead><tr><th>صلاحیت</th><th>نوع</th><th>ایمنی</th><th class="num">اعتبار (ماه)</th><th class="num">جایگاه‌های نیازمند</th><th class="num">افراد دارای سابقه</th>' + (H.edit ? '<th></th>' : '') + '</tr></thead><tbody>' +
      (C.comp.length ? C.comp.map(function (c) { var ppl = {}; C.tr.forEach(function (t) { if (t.competency_id === c.id) ppl[t.email] = 1; });
        return '<tr><td><b>' + esc(c.title) + '</b></td><td>' + CK[c.kind] + '</td><td>' + (c.safety ? '<span class="pill p1">ایمنی</span>' : "—") + '</td><td class="num">' + (c.validity_months ? toFa(c.validity_months) : "بدون انقضا") + '</td><td class="num">' + toFa(C.reqs.filter(function (q) { return q.competency_id === c.id; }).length) + '</td><td class="num">' + toFa(Object.keys(ppl).length) + '</td>' + (H.edit ? '<td><button class="del" data-cdel="' + c.id + '">✕</button></td>' : '') + '</tr>'; }).join("") : '<tr><td colspan="7" class="mid" style="color:var(--muted)">صلاحیتی تعریف نشده.</td></tr>') + '</tbody></table></div></div>';
    return h;
  };
  async function re(msg) { await X.load(); render(); if (msg) toast(msg); }
  X.bind = function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-req]"), function (td) { td.onclick = async function () {
      var a = td.dataset.req.split("_").map(Number), has = C.reqs.some(function (q) { return q.position_id === a[0] && q.competency_id === a[1]; });
      var r = has ? await db.from("hr_position_reqs").delete().eq("position_id", a[0]).eq("competency_id", a[1]) : await db.from("hr_position_reqs").insert({ position_id: a[0], competency_id: a[1] });
      if (r.error) { toast(r.error.message); return; } await logit((has ? "حذف" : "افزودن") + " الزام «" + (compOf(a[1]) || {}).title + "» برای جایگاه #" + a[0]); re(); }; });
    if ($("trF")) $("trF").onchange = function () { selE = $("trF").value; render(); };
    if ($("trC")) $("trC").onchange = function () { var c = compOf(+$("trC").value); if (c && !$("trT").value) $("trT").value = c.title; };
    if ($("trSave")) $("trSave").onclick = async function () {
      var o = { email: $("trE").value, competency_id: +$("trC").value || null, title: $("trT").value.trim(), provider: $("trP").value.trim() || null, done_date: pJ($("trD").value), hours: +toEn($("trH").value) || null,
        valid_until: $("trV").value.trim() ? pJ($("trV").value) : null, evidence: $("trEv").value.trim() || null, effectiveness: $("trEf").value.trim() || null };
      if (!o.title || !o.done_date) { toast("عنوان و تاریخ لازم است."); return; }
      var r = await db.from("hr_trainings").insert(o); if (r.error) { toast(r.error.message); return; } await logit("سابقهٔ آموزش «" + o.title + "» برای " + nameOf(o.email)); re("ثبت شد."); };
    Array.prototype.forEach.call(document.querySelectorAll("[data-trdel]"), function (b) { b.onclick = async function () { if (!confirm("این سابقه حذف شود؟")) return; await db.from("hr_trainings").delete().eq("id", +b.dataset.trdel); await logit("حذف سابقهٔ آموزش"); re(); }; });
    if ($("cAdd")) $("cAdd").onclick = async function () { var t = $("cT").value.trim(); if (!t) return; var v = +toEn($("cV").value) || null;
      var r = await db.from("hr_competencies").insert({ title: t, kind: $("cK").value, validity_months: v, safety: $("cS").checked, sort: C.comp.length }); if (r.error) { toast(r.error.message); return; } await logit("صلاحیت تازه «" + t + "»"); re(); };
    Array.prototype.forEach.call(document.querySelectorAll("[data-cdel]"), function (b) { b.onclick = async function () { if (!confirm("صلاحیت و الزام‌های آن حذف شود؟ سوابق آموزش می‌مانند.")) return; await db.from("hr_competencies").delete().eq("id", +b.dataset.cdel); await logit("حذف صلاحیت"); re(); }; });
    if ($("cSug")) $("cSug").onclick = async function () { if (!confirm(toFa(SUG.length) + " صلاحیت رایج کارخانهٔ خردایش باریت افزوده شود؟ بعداً قابل ویرایش و حذف است.")) return;
      var r = await db.from("hr_competencies").insert(SUG.map(function (s, i) { return { title: s[0], kind: s[1], safety: !!s[2], validity_months: s[3], sort: i }; })); if (r.error) { toast(r.error.message); return; } await logit("افزودن فهرست پیشنهادی صلاحیت‌ها"); re("افزوده شد."); };
  };
})();
