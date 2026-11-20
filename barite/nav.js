/* منوی کناری: گروه‌بندی، زیرمنو و آیکون‌های یکدست.
   افزودن صفحهٔ تازه = یک سطر در PAGES با کلید گروه (g)؛ گروه تازه = یک سطر در NAV_GROUPS. */

var ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
  compare: '<path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/>',
  radar: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 12l5-5"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  bank: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16l4-5 3 3 5-7"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5"/><path d="M12 17v.01"/>',
  back: '<path d="M9 14l-5-5 5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
  power: '<path d="M12 3v8"/><path d="M6.3 6.3a8 8 0 1011.4 0"/>',
  factory: '<path d="M3 21V10l6 4V10l6 4V6l6 3v12z"/>',
  truck: '<path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  scale: '<path d="M12 4v16"/><path d="M5 20h14"/><path d="M5 8h14"/><path d="M5 8l-3 6h6zM19 8l-3 6h6z"/>',
  up: '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
  sum: '<path d="M17 5H7l6 7-6 7h10"/>',
  alert: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.01"/>',
  hourglass: '<path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 10 5 10 9s-10 4-10 9"/><path d="M17 3c0 5-10 5-10 9s10 4 10 9"/>',
  diamond: '<path d="M12 3l9 9-9 9-9-9z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  percent: '<path d="M5 19L19 5"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>',
  value: '<path d="M4 16c3-6 5 2 8-4s5 2 8-4"/>',
  caret: '<path d="M14 6l-6 6 6 6"/>'
};
function icon(n, s) { return '<svg class="svgi" width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || ICONS.diamond) + '</svg>'; }
/* نمادهای قدیمی کارت‌ها ← آیکون یکدست (برخی روی آیفون ایموجی می‌شدند) */
var GLYPH = { "₪": "cash", "▤": "layers", "↗": "up", "⏱": "clock", "≈": "value", "%": "percent", "⚖": "scale", "⇡": "up", "▼": "down", "Σ": "sum", "!": "alert", "⏳": "hourglass", "◆": "diamond", "✕": "x", "?": "help" };
function chipHtml(g) { return icon(GLYPH[g] || "diamond", 17); }

var NAV_GROUPS = [
  { k: "over", t: "نمای کلی" },
  { k: "ops", t: "عملیات روزانه" },
  { k: "plan", t: "پایش و برنامهٔ رشد" },
  { k: "fin", t: "مالی و نقدینگی" },
  { k: "model", t: "مدل امکان‌سنجی" },
  { k: "dec", t: "تحلیل و تصمیم" }
];
var PAGES = [
  { k: "home", g: "over", t: "وضعیت کارخانه", ic: "home", h: "یک نگاه به برنامه و عملکرد" },
  { k: "daily", g: "ops", t: "ثبت روزانه", ic: "edit", h: "تولید، فروش، خرید خوراک و هزینه‌ها",
    kids: [{ s: "prod", t: "تولید", ic: "factory" }, { s: "sales", t: "فروش", ic: "tag" }, { s: "purch", t: "خرید خوراک", ic: "truck" }, { s: "exp", t: "هزینه‌ها", ic: "receipt" }] },
  { k: "pva", g: "ops", t: "برنامه در برابر واقعی", ic: "compare", h: "مقایسهٔ ماه‌به‌ماه با مدل" },
  { k: "watch", g: "plan", t: "پایش ۱۹ بُعد", ic: "radar", h: "هشدار زودهنگام برنامهٔ رشد ۵ ساله" },
  { k: "gates", g: "plan", t: "دروازه‌ها و اقدام‌ها", ic: "flag", h: "۹۰ روز اول، دروازهٔ سال اول و فرض‌ها" },
  { k: "cash", g: "fin", t: "جریان نقدی", ic: "cash", h: "پیش‌بینی ماهانه و ۱۳ هفته‌ای نقدینگی" },
  { k: "loans", g: "fin", t: "تسهیلات", ic: "bank", h: "وام‌ها و اقساط" },
  { k: "assume", g: "model", t: "مفروضات", ic: "list", h: "همهٔ عددهای ورودی مدل، با منبع و اعتبار هر کدام" },
  { k: "sources", g: "model", t: "منابع خوراک", ic: "layers", h: "افزودن، حذف و تنظیم منابع خوراک" },
  { k: "sens", g: "dec", t: "حساسیت و درخت ارزش", ic: "chart", h: "کدام متغیر بیشترین اثر را دارد" },
  { k: "scen", g: "dec", t: "سناریوها", ic: "copy", h: "نسخه‌های ذخیره‌شدهٔ مدل" },
  { k: "guide", g: null, t: "راهنما", ic: "help", h: "این داشبورد چطور کار می‌کند" }
];
var PAGE_ALIAS = { model: "assume" };
var navClosed = {}; try { navClosed = JSON.parse(localStorage.getItem("bf_nav") || "{}"); } catch (e) {}

function buildNav() {
  var cur = PAGES.filter(function (p) { return p.k === A.page; })[0] || {}, h = "";
  NAV_GROUPS.forEach(function (gr) {
    var items = PAGES.filter(function (p) { return p.g === gr.k; }), closed = navClosed[gr.k] && cur.g !== gr.k;
    h += '<div class="ngrp' + (closed ? " closed" : "") + '"><button class="nhead" data-grp="' + gr.k + '"><span>' + gr.t + '</span>' + icon("caret", 14) + '</button><div class="nbody">';
    items.forEach(function (p) {
      h += '<button class="nav' + (A.page === p.k ? " on" : "") + '" data-p="' + p.k + '"><span class="ic">' + icon(p.ic) + '</span>' + p.t + '</button>';
      if (p.kids && A.page === p.k) h += '<div class="nkids">' + p.kids.map(function (c) {
        return '<button class="nkid' + (A.sub === c.s ? " on" : "") + '" data-p="' + p.k + '" data-s="' + c.s + '">' + icon(c.ic, 15) + c.t + '</button>'; }).join("") + '</div>';
    });
    h += '</div></div>';
  });
  $("nav").innerHTML = h;
  Array.prototype.forEach.call($("nav").querySelectorAll("[data-p]"), function (b) { b.onclick = function () { if (b.dataset.s) A.sub = b.dataset.s; go(b.dataset.p); }; });
  Array.prototype.forEach.call($("nav").querySelectorAll("[data-grp]"), function (b) { b.onclick = function () {
    var k = b.dataset.grp; navClosed[k] = !b.parentNode.classList.contains("closed"); b.parentNode.classList.toggle("closed");
    try { localStorage.setItem("bf_nav", JSON.stringify(navClosed)); } catch (e) {} }; });
  var gb = $("guideBtn"); if (gb) { gb.classList.toggle("on", A.page === "guide"); gb.onclick = function () { go("guide"); }; }
}
function crumb() { var p = PAGES.filter(function (x) { return x.k === A.page; })[0]; if (!p) return "";
  var g = NAV_GROUPS.filter(function (x) { return x.k === p.g; })[0], kid = p.kids ? p.kids.filter(function (c) { return c.s === A.sub; })[0] : null;
  return (g ? g.t + " ‹ " : "") + p.t + (kid ? " ‹ " + kid.t : ""); }
