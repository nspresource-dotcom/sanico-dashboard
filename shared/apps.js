/* جابه‌جایی بین داشبوردها بدون ورود دوباره.
   همهٔ داشبوردها روی یک دامنه و یک پروژهٔ Supabase‌اند، پس نشست ورود مشترک است.
   این ماژول فهرست داشبوردهایی را که کاربر به آن‌ها دسترسی دارد (app_access) در منو می‌گذارد. */
window.SayaApps = (function () {
  var ICON = {
    admin: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    barite: '<path d="M3 21V10l6 4V10l6 4V6l6 3v12z"/>',
    finance: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    hr: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.2c2.9.3 5.5 2.5 5.5 5.8"/>',
    ims: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
    other: '<rect x="4" y="4" width="16" height="16" rx="3"/>'
  };
  function svg(k) { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICON[k] || ICON.other) + '</svg>'; }
  /* base: مسیر ریشهٔ سایت نسبت به صفحهٔ جاری، مثلاً "../" */
  async function render(db, el, current, base) {
    if (!el) return;
    try {
      var a = await db.from("app_dashboards").select("key,title,url,active,sort").order("sort");
      var ses = await db.auth.getSession(), me = ses && ses.data && ses.data.session ? String(ses.data.session.user.email || "").toLowerCase() : "";
      var b = await db.from("app_access").select("dashboard,role").eq("email", me);
      var mine = {}; (b.data || []).forEach(function (r) { mine[r.dashboard] = r.role; });
      var list = (a.data || []).filter(function (d) { return d.active && mine[d.key] && d.key !== current; });
      if (!list.length) { el.innerHTML = ""; return; }
      el.innerHTML = '<div class="apps-h">داشبوردهای دیگر</div>' + list.map(function (d) {
        var href = base + String(d.url || "").replace(/^\.\//, "");
        return '<a class="nav" href="' + href + '"><span class="ic">' + svg(d.key) + '</span>' + d.title + '</a>'; }).join("");
    } catch (e) { el.innerHTML = ""; }
  }
  return { render: render };
})();
