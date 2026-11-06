// کارنما — رابط کاربری
import { API } from './data-source.js';
import {
  toFa, toEn, formatJalali, isoToJalali, jalaliToIso, todayIso,
  MONTH_NAMES, monthLabel, jalaliMonthLength,
} from './jalali.js';
import { CATALOG, PRESETS, effectivePermissions, JUSTIFY_ABOVE } from './permissions.js';

// ───────────────────────────── کمکی ─────────────────────────────

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fh = (h) => {
  const v = Number(h || 0);
  return toFa(Number.isInteger(v) ? v : v.toFixed(1));
};
const initials = (name) => String(name || '؟').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');

const PRIORITY = { low: 'کم', normal: 'عادی', high: 'زیاد', urgent: 'فوری' };
const STATUS = {
  pending: { label: 'در انتظار تأیید', chip: 'warn' },
  approved: { label: 'تأیید شد', chip: 'ok' },
  rejected: { label: 'رد شد', chip: 'danger' },
};

const state = {
  user: null,
  view: 'myday',
  month: null,
  board: null,
  boards: [],
  boardId: null,
  labels: [],
  units: [],
  managedUnits: [],
  reviewQueue: [],
  unitView: null,
  unitReport: null,
  notifyStatus: null,
  users: [],
  stats: null,
  myday: null,
  workload: null,
  notifications: [],
  unread: 0,
  stock: {
    tab: 'onhand',
    setup: null,
    onhand: [],
    low: [],
    warehouses: [],
    warehouseCards: [],
    items: [],
    entries: [],
    filterWarehouse: '',
    entryStatus: '',
    search: '',
    lines: [],
  },
  chat: {
    open: false,
    pane: 'list',          // list | thread | new | newgroup
    list: [],
    activeId: null,
    messages: [],
    lastAt: null,
    unread: 0,
    directory: [],
    picked: [],
    groupTitle: '',
    search: '',
    draft: '',
    replyTo: null,
    editing: null,
    loading: false,
    focusComposer: false,
    timer: null,
  },
  recurrences: [],
  logs: [],
  scores: [],
  filterMine: true,
  filterLabel: '',
  search: '',
  loading: false,
};

function toast(message, kind = '') {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2800);
  setTimeout(() => el.remove(), 3200);
}

async function guard(fn, { silent = false } = {}) {
  try { return await fn(); } catch (err) {
    if (err.status === 401) { state.user = null; render(); return null; }
    if (!silent) toast(err.message || 'خطا رخ داد', 'err');
    return null;
  }
}

/** آیا کاربر جاری این دسترسی را دارد؟ */
const can = (key) => !!state.user && (state.user.role === 'admin'
  || (state.user.perms || []).includes(key));


// ───────────────────────────── ورود ─────────────────────────────

function loginView() {
  return `
  <div class="login-wrap">
    <form class="login-card" data-form="login">
      <div class="login-logo">ک</div>
      <h1>ورود به کارنما</h1>
      <p class="sub">سامانهٔ مدیریت کار، ساعت کاری و عملکرد</p>
      <div class="field">
        <label for="lg-user">نام کاربری</label>
        <input class="input" id="lg-user" name="username" autocomplete="username"
               dir="ltr" required placeholder="username">
      </div>
      <div class="field">
        <label for="lg-pass">رمز عبور</label>
        <input class="input" id="lg-pass" name="password" type="password"
               autocomplete="current-password" dir="ltr" required placeholder="••••••••">
      </div>
      <button class="btn block" type="submit" style="margin-top:8px">ورود</button>
      ${API.mode === 'demo' ? `
      <div class="hint" style="margin-top:16px;background:var(--brand-soft);border-radius:10px;padding:11px 13px;color:var(--brand)">
        <b>نسخهٔ نمایشی</b> — برای دیدن داشبورد مدیر با <b dir="ltr">modir</b> و برای داشبورد کارمند با
        <b dir="ltr">sara</b> وارد شوید (رمز عبور هرچه باشد قبول است).
      </div>` : `
      <p class="hint" style="text-align:center;margin-top:14px">
        اگر رمز عبور ندارید از مدیر سامانه بخواهید برایتان حساب بسازد.
      </p>`}
    </form>
  </div>`;
}

// ───────────────────────────── پوسته ─────────────────────────────

// هر بخش پنل با یک دسترسی باز می‌شود؛ اگر کاربر آن را نداشته باشد، بخش برایش نمایش داده نمی‌شود.
// ترتیب و گروه، هر دو عمدی‌اند. چهارده آیتم پشت سر هم فهرست نیست، دیوار است؛
// با سرگروه، چشم اول گروه را پیدا می‌کند و بعد آیتم را.
const NAV = [
  { id: 'myday', label: 'امروز من', icon: '◉', need: 'tasks.view' },
  { id: 'dashboard', label: 'داشبورد', icon: '▣' },

  { group: 'کارها' },
  { id: 'board', label: 'تخته کارها', icon: '▤', need: 'tasks.view' },
  { id: 'review', label: 'کارتابل بررسی', icon: '✍', need: 'review.do' },
  { id: 'recurring', label: 'کارهای تکراری', icon: '↻', need: 'recurrence.manage' },
  { id: 'workload', label: 'بار کاری تیم', icon: '⚖', need: 'tasks.view_all' },
  // گفت‌وگو صفحه نمی‌شود؛ کشو را باز می‌کند تا کاری که دستتان است از دست نرود
  { id: 'chat', label: 'گفت‌وگو', icon: '✉', need: 'chat.use', drawer: true },

  { group: 'انبار' },
  { id: 'stock', label: 'موجودی و اسناد', icon: '▦', need: 'stock.view' },

  { group: 'زمان و عملکرد' },
  { id: 'time', label: 'ساعت کاری', icon: '◷', needAny: ['time.log', 'time.view_all'] },
  { id: 'approvals', label: 'تأیید ساعات', icon: '✓', need: 'time.approve' },
  { id: 'scores', label: 'امتیاز عملکرد', icon: '★', needAny: ['scores.view_own', 'scores.view_all'] },
  { id: 'unitreport', label: 'گزارش واحدها', icon: '◳', need: 'reports.unit' },

  { group: 'سازمان' },
  // مدیر واحد هم باید بتواند ایست بهره‌وری واحد خودش را ببیند، حتی اگر واحد نسازد
  { id: 'units', label: 'واحدها', icon: '⌂', needAny: ['units.manage', 'units.assign', 'scores.unit', 'scores.view_unit', 'reports.unit'] },
  { id: 'team', label: 'کارکنان', icon: '☷', needAny: ['users.view', 'users.manage'] },
  { id: 'profile', label: 'حساب من', icon: '⚙' },
];

/** فقط آیتم‌های واقعی — نشانگرهای گروه از قلم می‌افتند */
function navItems() {
  return NAV.filter((n) => {
    if (n.group) return false;
    if (n.need) return can(n.need);
    if (n.needAny) return n.needAny.some(can);
    return true;
  });
}

/**
 * منوی کنار با سرگروه. گروهی که هیچ آیتم قابل‌دیدنی ندارد اصلاً چاپ نمی‌شود —
 * وگرنه کاربری که دسترسی انبار ندارد، سرگروه «انبار» را خالی می‌بیند و
 * فکر می‌کند چیزی خراب است.
 */
function navSections() {
  const out = [];
  let current = null;
  for (const n of NAV) {
    if (n.group) { current = { group: n.group, items: [] }; out.push(current); continue; }
    const ok = n.need ? can(n.need) : (n.needAny ? n.needAny.some(can) : true);
    if (!ok) continue;
    if (!current) { current = { group: null, items: [] }; out.push(current); }
    current.items.push(n);
  }
  return out.filter((s) => s.items.length);
}

function pendingBadge() {
  if (!can('time.approve') || !state.stats?.company) return 0;
  return state.stats.company.pending_logs || 0;
}

function shell(inner) {
  const u = state.user;
  const badge = pendingBadge();
  const nav = navSections().map((sec) => `
    ${sec.group ? `<div class="nav-group">${sec.group}</div>` : ''}
    ${sec.items.map((n) => `
      <button class="nav-item ${state.view === n.id ? 'active' : ''}" data-nav="${n.id}">
        <span>${n.icon}</span><span>${n.label}</span>
        ${n.id === 'approvals' && badge ? `<span class="badge-dot">${toFa(badge)}</span>` : ''}
        ${n.id === 'chat' ? `<span data-chat-badge>${chatBadgeHtml(state.chat.unread)}</span>` : ''}
      </button>`).join('')}`).join('');

  // روی موبایل مهم‌ترین‌ها پایین صفحه، بقیه در «بیشتر»
  const items = navItems();
  // کارتابل بررسی برای سرپرست پرکاربردترین صفحه است، پس روی موبایل هم پایین صفحه می‌ماند
  // ترتیب عمدی است، نه ترتیب منوی کنار: کارتابل بررسی و گفت‌وگو پرکاربردترین‌های
  // روزمره‌اند و باید روی موبایل یک لمس دور باشند، نه پشت «بیشتر».
  const MOBILE_ORDER = ['myday', 'board', 'chat', 'review', 'approvals', 'time', 'dashboard'];
  const primary = MOBILE_ORDER.map((mid) => items.find((n) => n.id === mid)).filter(Boolean).slice(0, 4);
  const mobile = primary.map((n) => `
    <button class="${state.view === n.id ? 'active' : ''}" data-nav="${n.id}">
      <span class="ic">${n.icon}</span><span>${n.label}</span>
      ${n.id === 'approvals' && badge ? `<span class="badge-dot">${toFa(badge)}</span>` : ''}
      ${n.id === 'chat' ? `<span data-chat-badge>${chatBadgeHtml(state.chat.unread)}</span>` : ''}
    </button>`).join('') + `
    <button class="${primary.some((p) => p.id === state.view) ? '' : 'active'}" data-action="more-menu">
      <span class="ic">☰</span><span>بیشتر</span>
      ${state.unread ? `<span class="badge-dot">${toFa(state.unread)}</span>` : ''}
    </button>`;

  const title = NAV.find((n) => n.id === state.view)?.label || 'کارنما';

  return `
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div class="mark">ک</div>
        <div>
          <div class="name">کارنما</div>
          <div class="org">${esc(u.company_name || '')}</div>
        </div>
      </div>
      ${nav}
      <div class="nav-spacer"></div>
      <div class="sidebar-user">
        <div class="avatar">${esc(initials(u.full_name))}</div>
        <div class="meta">
          <b>${esc(u.full_name)}</b>
          <span>${u.role === 'member' ? esc(u.job_title || 'کارمند') : 'مدیر'}</span>
        </div>
        <button class="x-btn" data-action="logout" title="خروج" style="margin-inline-start:auto;color:var(--sidebar-ink)">⎋</button>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <h2>${title}</h2>
        <div class="spacer"></div>
        ${['dashboard', 'time', 'approvals', 'scores'].includes(state.view) ? monthPicker() : ''}
        ${can('chat.use') ? `
        <button class="bell chat-btn" data-action="chat-toggle" title="گفت‌وگو">
          ✉<span data-chat-badge>${chatBadgeHtml(state.chat.unread)}</span>
        </button>` : ''}
        <button class="bell ${state.unread ? 'has' : ''}" data-action="bell" title="اعلان‌ها">
          🔔${state.unread ? `<i>${toFa(state.unread)}</i>` : ''}
        </button>
        <button class="user-chip" data-nav="profile" title="حساب من">
          <span class="avatar sm">${esc(initials(u.full_name))}</span>
          <span class="who">
            <b>${esc(u.full_name)}</b>
            <small>${esc(u.job_title || u.company_name || '')}</small>
          </span>
          <span class="caret">⌄</span>
        </button>
      </header>
      <div class="content">${inner}</div>
    </div>
  </div>
  <nav class="mobile-nav">${mobile}</nav>`;
}

function monthPicker() {
  if (!state.month) return '';
  const { jy, jm } = state.month;
  const years = [jy - 1, jy, jy + 1];
  return `
    <div class="row" style="flex:0 0 auto;gap:7px">
      <select class="select" data-action="month" style="flex:0 0 auto;width:auto;padding:7px 10px">
        ${MONTH_NAMES.map((m, i) => `<option value="${i + 1}" ${i + 1 === jm ? 'selected' : ''}>${m}</option>`).join('')}
      </select>
      <select class="select" data-action="year" style="flex:0 0 auto;width:auto;padding:7px 10px">
        ${years.map((y) => `<option value="${y}" ${y === jy ? 'selected' : ''}>${toFa(y)}</option>`).join('')}
      </select>
    </div>`;
}

// ───────────────────────────── امروز من ─────────────────────────────

function mydayView() {
  const d = state.myday;
  if (!d) return `<div class="card"><div class="empty">در حال بارگذاری…</div></div>`;
  const g = d.groups;
  const hi = state.user.full_name.split(/\s+/)[0];
  const target = state.user.monthly_target ? Math.round(state.user.monthly_target / 22 * 10) / 10 : 8;

  const section = (key, title, hint, tone) => {
    const list = g[key] || [];
    if (!list.length) return '';
    return `
      <div class="card day-sec ${tone || ''}">
        <header>
          <h3>${title}</h3>
          <span class="chip ${tone === 'danger' ? 'danger' : tone === 'warn' ? 'warn' : ''}">${toFa(list.length)}</span>
          <div class="spacer"></div>
          ${hint ? `<span class="small muted">${hint}</span>` : ''}
        </header>
        <div class="col-body">${list.map((t) => taskCard(t, null, 'day')).join('')}</div>
      </div>`;
  };

  const nothing = d.total === 0;
  return `
    <div class="hello">
      <div>
        <h3>${esc(hi)} عزیز، ${formatJalali(d.today, { long: true, withDay: true })}</h3>
        <p class="muted small">
          ${nothing ? 'کار بازی به شما سپرده نشده است.'
    : `${toFa(d.total)} کار باز دارید${g.overdue.length ? ` — ${toFa(g.overdue.length)} مورد از مهلت گذشته` : ''}.`}
        </p>
      </div>
      <div class="hello-today">
        <div class="label">ساعت ثبت‌شدهٔ امروز</div>
        <div class="value">${fh(d.logged_today)}<small> از ${fh(target)}</small></div>
        <div class="progress ${d.logged_today >= target ? 'ok' : 'warn'}">
          <i style="width:${Math.min(100, Math.round((d.logged_today / target) * 100))}%"></i></div>
        ${can('time.log') ? '<button class="btn sm block" data-action="quick-log" style="margin-top:9px">ثبت ساعت امروز</button>' : ''}
      </div>
    </div>

    ${section('overdue', 'از مهلت گذشته', 'اینها را اول تعیین تکلیف کنید', 'danger')}
    ${section('today', 'سررسید امروز', '', 'warn')}
    ${section('doing', 'در حال انجام', 'کاری که شروع کرده‌اید', '')}
    ${section('soon', 'تا سه روز آینده', '', '')}
    ${section('later', 'بعداً', '', '')}

    ${nothing ? `<div class="card"><div class="empty">
      کار بازی ندارید. اگر منتظر کار هستید به مدیرتان بگویید، یا از تخته کارها یک کار بردارید.
    </div></div>` : ''}`;
}

// ───────────────────────────── واحدهای سازمانی ─────────────────────────────

/** واحدها را به‌صورت درخت مرتب می‌کند تا تودرتویی دیده شود */
function unitTree(units) {
  const byParent = new Map();
  for (const u of units) {
    const k = u.parent_id || '';
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(u);
  }
  const out = [];
  const walk = (parent, depth) => {
    for (const u of byParent.get(parent) || []) {
      out.push({ ...u, depth });
      if (depth < 6) walk(u.id, depth + 1);
    }
  };
  walk('', 0);
  // واحدهایی که والدشان دیده نشده (مثلاً بایگانی‌شده) هم از قلم نیفتند
  for (const u of units) if (!out.some((x) => x.id === u.id)) out.push({ ...u, depth: 0 });
  return out;
}

function unitsView() {
  const tree = unitTree(state.units);
  const canEdit = can('units.manage');
  return `
    <div class="card">
      <header>
        <h3>واحدهای سازمانی</h3>
        <div class="spacer"></div>
        ${canEdit ? '<button class="btn new sm" data-action="new-unit">+ واحد جدید</button>' : ''}
      </header>
      <p class="hint" style="margin:-8px 0 14px">
        کار اول به یک واحد سپرده می‌شود، بعد مدیر واحد بین افراد تقسیمش می‌کند.
        واحدها می‌توانند تودرتو باشند — مثلاً «تولید» زیرمجموعهٔ «کارخانه».
      </p>
      ${tree.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>واحد</th><th>مدیر واحد</th><th class="num">نفرات</th>
            <th class="num">کار باز</th><th></th></tr></thead>
          <tbody>
            ${tree.map((un) => `
              <tr>
                <td>
                  <span style="display:inline-block;width:${un.depth * 18}px"></span>
                  <span class="dot" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${esc(un.color || '#387F81')};margin-inline-end:7px"></span>
                  <b>${esc(un.name)}</b>
                  ${un.depth ? `<span class="muted small"> زیرمجموعهٔ ${esc(un.parent_name || '')}</span>` : ''}
                </td>
                <td class="${un.manager_name ? '' : 'muted'} small">
                  ${un.manager_name ? esc(un.manager_name) : 'تعیین نشده'}</td>
                <td class="num">${toFa(un.headcount)}</td>
                <td class="num">${toFa(un.open_tasks)}</td>
                <td style="display:flex;gap:6px">
                  <button class="btn ghost sm" data-action="unit-prod" data-id="${un.id}">بهره‌وری</button>
                  ${canEdit ? `<button class="btn ghost sm" data-action="edit-unit" data-id="${un.id}">ویرایش</button>` : ''}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `<div class="empty">
        هنوز واحدی تعریف نشده است. اول واحدها را بسازید، بعد افراد را به آنها اختصاص دهید.
      </div>`}
    </div>`;
}

function unitFormModal(unit = null) {
  const others = state.units.filter((u) => !unit || u.id !== unit.id);
  openModal(unit ? `ویرایش ${esc(unit.name)}` : 'واحد جدید', `
    <form data-form="unit" data-id="${unit?.id || ''}">
      <div class="field"><label>نام واحد</label>
        <input class="input" name="name" required value="${esc(unit?.name || '')}"
               placeholder="مثلاً: کنترل کیفیت"></div>
      <div class="row">
        <div class="field"><label>واحد بالادست</label>
          <select class="select" name="parent_id">
            <option value="">— بالاترین سطح —</option>
            ${others.map((o) => `<option value="${o.id}" ${unit?.parent_id === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}
          </select></div>
        <div class="field"><label>رنگ</label>
          <input type="color" name="color" class="input" style="padding:3px;height:40px"
                 value="${esc(unit?.color || '#387F81')}"></div>
      </div>
      <div class="field"><label>مدیر واحد</label>
        <select class="select" name="manager_id">
          <option value="">— تعیین نشده —</option>
          ${state.users.filter((u) => u.is_active).map((u) => `
            <option value="${u.id}" ${unit?.manager_id === u.id ? 'selected' : ''}>${esc(u.full_name)}</option>`).join('')}
        </select>
        <p class="hint">مدیر واحد کار را بین اعضا تقسیم می‌کند و نتیجهٔ کارشان را بررسی و امتیازدهی می‌کند.</p></div>
      <button class="btn block" type="submit">${unit ? 'ذخیره' : 'ساخت واحد'}</button>
      ${unit ? `<button class="btn ghost block" type="button" data-action="archive-unit" data-id="${unit.id}" style="margin-top:8px">بایگانی کردن واحد</button>` : ''}
    </form>`);
}

/** ایست بهره‌وری واحد — جایی که کارهای تأییدشدهٔ واحد جمع می‌شود */
function unitProdView() {
  const d = state.unitView;
  if (!d) return '<div class="card"><div class="empty">در حال بارگذاری…</div></div>';
  const s = d.summary;
  const giveScore = can('scores.unit');
  const us = d.unit_score;
  return `
    <div class="card">
      <header>
        <button class="btn ghost sm" data-action="back-units">→ واحدها</button>
        <h3 style="margin-inline-start:8px">بهره‌وری ${esc(d.unit.name)}</h3>
        <div class="spacer"></div>
        <span class="small muted">${toFa(d.month.jm)}/${toFa(d.month.jy)}</span>
      </header>
      <div class="kpis">
        <div class="kpi"><span>کار تأییدشده</span><b>${toFa(s.approved)}</b></div>
        <div class="kpi"><span>برگشتی</span><b class="${s.returned ? 'danger' : ''}">${toFa(s.returned)}</b></div>
        <div class="kpi"><span>نرخ بازکاری</span><b class="${s.rework_rate > 20 ? 'danger' : ''}">${toFa(s.rework_rate)}٪</b></div>
        <div class="kpi"><span>میانگین امتیاز کارها</span><b>${s.avg_score === null ? '—' : toFa(s.avg_score)}</b></div>
        <div class="kpi"><span>سر وقت</span><b>${s.on_time_pct === null ? '—' : `${toFa(s.on_time_pct)}٪`}</b></div>
        <div class="kpi"><span>نفرات</span><b>${toFa(s.headcount)}</b></div>
      </div>
    </div>

    <div class="card">
      <header><h3>امتیاز واحد در این ماه</h3>
        <div class="spacer"></div>
        ${us ? `<span class="chip ${us.score >= 80 ? 'ok' : us.score >= 60 ? 'warn' : 'danger'}">${toFa(us.score)}</span>` : '<span class="chip">ثبت نشده</span>'}
      </header>
      ${us && us.note ? `<p class="small" style="margin:-4px 0 12px">${esc(us.note)}</p>` : ''}
      ${giveScore ? `
      <form data-form="unit-score" data-id="${d.unit.id}">
        <div class="field"><label>امتیاز واحد <b data-out="us-out">${toFa(us ? us.score : 70)}</b></label>
          <input type="range" name="score" min="0" max="100" step="5" value="${us ? us.score : 70}"
                 data-slider data-out-id="us-out" style="width:100%"></div>
        <div class="field"><label>توضیح</label>
          <textarea class="textarea" name="note" rows="2"
            placeholder="برای امتیاز بالاتر از ${toFa(JUSTIFY_ABOVE)} توضیح اجباری است">${esc(us?.note || '')}</textarea></div>
        <button class="btn block" type="submit">ثبت امتیاز واحد</button>
      </form>
      <p class="hint" style="margin-top:10px">
        امتیاز شما به کل واحد داده می‌شود، نه به افراد. تقسیم کار و قضاوت فردی کار مدیر واحد است.
      </p>` : `<p class="hint">امتیاز واحد را مدیر ارشد ثبت می‌کند.</p>`}
    </div>

    <div class="card">
      <header><h3>عملکرد اعضا در این ماه</h3>
        <div class="spacer"></div><span class="small muted">خودکار از امتیاز کارهای تأییدشده</span></header>
      ${d.people.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>عضو</th><th class="num">امتیاز ماه</th><th class="num">کار تأییدشده</th>
            <th class="num">برگشتی</th><th class="num">سر وقت</th><th class="num">وزن کارها</th></tr></thead>
          <tbody>
            ${d.people.map((p) => `
              <tr>
                <td><div class="who"><span class="av">${esc(initials(p.full_name))}</span>
                  <div><b>${esc(p.full_name)}</b><br><span class="muted small">${esc(p.job_title || '—')}</span></div></div></td>
                <td class="num">${p.score === null ? '<span class="muted">—</span>'
    : `<b class="${p.score >= 80 ? 'ok' : p.score >= 60 ? '' : 'danger'}">${toFa(p.score)}</b>`}</td>
                <td class="num">${toFa(p.tasks)}</td>
                <td class="num">${p.returns ? `<span class="chip danger">${toFa(p.returns)}</span>` : '—'}</td>
                <td class="num">${p.on_time_pct === null ? '—' : `${toFa(p.on_time_pct)}٪`}</td>
                <td class="num">${fh(p.weight)} ساعت</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<div class="empty">عضوی به این واحد اختصاص داده نشده است.</div>'}
    </div>

    <div class="card">
      <header><h3>سابقهٔ بررسی‌ها</h3>
        <div class="spacer"></div><span class="small muted">${toFa(d.reviews.length)} رکورد</span></header>
      ${d.reviews.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>کار</th><th>انجام‌دهنده</th><th>بررسی‌کننده</th>
            <th class="num">امتیاز</th><th>وضعیت</th><th>یادداشت</th></tr></thead>
          <tbody>
            ${d.reviews.map((r) => `
              <tr>
                <td><span class="t-code">#${toFa(r.task_code)}</span> ${esc(r.task_title)}</td>
                <td class="small">${esc(r.assignee_name || '—')}</td>
                <td class="small">${esc(r.reviewer_name || '—')}</td>
                <td class="num">${r.score === null ? '—' : toFa(r.score)}</td>
                <td>${r.decision === 'approved'
    ? `<span class="chip ok">تأیید</span>${r.on_time === 0 ? '<span class="chip danger">با تأخیر</span>' : ''}`
    : '<span class="chip danger">برگشت</span>'}</td>
                <td class="small muted">${esc(r.justification || r.comment || '—')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<div class="empty">در این ماه کاری بررسی نشده است.</div>'}
    </div>`;
}

/** گزارش تفصیلی ماهانهٔ واحدها — با نشانه‌های تورم امتیاز */
function unitReportView() {
  const d = state.unitReport;
  if (!d) return '<div class="card"><div class="empty">در حال بارگذاری…</div></div>';
  const rows = d.units;
  return `
    <div class="card">
      <header><h3>گزارش ماهانهٔ واحدها</h3><div class="spacer"></div>
        <span class="small muted">${toFa(d.month.jm)}/${toFa(d.month.jy)}</span></header>
      <div class="table-wrap">
        <table>
          <thead><tr><th>واحد</th><th>مدیر</th><th class="num">نفرات</th><th class="num">تأیید</th>
            <th class="num">برگشت</th><th class="num">بازکاری</th><th class="num">میانگین</th>
            <th class="num">سر وقت</th><th class="num">ساعت</th><th class="num">امتیاز واحد</th><th></th></tr></thead>
          <tbody>
            ${rows.map((r) => `
              <tr>
                <td><span class="dot" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${esc(r.unit.color || '#387F81')};margin-inline-end:7px"></span><b>${esc(r.unit.name)}</b></td>
                <td class="small ${r.unit.manager_name ? '' : 'muted'}">${esc(r.unit.manager_name || 'تعیین نشده')}</td>
                <td class="num">${toFa(r.headcount)}</td>
                <td class="num">${toFa(r.approved)}</td>
                <td class="num">${r.returned ? toFa(r.returned) : '—'}</td>
                <td class="num ${r.rework_rate > 20 ? 'danger' : ''}">${toFa(r.rework_rate)}٪</td>
                <td class="num">${r.avg_score === null ? '—' : toFa(r.avg_score)}</td>
                <td class="num">${r.on_time_pct === null ? '—' : `${toFa(r.on_time_pct)}٪`}</td>
                <td class="num">${fh(r.approved_hours)}</td>
                <td class="num">${r.unit_score === null ? '<span class="muted">—</span>' : `<b>${toFa(r.unit_score)}</b>`}</td>
                <td><button class="btn ghost sm" data-action="unit-prod" data-id="${r.unit.id}">جزئیات</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${rows.every((r) => !r.approved && !r.returned)
    ? '<div class="empty">در این ماه هنوز کاری بررسی نشده است.</div>' : ''}
    </div>

    <div class="card">
      <header><h3>رفتار امتیازدهی سرپرستان</h3><div class="spacer"></div>
        <span class="small muted">برای سنجش صحت امتیازها</span></header>
      <p class="hint" style="margin:-8px 0 14px">
        ستون «امتیاز بالا» نشان می‌دهد چند درصد امتیازهای این سرپرست بالاتر از ${toFa(d.justify_above)} بوده است.
        ستون «بالا ولی دیر» کارهایی است که با تأخیر تحویل شده‌اند ولی امتیاز بالا گرفته‌اند — هر عددی جز صفر
        اینجا یعنی آن امتیاز را باید از نزدیک دید.
      </p>
      ${rows.some((r) => r.reviewers.length) ? rows.filter((r) => r.reviewers.length).map((r) => `
        <h4 style="margin:14px 0 6px">${esc(r.unit.name)}</h4>
        <div class="table-wrap">
          <table>
            <thead><tr><th>سرپرست</th><th class="num">تعداد</th><th class="num">میانگین</th>
              <th class="num">کمینه</th><th class="num">بیشینه</th><th class="num">امتیاز بالا</th>
              <th class="num">بالا ولی دیر</th></tr></thead>
            <tbody>
              ${r.reviewers.map((v) => `
                <tr>
                  <td>${esc(v.name)}</td>
                  <td class="num">${toFa(v.count)}</td>
                  <td class="num"><b>${toFa(v.avg_score)}</b></td>
                  <td class="num">${toFa(v.min_score)}</td>
                  <td class="num">${toFa(v.max_score)}</td>
                  <td class="num ${v.top_share > 60 ? 'danger' : ''}">${toFa(v.top_share)}٪</td>
                  <td class="num">${v.late_but_scored_high
    ? `<span class="chip danger">${toFa(v.late_but_scored_high)}</span>` : '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`).join('') : '<div class="empty">امتیازی ثبت نشده است.</div>'}
    </div>`;
}

// ───────────────────────────── بار کاری تیم ─────────────────────────────

function workloadView() {
  const w = state.workload;
  if (!w) return `<div class="card"><div class="empty">در حال بارگذاری…</div></div>`;
  const maxEst = Math.max(1, ...w.team.map((t) => t.estimate_h));
  return `
    <div class="card">
      <header><h3>بار کاری تیم</h3><div class="spacer"></div>
        <span class="small muted">بر اساس کارهای باز و برآورد ساعت</span></header>
      <div class="table-wrap">
        <table>
          <thead><tr><th>کارمند</th><th>بار کاری</th><th class="num">کار باز</th>
            <th class="num">برآورد</th><th class="num">عقب‌افتاده</th><th class="num">فوری</th>
            <th class="num">راکد</th></tr></thead>
          <tbody>
            ${w.team.map((t) => `
              <tr>
                <td><div class="who"><span class="av">${esc(initials(t.full_name))}</span>
                  <div><b>${esc(t.full_name)}</b><br><span class="muted small">${esc(t.job_title || '—')}</span></div></div></td>
                <td style="min-width:140px">
                  <div class="progress ${t.estimate_h > maxEst * 0.8 ? 'warn' : 'ok'}" style="width:120px">
                    <i style="width:${Math.round((t.estimate_h / maxEst) * 100)}%"></i></div></td>
                <td class="num"><b>${toFa(t.open_tasks)}</b></td>
                <td class="num">${fh(t.estimate_h)} ساعت</td>
                <td class="num">${t.overdue ? `<span class="chip danger">${toFa(t.overdue)}</span>` : '—'}</td>
                <td class="num">${t.hot ? `<span class="chip warn">${toFa(t.hot)}</span>` : '—'}</td>
                <td class="num">${t.stale ? `<span class="chip" title="بیش از ۷ روز تغییری نکرده">${toFa(t.stale)}</span>` : '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="hint" style="margin-top:12px">
        «راکد» یعنی کاری که در ستون «در حال انجام» است ولی بیش از ۷ روز هیچ تغییری نکرده — معمولاً یعنی جایی گیر کرده.
      </p>
    </div>

    ${w.unassigned.length ? `
    <div class="card">
      <header><h3>کارهای بدون مسئول</h3>
        <span class="chip warn">${toFa(w.unassigned.length)}</span></header>
      <div class="col-body">${w.unassigned.map((t) => taskCard(t, null, 'day')).join('')}</div>
    </div>` : ''}`;
}

// ───────────────────────────── کارتابل بررسی ─────────────────────────────

/** حقایق ثبت‌شدهٔ یک کار، تا قضاوت سرپرست بر مبنای واقعیت باشد نه حافظه */
function factChips(f) {
  if (!f) return '';
  const bits = [];
  if (f.on_time === 1) bits.push('<span class="chip ok">سر وقت</span>');
  if (f.on_time === 0) bits.push(`<span class="chip danger">با تأخیر — مهلت ${formatJalali(f.due_date)}</span>`);
  if (f.checklist_pct !== null) {
    bits.push(`<span class="chip ${f.checklist_pct === 100 ? 'ok' : 'warn'}">چک‌لیست ${toFa(f.checklist_pct)}٪</span>`);
  }
  if (f.return_count) bits.push(`<span class="chip danger">${toFa(f.return_count)} بار برگشته</span>`);
  if (f.estimate_h) {
    const over = f.logged_h > f.estimate_h * 1.25;
    bits.push(`<span class="chip ${over ? 'warn' : ''}">${fh(f.logged_h)} از ${fh(f.estimate_h)} ساعت</span>`);
  }
  return `<div class="t-meta" style="margin-top:8px">${bits.join('')}</div>`;
}

function reviewView() {
  const list = state.reviewQueue;
  return `
    <div class="card">
      <header>
        <h3>کارتابل بررسی</h3>
        ${list.length ? `<span class="chip warn">${toFa(list.length)}</span>` : ''}
        <div class="spacer"></div>
        <span class="small muted">فقط کار زیردستان مستقیم و اعضای واحد شما</span>
      </header>
      <p class="hint" style="margin:-8px 0 14px">
        امتیاز بالاتر از ${toFa(JUSTIFY_ABOVE)} بدون نوشتن دلیل ثبت نمی‌شود.
        امتیازی که اینجا می‌دهید مستقیم در امتیاز ماهانهٔ آن فرد می‌نشیند.
      </p>
      ${list.length ? list.map((t) => `
        <div class="review-card">
          <div class="t-top">
            <span class="prio ${t.priority}"></span>
            <span class="t-code">#${toFa(t.code)}</span>
            ${t.unit_name ? `<span class="chip" style="background:${esc(t.unit_color || '#387F81')};color:#fff">${esc(t.unit_name)}</span>` : ''}
            <span class="who" style="margin-inline-start:auto">
              <span class="av">${esc(initials(t.assignee_name))}</span>${esc(t.assignee_name || '—')}</span>
          </div>
          <div class="t-title" data-action="open-task" data-id="${t.id}">${esc(t.title)}</div>
          ${factChips(t.facts)}
          <form data-form="review" data-id="${t.id}" class="review-form">
            <div class="row" style="gap:8px;align-items:flex-end">
              <div class="field" style="flex:1 1 150px;margin:0">
                <label>امتیاز این کار <b data-out="sc-${t.id}">۷۵</b></label>
                <input type="range" name="score" min="0" max="100" step="5" value="75"
                       data-slider data-out-id="sc-${t.id}" style="width:100%">
              </div>
              <button class="btn ok sm" type="submit" data-decision="approved" style="flex:0 0 auto">تأیید</button>
              <button class="btn ghost sm" type="button" data-action="return-task" data-id="${t.id}" style="flex:0 0 auto">برگرداندن</button>
            </div>
            <input type="hidden" name="decision" value="approved">
            <div class="field" style="margin:9px 0 0">
              <textarea class="textarea" name="justification" rows="2"
                placeholder="دلیل امتیاز (برای بالاتر از ${toFa(JUSTIFY_ABOVE)} اجباری است)"></textarea>
            </div>
          </form>
        </div>`).join('')
    : '<div class="empty">کاری در انتظار بررسی شما نیست ✓</div>'}
    </div>`;
}

// ───────────────────────────── داشبورد ─────────────────────────────

function dashboardView() {
  const s = state.stats;
  if (!s) return `<div class="card"><div class="empty">در حال بارگذاری…</div></div>`;
  return s.team ? managerDashboard(s) : memberDashboard(s);
}

function memberDashboard(s) {
  const me = s.me;
  const target = me.monthly_target || 0;
  const pct = target ? Math.min(100, Math.round((me.approved_hours / target) * 100)) : 0;
  const scoreCard = me.score === null
    ? `<div class="value" style="font-size:19px;color:var(--faint)">ثبت نشده</div>
       <div class="foot">امتیاز این ماه هنوز توسط مدیر ثبت نشده است</div>`
    : `<div class="value">${toFa(me.score)}<small> از ۱۰۰</small></div>
       <div class="progress ${me.score >= 80 ? 'ok' : me.score >= 60 ? 'warn' : ''}"><i style="width:${me.score}%"></i></div>`;

  return `
    <div class="stat-grid">
      <div class="stat ok">
        <div class="label">ساعات تأییدشدهٔ ${monthLabel(s.month.jy, s.month.jm)}</div>
        <div class="value">${fh(me.approved_hours)}<small> ساعت</small></div>
        <div class="progress ${pct >= 100 ? 'ok' : 'warn'}"><i style="width:${pct}%"></i></div>
        <div class="foot">${toFa(pct)}٪ از سقف ${fh(target)} ساعت</div>
      </div>
      <div class="stat warn">
        <div class="label">در انتظار تأیید مدیر</div>
        <div class="value">${fh(me.pending_hours)}<small> ساعت</small></div>
        <div class="foot">${me.rejected_hours ? `${fh(me.rejected_hours)} ساعت رد شده` : 'بدون مورد رد شده'}</div>
      </div>
      <div class="stat">
        <div class="label">کارهای باز من</div>
        <div class="value">${toFa(me.open_tasks)}</div>
        <div class="foot">${toFa(me.done_tasks)} کار در این ماه انجام شد</div>
      </div>
      <div class="stat ${me.score === null ? '' : me.score >= 80 ? 'ok' : 'warn'}">
        <div class="label">امتیاز عملکرد</div>
        ${scoreCard}
      </div>
    </div>

    ${can('time.log') ? `
    <div class="card">
      <header><h3>ثبت سریع ساعت کاری</h3></header>
      ${timeLogForm()}
    </div>` : ''}

    ${can('tasks.view') ? `
    <div class="card">
      <header>
        <h3>کارهای من</h3>
        <div class="spacer"></div>
        <button class="btn ghost sm" data-nav="board">تخته کارها</button>
      </header>
      ${myTasksList()}
    </div>` : ''}

    <div class="card">
      <header><h3>روند ۶ ماه اخیر</h3></header>
      ${trendChart(s.trend)}
    </div>`;
}

function managerDashboard(s) {
  const c = s.company;
  return `
    <div class="stat-grid">
      <div class="stat">
        <div class="label">کارکنان فعال</div>
        <div class="value">${toFa(c.headcount)}</div>
        <div class="foot">${toFa(c.open_tasks)} کار باز در تخته</div>
      </div>
      <div class="stat ${c.pending_logs ? 'warn' : 'ok'}">
        <div class="label">در انتظار تأیید شما</div>
        <div class="value">${toFa(c.pending_logs)}<small> رکورد</small></div>
        <div class="foot">${fh(c.pending_hours)} ساعت ثبت‌شده</div>
      </div>
      <div class="stat ${c.overdue_tasks ? 'danger' : 'ok'}">
        <div class="label">کارهای عقب‌افتاده</div>
        <div class="value">${toFa(c.overdue_tasks)}</div>
        <div class="foot">${toFa(c.unassigned_tasks)} کار بدون مسئول</div>
      </div>
      <div class="stat ok">
        <div class="label">میانگین امتیاز تیم</div>
        <div class="value">${c.avg_score === null ? '—' : toFa(c.avg_score)}${c.avg_score === null ? '' : '<small> از ۱۰۰</small>'}</div>
        <div class="foot">${fh(c.approved_hours)} ساعت تأییدشده در این ماه</div>
      </div>
    </div>

    <div class="card">
      <header>
        <h3>عملکرد تیم — ${monthLabel(s.month.jy, s.month.jm)}</h3>
        <div class="spacer"></div>
        <button class="btn new sm" data-action="new-task">+ کار جدید</button>
      </header>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>کارمند</th><th>سمت</th>
            <th class="num">ساعات تأییدشده</th><th class="num">در انتظار</th>
            <th class="num">کار باز</th><th class="num">انجام‌شده</th>
            <th class="num">امتیاز</th><th></th>
          </tr></thead>
          <tbody>
            ${s.team.length ? s.team.map((m) => {
    const pct = m.monthly_target ? Math.min(100, Math.round((m.approved_hours / m.monthly_target) * 100)) : 0;
    return `<tr>
              <td>
                <div class="who"><span class="av">${esc(initials(m.full_name))}</span>${esc(m.full_name)}</div>
              </td>
              <td class="muted small">${esc(m.job_title || '—')}</td>
              <td class="num">
                <b>${fh(m.approved_hours)}</b> <span class="muted small">/ ${fh(m.monthly_target)}</span>
                <div class="progress ${pct >= 90 ? 'ok' : pct >= 50 ? 'warn' : ''}" style="width:92px">
                  <i style="width:${pct}%"></i></div>
              </td>
              <td class="num">${m.pending_hours ? `<span class="chip warn">${fh(m.pending_hours)}</span>` : '—'}</td>
              <td class="num">${toFa(m.open_tasks)}</td>
              <td class="num">${toFa(m.done_tasks)}</td>
              <td class="num">${m.score === null
    ? '<span class="chip">ثبت نشده</span>'
    : `<span class="chip ${m.score >= 80 ? 'ok' : m.score >= 60 ? 'warn' : 'danger'}">${toFa(m.score)}</span>`}</td>
              <td><button class="btn ghost sm" data-action="score-user" data-id="${m.id}">ثبت امتیاز</button></td>
            </tr>`;
  }).join('') : `<tr><td colspan="8" class="empty">هنوز کارمندی اضافه نشده است</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <header><h3>روند ۶ ماه اخیر (ساعات تأییدشدهٔ شما)</h3></header>
      ${trendChart(s.trend)}
    </div>`;
}

function trendChart(trend = []) {
  const max = Math.max(1, ...trend.map((t) => t.hours));
  return `<div class="bars">
    ${trend.map((t) => `
      <div class="b" title="${monthLabel(t.jy, t.jm)}">
        <b>${t.hours ? fh(t.hours) : ''}</b>
        <i style="height:${Math.round((t.hours / max) * 100)}%"></i>
        <span>${MONTH_NAMES[t.jm - 1].slice(0, 6)}</span>
      </div>`).join('')}
  </div>`;
}

function myTasksList() {
  if (!state.board) return `<div class="empty">در حال بارگذاری…</div>`;
  const cols = Object.fromEntries(state.board.columns.map((c) => [c.id, c]));
  const mine = state.board.tasks
    .filter((t) => t.assignee_id === state.user.id && cols[t.column_id]?.kind !== 'done')
    .slice(0, 8);
  if (!mine.length) return `<div class="empty">کار بازی به شما سپرده نشده است</div>`;
  return `<div class="col-body">${mine.map((t) => taskCard(t, cols[t.column_id], 'compact')).join('')}</div>`;
}

// ───────────────────────────── تخته کارها ─────────────────────────────

function boardPicker() {
  if (state.boards.length <= 1 && !can('boards.manage')) return '';
  return `
    <div class="board-tabs">
      ${state.boards.map((b) => `
        <button class="board-tab ${b.id === state.boardId ? 'active' : ''}" data-action="pick-board" data-id="${b.id}">
          <span class="dot" style="background:${esc(b.color || '#387F81')}"></span>
          ${esc(b.name)}
          ${b.open_tasks ? `<i>${toFa(b.open_tasks)}</i>` : ''}
        </button>`).join('')}
      ${can('boards.manage') ? '<button class="board-tab add" data-action="new-board">+ پروژه</button>' : ''}
    </div>`;
}

function boardView() {
  const b = state.board;
  if (!b) return `<div class="card"><div class="empty">در حال بارگذاری…</div></div>`;
  const term = state.search.trim().toLowerCase();
  const tasks = b.tasks.filter((t) => {
    if (state.filterMine && t.assignee_id !== state.user.id) return false;
    if (state.filterLabel && !(t.labels || []).some((l) => l.id === state.filterLabel)) return false;
    if (term && !(`${t.title} ${t.description || ''} ${t.assignee_name || ''}`.toLowerCase().includes(term))) return false;
    return true;
  });

  return `
    ${boardPicker()}
    <div class="card toolbar">
      <div class="row" style="align-items:center;gap:8px">
        ${can('tasks.view_all') ? `
        <div class="seg" style="flex:0 0 auto">
          <button class="${state.filterMine ? 'active' : ''}" data-action="filter" data-v="mine">کارهای من</button>
          <button class="${!state.filterMine ? 'active' : ''}" data-action="filter" data-v="all">همه</button>
        </div>` : ''}
        <input class="input" data-action="search" placeholder="جستجو در کارها…"
               value="${esc(state.search)}" style="flex:1 1 170px;max-width:260px;padding:7px 11px">
        ${state.labels.length ? `
        <select class="select" data-action="filter-label" style="flex:0 1 auto;width:auto;padding:7px 10px">
          <option value="">همهٔ برچسب‌ها</option>
          ${state.labels.map((l) => `<option value="${l.id}" ${state.filterLabel === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
        </select>` : ''}
        <div class="spacer" style="flex:1"></div>
        ${can('tasks.create') ? '<button class="btn new sm" data-action="new-task">+ کار جدید</button>' : ''}
        ${can('columns.manage') ? '<button class="btn ghost sm" data-action="new-column">+ ستون</button>' : ''}
        ${can('labels.manage') ? '<button class="btn ghost sm" data-action="manage-labels">برچسب‌ها</button>' : ''}
      </div>
    </div>
    <div class="board">
      ${b.columns.map((col) => {
    const items = tasks.filter((t) => t.column_id === col.id);
    const over = col.wip_limit && items.length > col.wip_limit;
    return `
        <section class="column" data-col="${col.id}">
          <header>
            <span class="dot" style="background:${esc(col.color || '#387F81')}"></span>
            <h4>${esc(col.title)}</h4>
            <span class="count ${over ? 'chip danger' : ''}">${toFa(items.length)}${col.wip_limit ? ` / ${toFa(col.wip_limit)}` : ''}</span>
          </header>
          <div class="col-body" data-drop="${col.id}">
            ${items.length ? items.map((t) => taskCard(t, col, 'board')).join('')
    : `<div class="empty" style="padding:18px 6px;font-size:13px">خالی</div>`}
          </div>
        </section>`;
  }).join('')}
    </div>`;
}

/** mode: 'board' (داخل ستون) | 'day' (امروز من) | 'compact' */
function taskCard(t, col, mode = 'board') {
  const kind = col?.kind || t.column_kind;
  const overdue = t.due_date && t.due_date < todayIso() && kind !== 'done';
  const cols = state.board?.columns || [];
  const colIndex = cols.findIndex((c) => c.id === t.column_id);
  const movable = can('tasks.edit') || (can('tasks.move_own') && t.assignee_id === state.user.id);
  const pct = t.checklist_total ? Math.round((t.checklist_done / t.checklist_total) * 100) : 0;

  return `
  <article class="task ${mode === 'day' ? 'day' : ''}" ${mode === 'board' ? 'draggable="true"' : ''} data-task="${t.id}">
    ${(t.labels || []).length ? `<div class="t-labels">
      ${t.labels.map((l) => `<span class="lbl" style="background:${esc(l.color)}" title="${esc(l.name)}">${esc(l.name)}</span>`).join('')}
    </div>` : ''}
    <div class="t-top">
      <span class="prio ${t.priority}" title="اولویت: ${PRIORITY[t.priority]}"></span>
      <span class="t-code">#${toFa(t.code)}</span>
      ${t.priority === 'urgent' ? '<span class="chip danger">فوری</span>' : ''}
      ${mode === 'day' && t.board_name ? `<span class="chip" style="margin-inline-start:auto">${esc(t.board_name)}</span>` : ''}
      ${mode === 'compact' ? `<span class="chip" style="margin-inline-start:auto">${esc(col?.title || t.column_title || '')}</span>` : ''}
    </div>
    <div class="t-title" data-action="open-task" data-id="${t.id}">${esc(t.title)}</div>

    ${t.checklist_total ? `
    <div class="t-check">
      <div class="progress ${pct === 100 ? 'ok' : ''}"><i style="width:${pct}%"></i></div>
      <span>${toFa(t.checklist_done)}/${toFa(t.checklist_total)}</span>
    </div>` : ''}

    <div class="t-meta">
      ${t.assignee_name
    ? `<span class="who"><span class="av">${esc(initials(t.assignee_name))}</span>${esc(t.assignee_name)}</span>`
    : '<span class="chip">بدون مسئول</span>'}
      ${t.due_date ? `<span class="chip ${overdue ? 'danger' : ''}">${overdue ? '⚠ ' : ''}${formatJalali(t.due_date)}</span>` : ''}
      ${mode === 'day' && t.column_title ? `<span class="chip info">${esc(t.column_title)}</span>` : ''}
      ${t.estimate_h ? `<span class="chip">${fh(t.estimate_h)} ساعت</span>` : ''}
      ${t.logged_hours ? `<span class="chip info">ثبت‌شده ${fh(t.logged_hours)}</span>` : ''}
      ${t.subtask_count ? `<span class="chip">${toFa(t.subtask_count)} زیرکار</span>` : ''}
      ${t.comment_count ? `<span class="chip">💬 ${toFa(t.comment_count)}</span>` : ''}
    </div>

    ${mode === 'compact' ? '' : `
    <div class="t-move">
      ${mode === 'board' ? `
      <button data-action="move" data-id="${t.id}" data-dir="-1" ${!movable || colIndex <= 0 ? 'disabled' : ''} title="ستون قبلی">→</button>` : ''}
      <button data-action="open-task" data-id="${t.id}">جزئیات</button>
      ${mode === 'day' && movable ? `
      <button class="go" data-action="advance" data-id="${t.id}">انتقال به ستون بعد ←</button>` : ''}
      ${mode === 'board' ? `
      <button data-action="move" data-id="${t.id}" data-dir="1" ${!movable || colIndex >= cols.length - 1 ? 'disabled' : ''} title="ستون بعدی">←</button>` : ''}
    </div>`}
  </article>`;
}

// ───────────────────────────── ساعت کاری ─────────────────────────────

function timeLogForm() {
  const today = isoToJalali(todayIso());
  const tasks = (state.board?.tasks || []).filter((t) => can('tasks.view_all') || t.assignee_id === state.user.id);
  return `
  <form data-form="timelog">
    <div class="row">
      <div class="field">
        <label>تاریخ</label>
        <div class="row" style="gap:6px">
          <select class="select" name="jd">
            ${Array.from({ length: jalaliMonthLength(today.jy, today.jm) }, (_, i) => i + 1)
    .map((d) => `<option value="${d}" ${d === today.jd ? 'selected' : ''}>${toFa(d)}</option>`).join('')}
          </select>
          <select class="select" name="jm">
            ${MONTH_NAMES.map((m, i) => `<option value="${i + 1}" ${i + 1 === today.jm ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
          <select class="select" name="jy">
            ${[today.jy - 1, today.jy].map((y) => `<option value="${y}" ${y === today.jy ? 'selected' : ''}>${toFa(y)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field" style="flex:0 1 150px">
        <label>ساعت کارکرد</label>
        <input class="input" name="hours" type="number" step="0.5" min="0.5" max="24" value="8" required>
      </div>
    </div>
    <div class="row">
      <div class="field">
        <label>مربوط به کار (اختیاری)</label>
        <select class="select" name="task_id">
          <option value="">— بدون ارجاع به کار مشخص —</option>
          ${tasks.map((t) => `<option value="${t.id}">#${toFa(t.code)} — ${esc(t.title)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field">
      <label>شرح کار انجام‌شده</label>
      <textarea class="textarea" name="note" rows="2" placeholder="مثلاً: نمونه‌برداری خط ۲ و تنظیم گزارش روزانه"></textarea>
    </div>
    <button class="btn" type="submit">ثبت ساعت کاری</button>
  </form>`;
}

function timeView() {
  const { jy, jm } = state.month;
  const logs = state.logs;
  const totals = logs.reduce((a, l) => {
    a[l.status] = (a[l.status] || 0) + l.hours; return a;
  }, {});
  return `
    <div class="stat-grid">
      <div class="stat ok"><div class="label">تأییدشده</div><div class="value">${fh(totals.approved || 0)}<small> ساعت</small></div></div>
      <div class="stat warn"><div class="label">در انتظار</div><div class="value">${fh(totals.pending || 0)}<small> ساعت</small></div></div>
      <div class="stat danger"><div class="label">رد شده</div><div class="value">${fh(totals.rejected || 0)}<small> ساعت</small></div></div>
      <div class="stat"><div class="label">تعداد روزهای ثبت‌شده</div><div class="value">${toFa(new Set(logs.map((l) => l.work_date)).size)}</div></div>
    </div>

    ${can('time.log') ? `
    <div class="card">
      <header><h3>ثبت ساعت کاری</h3></header>
      ${timeLogForm()}
    </div>` : ''}

    <div class="card">
      <header>
        <h3>سوابق ${monthLabel(jy, jm)}</h3>
        ${can('time.view_all') ? `<div class="spacer"></div>
          <select class="select" data-action="log-user" style="width:auto">
            <option value="">همهٔ کارکنان</option>
            ${state.users.filter((u) => u.is_active).map((u) => `<option value="${u.id}" ${state.logUser === u.id ? 'selected' : ''}>${esc(u.full_name)}</option>`).join('')}
          </select>` : ''}
      </header>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>تاریخ</th>${can('time.view_all') ? '<th>کارمند</th>' : ''}
            <th class="num">ساعت</th><th>شرح</th><th>کار مرتبط</th><th>وضعیت</th><th></th>
          </tr></thead>
          <tbody>
            ${logs.length ? logs.map((l) => `
              <tr>
                <td>${formatJalali(l.work_date)}</td>
                ${can('time.view_all') ? `<td>${esc(l.full_name)}</td>` : ''}
                <td class="num"><b>${fh(l.hours)}</b></td>
                <td class="muted small" style="white-space:normal;max-width:260px">${esc(l.note || '—')}</td>
                <td class="muted small">${l.task_title ? `#${toFa(l.task_code)} ${esc(l.task_title)}` : '—'}</td>
                <td><span class="chip ${STATUS[l.status].chip}">${STATUS[l.status].label}</span></td>
                <td>${l.status !== 'approved' || can('time.approve')
    ? `<button class="btn ghost sm" data-action="del-log" data-id="${l.id}">حذف</button>` : ''}</td>
              </tr>`).join('') : `<tr><td colspan="${can('time.view_all') ? 7 : 6}" class="empty">برای این ماه رکوردی ثبت نشده است</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

function approvalsView() {
  const logs = state.logs.filter((l) => l.status === 'pending');
  return `
    <div class="card">
      <header>
        <h3>ساعات در انتظار تأیید</h3>
        <div class="spacer"></div>
        ${logs.length ? `
          <button class="btn ok sm" data-action="review-all" data-status="approved">تأیید همه</button>
          <button class="btn ghost sm" data-action="review-all" data-status="rejected">رد همه</button>` : ''}
      </header>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>کارمند</th><th>تاریخ</th><th class="num">ساعت</th><th>شرح</th><th>کار مرتبط</th><th></th>
          </tr></thead>
          <tbody>
            ${logs.length ? logs.map((l) => `
              <tr>
                <td><div class="who"><span class="av">${esc(initials(l.full_name))}</span>${esc(l.full_name)}</div></td>
                <td>${formatJalali(l.work_date)}</td>
                <td class="num"><b>${fh(l.hours)}</b></td>
                <td class="muted small" style="white-space:normal;max-width:280px">${esc(l.note || '—')}</td>
                <td class="muted small">${l.task_title ? `#${toFa(l.task_code)} ${esc(l.task_title)}` : '—'}</td>
                <td style="display:flex;gap:6px">
                  <button class="btn ok sm" data-action="review" data-id="${l.id}" data-status="approved">تأیید</button>
                  <button class="btn ghost sm" data-action="review" data-id="${l.id}" data-status="rejected">رد</button>
                </td>
              </tr>`).join('') : `<tr><td colspan="6" class="empty">موردی در انتظار تأیید نیست ✓</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ───────────────────────────── کارکنان ─────────────────────────────

/** وضعیت پل اعلان — تا معلوم باشد اعلان‌ها واقعاً به دست چند نفر می‌رسد */
function notifyBanner() {
  const s = state.notifyStatus;
  if (!s) return '';
  if (s.demo) {
    return `<div class="note-box">
      <b>این نسخهٔ نمایشی است و پیام واقعی نمی‌فرستد.</b>
      در نسخهٔ نصب‌شده روی سرور، اعلان‌های مهم به پیام‌رسان هر نفر هم می‌رود.
    </div>`;
  }
  if (!s.enabled) {
    return `<div class="note-box">
      <b>اعلان‌ها فقط داخل کارنما دیده می‌شوند.</b>
      تا وقتی پل پیام‌رسان روشن نشده، اگر کسی کارنما را باز نکند خبردار نمی‌شود.
      برای روشن کردنش یک ربات در بله یا ایتا بسازید و
      <code>NOTIFY_DRIVER</code> و <code>NOTIFY_TOKEN</code> را در فایل <code>.env</code> بگذارید.
    </div>`;
  }
  const gap = s.total - s.linked;
  return `<div class="note-box ${gap ? 'warn' : 'ok'}">
    <b>پل اعلان روشن است (${esc(s.driver)}).</b>
    ${gap
    ? `${toFa(s.linked)} نفر از ${toFa(s.total)} نفر شناسهٔ پیام‌رسان دارند —
       برای ${toFa(gap)} نفر باقی‌مانده اعلان بیرون نمی‌رود.`
    : `هر ${toFa(s.total)} نفر شناسه دارند؛ اعلان‌ها به همه می‌رسد.`}
  </div>`;
}

function teamView() {
  return `
    <div class="card">
      <header>
        <h3>کارکنان و پنل‌ها</h3>
        <div class="spacer"></div>
        ${can('users.manage') ? '<button class="btn new sm" data-action="new-user">+ ساخت پنل برای فرد جدید</button>' : ''}
      </header>
      <p class="hint" style="margin:-8px 0 14px">
        برای هر نفر یک نام کاربری و رمز می‌سازید و با تیک‌زدن مشخص می‌کنید کدام بخش‌های پنل برایش باز باشد.
      </p>
      ${notifyBanner()}
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>نام</th><th>نام کاربری</th><th>سمت</th><th>واحد</th><th>سرپرست امتیازدهنده</th>
            <th class="num">سقف ماهانه</th><th>بخش‌های باز در پنل او</th><th>وضعیت</th><th></th>
          </tr></thead>
          <tbody>
            ${state.users.map((u) => {
    const { open } = panelSummary(u);
    return `
              <tr>
                <td><div class="who"><span class="av">${esc(initials(u.full_name))}</span>${esc(u.full_name)}
                  ${u.role !== 'member' ? `<span class="chip brand">${u.role === 'admin' ? 'مدیر ارشد' : 'مدیر'}</span>` : ''}</div></td>
                <td dir="ltr" style="text-align:right" class="muted small">${esc(u.username)}</td>
                <td class="muted small">${esc(u.job_title || '—')}</td>
                <td class="small">${u.unit_name
    ? `<span class="chip">${esc(u.unit_name)}</span>` : '<span class="muted">—</span>'}</td>
                <td class="small">${u.supervisor_name
    ? esc(u.supervisor_name) : '<span class="muted">—</span>'}</td>
                <td class="num">${fh(u.monthly_target)}</td>
                <td style="white-space:normal;max-width:260px">
                  ${u.role === 'admin' ? '<span class="chip brand">همهٔ بخش‌ها</span>'
    : open.length ? open.map((g) => `<span class="chip">${g.icon} ${esc(g.title)}</span>`).join(' ')
      : '<span class="chip danger">هیچ بخشی</span>'}
                </td>
                <td><span class="chip ${u.is_active ? 'ok' : 'danger'}">${u.is_active ? 'فعال' : 'غیرفعال'}</span></td>
                <td style="display:flex;gap:6px">
                  ${can('users.manage') ? `<button class="btn ghost sm" data-action="edit-user" data-id="${u.id}">ویرایش</button>` : ''}
                  ${can('users.permissions') ? `<button class="btn soft sm" data-action="perm-user" data-id="${u.id}">دسترسی‌ها</button>` : ''}
                  ${can('users.delete') && u.id !== state.user.id
    ? `<button class="btn ghost sm danger-text" data-action="del-user" data-id="${u.id}">حذف</button>` : ''}
                </td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ───────────────────────────── امتیاز ─────────────────────────────

function scoresView() {
  const { jy, jm } = state.month;
  if (!can('scores.view_all')) {
    const mine = state.scores;
    const current = mine.find((s) => s.j_year === jy && s.j_month === jm);
    return `
      <div class="card">
        <header><h3>امتیاز ${monthLabel(jy, jm)}</h3></header>
        ${current ? scoreDetail(current) : '<div class="empty">امتیاز این ماه هنوز ثبت نشده است</div>'}
      </div>
      <div class="card">
        <header><h3>سوابق امتیاز</h3></header>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ماه</th><th class="num">کیفیت</th><th class="num">سرعت</th>
              <th class="num">نظم</th><th class="num">همکاری</th><th class="num">امتیاز کل</th><th>یادداشت</th></tr></thead>
            <tbody>
              ${mine.length ? mine.map((s) => `
                <tr>
                  <td>${monthLabel(s.j_year, s.j_month)}</td>
                  <td class="num">${s.quality === null ? '—' : toFa(s.quality)}</td>
                  <td class="num">${s.speed === null ? '—' : toFa(s.speed)}</td>
                  <td class="num">${s.discipline === null ? '—' : toFa(s.discipline)}</td>
                  <td class="num">${s.teamwork === null ? '—' : toFa(s.teamwork)}</td>
                  <td class="num"><span class="chip ${s.score >= 80 ? 'ok' : s.score >= 60 ? 'warn' : 'danger'}">${toFa(s.score)}</span></td>
                  <td class="muted small" style="white-space:normal">${esc(s.note || '—')}</td>
                </tr>`).join('') : '<tr><td colspan="7" class="empty">سابقه‌ای ثبت نشده است</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  const rows = state.stats?.team || [];
  return `
    <div class="card">
      <header><h3>امتیاز عملکرد — ${monthLabel(jy, jm)}</h3></header>
      <p class="hint" style="margin:-8px 0 14px">
        امتیاز هر کارمند از میانگین چهار معیار محاسبه می‌شود و در داشبورد خودش نمایش داده می‌شود.
      </p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>کارمند</th><th class="num">ساعات تأییدشده</th><th class="num">کار انجام‌شده</th>
            <th class="num">امتیاز ماه</th><th></th></tr></thead>
          <tbody>
            ${rows.map((m) => `
              <tr>
                <td><div class="who"><span class="av">${esc(initials(m.full_name))}</span>${esc(m.full_name)}</div></td>
                <td class="num">${fh(m.approved_hours)}</td>
                <td class="num">${toFa(m.done_tasks)}</td>
                <td class="num">${m.score === null ? '<span class="chip">ثبت نشده</span>'
    : `<span class="chip ${m.score >= 80 ? 'ok' : m.score >= 60 ? 'warn' : 'danger'}">${toFa(m.score)}</span>`}</td>
                <td><button class="btn sm" data-action="score-user" data-id="${m.id}">${m.score === null ? 'ثبت امتیاز' : 'ویرایش'}</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function scoreDetail(s) {
  const bar = (label, v) => `
    <div style="margin-bottom:10px">
      <div class="row" style="gap:6px"><span class="small muted" style="flex:1">${label}</span>
        <b class="small">${v === null ? '—' : toFa(v)}</b></div>
      <div class="progress"><i style="width:${v || 0}%"></i></div>
    </div>`;
  return `
    <div class="row" style="align-items:flex-start">
      <div style="flex:0 0 150px;text-align:center">
        <div style="font-size:44px;font-weight:800;color:${s.score >= 80 ? 'var(--ok)' : s.score >= 60 ? 'var(--warn)' : 'var(--danger)'}">${toFa(s.score)}</div>
        <div class="muted small">از ۱۰۰</div>
      </div>
      <div style="flex:1 1 260px">
        ${bar('کیفیت کار', s.quality)}
        ${bar('سرعت و به‌موقع بودن', s.speed)}
        ${bar('نظم و انضباط', s.discipline)}
        ${bar('همکاری تیمی', s.teamwork)}
      </div>
    </div>
    ${s.note ? `<p class="small muted" style="margin-top:8px">یادداشت مدیر: ${esc(s.note)}</p>` : ''}`;
}

// ───────────────────────────── کارهای تکراری ─────────────────────────────

const FREQ = { daily: 'هر روز', weekly: 'هفتگی', monthly: 'ماهانه' };
const WEEKDAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

function recurringView() {
  const rows = state.recurrences;
  return `
    <div class="card">
      <header>
        <h3>کارهای تکرارشونده</h3>
        <div class="spacer"></div>
        <button class="btn new sm" data-action="new-recurrence">+ کار تکراری</button>
      </header>
      <p class="hint" style="margin:-8px 0 14px">
        کار روتین را یک‌بار تعریف کنید؛ سامانه هر روز/هفته/ماه خودش آن را می‌سازد و به فرد مربوط می‌سپارد.
        مثل «گزارش روزانهٔ تولید»، «کالیبراسیون ماهانهٔ ترازو»، «بازرسی ایمنی هفتگی».
      </p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>عنوان</th><th>تکرار</th><th>پروژه</th><th>مسئول</th>
            <th>آخرین ساخت</th><th>وضعیت</th><th></th></tr></thead>
          <tbody>
            ${rows.length ? rows.map((r) => `
              <tr>
                <td><b>${esc(r.title)}</b></td>
                <td class="small">${FREQ[r.freq]}${r.freq === 'weekly' && r.weekdays
    ? ` — ${r.weekdays.split(',').map((d) => WEEKDAYS[Number(d)]).join('، ')}`
    : r.freq === 'monthly' ? ` — روز ${toFa(r.month_day || 1)}` : ''}</td>
                <td class="muted small">${esc(r.board_name)}</td>
                <td class="muted small">${esc(r.assignee_name || 'بدون مسئول')}</td>
                <td class="muted small">${r.last_run_date ? formatJalali(r.last_run_date) : '—'}</td>
                <td><span class="chip ${r.is_active ? 'ok' : ''}">${r.is_active ? 'فعال' : 'متوقف'}</span></td>
                <td style="display:flex;gap:6px">
                  <button class="btn ghost sm" data-action="toggle-recurrence" data-id="${r.id}"
                    data-v="${r.is_active ? '0' : '1'}">${r.is_active ? 'توقف' : 'فعال'}</button>
                  <button class="btn ghost sm" data-action="del-recurrence" data-id="${r.id}">حذف</button>
                </td>
              </tr>`).join('') : '<tr><td colspan="7" class="empty">هنوز کار تکرارشونده‌ای تعریف نشده است</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function recurrenceFormModal() {
  const boards = state.boards;
  return openModal('کار تکرارشونده', `
    <form data-form="recurrence">
      <div class="field"><label>عنوان کار</label>
        <input class="input" name="title" required placeholder="مثلاً: گزارش روزانهٔ تولید"></div>
      <div class="row">
        <div class="field"><label>پروژه</label>
          <select class="select" name="board_id">
            ${boards.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}
          </select></div>
        <div class="field"><label>مسئول</label>
          <select class="select" name="assignee_id">
            <option value="">— بدون مسئول —</option>
            ${state.users.filter((u) => u.is_active).map((u) => `<option value="${u.id}">${esc(u.full_name)}</option>`).join('')}
          </select></div>
      </div>
      <div class="row">
        <div class="field"><label>دورهٔ تکرار</label>
          <select class="select" name="freq" data-action="freq">
            <option value="daily">هر روز</option>
            <option value="weekly">هفتگی</option>
            <option value="monthly">ماهانه</option>
          </select></div>
        <div class="field"><label>مهلت انجام</label>
          <select class="select" name="due_offset">
            <option value="0">همان روز</option>
            <option value="1">فردا</option>
            <option value="3">۳ روز بعد</option>
            <option value="7">یک هفته بعد</option>
          </select></div>
      </div>
      <div class="field hidden" data-when="weekly"><label>روزهای هفته</label>
        <div class="row" style="gap:6px">
          ${WEEKDAYS.map((d, i) => `
            <label class="chip" style="cursor:pointer;flex:0 0 auto;gap:5px">
              <input type="checkbox" name="weekday" value="${i}" ${i === 0 ? 'checked' : ''}> ${d}
            </label>`).join('')}
        </div></div>
      <div class="field hidden" data-when="monthly"><label>روز ماه (شمسی)</label>
        <select class="select" name="month_day">
          ${Array.from({ length: 29 }, (_, i) => i + 1).map((d) => `<option value="${d}">${toFa(d)}</option>`).join('')}
        </select></div>
      <div class="row">
        <div class="field"><label>اولویت</label>
          <select class="select" name="priority">
            ${Object.entries(PRIORITY).map(([k, v]) => `<option value="${k}" ${k === 'normal' ? 'selected' : ''}>${v}</option>`).join('')}
          </select></div>
        <div class="field"><label>برآورد ساعت</label>
          <input class="input" name="estimate_h" type="number" step="0.5" min="0" placeholder="۱"></div>
      </div>
      <div class="field"><label>چک‌لیست (هر خط یک مورد)</label>
        <textarea class="textarea" name="checklist" rows="3" placeholder="ثبت تناژ تولید&#10;ثبت توقفات خط&#10;ارسال به سرپرست"></textarea></div>
      <button class="btn block" type="submit">ایجاد کار تکرارشونده</button>
    </form>`);
}

// ───────────────────────────── اعلان‌ها ─────────────────────────────

const NOTIF_ICON = {
  assigned: '📌', comment: '💬', mention: '🗣', moved: '➡', due: '⏰',
  approved: '✓', returned: '↩', review: '✍', unit_score: '★',
};

function notificationsModal() {
  const rows = state.notifications;
  openModal('اعلان‌ها', `
    ${rows.length ? `
      ${state.unread ? '<button class="btn ghost sm block" data-action="read-all" style="margin-bottom:12px">علامت‌زدن همه به‌عنوان خوانده‌شده</button>' : ''}
      <div class="notif-list">
        ${rows.map((nt) => `
          <div class="notif ${nt.read_at ? '' : 'unread'}" ${nt.task_id ? `data-action="open-task" data-id="${nt.task_id}"` : ''}>
            <span class="ic">${NOTIF_ICON[nt.kind] || '•'}</span>
            <div>
              <b>${esc(nt.title)}</b>
              ${nt.body ? `<p class="small muted">${esc(nt.body)}</p>` : ''}
              <span class="small muted">${esc(nt.actor_name || '')} · ${formatJalali(nt.created_at.slice(0, 10))}</span>
            </div>
          </div>`).join('')}
      </div>`
    : '<div class="empty">اعلانی ندارید</div>'}`);
}

function labelPickerModal(taskId) {
  const current = new Set((state.openTask?.task.labels || []).map((l) => l.id));
  openModal('برچسب‌های این کار', `
    <form data-form="task-labels" data-id="${taskId}">
      ${state.labels.length ? state.labels.map((l) => `
        <label class="perm-item">
          <input type="checkbox" name="lbl" value="${l.id}" ${current.has(l.id) ? 'checked' : ''}>
          <span><span class="lbl" style="background:${esc(l.color)}">${esc(l.name)}</span></span>
        </label>`).join('')
    : '<p class="muted small">هنوز برچسبی تعریف نشده است.</p>'}
      <button class="btn block" type="submit" style="margin-top:12px">ذخیره</button>
    </form>`);
}

function labelManagerModal() {
  openModal('برچسب‌ها', `
    <p class="hint">برچسب برای دسته‌بندی کارهاست — مثلاً «تولید»، «آزمایشگاه»، «پیگیری مالی».</p>
    <div style="margin:12px 0">
      ${state.labels.length ? state.labels.map((l) => `
        <div class="link-row">
          <span class="lbl" style="background:${esc(l.color)}">${esc(l.name)}</span>
          <button class="x-btn sm" data-action="del-label" data-id="${l.id}">×</button>
        </div>`).join('') : '<p class="muted small">برچسبی تعریف نشده است</p>'}
    </div>
    <form data-form="label" class="row" style="gap:7px">
      <input class="input" name="name" placeholder="نام برچسب" required style="flex:2 1 140px">
      <input type="color" name="color" value="#387F81" class="input" style="flex:0 0 52px;padding:3px;height:40px">
      <button class="btn sm" type="submit" style="flex:0 0 auto">افزودن</button>
    </form>`);
}

/** پنجرهٔ حذف کاربر — تبعات را صریح نشان می‌دهد و دو تأیید جداگانه می‌خواهد */
async function deleteUserModal(userId) {
  const data = await guard(() => API.users.impact(userId));
  if (!data) return;
  const { user, impact, clean } = data;

  const destroyed = [
    ['رکورد ساعت کاری', impact.time_logs, impact.approved_hours
      ? `شامل ${fh(impact.approved_hours)} ساعت تأییدشده` : ''],
    ['امتیاز عملکرد ماهانه', impact.scores, ''],
    ['یادداشت روی کارها', impact.comments, ''],
  ].filter(([, n]) => n > 0);

  const moved = [
    ['کار باز که به او سپرده شده', impact.tasks_assigned, 'بدون مسئول می‌شود و باید دوباره واگذار کنید'],
    ['کاری که او ساخته', impact.tasks_created, 'به نام شما منتقل می‌شود'],
    ['کار تکرارشونده', impact.recurrences, 'به نام شما منتقل می‌شود'],
    ['تأیید ساعتی که او زده', impact.approvals_given, 'بی‌امضا می‌شود'],
  ].filter(([, n]) => n > 0);

  openModal(`حذف ${esc(user.full_name)}`, `
    <div class="danger-box">
      <div class="danger-head">
        <span class="ic">⚠</span>
        <div>
          <b>این کار برگشت‌ناپذیر است</b>
          <p class="small">پس از حذف، هیچ راهی برای بازگرداندن این داده‌ها وجود ندارد.</p>
        </div>
      </div>
    </div>

    ${clean ? `
      <p class="hint" style="background:var(--ok-soft);color:var(--ok);padding:11px 13px;border-radius:10px;margin:14px 0">
        این حساب هیچ سابقه‌ای ندارد — نه ساعت کاری، نه کار، نه امتیاز.
        حذفش بی‌خطر است (مثلاً حسابی که اشتباهی ساخته شده).
      </p>` : `
      ${destroyed.length ? `
      <div class="impact-group destroy">
        <h4>برای همیشه پاک می‌شود</h4>
        ${destroyed.map(([label, n, note]) => `
          <div class="impact-row">
            <b>${toFa(n)}</b>
            <span>${label}${note ? `<em>${note}</em>` : ''}</span>
          </div>`).join('')}
      </div>` : ''}

      ${moved.length ? `
      <div class="impact-group keep">
        <h4>پاک نمی‌شود ولی جابه‌جا می‌شود</h4>
        ${moved.map(([label, n, note]) => `
          <div class="impact-row">
            <b>${toFa(n)}</b>
            <span>${label}<em>${note}</em></span>
          </div>`).join('')}
      </div>` : ''}

      <div class="alt-box">
        <b>جایگزین بهتر: غیرفعال کردن</b>
        <p class="small">ورودش مسدود می‌شود و از فهرست‌ها کنار می‌رود، ولی ساعات کاری و امتیازهایش
        برای گزارش‌های مالی و سوابق سال‌های قبل دست‌نخورده می‌ماند.</p>
        <button class="btn ghost sm" data-action="deactivate-instead" data-id="${user.id}">
          به‌جای حذف، غیرفعالش کن
        </button>
      </div>`}

    <form data-form="delete-user" data-id="${user.id}" data-username="${esc(user.username)}">
      <label class="perm-item" style="border:1px solid var(--line);border-radius:10px;padding:11px;margin:16px 0 12px">
        <input type="checkbox" name="ack" required>
        <span>می‌دانم این داده‌ها برای همیشه پاک می‌شوند و قابل بازیابی نیستند.</span>
      </label>

      <div class="field">
        <label>برای تأیید، نام کاربری را دقیقاً تایپ کنید: <b dir="ltr">${esc(user.username)}</b></label>
        <input class="input" name="confirm" dir="ltr" autocomplete="off" placeholder="${esc(user.username)}" required>
      </div>

      <button class="btn danger block" type="submit">حذف دائمی این کاربر</button>
      <button class="btn ghost block" type="button" data-action="close-modal" style="margin-top:8px">انصراف</button>
    </form>`);
}

function moreMenuModal() {
  openModal('بخش‌های دیگر', `
    <div class="more-grid">
      ${navItems().map((n) => `
        <button class="more-item ${state.view === n.id ? 'active' : ''}" data-nav="${n.id}">
          <span class="ic">${n.icon}</span><span>${n.label}</span>
        </button>`).join('')}
      <button class="more-item" data-action="logout"><span class="ic">⎋</span><span>خروج</span></button>
    </div>`);
}

// ───────────────────────────── حساب من ─────────────────────────────

function profileView() {
  const u = state.user;
  return `
    <div class="card">
      <header><h3>مشخصات</h3></header>
      <div class="row">
        <div class="field"><label>نام</label><input class="input" value="${esc(u.full_name)}" disabled></div>
        <div class="field"><label>نام کاربری</label><input class="input" dir="ltr" value="${esc(u.username)}" disabled></div>
      </div>
      <div class="row">
        <div class="field"><label>سمت</label><input class="input" value="${esc(u.job_title || '—')}" disabled></div>
        <div class="field"><label>سقف ساعت ماهانه</label><input class="input" value="${fh(u.monthly_target)}" disabled></div>
      </div>
      <p class="hint">برای تغییر این اطلاعات با مدیر سامانه هماهنگ کنید.</p>
    </div>
    <div class="card">
      <header><h3>تغییر رمز عبور</h3></header>
      <form data-form="password">
        <div class="row">
          <div class="field"><label>رمز فعلی</label>
            <input class="input" name="current" type="password" dir="ltr" required></div>
          <div class="field"><label>رمز جدید</label>
            <input class="input" name="next" type="password" dir="ltr" minlength="6" required></div>
        </div>
        <button class="btn" type="submit">تغییر رمز</button>
      </form>
    </div>
    ${API.mode === 'demo' ? `
    <div class="card">
      <header><h3>شروع از صفر</h3></header>
      <p class="hint">
        این نسخهٔ نمایشی است و همهٔ داده‌ها فقط در مرورگر همین دستگاه می‌مانند.
        هر دو دکمه همه‌چیز را پاک می‌کنند و جای دیگری اثر ندارند.
      </p>
      <div class="row" style="margin-top:11px;gap:8px">
        <button class="btn ghost" data-action="demo-reset">بازگشت به دادهٔ نمونه</button>
        <button class="btn danger" data-action="demo-reset-empty">شروع خالی — فقط حساب مدیر</button>
      </div>
      <p class="hint" style="margin-top:9px">
        «شروع خالی» برای وقتی است که می‌خواهید ساختار واقعی خودتان را از صفر وارد کنید:
        هیچ واحد، کار، کالا یا انباری ساخته نمی‌شود — فقط حساب مدیر و واحدهای سنجش پایه.
      </p>
    </div>` : ''}
    <div class="card">
      <header><h3>خروج از حساب</h3></header>
      <button class="btn danger" data-action="logout">خروج</button>
    </div>`;
}

// ───────────────────────────── پنجره‌ها ─────────────────────────────

let modalEl = null;

function openModal(title, bodyHtml, footHtml = '') {
  closeModal();
  modalEl = document.createElement('div');
  modalEl.className = 'modal-back';
  modalEl.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <header><h3>${title}</h3><div class="spacer"></div>
        <button class="x-btn" data-action="close-modal">×</button></header>
      <div class="body">${bodyHtml}</div>
      ${footHtml ? `<div class="foot">${footHtml}</div>` : ''}
    </div>`;
  modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeModal(); });
  document.body.appendChild(modalEl);
  const first = modalEl.querySelector('input, select, textarea');
  if (first) setTimeout(() => first.focus(), 60);
}

function closeModal() {
  if (modalEl) { modalEl.remove(); modalEl = null; }
}

function taskFormModal(task = null, parentId = null) {
  const cols = state.board.columns;
  const due = task?.due_date ? isoToJalali(task.due_date) : null;
  const today = isoToJalali(todayIso());
  const picked = new Set((task?.labels || []).map((l) => l.id));
  openModal(task ? `ویرایش کار #${toFa(task.code)}` : (parentId ? 'زیرکار جدید' : 'کار جدید'), `
    <form data-form="task" data-id="${task?.id || ''}" data-parent="${parentId || ''}">
      <div class="field"><label>عنوان کار</label>
        <input class="input" name="title" required value="${esc(task?.title || '')}" placeholder="مثلاً: تهیهٔ گزارش ماهانهٔ تولید"></div>
      <div class="field"><label>شرح</label>
        <textarea class="textarea" name="description" rows="3">${esc(task?.description || '')}</textarea></div>
      <div class="row">
        <div class="field"><label>مسئول انجام</label>
          <select class="select" name="assignee_id">
            <option value="">— انتخاب نشده —</option>
            ${state.users.filter((u) => u.is_active).map((u) => `
              <option value="${u.id}" ${task?.assignee_id === u.id ? 'selected' : ''}>${esc(u.full_name)}</option>`).join('')}
          </select></div>
        <div class="field"><label>ستون</label>
          <select class="select" name="column_id">
            ${cols.map((c) => `<option value="${c.id}" ${task?.column_id === c.id ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}
          </select></div>
      </div>
      ${state.units.length ? `
      <div class="field"><label>واحد مسئول</label>
        <select class="select" name="unit_id">
          <option value="">— بدون واحد (بررسی سرپرست ندارد) —</option>
          ${unitTree(state.units).map((o) => `
            <option value="${o.id}" ${task?.unit_id === o.id ? 'selected' : ''}>${'┄'.repeat(o.depth)}${esc(o.name)}</option>`).join('')}
        </select>
        <p class="hint">
          کار را به یک واحد بسپارید و «مسئول انجام» را خالی بگذارید تا مدیر واحد خودش تقسیمش کند.
          فقط کار دارای واحد وارد چرخهٔ بررسی و بهره‌وری می‌شود.
        </p></div>` : ''}
      ${state.boards.length > 1 ? `
      <div class="field"><label>پروژه</label>
        <select class="select" name="board_id">
          ${state.boards.map((b) => `<option value="${b.id}" ${(task?.board_id || state.boardId) === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}
        </select></div>` : ''}
      <div class="row">
        <div class="field"><label>اولویت</label>
          <select class="select" name="priority">
            ${Object.entries(PRIORITY).map(([k, v]) => `<option value="${k}" ${(task?.priority || 'normal') === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select></div>
        <div class="field"><label>برآورد ساعت</label>
          <input class="input" name="estimate_h" type="number" step="0.5" min="0" value="${task?.estimate_h ?? ''}"></div>
      </div>
      <div class="field"><label>مهلت انجام</label>
        <div class="row" style="gap:6px">
          <select class="select" name="due_jd"><option value="">روز</option>
            ${Array.from({ length: 31 }, (_, i) => i + 1).map((d) => `<option value="${d}" ${due?.jd === d ? 'selected' : ''}>${toFa(d)}</option>`).join('')}</select>
          <select class="select" name="due_jm"><option value="">ماه</option>
            ${MONTH_NAMES.map((m, i) => `<option value="${i + 1}" ${due?.jm === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>
          <select class="select" name="due_jy"><option value="">سال</option>
            ${[today.jy, today.jy + 1].map((y) => `<option value="${y}" ${due?.jy === y ? 'selected' : ''}>${toFa(y)}</option>`).join('')}</select>
        </div>
        <div class="row" style="gap:6px;margin-top:7px">
          <button type="button" class="btn ghost sm" data-action="due-quick" data-d="0">امروز</button>
          <button type="button" class="btn ghost sm" data-action="due-quick" data-d="1">فردا</button>
          <button type="button" class="btn ghost sm" data-action="due-quick" data-d="7">یک هفته</button>
        </div>
      </div>

      ${state.labels.length ? `
      <div class="field"><label>برچسب‌ها</label>
        <div class="row" style="gap:6px">
          ${state.labels.map((l) => `
            <label class="lbl-pick" style="--c:${esc(l.color)}">
              <input type="checkbox" name="lbl" value="${l.id}" ${picked.has(l.id) ? 'checked' : ''}>
              <span>${esc(l.name)}</span>
            </label>`).join('')}
        </div></div>` : ''}

      ${task ? '' : `
      <div class="field"><label>چک‌لیست (هر خط یک مورد)</label>
        <textarea class="textarea" name="checklist" rows="3"
          placeholder="نمونه‌برداری از ۳ نقطه&#10;ثبت در فرم QC-07&#10;تأیید سرپرست"></textarea>
        <p class="hint">با چک‌لیست مشخص می‌کنید «انجام شد» دقیقاً یعنی چه.</p></div>`}

      <button class="btn block" type="submit">${task ? 'ذخیرهٔ تغییرات' : 'ایجاد کار و واگذاری'}</button>
      ${task ? `<button class="btn ghost block" type="button" data-action="del-task" data-id="${task.id}" style="margin-top:8px">حذف کار</button>` : ''}
    </form>`);
}

async function openTaskModal(id) {
  const data = await guard(() => API.tasks.get(id));
  if (!data) return;
  state.openTask = data;
  const { task, comments, events, logs, checklist, links, subtasks } = data;
  const columns = state.board?.columns || [];
  const mine = task.assignee_id === state.user.id;
  const editable = can('tasks.edit') || mine;
  const pct = checklist.length ? Math.round((checklist.filter((c) => c.is_done).length / checklist.length) * 100) : 0;

  openModal(`#${toFa(task.code)} — ${esc(task.title)}`, `
    <div class="row" style="gap:7px;margin-bottom:12px">
      ${task.board_name ? `<span class="chip" style="flex:0 0 auto">◈ ${esc(task.board_name)}</span>` : ''}
      <span class="chip brand" style="flex:0 0 auto">${esc(task.column_title || '')}</span>
      <span class="chip" style="flex:0 0 auto">اولویت: ${PRIORITY[task.priority]}</span>
      ${task.due_date ? `<span class="chip ${task.due_date < todayIso() && task.column_kind !== 'done' ? 'danger' : ''}" style="flex:0 0 auto">مهلت: ${formatJalali(task.due_date)}</span>` : ''}
      ${task.assignee_name ? `<span class="chip" style="flex:0 0 auto">👤 ${esc(task.assignee_name)}</span>` : ''}
      ${task.unit_name ? `<span class="chip" style="flex:0 0 auto">⌂ ${esc(task.unit_name)}</span>` : ''}
      ${task.review_status === 'pending' ? '<span class="chip warn" style="flex:0 0 auto">در کارتابل بررسی</span>' : ''}
      ${task.review_status === 'approved' ? '<span class="chip ok" style="flex:0 0 auto">تأیید شده</span>' : ''}
      ${task.review_status === 'returned' ? `<span class="chip danger" style="flex:0 0 auto">برگشت خورده${task.return_count ? ` (${toFa(task.return_count)} بار)` : ''}</span>` : ''}
    </div>

    ${task.unit_id && mine && task.review_status !== 'pending' && task.review_status !== 'approved' ? `
    <button class="btn block" data-action="submit-task" data-id="${task.id}" style="margin-bottom:12px">
      ✍ تحویل برای بررسی سرپرست</button>
    <p class="hint" style="margin:-6px 0 14px">
      چک‌لیست را کامل کنید و ساعت کارتان را ثبت کنید، بعد تحویل دهید — سرپرست همین‌ها را می‌بیند.
    </p>` : ''}

    ${(task.labels || []).length ? `<div class="t-labels" style="margin-bottom:10px">
      ${task.labels.map((l) => `<span class="lbl" style="background:${esc(l.color)}">${esc(l.name)}</span>`).join('')}
    </div>` : ''}
    ${state.labels.length && editable ? `
      <button class="btn ghost sm" data-action="pick-labels" data-id="${task.id}" style="margin-bottom:12px">برچسب‌ها</button>` : ''}

    ${task.description ? `<p class="small" style="white-space:pre-wrap">${esc(task.description)}</p>` : '<p class="muted small">بدون شرح</p>'}

    ${columns.length ? `
    <div class="field" style="margin-top:16px">
      <label>انتقال به ستون</label>
      <div class="row" style="gap:6px">
        ${columns.map((c) => `
          <button class="btn ${c.id === task.column_id ? '' : 'ghost'} sm" style="flex:1 1 auto"
            data-action="move-to" data-id="${task.id}" data-col="${c.id}">${esc(c.title)}</button>`).join('')}
      </div>
    </div>` : ''}

    <div class="field" style="margin-top:16px">
      <label>چک‌لیست ${checklist.length ? `— ${toFa(pct)}٪ انجام شد` : ''}</label>
      ${checklist.length ? `<div class="progress ${pct === 100 ? 'ok' : ''}" style="margin-bottom:10px"><i style="width:${pct}%"></i></div>` : ''}
      <div class="checks">
        ${checklist.map((c) => `
          <label class="chk ${c.is_done ? 'done' : ''}">
            <input type="checkbox" ${c.is_done ? 'checked' : ''} ${editable ? '' : 'disabled'}
                   data-action="toggle-check" data-id="${c.id}">
            <span>${esc(c.title)}
              ${c.is_done && c.done_by_name ? `<em>${esc(c.done_by_name)}</em>` : ''}</span>
            ${editable ? `<button class="x-btn sm" data-action="del-check" data-id="${c.id}">×</button>` : ''}
          </label>`).join('')}
      </div>
      ${editable ? `
      <form data-form="check" data-id="${task.id}" style="display:flex;gap:7px;margin-top:8px">
        <input class="input" name="title" placeholder="افزودن مورد به چک‌لیست…" required>
        <button class="btn sm" type="submit">+</button>
      </form>
      <p class="hint">چک‌لیست یعنی «کار انجام‌شده» دقیقاً چه چیزی است — جلوی برگشت کار را می‌گیرد.</p>` : ''}
    </div>

    ${subtasks.length ? `
    <div class="field"><label>زیرکارها</label>
      <div class="col-body">${subtasks.map((s) => taskCard(s, null, 'compact')).join('')}</div>
    </div>` : ''}

    <div class="field">
      <label>پیوست‌ها</label>
      ${links.length ? links.map((l) => `
        <div class="link-row">
          <a href="${esc(l.url)}" target="_blank" rel="noopener">🔗 ${esc(l.title)}</a>
          ${editable ? `<button class="x-btn sm" data-action="del-link" data-id="${l.id}">×</button>` : ''}
        </div>`).join('') : '<p class="muted small">پیوستی ثبت نشده است</p>'}
      ${editable ? `
      <form data-form="link" data-id="${task.id}" class="row" style="gap:6px;margin-top:8px">
        <input class="input" name="title" placeholder="عنوان" style="flex:1 1 110px">
        <input class="input" name="url" dir="ltr" placeholder="https://…" required style="flex:2 1 170px">
        <button class="btn sm" type="submit" style="flex:0 0 auto">افزودن</button>
      </form>` : ''}
    </div>

    ${logs.length ? `<div class="field"><label>ساعات ثبت‌شده روی این کار</label>
      <div class="small muted">${logs.map((l) => `${esc(l.full_name)}: ${fh(l.hours)} ساعت (${formatJalali(l.work_date)})`).join(' • ')}</div></div>` : ''}

    <div class="field" style="margin-top:14px">
      <label>یادداشت‌ها</label>
      ${comments.length ? comments.map((c) => `
        <div class="cmt">
          <div class="small"><b>${esc(c.full_name)}</b> <span class="muted">${formatJalali(c.created_at.slice(0, 10))}</span></div>
          <div class="small" style="white-space:pre-wrap">${esc(c.body)}</div>
        </div>`).join('') : '<p class="muted small">یادداشتی ثبت نشده است</p>'}
      <form data-form="comment" data-id="${task.id}" style="display:flex;gap:7px;margin-top:8px">
        <input class="input" name="body" placeholder="یادداشت یا گزارش پیشرفت… (با @نام‌کاربری اطلاع بدهید)" required>
        <button class="btn sm" type="submit">ثبت</button>
      </form>
    </div>

    <details style="margin-top:12px">
      <summary class="small muted" style="cursor:pointer">تاریخچهٔ تغییرات</summary>
      <div class="small muted" style="margin-top:8px">
        ${events.map((e) => `${esc(e.full_name || 'سیستم')} — ${{
    created: 'ایجاد کرد', moved: `منتقل کرد به «${esc(e.detail || '')}»`,
    updated: 'ویرایش کرد', commented: 'یادداشت گذاشت',
  }[e.action] || esc(e.action)} (${formatJalali(e.created_at.slice(0, 10))})`).join('<br>')}
      </div>
    </details>`,
  can('tasks.edit') ? `
    <button class="btn ghost" data-action="edit-task" data-id="${task.id}">ویرایش کار</button>
    ${can('tasks.create') ? `<button class="btn ghost" data-action="new-subtask" data-id="${task.id}">+ زیرکار</button>` : ''}` : '');
}

/** شمارش بخش‌هایی از پنل که برای یک کاربر باز است */
function panelSummary(user) {
  const perms = user.perms || effectivePermissions(user);
  const open = CATALOG.filter((g) => g.items.some((i) => perms.includes(i.key)));
  return { perms, open };
}

function permissionGrid(perms, { editable = true } = {}) {
  const isAdminTarget = false;
  return `
  <div class="perm-presets">
    <span class="small muted">قالب آماده:</span>
    ${Object.entries(PRESETS).map(([k, p]) => `
      <button type="button" class="btn ghost sm" data-action="preset" data-preset="${k}" title="${esc(p.hint)}">${esc(p.label)}</button>`).join('')}
  </div>
  ${CATALOG.map((g) => `
    <fieldset class="perm-group">
      <legend>
        <label class="perm-all">
          <input type="checkbox" data-group-toggle="${g.group}"
            ${g.items.every((i) => perms.includes(i.key)) ? 'checked' : ''} ${editable ? '' : 'disabled'}>
          <span>${g.icon} ${esc(g.title)}</span>
        </label>
      </legend>
      ${g.items.map((i) => `
        <label class="perm-item">
          <input type="checkbox" name="perm" value="${i.key}" data-group="${g.group}"
            ${perms.includes(i.key) ? 'checked' : ''} ${editable ? '' : 'disabled'}>
          <span>
            ${esc(i.label)}
            ${i.hint ? `<em>${esc(i.hint)}</em>` : ''}
          </span>
        </label>`).join('')}
    </fieldset>`).join('')}
  ${isAdminTarget ? '' : ''}`;
}

function userFormModal(user = null, focusPerms = false) {
  const perms = user ? (user.perms || effectivePermissions(user)) : [...PRESETS.member.keys];
  const canSetPerms = can('users.permissions');
  const isSelf = user && user.id === state.user.id;
  const isAdminTarget = user && user.role === 'admin';

  openModal(user ? `ویرایش ${esc(user.full_name)}` : 'ساخت حساب کاربری جدید', `
    <form data-form="user" data-id="${user?.id || ''}">
      <div class="seg" style="width:100%;margin-bottom:16px">
        <button type="button" style="flex:1" class="${focusPerms ? '' : 'active'}" data-action="tab" data-tab="info">مشخصات و ورود</button>
        <button type="button" style="flex:1" class="${focusPerms ? 'active' : ''}" data-action="tab" data-tab="perms">دسترسی‌های پنل</button>
      </div>

      <div data-pane="info" class="${focusPerms ? 'hidden' : ''}">
        <div class="field"><label>نام و نام خانوادگی</label>
          <input class="input" name="full_name" required value="${esc(user?.full_name || '')}"
                 placeholder="مثلاً: سارا رضایی"></div>
        ${user ? `
        <div class="row">
          <div class="field"><label>نام کاربری</label>
            <input class="input" dir="ltr" value="${esc(user.username)}" disabled></div>
          <div class="field"><label>رمز عبور</label>
            <button type="button" class="btn ghost block" data-action="reset-pw" data-id="${user.id}">تغییر رمز عبور</button></div>
        </div>` : `
        <div class="row">
          <div class="field"><label>نام کاربری (برای ورود)</label>
            <input class="input" name="username" dir="ltr" required pattern="[a-zA-Z0-9._-]{3,32}"
                   placeholder="sara.rezaei" autocomplete="off">
            <p class="hint">حروف و اعداد انگلیسی، ۳ تا ۳۲ نویسه</p></div>
          <div class="field"><label>رمز عبور اولیه</label>
            <input class="input" name="password" dir="ltr" required minlength="6" value="karnama1404">
            <p class="hint">کارمند پس از اولین ورود می‌تواند آن را عوض کند</p></div>
        </div>`}
        <div class="row">
          <div class="field"><label>سمت</label>
            <input class="input" name="job_title" value="${esc(user?.job_title || '')}" placeholder="کارشناس آزمایشگاه"></div>
          <div class="field"><label>واحد سازمانی</label>
            <select class="select" name="unit_id">
              <option value="">— بدون واحد —</option>
              ${unitTree(state.units).map((o) => `
                <option value="${o.id}" ${user?.unit_id === o.id ? 'selected' : ''}>${'┄'.repeat(o.depth)}${esc(o.name)}</option>`).join('')}
            </select>
            <p class="hint">کار این شخص فقط برای خودش و واحدش دیده می‌شود.</p></div>
        </div>
        <div class="field"><label>شناسهٔ پیام‌رسان <span class="muted small">(اختیاری)</span></label>
          <div class="row" style="gap:7px">
            <input class="input" name="chat_id" dir="ltr" style="flex:1 1 150px"
                   value="${esc(user?.chat_id || '')}" placeholder="مثلاً ۱۲۳۴۵۶۷۸۹">
            ${user ? `<button type="button" class="btn ghost sm" style="flex:0 0 auto"
              data-action="test-notify" data-id="${user.id}">ارسال آزمایشی</button>` : ''}
          </div>
          <p class="hint">
            اگر پر باشد، اعلان‌های مهم (کار تازه، آمادهٔ بررسی، تأیید، برگشت) به پیام‌رسان این شخص هم می‌رود.
            برای پیدا کردن شناسه‌ها: هر نفر یک‌بار به ربات پیام بدهد، بعد <code>node server/bot-ids.js</code> را اجرا کنید.
          </p></div>

        <div class="field"><label>سرپرست امتیازدهنده</label>
          <select class="select" name="supervisor_id">
            <option value="">— بدون سرپرست مستقیم —</option>
            ${state.users.filter((o) => o.is_active && (!user || o.id !== user.id)).map((o) => `
              <option value="${o.id}" ${user?.supervisor_id === o.id ? 'selected' : ''}>
                ${esc(o.full_name)}${o.job_title ? ` — ${esc(o.job_title)}` : ''}</option>`).join('')}
          </select>
          <p class="hint">
            کار تمام‌شدهٔ این شخص به کارتابل همین فرد می‌رود. زیردست هرگز نمی‌تواند به بالادست خود
            امتیاز بدهد؛ سامانه جلوی حلقه را هم می‌گیرد. اگر خالی بماند، مدیر واحدش بررسی می‌کند.
          </p></div>
        <div class="row">
          <div class="field"><label>سقف ساعت ماهانه</label>
            <input class="input" name="monthly_target" type="number" min="0" step="1" value="${user?.monthly_target ?? 176}"></div>
          ${state.user.role === 'admin' && !isSelf ? `
          <div class="field"><label>نقش پایه</label>
            <select class="select" name="role">
              <option value="member" ${!user || user.role === 'member' ? 'selected' : ''}>کارمند</option>
              <option value="manager" ${user?.role === 'manager' ? 'selected' : ''}>مدیر</option>
              <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>مدیر ارشد (همهٔ دسترسی‌ها)</option>
            </select></div>` : ''}
        </div>
        ${user && !isSelf ? `
        <div class="field"><label>وضعیت حساب</label>
          <select class="select" name="is_active">
            <option value="1" ${user.is_active ? 'selected' : ''}>فعال — می‌تواند وارد شود</option>
            <option value="0" ${!user.is_active ? 'selected' : ''}>غیرفعال — ورود مسدود است</option>
          </select></div>` : ''}
      </div>

      <div data-pane="perms" class="${focusPerms ? '' : 'hidden'}">
        ${isAdminTarget ? `
          <p class="hint" style="background:var(--brand-soft);color:var(--brand);padding:10px 12px;border-radius:10px">
            «مدیر ارشد» همیشه به همهٔ بخش‌ها دسترسی دارد و تیک‌ها روی او اثری ندارد.
          </p>` : ''}
        ${isSelf ? `
          <p class="hint" style="background:var(--warn-soft);color:var(--warn);padding:10px 12px;border-radius:10px">
            سطح دسترسی خودتان را نمی‌توانید تغییر دهید.
          </p>` : ''}
        ${canSetPerms ? '' : `
          <p class="hint">شما اجازهٔ تغییر سطح دسترسی را ندارید؛ تیک‌ها فقط برای مشاهده است.</p>`}
        <p class="hint" style="margin-bottom:12px">
          هر تیک یعنی آن بخش در پنل این شخص باز می‌شود. بخش‌های بدون تیک اصلاً در منوی او دیده نمی‌شوند.
        </p>
        ${permissionGrid(perms, { editable: canSetPerms && !isSelf && !isAdminTarget })}
      </div>

      <button class="btn block" type="submit" style="margin-top:16px">
        ${user ? 'ذخیرهٔ تغییرات' : 'ایجاد حساب و باز کردن پنل'}</button>
    </form>`);
}

function scoreFormModal(userId) {
  const person = (state.users.find((u) => u.id === userId))
    || (state.stats?.team || []).find((u) => u.id === userId);
  const { jy, jm } = state.month;
  const existing = (state.allScores || []).find((s) => s.user_id === userId && s.j_year === jy && s.j_month === jm);
  const f = (k) => (existing && existing[k] !== null ? existing[k] : '');
  const slider = (name, label) => `
    <div class="field">
      <label>${label} <b data-out="${name}">${f(name) === '' ? '—' : toFa(f(name))}</b></label>
      <input type="range" name="${name}" min="0" max="100" step="5" value="${f(name) === '' ? 75 : f(name)}"
             style="width:100%" data-slider>
    </div>`;
  openModal(`امتیاز ${esc(person?.full_name || '')} — ${monthLabel(jy, jm)}`, `
    <form data-form="score" data-id="${userId}">
      ${slider('quality', 'کیفیت کار')}
      ${slider('speed', 'سرعت و به‌موقع بودن')}
      ${slider('discipline', 'نظم و انضباط')}
      ${slider('teamwork', 'همکاری تیمی')}
      <div class="field"><label>یادداشت مدیر (در داشبورد کارمند دیده می‌شود)</label>
        <textarea class="textarea" name="note" rows="2">${esc(existing?.note || '')}</textarea></div>
      <p class="hint">امتیاز نهایی میانگین چهار معیار بالا خواهد بود.</p>
      <button class="btn block" type="submit">ثبت امتیاز</button>
    </form>`);
}

// ───────────────────────────── بارگذاری داده ─────────────────────────────

async function loadAll() {
  if (!state.user) return;
  const { jy, jm } = state.month;
  const tasks = [
    guard(() => API.stats({ jy, jm }), { silent: true }).then((d) => { if (d) state.stats = d; }),
    guard(() => API.notifications.list(), { silent: true }).then((d) => {
      if (d) { state.notifications = d.notifications; state.unread = d.unread; }
    }),
  ];
  if (can('tasks.view')) {
    tasks.push(guard(() => API.boards.list(), { silent: true }).then((d) => {
      if (d) {
        state.boards = d.boards;
        if (!state.boardId || !d.boards.some((b) => b.id === state.boardId)) {
          state.boardId = d.boards[0]?.id || null;
        }
      }
    }).then(() => guard(() => API.board.get(state.boardId), { silent: true }).then((d) => {
      if (d) { state.board = d; state.labels = d.labels || []; }
    })));
    tasks.push(guard(() => API.myday(), { silent: true }).then((d) => { if (d) state.myday = d; }));
  }
  if (can('tasks.view_all') && state.view === 'workload') {
    tasks.push(guard(() => API.workload(), { silent: true }).then((d) => { if (d) state.workload = d; }));
  }
  if (can('recurrence.manage') && state.view === 'recurring') {
    tasks.push(guard(() => API.recurrences.list(), { silent: true })
      .then((d) => { if (d) state.recurrences = d.recurrences; }));
  }
  if (can('users.manage') && (state.view === 'team' || state.view === 'profile')) {
    tasks.push(guard(() => API.notify.status(), { silent: true })
      .then((d) => { if (d) state.notifyStatus = d; }));
  }
  if (can('users.view') || can('users.manage') || can('tasks.create')) {
    tasks.push(guard(() => API.users.list(), { silent: true }).then((d) => { if (d) state.users = d.users; }));
    tasks.push(guard(() => API.scores.list({ jy, jm }), { silent: true }).then((d) => { if (d) state.allScores = d.scores; }));
  } else {
    state.users = [];
    tasks.push(guard(() => API.scores.list({}), { silent: true }).then((d) => { if (d) state.scores = d.scores; }));
  }
  tasks.push(guard(() => API.timelogs.list(
    can('time.view_all')
      ? { jy, jm, user_id: state.logUser || '' }
      : { jy, jm },
  ), { silent: true }).then((d) => { if (d) state.logs = d.logs; }));

  if (can('time.approve') && state.view === 'approvals') {
    tasks.push(guard(() => API.timelogs.list({ status: 'pending' }), { silent: true })
      .then((d) => { if (d) state.pending = d.logs; }));
  }
  // ساختار سازمانی: واحدها همه‌جا لازم است (فرم کاربر، فرم کار، فیلتر دید)
  tasks.push(guard(() => API.units.list(), { silent: true }).then((d) => {
    if (d) { state.units = d.units; state.managedUnits = d.managed || []; }
  }));
  if (can('review.do')) {
    tasks.push(guard(() => API.review.list(), { silent: true })
      .then((d) => { if (d) state.reviewQueue = d.tasks; }));
  }
  if (can('reports.unit') && state.view === 'unitreport') {
    tasks.push(guard(() => API.reports.units({ jy, jm }), { silent: true })
      .then((d) => { if (d) state.unitReport = d; }));
  }
  if (state.view === 'unitprod' && state.unitView) {
    tasks.push(guard(() => API.units.productivity(state.unitView.unit.id, { jy, jm }), { silent: true })
      .then((d) => { if (d) state.unitView = d; }));
  }
  await Promise.all(tasks);
}

// ───────────────────────────── انبار ─────────────────────────────
//
// یک آیتم در منو، چهار زبانه داخلش. اگر هر کدام یک آیتم منو می‌شد، منوی کنار
// هفده‌تایی می‌شد و پیدا کردن چیزها سخت‌تر — نه آسان‌تر.

const STOCK_TABS = [
  { id: 'onhand', label: 'موجودی', need: 'stock.view' },
  { id: 'entries', label: 'اسناد انبار', need: 'stock.view' },
  { id: 'items', label: 'کالاها', need: 'stock.view' },
  { id: 'warehouses', label: 'انبارها', need: 'stock.view' },
];

const STOCK_KINDS = {
  receipt: { label: 'رسید', icon: '↓', hint: 'ورود کالا به انبار', from: false, to: true },
  issue: { label: 'حواله', icon: '↑', hint: 'خروج کالا از انبار', from: true, to: false },
  transfer: { label: 'انتقال', icon: '⇄', hint: 'جابه‌جایی بین دو انبار', from: true, to: true },
  adjust: { label: 'اصلاح', icon: '✎', hint: 'اصلاح موجودی پس از انبارگردانی', from: false, to: true },
};

const STOCK_STATUS = {
  draft: { label: 'پیش‌نویس', cls: '' },
  submitted: { label: 'قطعی', cls: 'ok' },
  cancelled: { label: 'باطل', cls: 'danger' },
};

/**
 * عدد انبار: ارقام فارسی، با همان تعداد رقم اعشار که واحد سنجش می‌خواهد.
 * صفرهای انتهایی فقط وقتی حذف می‌شوند که بعد از ممیز باشند — وگرنه ۲۵۰۰ کیسه
 * «۲۵» نمایش داده می‌شود، که در انبار یعنی فاجعه.
 */
function qtyText(v, decimals = 2) {
  const x = Number(v) || 0;
  const s = x.toFixed(Math.max(0, Math.min(3, decimals)));
  const trimmed = s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
  return toFa(trimmed);
}

async function loadStock() {
  const [setup, data] = await Promise.all([
    guard(() => API.stock.setup(), { silent: true }),
    guard(() => API.stock.onHand(state.stock.filterWarehouse
      ? { warehouse_id: state.stock.filterWarehouse } : {}), { silent: true }),
  ]);
  if (setup) state.stock.setup = setup;
  if (data) { state.stock.onhand = data.rows; state.stock.low = data.low; state.stock.warehouses = data.warehouses; }
}

async function loadStockTab(tab) {
  if (tab === 'onhand') {
    const d = await guard(() => API.stock.onHand(state.stock.filterWarehouse
      ? { warehouse_id: state.stock.filterWarehouse } : {}), { silent: true });
    if (d) { state.stock.onhand = d.rows; state.stock.low = d.low; state.stock.warehouses = d.warehouses; }
  } else if (tab === 'entries') {
    const d = await guard(() => API.stock.entries(state.stock.entryStatus
      ? { status: state.stock.entryStatus } : {}), { silent: true });
    if (d) state.stock.entries = d.entries;
  } else if (tab === 'items') {
    const d = await guard(() => API.stock.items({}), { silent: true });
    if (d) state.stock.items = d.items;
  } else if (tab === 'warehouses') {
    const d = await guard(() => API.stock.warehouses(), { silent: true });
    if (d) state.stock.warehouseCards = d.warehouses;
  }
}

function stockView() {
  const tabs = STOCK_TABS.filter((t) => can(t.need));
  const tab = state.stock.tab;
  return `
    <div class="seg" style="margin-bottom:14px">
      ${tabs.map((t) => `<button class="${tab === t.id ? 'active' : ''}" data-action="stock-tab" data-id="${t.id}">${t.label}</button>`).join('')}
    </div>
    ${tab === 'onhand' ? stockOnHandTab()
    : tab === 'entries' ? stockEntriesTab()
      : tab === 'items' ? stockItemsTab()
        : stockWarehousesTab()}`;
}

/** ردیف‌های موجودی پس از جست‌وجو — جدا است تا بشود بدون رندر کامل تازه‌اش کرد */
function stockShownRows() {
  const rows = state.stock.onhand || [];
  const qq = (state.stock.search || '').trim();
  if (!qq) return rows;
  return rows.filter((r) => r.name.includes(qq) || String(r.code).includes(qq)
    || (r.group_name || '').includes(qq));
}

function stockOnHandRows() {
  const shown = stockShownRows();
  if (!shown.length) {
    return '<tr><td colspan="6"><div class="empty"><p>کالایی با این نام در موجودی نیست.</p></div></td></tr>';
  }
  // «کمبود» با مجموع کالا در همهٔ انبارها سنجیده می‌شود، نه با موجودی یک انبار.
  // وگرنه کالایی که در دو انبار پخش شده، در هر دو ردیف الکی قرمز می‌شود.
  const lowItems = new Set((state.stock.low || []).map((l) => l.item_id));
  return shown.map((r) => {
    const isLow = lowItems.has(r.item_id);
    return `<tr class="${isLow ? 'row-warn' : ''}">
      <td><code>${toFa(r.code)}</code></td>
      <td><b>${esc(r.name)}</b></td>
      <td>${esc(r.group_name || '—')}</td>
      <td>${esc(r.warehouse_name)}</td>
      <td><b>${qtyText(r.qty, r.uom_decimals)}</b> <small>${esc(r.uom_name)}</small>
          ${isLow ? ' <span class="chip danger sm">کمبود</span>' : ''}</td>
      <td>${can('stock.report') ? `<button class="btn ghost sm" data-action="stock-card" data-id="${r.item_id}">کاردکس</button>` : ''}</td>
    </tr>`;
  }).join('');
}

function stockOnHandTab() {
  const rows = state.stock.onhand || [];
  const low = state.stock.low || [];
  const whs = state.stock.warehouses || [];
  const qq = (state.stock.search || '').trim();
  const shown = stockShownRows();
  const kinds = new Set(shown.map((r) => r.item_id));

  if (!whs.length) {
    return `<div class="card"><div class="empty">
      <p>هنوز انباری برای شما تعریف نشده است.</p>
      ${can('stock.manage') ? '<p class="hint">از زبانهٔ «انبارها» اولین انبار را بسازید.</p>' : ''}
    </div></div>`;
  }

  return `
    ${low.length ? `
    <div class="card warn-card">
      <header><h3>⚠ کمبود موجودی — ${toFa(low.length)} قلم</h3></header>
      <div class="chips">
        ${low.map((l) => `<button class="chip danger" data-action="stock-card" data-id="${l.item_id}">
          ${esc(l.name)}: ${qtyText(l.on_hand)} از ${qtyText(l.reorder_level)} ${esc(l.uom_name)}
        </button>`).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <header>
        <h3>موجودی لحظه‌ای</h3>
        <div class="spacer"></div>
        ${can('stock.entry') ? '<button class="btn new sm" data-action="stock-new-entry">+ سند انبار</button>' : ''}
        <select class="select sm" data-action="stock-warehouse-filter" style="max-width:190px">
          <option value="">همهٔ انبارها</option>
          ${whs.map((w) => `<option value="${w.id}" ${state.stock.filterWarehouse === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}
        </select>
        <input class="input sm" data-action="stock-search" value="${esc(qq)}"
               placeholder="جست‌وجوی کالا…" style="max-width:190px">
      </header>
      <div class="kpis">
        <div class="kpi"><b>${toFa(kinds.size)}</b><span>قلم کالا</span></div>
        <div class="kpi"><b>${toFa(whs.length)}</b><span>انبار</span></div>
        <div class="kpi ${low.length ? 'danger' : ''}"><b>${toFa(low.length)}</b><span>زیر حداقل</span></div>
      </div>
      ${rows.length ? `
      <div class="table-wrap"><table id="stock-onhand">
        <thead><tr>
          <th>کد</th><th>کالا</th><th>گروه</th><th>انبار</th><th>موجودی</th><th></th>
        </tr></thead>
        <tbody>${stockOnHandRows()}</tbody>
      </table></div>`
    : '<div class="empty"><p>موجودی‌ای برای نمایش نیست. با یک «رسید» شروع کنید.</p></div>'}
    </div>`;
}

function stockEntriesTab() {
  const list = state.stock.entries || [];
  return `
    <div class="card">
      <header>
        <h3>اسناد انبار</h3>
        <div class="spacer"></div>
        ${can('stock.entry') ? '<button class="btn new sm" data-action="stock-new-entry">+ سند انبار</button>' : ''}
        <select class="select sm" data-action="stock-entry-status" style="max-width:170px">
          <option value="">همهٔ اسناد</option>
          <option value="draft" ${state.stock.entryStatus === 'draft' ? 'selected' : ''}>پیش‌نویس</option>
          <option value="submitted" ${state.stock.entryStatus === 'submitted' ? 'selected' : ''}>قطعی‌شده</option>
          <option value="cancelled" ${state.stock.entryStatus === 'cancelled' ? 'selected' : ''}>باطل‌شده</option>
        </select>
      </header>
      ${list.length ? `<div class="entry-list">${list.map(stockEntryRow).join('')}</div>`
    : '<div class="empty"><p>سندی ثبت نشده است.</p></div>'}
    </div>`;
}

function stockEntryRow(e) {
  const k = STOCK_KINDS[e.kind] || { icon: '•', label: e.kind };
  const st = STOCK_STATUS[e.status] || { label: e.status, cls: '' };
  const route = e.kind === 'transfer'
    ? `${esc(e.from_warehouse || '—')} ← ${esc(e.to_warehouse || '—')}`
    : (e.kind === 'issue' ? `از ${esc(e.from_warehouse || '—')}` : `به ${esc(e.to_warehouse || '—')}`);
  return `
    <div class="entry-row ${e.status}">
      <span class="entry-kind">${k.icon}</span>
      <div class="entry-mid">
        <b>${k.label} #${toFa(e.code)}</b>
        <small>${route} · ${formatJalali(e.entry_date)}${e.party ? ` · ${esc(e.party)}` : ''}${e.ref_no ? ` · ${esc(e.ref_no)}` : ''}</small>
        <small class="faint">${toFa(e.lines.length)} قلم: ${e.lines.slice(0, 3).map((l) => esc(l.item_name)).join('، ')}${e.lines.length > 3 ? ' …' : ''}</small>
      </div>
      <div class="entry-end">
        <span class="chip ${st.cls}">${st.label}</span>
        <button class="btn ghost sm" data-action="stock-entry-open" data-id="${e.id}">جزئیات</button>
      </div>
    </div>`;
}

function stockItemsTab() {
  const list = state.stock.items || [];
  return `
    <div class="card">
      <header>
        <h3>کالاها</h3>
        <div class="spacer"></div>
        ${can('stock.manage') ? '<button class="btn new sm" data-action="stock-new-item">+ کالای تازه</button>' : ''}
      </header>
      ${list.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>کد</th><th>نام</th><th>گروه</th><th>واحد</th><th>موجودی کل</th><th>حداقل</th><th></th></tr></thead>
        <tbody>${list.map((it) => `
          <tr class="${it.low ? 'row-warn' : ''}">
            <td><code>${toFa(it.code)}</code></td>
            <td><b>${esc(it.name)}</b>${it.description ? `<br><small class="faint">${esc(it.description)}</small>` : ''}</td>
            <td>${esc(it.group_name || '—')}</td>
            <td>${esc(it.uom_name)}</td>
            <td><b>${qtyText(it.on_hand, it.uom_decimals)}</b></td>
            <td>${it.reorder_level == null ? '—' : qtyText(it.reorder_level, it.uom_decimals)}</td>
            <td>
              ${can('stock.report') ? `<button class="btn ghost sm" data-action="stock-card" data-id="${it.id}">کاردکس</button>` : ''}
              ${can('stock.manage') ? `<button class="btn ghost sm" data-action="stock-edit-item" data-id="${it.id}">ویرایش</button>` : ''}
            </td>
          </tr>`).join('')}</tbody>
      </table></div>`
    : `<div class="empty"><p>هنوز کالایی تعریف نشده است.</p>
         ${can('stock.manage') ? '<p class="hint">پیش از ثبت سند، کالاها و واحد سنجششان را تعریف کنید.</p>' : ''}</div>`}
    </div>`;
}

function stockWarehousesTab() {
  const list = state.stock.warehouseCards || [];
  return `
    <div class="card">
      <header>
        <h3>انبارها</h3>
        <div class="spacer"></div>
        ${can('stock.manage') ? '<button class="btn new sm" data-action="stock-new-warehouse">+ انبار تازه</button>' : ''}
      </header>
      ${list.length ? `<div class="wh-grid">${list.map((w) => `
        <div class="wh-card">
          <b>${esc(w.name)}${w.code ? ` <small class="faint">${esc(w.code)}</small>` : ''}</b>
          <small>${w.unit_name ? `واحد ${esc(w.unit_name)}` : 'بدون واحد سازمانی'}</small>
          <small>انباردار: ${esc(w.keeper_name || '—')}</small>
          <div class="wh-foot">
            <span class="chip">${toFa(w.item_kinds)} قلم</span>
            ${can('stock.manage') ? `<button class="btn ghost sm" data-action="stock-edit-warehouse" data-id="${w.id}">ویرایش</button>` : ''}
          </div>
        </div>`).join('')}</div>`
    : '<div class="empty"><p>انباری تعریف نشده است.</p></div>'}
    </div>`;
}

// ───── پنجره‌ها ─────

function stockLineRowHtml(line = {}, i = 0) {
  const items = (state.stock.items || []).filter((x) => x.is_active !== 0);
  return `
    <div class="stock-line" data-line="${i}">
      <select class="select" name="item">
        <option value="">— کالا —</option>
        ${items.map((it) => `<option value="${it.id}" ${line.item_id === it.id ? 'selected' : ''}>${toFa(it.code)} · ${esc(it.name)} (${esc(it.uom_name)})</option>`).join('')}
      </select>
      <input class="input" name="qty" type="number" step="0.001" min="0" placeholder="مقدار"
             value="${line.qty ?? ''}">
      <button type="button" class="x-btn" data-action="stock-line-del" data-i="${i}" title="حذف ردیف">×</button>
    </div>`;
}

function stockEntryModal(kind = 'receipt', entry = null) {
  const setup = state.stock.setup || {};
  const whs = setup.warehouses || [];
  const k = STOCK_KINDS[kind];
  const today = isoToJalali(entry?.entry_date || todayIso());
  state.stock.lines = entry ? entry.lines.map((l) => ({ item_id: l.item_id, qty: l.qty })) : [{}];

  openModal(entry ? `ویرایش ${k.label} #${toFa(entry.code)}` : `${k.label} انبار`, `
    <form data-form="stock-entry" data-id="${entry?.id || ''}" data-kind="${kind}">
      ${!entry ? `
      <div class="field"><label>نوع سند</label>
        <div class="seg">
          ${Object.entries(STOCK_KINDS)
    .filter(([id]) => id !== 'adjust' || can('stock.manage'))
    .map(([id, v]) => `<button type="button" class="${id === kind ? 'active' : ''}"
              data-action="stock-kind" data-id="${id}">${v.icon} ${v.label}</button>`).join('')}
        </div>
        <p class="hint">${k.hint}</p>
      </div>` : ''}

      <div class="row">
        ${k.from ? `
        <div class="field"><label>انبار مبدأ</label>
          <select class="select" name="from_warehouse_id" required>
            <option value="">— انتخاب —</option>
            ${whs.map((w) => `<option value="${w.id}" ${entry?.from_warehouse_id === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}
          </select></div>` : ''}
        ${k.to ? `
        <div class="field"><label>${kind === 'transfer' ? 'انبار مقصد' : 'انبار'}</label>
          <select class="select" name="to_warehouse_id" required>
            <option value="">— انتخاب —</option>
            ${whs.map((w) => `<option value="${w.id}" ${entry?.to_warehouse_id === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}
          </select></div>` : ''}
      </div>

      <div class="field"><label>تاریخ سند</label>
        <div class="row" style="gap:6px">
          <select class="select" name="jd">${Array.from({ length: 31 }, (_, i) => i + 1)
    .map((d) => `<option value="${d}" ${today.jd === d ? 'selected' : ''}>${toFa(d)}</option>`).join('')}</select>
          <select class="select" name="jm">${MONTH_NAMES
    .map((m, i) => `<option value="${i + 1}" ${today.jm === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>
          <select class="select" name="jy">${[today.jy - 1, today.jy, today.jy + 1]
    .map((y) => `<option value="${y}" ${today.jy === y ? 'selected' : ''}>${toFa(y)}</option>`).join('')}</select>
        </div>
      </div>

      <div class="row">
        <div class="field"><label>${kind === 'receipt' ? 'تأمین‌کننده' : 'تحویل‌گیرنده'}</label>
          <input class="input" name="party" value="${esc(entry?.party || '')}"
                 placeholder="${kind === 'receipt' ? 'نام فروشنده یا معدن' : 'خط تولید، پیمانکار…'}"></div>
        <div class="field"><label>شمارهٔ مرجع</label>
          <input class="input" name="ref_no" value="${esc(entry?.ref_no || '')}"
                 placeholder="بارنامه، فاکتور، حوالهٔ کاغذی"></div>
      </div>

      <div class="field">
        <label>اقلام سند</label>
        <div id="stock-lines">${state.stock.lines.map((l, i) => stockLineRowHtml(l, i)).join('')}</div>
        <button type="button" class="btn ghost sm" data-action="stock-line-add" style="margin-top:7px">+ ردیف</button>
      </div>

      <div class="field"><label>توضیح</label>
        <textarea class="textarea" name="note" rows="2">${esc(entry?.note || '')}</textarea></div>
    </form>`, `
    <button class="btn ghost" data-action="close-modal">انصراف</button>
    <div class="spacer"></div>
    <button class="btn ghost" form="" data-action="stock-save-draft">ذخیرهٔ پیش‌نویس</button>
    ${can('stock.submit') ? '<button class="btn" data-action="stock-save-submit">ثبت قطعی</button>' : ''}`);
}

function stockEntryDetailModal(e) {
  const k = STOCK_KINDS[e.kind] || {};
  const st = STOCK_STATUS[e.status] || {};
  openModal(`${k.label} #${toFa(e.code)}`, `
    <div class="chips" style="margin-bottom:11px">
      <span class="chip ${st.cls}">${st.label}</span>
      <span class="chip">${formatJalali(e.entry_date)}</span>
      ${e.from_warehouse ? `<span class="chip">از ${esc(e.from_warehouse)}</span>` : ''}
      ${e.to_warehouse ? `<span class="chip">به ${esc(e.to_warehouse)}</span>` : ''}
      ${e.party ? `<span class="chip">${esc(e.party)}</span>` : ''}
      ${e.ref_no ? `<span class="chip">مرجع: ${esc(e.ref_no)}</span>` : ''}
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>کالا</th><th>مقدار</th><th>واحد</th></tr></thead>
      <tbody>${e.lines.map((l) => `<tr>
        <td><code>${toFa(l.item_code)}</code> ${esc(l.item_name)}</td>
        <td><b>${qtyText(l.qty, l.uom_decimals)}</b></td>
        <td>${esc(l.uom_name)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    ${e.note ? `<p class="hint" style="margin-top:10px">${esc(e.note)}</p>` : ''}
    <div class="trail">
      <div>ثبت‌کننده: <b>${esc(e.created_by_name || '—')}</b></div>
      ${e.submitted_by_name ? `<div>قطعی‌کننده: <b>${esc(e.submitted_by_name)}</b></div>` : ''}
      ${e.cancelled_by_name ? `<div class="danger-text">ابطال: <b>${esc(e.cancelled_by_name)}</b> — ${esc(e.cancel_reason || '')}</div>` : ''}
    </div>`, `
    <button class="btn ghost" data-action="close-modal">بستن</button>
    <div class="spacer"></div>
    ${e.can_edit ? `<button class="btn ghost" data-action="stock-edit-entry" data-id="${e.id}">ویرایش</button>` : ''}
    ${e.can_edit ? `<button class="btn ghost danger" data-action="stock-del-entry" data-id="${e.id}">حذف پیش‌نویس</button>` : ''}
    ${e.can_submit ? `<button class="btn" data-action="stock-submit-entry" data-id="${e.id}">ثبت قطعی</button>` : ''}
    ${e.can_cancel ? `<button class="btn danger" data-action="stock-cancel-entry" data-id="${e.id}">ابطال سند</button>` : ''}`);
}

async function stockCardModal(itemId) {
  const d = await guard(() => API.stock.card({ item_id: itemId }));
  if (!d) return;
  const dec = Number(d.item.uom_decimals) || 0;
  openModal(`کاردکس — ${esc(d.item.name)}`, `
    <div class="kpis" style="margin-bottom:12px">
      <div class="kpi"><b>${qtyText(d.balance, dec)}</b><span>موجودی کل (${esc(d.item.uom_name)})</span></div>
      <div class="kpi"><b>${toFa(d.moves.length)}</b><span>حرکت ثبت‌شده</span></div>
    </div>
    ${d.moves.length ? `
    <div class="table-wrap"><table>
      <thead><tr><th>تاریخ</th><th>سند</th><th>انبار</th><th>وارده</th><th>صادره</th><th>مانده</th><th>ثبت</th></tr></thead>
      <tbody>${d.moves.map((m) => `
        <tr class="${m.is_reversal ? 'row-muted' : ''}">
          <td>${formatJalali(m.entry_date)}</td>
          <td>${STOCK_KINDS[m.kind]?.label || m.kind} #${toFa(m.entry_code)}${m.is_reversal ? ' <small class="faint">(ابطال)</small>' : ''}</td>
          <td>${esc(m.warehouse_name)}</td>
          <td>${m.qty_change > 0 ? `<b class="ok-text">${qtyText(m.qty_change, dec)}</b>` : ''}</td>
          <td>${m.qty_change < 0 ? `<b class="danger-text">${qtyText(-m.qty_change, dec)}</b>` : ''}</td>
          <td>${qtyText(m.balance, dec)}</td>
          <td><small>${esc(m.who)}</small></td>
        </tr>`).join('')}</tbody>
    </table></div>
    <p class="hint" style="margin-top:9px">
      مانده از بالا به پایین کم می‌شود چون تازه‌ترین حرکت اول آمده است.
    </p>`
    : '<div class="empty"><p>برای این کالا هنوز حرکتی ثبت نشده است.</p></div>'}`, `
    <button class="btn ghost" data-action="close-modal">بستن</button>`);
}

function stockItemModal(item = null) {
  const setup = state.stock.setup || {};
  openModal(item ? `ویرایش کالا` : 'کالای تازه', `
    <form data-form="stock-item" data-id="${item?.id || ''}">
      <div class="row">
        <div class="field"><label>نام کالا</label>
          <input class="input" name="name" required value="${esc(item?.name || '')}"
                 placeholder="مثلاً: پودر باریت حفاری API"></div>
        <div class="field"><label>کد کالا</label>
          <input class="input" name="code" value="${esc(item?.code || '')}" placeholder="خودکار">
          <p class="hint">خالی بگذارید تا خودش شماره بدهد</p></div>
      </div>
      <div class="row">
        <div class="field"><label>واحد سنجش</label>
          <select class="select" name="uom_id" required>
            <option value="">— انتخاب —</option>
            ${(setup.uoms || []).map((uo) => `<option value="${uo.id}" ${item?.uom_id === uo.id ? 'selected' : ''}>${esc(uo.name)}</option>`).join('')}
          </select></div>
        <div class="field"><label>گروه کالا</label>
          <select class="select" name="group_id">
            <option value="">— بدون گروه —</option>
            ${(setup.groups || []).map((g) => `<option value="${g.id}" ${item?.group_id === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}
          </select></div>
      </div>
      <div class="field"><label>شرح</label>
        <input class="input" name="description" value="${esc(item?.description || '')}"></div>
      <div class="row">
        <div class="field"><label>حداقل موجودی</label>
          <input class="input" name="reorder_level" type="number" step="0.001" min="0"
                 value="${item?.reorder_level ?? ''}">
          <p class="hint">زیر این مقدار، هشدار کمبود می‌دهد</p></div>
        <div class="field"><label>مقدار سفارش</label>
          <input class="input" name="reorder_qty" type="number" step="0.001" min="0"
                 value="${item?.reorder_qty ?? ''}"></div>
      </div>
      ${item ? `
      <div class="field"><label class="check">
        <input type="checkbox" name="is_active" ${item.is_active ? 'checked' : ''}> کالا فعال است
      </label></div>` : ''}
      <button class="btn block" type="submit">${item ? 'ذخیره' : 'ساخت کالا'}</button>
    </form>`);
}

function stockWarehouseModal(wh = null) {
  openModal(wh ? 'ویرایش انبار' : 'انبار تازه', `
    <form data-form="stock-warehouse" data-id="${wh?.id || ''}">
      <div class="row">
        <div class="field"><label>نام انبار</label>
          <input class="input" name="name" required value="${esc(wh?.name || '')}"
                 placeholder="مثلاً: انبار مواد اولیه"></div>
        <div class="field"><label>کد</label>
          <input class="input" name="code" value="${esc(wh?.code || '')}" placeholder="RAW"></div>
      </div>
      <div class="row">
        <div class="field"><label>واحد سازمانی</label>
          <select class="select" name="unit_id">
            <option value="">— انبار مشترک، بدون واحد —</option>
            ${unitTree(state.units).map((o) => `<option value="${o.id}" ${wh?.unit_id === o.id ? 'selected' : ''}>${'┄'.repeat(o.depth)}${esc(o.name)}</option>`).join('')}
          </select>
          <p class="hint">انبارِ یک واحد را فقط افراد همان واحد و کسی با «دیدن همهٔ انبارها» می‌بینند</p></div>
        <div class="field"><label>انباردار</label>
          <select class="select" name="keeper_id">
            <option value="">— تعیین نشده —</option>
            ${state.users.filter((x) => x.is_active).map((x) => `<option value="${x.id}" ${wh?.keeper_id === x.id ? 'selected' : ''}>${esc(x.full_name)}</option>`).join('')}
          </select></div>
      </div>
      <div class="field"><label>نشانی</label>
        <input class="input" name="address" value="${esc(wh?.address || '')}"></div>
      ${wh ? `
      <div class="field"><label class="check">
        <input type="checkbox" name="is_active" ${wh.is_active ? 'checked' : ''}> انبار فعال است
      </label></div>` : ''}
      <button class="btn block" type="submit">${wh ? 'ذخیره' : 'ساخت انبار'}</button>
    </form>`);
}

/** اقلام سند را از DOM می‌خواند — چون ردیف‌ها پویا اضافه و کم می‌شوند */
function readStockLines() {
  const out = [];
  for (const row of document.querySelectorAll('#stock-lines .stock-line')) {
    const itemId = row.querySelector('[name="item"]').value;
    const qty = row.querySelector('[name="qty"]').value;
    if (!itemId && !qty) continue;
    out.push({ item_id: itemId, qty });
  }
  return out;
}

async function saveStockEntry(submit) {
  const form = $('form[data-form="stock-entry"]');
  if (!form) return;
  const fd = Object.fromEntries(new FormData(form));
  const kind = form.dataset.kind;
  const id = form.dataset.id;
  const lines = readStockLines();
  if (!lines.length) { toast('حداقل یک قلم کالا اضافه کنید', 'err'); return; }

  const iso = jalaliToIso(Number(fd.jy), Number(fd.jm), Number(fd.jd));
  const payload = {
    kind,
    entry_date: iso,
    from_warehouse_id: fd.from_warehouse_id || null,
    to_warehouse_id: fd.to_warehouse_id || null,
    party: fd.party || '',
    ref_no: fd.ref_no || '',
    note: fd.note || '',
    lines,
    submit,
  };
  const res = await guard(() => (id ? API.stock.updateEntry(id, payload) : API.stock.createEntry(payload)));
  if (!res) return;
  closeModal();
  toast(submit ? 'سند قطعی شد و در دفتر انبار نشست' : 'پیش‌نویس ذخیره شد', 'ok');
  await loadStockTab(state.stock.tab);
  if (state.stock.tab !== 'onhand') await loadStockTab('onhand');
  render();
}

// ───────────────────────────── گفت‌وگو ─────────────────────────────
//
// کشوی گفت‌وگو جدا از بدنهٔ صفحه رندر می‌شود. دلیلش ساده است: render() هر بار
// کل #root را از نو می‌سازد، و اگر گفت‌وگو داخل آن بود، هر تازه‌سازی پس‌زمینه
// نیمهٔ تایپ‌شدهٔ پیام و جای اسکرول را پاک می‌کرد.

const TZ = 'Asia/Tehran';

function tehranParts(iso) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const o = {};
  for (const p of f.formatToParts(new Date(iso))) o[p.type] = p.value;
  return o;
}
const msgDay = (iso) => { const p = tehranParts(iso); return `${p.year}-${p.month}-${p.day}`; };
const msgTime = (iso) => {
  const p = tehranParts(iso);
  const h = p.hour === '24' ? '00' : p.hour;
  return toFa(`${h}:${p.minute}`);
};

/** «۳ دقیقه پیش» برای فهرست گفت‌وگوها */
function sinceLabel(iso) {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'همین حالا';
  if (mins < 60) return `${toFa(mins)} دقیقه پیش`;
  if (msgDay(iso) === todayIso()) return msgTime(iso);
  const hours = Math.floor(mins / 60);
  if (hours < 48) return 'دیروز';
  return formatJalali(msgDay(iso));
}

function dayLabel(day) {
  if (day === todayIso()) return 'امروز';
  const y = new Date(new Date(`${todayIso()}T00:00:00Z`).getTime() - 864e5).toISOString().slice(0, 10);
  if (day === y) return 'دیروز';
  return formatJalali(day, { long: true, withDay: true });
}

function chatBadgeHtml(count) {
  return count ? `<span class="badge-dot">${toFa(count > 99 ? '99+' : count)}</span>` : '';
}

/** نشان نخوانده روی دکمه‌ها را بی‌رندر کامل به‌روز می‌کند */
function chatPaintBadges() {
  const total = state.chat.unread;
  document.querySelectorAll('[data-chat-badge]').forEach((el) => {
    el.innerHTML = chatBadgeHtml(total);
  });
}

function chatAvatar(name, id) {
  const palette = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--ok)', 'var(--info)'];
  let h = 0;
  for (const ch of String(id || name || '')) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return `<span class="chat-av" style="background:${palette[h % palette.length]}">${esc(initials(name))}</span>`;
}

function chatListHtml() {
  const list = state.chat.list;
  if (!list.length) {
    return '<div class="chat-empty"><p>هنوز گفت‌وگویی ندارید.<br>از دکمهٔ بالا شروع کنید.</p></div>';
  }
  const icon = { direct: '', unit: '⌂', group: '☷' };
  return list.map((c) => `
    <button class="chat-row ${c.id === state.chat.activeId ? 'active' : ''} ${c.unread ? 'unread' : ''}"
            data-action="chat-open" data-id="${c.id}">
      ${c.kind === 'direct' ? chatAvatar(c.title, c.peer_id) : `<span class="chat-av grp">${icon[c.kind]}</span>`}
      <span class="chat-row-mid">
        <b>${esc(c.title)}${c.muted ? ' <i class="muted-mark" title="بی‌صدا">⊘</i>' : ''}</b>
        <small>${c.last_preview
    ? `${c.kind !== 'direct' && c.last_sender_name ? `${esc(c.last_sender_name.split(/\s+/)[0])}: ` : ''}${esc(c.last_preview)}`
    : '<i>پیامی رد و بدل نشده</i>'}</small>
      </span>
      <span class="chat-row-end">
        <small>${sinceLabel(c.last_message_at)}</small>
        ${chatBadgeHtml(c.unread)}
      </span>
    </button>`).join('');
}

function chatMessagesHtml() {
  const msgs = state.chat.messages;
  const conv = state.chat.list.find((c) => c.id === state.chat.activeId);
  if (!conv) return '<div class="chat-empty"><p>یک گفت‌وگو را از فهرست انتخاب کنید.</p></div>';
  if (state.chat.loading) return '<div class="chat-empty"><p>در حال بارگذاری…</p></div>';
  if (!msgs.length) {
    return `<div class="chat-empty">
      <p>${conv.kind === 'direct' ? `اولین پیام را به ${esc(conv.title)} بنویسید.` : 'اولین پیام این گروه را بنویسید.'}</p>
    </div>`;
  }
  const me = state.user.id;
  const out = [];
  let lastDay = '';
  let lastSender = '';
  let lastAt = 0;
  for (const m of msgs) {
    const day = msgDay(m.created_at);
    if (day !== lastDay) {
      out.push(`<div class="chat-day"><span>${dayLabel(day)}</span></div>`);
      lastDay = day;
      lastSender = '';
    }
    const at = new Date(m.created_at).getTime();
    const grouped = m.sender_id === lastSender && at - lastAt < 5 * 60000;
    lastSender = m.sender_id;
    lastAt = at;
    const mine = m.sender_id === me;
    const reply = m.reply_to ? msgs.find((x) => x.id === m.reply_to) : null;

    out.push(`
      <div class="chat-msg ${mine ? 'mine' : ''} ${grouped ? 'grouped' : ''} ${m.pending ? 'pending' : ''}"
           data-msg="${m.id}">
        ${!mine && !grouped && conv.kind !== 'direct' ? chatAvatar(m.sender_name, m.sender_id) : ''}
        <div class="bubble">
          ${!mine && !grouped && conv.kind !== 'direct' ? `<b class="who">${esc(m.sender_name)}</b>` : ''}
          ${reply ? `<div class="quote"><b>${esc(reply.sender_name)}</b>${esc((reply.body || 'پیام حذف شد').slice(0, 80))}</div>` : ''}
          ${m.task_id ? `<button class="chat-task" data-action="open-task" data-id="${m.task_id}">
              ▤ ${esc(m.task_title || 'کار')}${m.task_code ? ` <small>#${toFa(m.task_code)}</small>` : ''}
            </button>` : ''}
          <div class="text">${m.deleted ? '<i class="gone">پیام حذف شد</i>' : chatText(m.body)}</div>
          <div class="meta">
            ${m.edited && !m.deleted ? '<i>ویرایش‌شده</i>' : ''}
            <span>${m.pending ? '…' : msgTime(m.created_at)}</span>
          </div>
          ${mine && !m.deleted && !m.pending ? `
            <div class="msg-tools">
              <button data-action="chat-edit" data-id="${m.id}" title="ویرایش">✎</button>
              <button data-action="chat-del" data-id="${m.id}" title="حذف">🗑</button>
            </div>` : ''}
          ${!m.deleted && !m.pending ? `<button class="msg-reply" data-action="chat-reply" data-id="${m.id}" title="پاسخ">↩</button>` : ''}
        </div>
      </div>`);
  }
  return out.join('');
}

/** متن پیام: @نام و نشانی اینترنتی را برجسته می‌کند، بقیه خنثی می‌ماند */
function chatText(body) {
  return esc(body)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|\s)@([a-zA-Z0-9._-]{3,32})/g, '$1<b class="at">@$2</b>')
    .replace(/\n/g, '<br>');
}

function chatDirectoryHtml() {
  const q = (state.chat.search || '').trim();
  const people = state.chat.directory.filter((p) => !q
    || p.full_name.includes(q) || (p.job_title || '').includes(q) || (p.unit_name || '').includes(q));
  const group = state.chat.pane === 'newgroup';
  const picked = state.chat.picked;
  return `
    <div class="chat-new">
      ${group ? `
        <div class="field">
          <label for="cg-title">نام گروه</label>
          <input class="input" id="cg-title" data-action="chat-group-title"
                 value="${esc(state.chat.groupTitle || '')}" placeholder="مثلاً هماهنگی تولید">
        </div>` : ''}
      <input class="input" data-action="chat-search" value="${esc(q)}"
             placeholder="جست‌وجوی نام همکار…" autocomplete="off">
      ${can('chat.group') ? `
        <button class="btn ghost sm block" data-action="${group ? 'chat-new' : 'chat-new-group'}">
          ${group ? 'گفت‌وگوی دونفره' : '☷ ساخت گروه دلخواه'}
        </button>` : ''}
      <div class="chat-people">
        ${people.length ? people.map((p) => `
          <button class="chat-row ${group && picked.includes(p.id) ? 'picked' : ''}"
                  data-action="${group ? 'chat-pick' : 'chat-start'}" data-id="${p.id}">
            ${chatAvatar(p.full_name, p.id)}
            <span class="chat-row-mid">
              <b>${esc(p.full_name)}</b>
              <small>${esc(p.job_title || '—')}${p.unit_name ? ` · واحد ${esc(p.unit_name)}` : ''}</small>
            </span>
            ${group ? `<span class="chat-row-end">${picked.includes(p.id) ? '✓' : '+'}</span>` : ''}
          </button>`).join('')
    : '<div class="chat-empty"><p>همکاری با این نام پیدا نشد.</p></div>'}
      </div>
      ${group ? `
        <button class="btn block" data-action="chat-make-group"
                ${picked.length ? '' : 'disabled'}>
          ساخت گروه${picked.length ? ` با ${toFa(picked.length)} نفر` : ''}
        </button>` : ''}
    </div>`;
}

function chatHeadHtml() {
  const { pane } = state.chat;
  if (pane === 'new' || pane === 'newgroup') {
    return `
      <button class="chat-back" data-action="chat-back">→</button>
      <div class="chat-head-mid"><b>${pane === 'newgroup' ? 'گروه تازه' : 'گفت‌وگوی تازه'}</b></div>
      <button class="chat-x" data-action="chat-close" title="بستن">✕</button>`;
  }
  const conv = state.chat.list.find((c) => c.id === state.chat.activeId);
  if (pane === 'thread' && conv) {
    return `
      <button class="chat-back" data-action="chat-back">→</button>
      <div class="chat-head-mid">
        <b>${esc(conv.title)}</b>
        <small>${esc(conv.kind === 'direct' ? (conv.subtitle || '') : conv.members.map((m) => m.full_name.split(/\s+/)[0]).slice(0, 4).join('، '))}</small>
      </div>
      <button class="chat-x" data-action="chat-mute" data-id="${conv.id}"
              title="${conv.muted ? 'صدادار کردن' : 'بی‌صدا کردن'}">${conv.muted ? '⊘' : '🔔'}</button>
      ${conv.kind !== 'unit' ? `<button class="chat-x" data-action="chat-leave" data-id="${conv.id}" title="ترک گفت‌وگو">⎋</button>` : ''}
      <button class="chat-x" data-action="chat-close" title="بستن">✕</button>`;
  }
  return `
    <div class="chat-head-mid"><b>گفت‌وگو</b>
      <small>${state.chat.unread ? `${toFa(state.chat.unread)} پیام نخوانده` : 'پیام نخوانده‌ای ندارید'}</small>
    </div>
    <button class="chat-x" data-action="chat-close" title="بستن">✕</button>`;
}

function chatComposerHtml() {
  const conv = state.chat.list.find((c) => c.id === state.chat.activeId);
  if (!conv) return '';
  const reply = state.chat.replyTo
    ? state.chat.messages.find((m) => m.id === state.chat.replyTo) : null;
  const editing = state.chat.editing
    ? state.chat.messages.find((m) => m.id === state.chat.editing) : null;
  return `
    <form class="chat-composer" data-form="chat-send">
      ${reply ? `<div class="composer-ctx">
        <span>پاسخ به <b>${esc(reply.sender_name)}</b>: ${esc((reply.body || '').slice(0, 60))}</span>
        <button type="button" class="x-btn" data-action="chat-reply-clear">✕</button>
      </div>` : ''}
      ${editing ? `<div class="composer-ctx edit">
        <span>ویرایش پیام</span>
        <button type="button" class="x-btn" data-action="chat-edit-clear">✕</button>
      </div>` : ''}
      <textarea name="body" rows="1" placeholder="پیام بنویسید…" autocomplete="off"></textarea>
      <button class="chat-send" type="submit" title="فرستادن">➤</button>
    </form>`;
}

function chatRenderAll() {
  const box = $('#chat');
  if (!box) return;
  if (!state.chat.open || !state.user || !can('chat.use')) { box.innerHTML = ''; return; }
  const { pane } = state.chat;
  const draft = state.chat.draft || '';
  box.innerHTML = `
    <div class="chat-drawer">
      <div class="chat-backdrop" data-action="chat-close"></div>
      <section class="chat-panel pane-${pane}${state.chat.animate ? ' enter' : ''}">
        <header class="chat-head">${chatHeadHtml()}</header>
        <div class="chat-body">
          <aside class="chat-side">
            ${pane === 'new' || pane === 'newgroup' ? '' : `
            <div class="chat-side-top">
              <button class="btn new sm block" data-action="chat-new">✎ گفت‌وگوی تازه</button>
            </div>`}
            <div class="chat-list">${pane === 'new' || pane === 'newgroup' ? chatDirectoryHtml() : chatListHtml()}</div>
          </aside>
          <div class="chat-thread">
            <div class="chat-msgs" id="chat-msgs">${chatMessagesHtml()}</div>
            ${chatComposerHtml()}
          </div>
        </div>
      </section>
    </div>`;
  // انیمیشن فقط هنگام باز شدن کشو، نه در هر بار رندر دوباره — وگرنه با هر
  // رفت‌وبرگشت بین فهرست و گفت‌وگو، کل پنل چشمک می‌زند.
  state.chat.animate = false;
  const ta = $('#chat textarea[name="body"]');
  if (ta) {
    ta.value = draft;
    chatGrow(ta);
    if (state.chat.focusComposer) { ta.focus(); state.chat.focusComposer = false; }
  }
  chatScrollEnd();
}

/** فقط فهرست — برای وقتی خبر تازه رسید و نباید کادر نوشتن پیام دست بخورد */
function chatRenderList() {
  const el = $('#chat .chat-list');
  if (el && state.chat.pane !== 'new' && state.chat.pane !== 'newgroup') el.innerHTML = chatListHtml();
  const head = $('#chat .chat-head');
  if (head) head.innerHTML = chatHeadHtml();
}

function chatRenderMessages({ keepScroll = false } = {}) {
  const box = $('#chat-msgs');
  if (!box) return;
  const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  box.innerHTML = chatMessagesHtml();
  if (!keepScroll || atEnd) chatScrollEnd();
}

function chatScrollEnd() {
  const box = $('#chat-msgs');
  if (box) box.scrollTop = box.scrollHeight;
}

function chatGrow(ta) {
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(140, ta.scrollHeight)}px`;
}

async function chatLoadList({ quiet = false } = {}) {
  const d = await guard(() => API.chat.list(), { silent: quiet });
  if (!d) return;
  state.chat.list = d.conversations;
  state.chat.unread = d.unread;
  chatPaintBadges();
}

async function chatOpen() {
  if (!can('chat.use')) { toast('گفت‌وگو برای شما فعال نیست', 'err'); return; }
  state.chat.open = true;
  state.chat.animate = true;
  state.chat.pane = state.chat.activeId ? 'thread' : 'list';
  chatRenderAll();
  await chatLoadList();
  if (state.chat.activeId && state.chat.list.some((c) => c.id === state.chat.activeId)) {
    await chatOpenConv(state.chat.activeId);
  } else {
    state.chat.activeId = null;
    state.chat.pane = 'list';
    chatRenderAll();
  }
  chatSchedule();
}

function chatClose() {
  state.chat.open = false;
  state.chat.pane = 'list';
  chatRenderAll();
  chatSchedule();
}

async function chatOpenConv(id) {
  state.chat.activeId = id;
  state.chat.pane = 'thread';
  state.chat.replyTo = null;
  state.chat.editing = null;
  state.chat.draft = '';
  state.chat.loading = true;
  state.chat.messages = [];
  chatRenderAll();
  const d = await guard(() => API.chat.messages(id, { limit: 60 }));
  state.chat.loading = false;
  if (!d) { chatRenderMessages(); return; }
  state.chat.messages = d.messages;
  state.chat.lastAt = d.messages.length ? d.messages[d.messages.length - 1].created_at : null;
  const row = state.chat.list.find((c) => c.id === id);
  if (row) {
    state.chat.unread = Math.max(0, state.chat.unread - row.unread);
    row.unread = 0;
  }
  state.chat.focusComposer = !('ontouchstart' in window);
  chatRenderAll();
  chatPaintBadges();
}

async function chatSend(text) {
  const id = state.chat.activeId;
  if (!id || !text.trim()) return;
  if (state.chat.editing) {
    const mid = state.chat.editing;
    const res = await guard(() => API.chat.editMessage(mid, text.trim()));
    state.chat.editing = null;
    state.chat.draft = '';
    if (res) {
      const m = state.chat.messages.find((x) => x.id === mid);
      if (m) { m.body = text.trim(); m.edited = true; }
    }
    chatRenderAll();
    await chatLoadList({ quiet: true });
    chatRenderList();
    return;
  }
  const tmp = {
    id: `tmp-${Date.now()}`,
    sender_id: state.user.id,
    sender_name: state.user.full_name,
    body: text.trim(),
    created_at: new Date().toISOString(),
    pending: true,
    reply_to: state.chat.replyTo || null,
  };
  state.chat.messages.push(tmp);
  const replyTo = state.chat.replyTo;
  state.chat.replyTo = null;
  state.chat.draft = '';
  chatRenderAll();

  const d = await guard(() => API.chat.send(id, { body: tmp.body, reply_to: replyTo }));
  state.chat.messages = state.chat.messages.filter((m) => m.id !== tmp.id);
  if (d) {
    state.chat.messages.push(d.message);
    state.chat.lastAt = d.message.created_at;
  } else {
    toast('پیام فرستاده نشد — دوباره تلاش کنید', 'err');
    state.chat.draft = tmp.body;
  }
  chatRenderAll();
  await chatLoadList({ quiet: true });
  chatRenderList();
}

/** گرفتن مداوم خبر: سبک، و وقتی برگه پیدا نیست کم‌کارتر */
function chatSchedule() {
  clearTimeout(state.chat.timer);
  if (!state.user || !can('chat.use')) return;
  const ms = document.hidden ? 60000 : (state.chat.open ? 5000 : 20000);
  state.chat.timer = setTimeout(async () => {
    await chatTick();
    chatSchedule();
  }, ms);
}

async function chatTick() {
  if (!state.user || !can('chat.use')) return;
  const d = await guard(() => API.chat.unread(), { silent: true });
  if (!d) return;
  const before = state.chat.unread;
  state.chat.unread = d.total;
  for (const c of state.chat.list) {
    c.unread = d.items.find((x) => x.id === c.id)?.unread || 0;
  }
  if (before !== d.total) chatPaintBadges();

  // گفت‌وگوی باز: فقط پیام‌های تازه را می‌گیریم، نه کل رشته را
  if (state.chat.open && state.chat.activeId) {
    const after = state.chat.lastAt;
    const res = await guard(() => API.chat.messages(state.chat.activeId,
      after ? { after } : { limit: 60 }), { silent: true });
    if (res && res.messages.length) {
      const have = new Set(state.chat.messages.map((m) => m.id));
      const fresh = res.messages.filter((m) => !have.has(m.id));
      if (fresh.length) {
        state.chat.messages.push(...fresh);
        state.chat.lastAt = fresh[fresh.length - 1].created_at;
        chatRenderMessages({ keepScroll: true });
      }
    }
    if (d.total !== state.chat.unread || state.chat.list.some((c) => c.unread)) chatRenderList();
  } else if (state.chat.open) {
    await chatLoadList({ quiet: true });
    chatRenderList();
  } else if (before !== d.total) {
    await chatLoadList({ quiet: true });
  }
}

async function chatStartDirect(userId) {
  const d = await guard(() => API.chat.direct(userId));
  if (!d) return;
  const exists = state.chat.list.find((c) => c.id === d.conversation.id);
  if (!exists) state.chat.list.unshift(d.conversation);
  state.chat.pane = 'thread';
  await chatOpenConv(d.conversation.id);
}

async function chatShowDirectory(group = false) {
  state.chat.pane = group ? 'newgroup' : 'new';
  state.chat.search = '';
  if (group) state.chat.picked = [];
  chatRenderAll();
  if (!state.chat.directory.length) {
    const d = await guard(() => API.chat.directory());
    if (d) state.chat.directory = d.people;
    chatRenderAll();
  }
}

// ───────────────────────────── رندر ─────────────────────────────

function render() {
  const root = $('#root');
  if (!state.user) { root.innerHTML = loginView(); return; }
  let inner = '';
  switch (state.view) {
    case 'myday': inner = mydayView(); break;
    case 'board': inner = boardView(); break;
    case 'workload': inner = workloadView(); break;
    case 'review': inner = reviewView(); break;
    case 'units': inner = unitsView(); break;
    case 'stock': inner = stockView(); break;
    case 'unitprod': inner = unitProdView(); break;
    case 'unitreport': inner = unitReportView(); break;
    case 'time': inner = timeView(); break;
    case 'approvals': inner = approvalsView(); break;
    case 'team': inner = teamView(); break;
    case 'scores': inner = scoresView(); break;
    case 'recurring': inner = recurringView(); break;
    case 'profile': inner = profileView(); break;
    default: inner = dashboardView();
  }
  root.innerHTML = shell(inner);
  if (state.view === 'board') wireDragDrop();
  chatPaintBadges();
}

async function refresh() {
  await loadAll();
  render();
}

async function setView(view) {
  state.view = view;
  closeModal();
  if (view === 'workload') {
    const d = await guard(() => API.workload(), { silent: true });
    if (d) state.workload = d;
  } else if (view === 'recurring') {
    const d = await guard(() => API.recurrences.list(), { silent: true });
    if (d) state.recurrences = d.recurrences;
  } else if (view === 'myday') {
    const d = await guard(() => API.myday(), { silent: true });
    if (d) state.myday = d;
  } else if (view === 'approvals') {
    const d = await guard(() => API.timelogs.list({ status: 'pending' }), { silent: true });
    if (d) state.logs = d.logs;
  } else if (view === 'review') {
    const d = await guard(() => API.review.list(), { silent: true });
    if (d) state.reviewQueue = d.tasks;
  } else if (view === 'team' && can('users.manage')) {
    const d = await guard(() => API.notify.status(), { silent: true });
    if (d) state.notifyStatus = d;
  } else if (view === 'stock') {
    await loadStock();
    await loadStockTab(state.stock.tab);
    // فهرست کالاها برای ساختن سند لازم است، حتی وقتی زبانهٔ دیگری باز است
    if (state.stock.tab !== 'items' && can('stock.entry')) await loadStockTab('items');
  } else if (view === 'units') {
    const d = await guard(() => API.units.list(), { silent: true });
    if (d) { state.units = d.units; state.managedUnits = d.managed || []; }
  } else if (view === 'unitreport') {
    const d = await guard(() => API.reports.units({ jy: state.month.jy, jm: state.month.jm }));
    if (d) state.unitReport = d;
  } else if (view === 'time') {
    const d = await guard(() => API.timelogs.list(
      can('time.view_all') ? { jy: state.month.jy, jm: state.month.jm, user_id: state.logUser || '' }
        : { jy: state.month.jy, jm: state.month.jm },
    ), { silent: true });
    if (d) state.logs = d.logs;
  }
  render();
  window.scrollTo(0, 0);
}

// ───────────────────────────── کشیدن و رها کردن ─────────────────────────────

function wireDragDrop() {
  let dragId = null;
  document.querySelectorAll('.task[draggable]').forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      dragId = card.dataset.task;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
    });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); dragId = null; });
  });
  document.querySelectorAll('[data-drop]').forEach((zone) => {
    const col = zone.closest('.column');
    zone.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drop-target'); });
    zone.addEventListener('dragleave', () => col.classList.remove('drop-target'));
    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drop-target');
      const id = dragId || e.dataTransfer.getData('text/plain');
      if (id) await moveTask(id, zone.dataset.drop);
    });
  });
}

async function moveTask(id, columnId) {
  const task = state.board.tasks.find((t) => t.id === id);
  if (!task || task.column_id === columnId) return;
  const prev = task.column_id;
  task.column_id = columnId;           // خوش‌بینانه
  render();
  const res = await guard(() => API.tasks.update(id, { column_id: columnId }));
  if (!res) { task.column_id = prev; render(); return; }
  const col = state.board.columns.find((c) => c.id === columnId);
  toast(`منتقل شد به «${col.title}»`, 'ok');
  await refresh();
}

// ───────────────────────────── رویدادها ─────────────────────────────

document.addEventListener('click', async (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    closeModal();
    // گفت‌وگو صفحه را عوض نمی‌کند — روی همان کاری که باز است می‌نشیند
    if (nav.dataset.nav === 'chat') { await chatOpen(); return; }
    await setView(nav.dataset.nav);
    return;
  }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  switch (action) {
    case 'logout':
      await guard(() => API.logout());
      state.user = null; state.view = 'dashboard';
      clearTimeout(state.chat.timer);
      Object.assign(state.chat, {
        open: false, pane: 'list', list: [], activeId: null, messages: [],
        lastAt: null, unread: 0, directory: [], picked: [], draft: '',
        replyTo: null, editing: null,
      });
      chatRenderAll();
      closeModal(); render();
      break;

    case 'close-modal': closeModal(); break;

    case 'demo-reset':
      if (window.confirm('همهٔ داده‌های روی این دستگاه پاک شود و دادهٔ نمونه از نو ساخته شود؟')
        && typeof window.karnamaReset === 'function') window.karnamaReset();
      break;

    case 'demo-reset-empty':
      if (window.confirm('همه‌چیز پاک شود و فقط حساب مدیر بماند؟ هیچ واحد، کار، کالا یا انباری نخواهد ماند.')
        && typeof window.karnamaResetEmpty === 'function') window.karnamaResetEmpty();
      break;

    case 'filter':
      state.filterMine = btn.dataset.v === 'mine';
      render();
      break;

    case 'new-task': taskFormModal(); break;
    case 'new-column': {
      const title = prompt('عنوان ستون جدید:');
      if (!title) break;
      if (await guard(() => API.board.addColumn({ title }))) { toast('ستون اضافه شد', 'ok'); await refresh(); }
      break;
    }
    case 'open-task': await openTaskModal(id); break;
    case 'edit-task': {
      const t = state.board.tasks.find((x) => x.id === id);
      if (t) taskFormModal(t);
      break;
    }
    case 'del-task':
      if (!confirm('این کار حذف شود؟')) break;
      if (await guard(() => API.tasks.remove(id))) { closeModal(); toast('حذف شد', 'ok'); await refresh(); }
      break;
    case 'move': {
      const t = state.board.tasks.find((x) => x.id === id);
      const idx = state.board.columns.findIndex((c) => c.id === t.column_id);
      const next = state.board.columns[idx + Number(btn.dataset.dir)];
      if (next) await moveTask(id, next.id);
      break;
    }
    case 'move-to':
      closeModal();
      await moveTask(id, btn.dataset.col);
      break;

    case 'review':
      if (await guard(() => API.timelogs.update(id, { status: btn.dataset.status }))) {
        toast(btn.dataset.status === 'approved' ? 'تأیید شد' : 'رد شد', 'ok');
        await setView(state.view);
        await loadAll(); render();
      }
      break;
    case 'review-all': {
      const ids = state.logs.filter((l) => l.status === 'pending').map((l) => l.id);
      if (!ids.length) break;
      const st = btn.dataset.status;
      if (!confirm(`${toFa(ids.length)} رکورد ${st === 'approved' ? 'تأیید' : 'رد'} شود؟`)) break;
      if (await guard(() => API.timelogs.review(ids, st))) {
        toast('انجام شد', 'ok'); await setView('approvals'); await loadAll(); render();
      }
      break;
    }
    case 'del-log':
      if (!confirm('این رکورد حذف شود؟')) break;
      if (await guard(() => API.timelogs.remove(id))) { toast('حذف شد', 'ok'); await setView(state.view); }
      break;

    // ── ساختار سازمانی و چرخهٔ بررسی ──
    case 'new-unit': unitFormModal(); break;
    case 'edit-unit': unitFormModal(state.units.find((u) => u.id === id)); break;
    case 'archive-unit': {
      const un = state.units.find((u) => u.id === id);
      if (!confirm(`واحد «${un?.name || ''}» بایگانی شود؟\n\n`
        + 'سوابق و امتیازهای این واحد دست‌نخورده می‌ماند، ولی دیگر نمی‌توان کار جدیدی به آن سپرد. '
        + 'اعضای آن باید به واحد دیگری منتقل شوند.')) break;
      if (await guard(() => API.units.update(id, { archived: true }))) {
        closeModal(); toast('واحد بایگانی شد', 'ok'); await setView('units');
      }
      break;
    }
    case 'unit-prod': {
      const d = await guard(() => API.units.productivity(id, { jy: state.month.jy, jm: state.month.jm }));
      if (!d) break;
      state.unitView = d; state.view = 'unitprod'; closeModal(); render(); window.scrollTo(0, 0);
      break;
    }
    case 'back-units': await setView('units'); break;

    case 'submit-task':
      if (!confirm('این کار برای بررسی و امتیازدهی به سرپرست شما فرستاده شود؟\n\n'
        + 'تا تصمیم سرپرست، کار در کارتابل او می‌ماند و شما نمی‌توانید آن را دوباره بفرستید.')) break;
      if (await guard(() => API.review.submit(id))) {
        closeModal(); toast('برای بررسی فرستاده شد', 'ok'); await refresh();
      }
      break;

    case 'return-task': {
      const form = btn.closest('form');
      const why = form.querySelector('[name="justification"]').value.trim();
      if (why.length < 10) {
        toast('برای برگرداندن کار بنویسید چه چیزی باید اصلاح شود — دست‌کم ۱۰ نویسه', 'danger');
        form.querySelector('[name="justification"]').focus();
        break;
      }
      if (await guard(() => API.review.decide(id, { decision: 'returned', comment: why }))) {
        toast('کار برای اصلاح برگشت', 'ok'); await setView('review');
      }
      break;
    }

    case 'new-user': userFormModal(); break;
    case 'edit-user': userFormModal(state.users.find((u) => u.id === id)); break;
    case 'perm-user': userFormModal(state.users.find((u) => u.id === id), true); break;
    case 'del-user': await deleteUserModal(id); break;
    case 'deactivate-instead':
      if (await guard(() => API.users.update(id, { is_active: false }))) {
        closeModal();
        toast('حساب غیرفعال شد — سوابقش دست‌نخورده ماند', 'ok');
        await refresh();
      }
      break;
    case 'test-notify': {
      const field = btn.closest('.field')?.querySelector('[name="chat_id"]');
      const typed = field ? field.value.trim() : '';
      const saved = state.users.find((x) => x.id === id)?.chat_id || '';
      if (typed && typed !== saved) {
        if (!(await guard(() => API.users.update(id, { chat_id: typed })))) break;
        await guard(() => API.users.list(), { silent: true })
          .then((d) => { if (d) state.users = d.users; });
      }
      const r = await guard(() => API.notify.test(id));
      if (r) toast('پیام آزمایشی فرستاده شد — گوشی را نگاه کنید', 'ok');
      break;
    }
    case 'reset-pw': {
      const pw = prompt('رمز جدید (حداقل ۶ نویسه):', 'karnama1404');
      if (!pw) break;
      if (await guard(() => API.users.setPassword(id, pw))) toast('رمز عوض شد', 'ok');
      break;
    }
    case 'score-user': scoreFormModal(id); break;

    case 'bell':
      await guard(() => API.notifications.list(), { silent: true }).then((d) => {
        if (d) { state.notifications = d.notifications; state.unread = d.unread; }
      });
      notificationsModal();
      if (state.unread) {
        await guard(() => API.notifications.markRead(), { silent: true });
        state.unread = 0;
        // دقت: دکمهٔ گفت‌وگو هم کلاس bell دارد، پس باید با همین انتخابگر دقیق سراغش رفت
        const b = $('[data-action="bell"]');
        if (b) { b.classList.remove('has'); b.innerHTML = '🔔'; }
      }
      break;
    case 'read-all':
      await guard(() => API.notifications.markRead());
      state.unread = 0; closeModal(); render();
      break;
    case 'more-menu': moreMenuModal(); break;

    // ───── انبار ─────
    case 'stock-tab':
      state.stock.tab = id;
      await loadStockTab(id);
      render();
      break;
    case 'stock-new-entry': stockEntryModal('receipt'); break;
    case 'stock-kind': stockEntryModal(id); break;
    case 'stock-line-add': {
      const box = $('#stock-lines');
      if (box) {
        box.insertAdjacentHTML('beforeend', stockLineRowHtml({}, box.children.length));
      }
      break;
    }
    case 'stock-line-del': {
      const row = e.target.closest('.stock-line');
      const box = $('#stock-lines');
      if (row && box && box.children.length > 1) row.remove();
      else if (row) { row.querySelector('[name="item"]').value = ''; row.querySelector('[name="qty"]').value = ''; }
      break;
    }
    case 'stock-save-draft': await saveStockEntry(false); break;
    case 'stock-save-submit': await saveStockEntry(true); break;
    case 'stock-entry-open': {
      const d = await guard(() => API.stock.entry(id));
      if (d) stockEntryDetailModal(d.entry);
      break;
    }
    case 'stock-edit-entry': {
      const d = await guard(() => API.stock.entry(id));
      if (d) stockEntryModal(d.entry.kind, d.entry);
      break;
    }
    case 'stock-del-entry': {
      if (!window.confirm('این پیش‌نویس حذف شود؟')) break;
      const d = await guard(() => API.stock.removeEntry(id));
      if (!d) break;
      closeModal();
      toast('پیش‌نویس حذف شد', 'ok');
      await loadStockTab(state.stock.tab);
      render();
      break;
    }
    case 'stock-submit-entry': {
      const d = await guard(() => API.stock.submitEntry(id));
      if (!d) break;
      closeModal();
      toast('سند قطعی شد و در دفتر انبار نشست', 'ok');
      await loadStock();
      await loadStockTab(state.stock.tab);
      render();
      break;
    }
    case 'stock-cancel-entry': {
      const reason = window.prompt('دلیل ابطال این سند چیست؟ (در سابقه می‌ماند)');
      if (reason === null) break;
      if (reason.trim().length < 5) { toast('دلیل ابطال را کامل‌تر بنویسید', 'err'); break; }
      const d = await guard(() => API.stock.cancelEntry(id, reason.trim()));
      if (!d) break;
      closeModal();
      toast('سند باطل شد و سطرهای معکوس در دفتر نوشته شد', 'ok');
      await loadStock();
      await loadStockTab(state.stock.tab);
      render();
      break;
    }
    case 'stock-card': await stockCardModal(id); break;
    case 'stock-new-item': stockItemModal(); break;
    case 'stock-edit-item':
      stockItemModal((state.stock.items || []).find((x) => x.id === id));
      break;
    case 'stock-new-warehouse': stockWarehouseModal(); break;
    case 'stock-edit-warehouse':
      stockWarehouseModal((state.stock.warehouseCards || []).find((x) => x.id === id));
      break;

    // ───── گفت‌وگو ─────
    case 'chat-toggle':
      if (state.chat.open) chatClose(); else await chatOpen();
      break;
    case 'chat-close': chatClose(); break;
    case 'chat-open': await chatOpenConv(id); break;
    case 'chat-back':
      if (state.chat.pane === 'thread') { state.chat.activeId = null; state.chat.pane = 'list'; } else { state.chat.pane = state.chat.activeId ? 'thread' : 'list'; }
      chatRenderAll();
      break;
    case 'chat-new': await chatShowDirectory(false); break;
    case 'chat-new-group': await chatShowDirectory(true); break;
    case 'chat-start': await chatStartDirect(id); break;
    case 'chat-pick':
      state.chat.picked = state.chat.picked.includes(id)
        ? state.chat.picked.filter((x) => x !== id)
        : [...state.chat.picked, id];
      chatRenderAll();
      break;
    case 'chat-make-group': {
      const title = (state.chat.groupTitle || '').trim();
      if (title.length < 2) { toast('نام گروه را بنویسید', 'err'); break; }
      const d = await guard(() => API.chat.group(title, state.chat.picked));
      if (!d) break;
      state.chat.groupTitle = '';
      state.chat.picked = [];
      state.chat.list.unshift(d.conversation);
      await chatOpenConv(d.conversation.id);
      toast('گروه ساخته شد', 'ok');
      break;
    }
    case 'chat-reply':
      state.chat.replyTo = id;
      state.chat.editing = null;
      state.chat.focusComposer = true;
      chatRenderAll();
      break;
    case 'chat-reply-clear': state.chat.replyTo = null; chatRenderAll(); break;
    case 'chat-edit': {
      const m = state.chat.messages.find((x) => x.id === id);
      if (!m) break;
      state.chat.editing = id;
      state.chat.replyTo = null;
      state.chat.draft = m.body;
      state.chat.focusComposer = true;
      chatRenderAll();
      break;
    }
    case 'chat-edit-clear':
      state.chat.editing = null;
      state.chat.draft = '';
      chatRenderAll();
      break;
    case 'chat-del': {
      if (!window.confirm('این پیام حذف شود؟')) break;
      const res = await guard(() => API.chat.removeMessage(id));
      if (!res) break;
      const m = state.chat.messages.find((x) => x.id === id);
      if (m) { m.deleted = true; m.body = ''; }
      chatRenderMessages({ keepScroll: true });
      await chatLoadList({ quiet: true });
      chatRenderList();
      break;
    }
    case 'chat-mute': {
      const conv = state.chat.list.find((c) => c.id === id);
      if (!conv) break;
      const res = await guard(() => API.chat.mute(id, !conv.muted));
      if (!res) break;
      conv.muted = !conv.muted;
      toast(conv.muted ? 'این گفت‌وگو بی‌صدا شد' : 'صدای این گفت‌وگو برگشت', 'ok');
      chatRenderAll();
      break;
    }
    case 'chat-leave': {
      if (!window.confirm('از این گفت‌وگو بیرون می‌آیید؟')) break;
      const res = await guard(() => API.chat.leave(id));
      if (!res) break;
      state.chat.list = state.chat.list.filter((c) => c.id !== id);
      state.chat.activeId = null;
      state.chat.pane = 'list';
      chatRenderAll();
      break;
    }

    case 'pick-board':
      state.boardId = id;
      closeModal();
      await refresh();
      break;
    case 'new-board': {
      const name = prompt('نام پروژهٔ جدید:');
      if (!name) break;
      if (await guard(() => API.boards.create({ name }))) {
        toast('پروژه ساخته شد', 'ok');
        const d = await guard(() => API.boards.list(), { silent: true });
        if (d) { state.boards = d.boards; state.boardId = d.boards[d.boards.length - 1].id; }
        await refresh();
      }
      break;
    }

    case 'advance': {
      const t = (state.myday && [].concat(...Object.values(state.myday.groups)).find((x) => x.id === id))
        || state.board?.tasks.find((x) => x.id === id);
      if (!t) break;
      const cols = state.board?.columns || [];
      const i = cols.findIndex((c) => c.id === t.column_id);
      if (i >= 0 && cols[i + 1]) await moveTask(id, cols[i + 1].id);
      else toast('ستون بعدی وجود ندارد');
      break;
    }

    case 'toggle-check': break; // در رویداد change مدیریت می‌شود
    case 'del-check':
      if (await guard(() => API.tasks.delCheck(id))) {
        await openTaskModal(state.openTask.task.id);
        await refresh();
      }
      break;
    case 'del-link':
      if (await guard(() => API.tasks.delLink(id))) await openTaskModal(state.openTask.task.id);
      break;
    case 'pick-labels': labelPickerModal(id); break;
    case 'manage-labels': labelManagerModal(); break;
    case 'del-label':
      if (!confirm('این برچسب از همهٔ کارها حذف شود؟')) break;
      if (await guard(() => API.labels.remove(id))) { toast('حذف شد', 'ok'); await refresh(); labelManagerModal(); }
      break;
    case 'new-subtask':
      closeModal();
      taskFormModal(null, id);
      break;

    case 'new-recurrence': recurrenceFormModal(); break;
    case 'toggle-recurrence':
      if (await guard(() => API.recurrences.update(id, { is_active: btn.dataset.v === '1' }))) {
        await setView('recurring');
      }
      break;
    case 'del-recurrence':
      if (!confirm('این کار تکرارشونده حذف شود؟ (کارهای ساخته‌شده باقی می‌مانند)')) break;
      if (await guard(() => API.recurrences.remove(id))) { toast('حذف شد', 'ok'); await setView('recurring'); }
      break;

    case 'quick-log':
      await setView('time');
      break;

    case 'due-quick': {
      const form = btn.closest('form');
      const iso = new Date(new Date(todayIso() + 'T00:00:00Z').getTime() + Number(btn.dataset.d) * 864e5)
        .toISOString().slice(0, 10);
      const j = isoToJalali(iso);
      form.querySelector('[name="due_jd"]').value = j.jd;
      form.querySelector('[name="due_jm"]').value = j.jm;
      form.querySelector('[name="due_jy"]').value = j.jy;
      break;
    }

    case 'tab': {
      const form = btn.closest('form');
      form.querySelectorAll('[data-action="tab"]').forEach((b) => b.classList.toggle('active', b === btn));
      form.querySelectorAll('[data-pane]').forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== btn.dataset.tab));
      break;
    }
    case 'preset': {
      const form = btn.closest('form');
      const keys = PRESETS[btn.dataset.preset].keys;
      form.querySelectorAll('input[name="perm"]').forEach((cb) => { cb.checked = keys.includes(cb.value); });
      syncGroupToggles(form);
      toast(`قالب «${PRESETS[btn.dataset.preset].label}» اعمال شد`);
      break;
    }
    default: break;
  }
});

let searchTimer = null;
document.addEventListener('input', (e) => {
  if (e.target.matches('[data-slider]')) {
    const key = e.target.dataset.outId || e.target.name;
    const out = e.target.form.querySelector(`[data-out="${key}"]`);
    if (out) out.textContent = toFa(e.target.value);
  }
  // کادر نوشتن پیام: متن را در حافظه نگه می‌داریم تا تازه‌سازی پس‌زمینه نبلعدش
  if (e.target.matches('#chat textarea[name="body"]')) {
    state.chat.draft = e.target.value;
    chatGrow(e.target);
    return;
  }
  // جست‌وجوی انبار فقط بدنهٔ جدول را عوض می‌کند. render() کامل، کادر جست‌وجو را
  // از نو می‌سازد و تمرکز و مکان‌نما می‌پرد — یعنی حرف دوم دیگر تایپ نمی‌شود.
  if (e.target.dataset.action === 'stock-search') {
    state.stock.search = e.target.value;
    const tbody = $('#stock-onhand tbody');
    if (tbody) tbody.innerHTML = stockOnHandRows();
    return;
  }
  if (e.target.dataset.action === 'stock-warehouse-filter') {
    state.stock.filterWarehouse = e.target.value;
    loadStockTab('onhand').then(render);
    return;
  }
  if (e.target.dataset.action === 'stock-entry-status') {
    state.stock.entryStatus = e.target.value;
    loadStockTab('entries').then(render);
    return;
  }
  if (e.target.dataset.action === 'chat-search') {
    state.chat.search = e.target.value;
    const el = $('#chat .chat-people');
    if (el) {
      const q = state.chat.search.trim();
      const group = state.chat.pane === 'newgroup';
      const people = state.chat.directory.filter((p) => !q
        || p.full_name.includes(q) || (p.job_title || '').includes(q) || (p.unit_name || '').includes(q));
      el.innerHTML = people.length ? people.map((p) => `
        <button class="chat-row ${group && state.chat.picked.includes(p.id) ? 'picked' : ''}"
                data-action="${group ? 'chat-pick' : 'chat-start'}" data-id="${p.id}">
          ${chatAvatar(p.full_name, p.id)}
          <span class="chat-row-mid">
            <b>${esc(p.full_name)}</b>
            <small>${esc(p.job_title || '—')}${p.unit_name ? ` · واحد ${esc(p.unit_name)}` : ''}</small>
          </span>
          ${group ? `<span class="chat-row-end">${state.chat.picked.includes(p.id) ? '✓' : '+'}</span>` : ''}
        </button>`).join('')
        : '<div class="chat-empty"><p>همکاری با این نام پیدا نشد.</p></div>';
    }
    return;
  }
  if (e.target.dataset.action === 'chat-group-title') {
    state.chat.groupTitle = e.target.value;
    const btn = $('#chat [data-action="chat-make-group"]');
    if (btn) btn.disabled = !(state.chat.picked.length && e.target.value.trim().length >= 2);
    return;
  }
  if (e.target.dataset.action === 'search') {
    state.search = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const pos = e.target.selectionStart;
      render();
      const box = $('[data-action="search"]');
      if (box) { box.focus(); box.setSelectionRange(pos, pos); }
    }, 220);
  }
});

/** هم‌تراز کردن تیک «همهٔ این بخش» با تیک‌های زیرمجموعه */
function syncGroupToggles(form) {
  form.querySelectorAll('[data-group-toggle]').forEach((master) => {
    const items = [...form.querySelectorAll(`input[data-group="${master.dataset.groupToggle}"]`)];
    master.checked = items.length > 0 && items.every((i) => i.checked);
    master.indeterminate = !master.checked && items.some((i) => i.checked);
  });
}

document.addEventListener('change', async (e) => {
  // تیک چک‌لیست
  if (e.target.dataset.action === 'toggle-check') {
    const ok = await guard(() => API.tasks.setCheck(e.target.dataset.id, { is_done: e.target.checked }));
    if (ok) { await openTaskModal(state.openTask.task.id); await loadAll(); }
    return;
  }
  // نمایش بخش مربوط به دورهٔ تکرار
  if (e.target.dataset.action === 'freq') {
    const form = e.target.closest('form');
    form.querySelectorAll('[data-when]').forEach((el) => {
      el.classList.toggle('hidden', el.dataset.when !== e.target.value);
    });
    return;
  }
  if (e.target.dataset.action === 'filter-label') { state.filterLabel = e.target.value; render(); return; }
  // تیک گروهی دسترسی‌ها
  if (e.target.dataset.groupToggle) {
    const form = e.target.closest('form');
    form.querySelectorAll(`input[data-group="${e.target.dataset.groupToggle}"]`)
      .forEach((cb) => { if (!cb.disabled) cb.checked = e.target.checked; });
    syncGroupToggles(form);
    return;
  }
  if (e.target.name === 'perm') { syncGroupToggles(e.target.closest('form')); return; }

  const act = e.target.dataset.action;
  if (act === 'month') { state.month.jm = Number(e.target.value); await refresh(); }
  if (act === 'year') { state.month.jy = Number(e.target.value); await refresh(); }
  if (act === 'log-user') { state.logUser = e.target.value; await setView('time'); }
});

document.addEventListener('submit', async (e) => {
  const form = e.target;
  const kind = form.dataset.form;
  if (!kind) return;
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(form).entries());
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;

  try {
    if (kind === 'login') {
      const res = await guard(() => API.login(String(fd.username).trim(), fd.password));
      if (res) { state.user = res.user; await boot(); }
    }

    if (kind === 'stock-item') {
      const rid = form.dataset.id;
      const payload = {
        name: fd.name,
        code: fd.code || '',
        uom_id: fd.uom_id,
        group_id: fd.group_id || null,
        description: fd.description || '',
        reorder_level: fd.reorder_level === '' ? null : fd.reorder_level,
        reorder_qty: fd.reorder_qty === '' ? null : fd.reorder_qty,
      };
      if (rid) payload.is_active = !!fd.is_active;
      const res = await guard(() => (rid ? API.stock.updateItem(rid, payload) : API.stock.createItem(payload)));
      if (res) {
        closeModal();
        toast(rid ? 'کالا به‌روز شد' : 'کالا ساخته شد', 'ok');
        await loadStock();
        await loadStockTab(state.stock.tab);
        if (state.stock.tab !== 'items') await loadStockTab('items');
        render();
      }
    }

    if (kind === 'stock-warehouse') {
      const rid = form.dataset.id;
      const payload = {
        name: fd.name,
        code: fd.code || '',
        unit_id: fd.unit_id || null,
        keeper_id: fd.keeper_id || null,
        address: fd.address || '',
      };
      if (rid) payload.is_active = !!fd.is_active;
      const res = await guard(() => (rid
        ? API.stock.updateWarehouse(rid, payload) : API.stock.createWarehouse(payload)));
      if (res) {
        closeModal();
        toast(rid ? 'انبار به‌روز شد' : 'انبار ساخته شد', 'ok');
        await loadStock();
        await loadStockTab('warehouses');
        render();
      }
    }

    if (kind === 'chat-send') {
      const text = String(fd.body || '');
      if (submit) submit.disabled = false;
      await chatSend(text);
      return;
    }

    if (kind === 'timelog') {
      const iso = jalaliToIso(Number(fd.jy), Number(fd.jm), Number(fd.jd));
      const ok = await guard(() => API.timelogs.create({
        work_date: iso, hours: Number(toEn(fd.hours)), task_id: fd.task_id || null, note: fd.note || null,
      }));
      if (ok) { toast('ثبت شد؛ در انتظار تأیید مدیر', 'ok'); form.reset(); await refresh(); }
    }

    if (kind === 'task') {
      const labelIds = [...form.querySelectorAll('input[name="lbl"]:checked')].map((b) => b.value);
      const payload = {
        title: fd.title,
        description: fd.description || null,
        assignee_id: fd.assignee_id || null,
        column_id: fd.column_id,
        priority: fd.priority,
        estimate_h: fd.estimate_h ? Number(toEn(fd.estimate_h)) : null,
        due_date: fd.due_jy && fd.due_jm && fd.due_jd
          ? jalaliToIso(Number(fd.due_jy), Number(fd.due_jm), Number(fd.due_jd)) : null,
      };
      if (fd.board_id) payload.board_id = fd.board_id;
      if (fd.unit_id !== undefined) payload.unit_id = fd.unit_id || null;
      let ok;
      if (form.dataset.id) {
        ok = await guard(() => API.tasks.update(form.dataset.id, payload));
        if (ok) await guard(() => API.labels.setOn(form.dataset.id, labelIds), { silent: true });
      } else {
        payload.label_ids = labelIds;
        payload.parent_id = form.dataset.parent || null;
        payload.checklist = String(fd.checklist || '').split('\n').map((s) => s.trim()).filter(Boolean);
        ok = await guard(() => API.tasks.create(payload));
      }
      if (ok) { closeModal(); toast(form.dataset.id ? 'ذخیره شد' : 'کار ایجاد و واگذار شد', 'ok'); await refresh(); }
    }

    if (kind === 'user') {
      const payload = {
        full_name: fd.full_name,
        job_title: fd.job_title || null,
        monthly_target: Number(toEn(fd.monthly_target)) || 0,
      };
      if (fd.unit_id !== undefined) payload.unit_id = fd.unit_id || null;
      if (fd.supervisor_id !== undefined) payload.supervisor_id = fd.supervisor_id || null;
      if (fd.chat_id !== undefined) payload.chat_id = String(fd.chat_id).trim() || null;
      if (fd.role) payload.role = fd.role;

      // تیک‌های دسترسی
      const boxes = [...form.querySelectorAll('input[name="perm"]')];
      if (boxes.length && !boxes[0].disabled) {
        payload.permissions = boxes.filter((b) => b.checked).map((b) => b.value);
      }

      let ok;
      if (form.dataset.id) {
        payload.is_active = fd.is_active !== undefined ? fd.is_active === '1' : undefined;
        ok = await guard(() => API.users.update(form.dataset.id, payload));
      } else {
        ok = await guard(() => API.users.create({
          ...payload, username: String(fd.username).trim().toLowerCase(), password: fd.password,
        }));
      }
      if (ok) { closeModal(); toast('ذخیره شد', 'ok'); await refresh(); }
    }

    if (kind === 'unit') {
      const payload = {
        name: fd.name,
        parent_id: fd.parent_id || null,
        manager_id: fd.manager_id || null,
        color: fd.color || null,
      };
      const ok = form.dataset.id
        ? await guard(() => API.units.update(form.dataset.id, payload))
        : await guard(() => API.units.create(payload));
      if (ok) { closeModal(); toast('ذخیره شد', 'ok'); await setView('units'); }
    }

    if (kind === 'review') {
      const score = Number(toEn(fd.score));
      const why = String(fd.justification || '').trim();
      if (score > JUSTIFY_ABOVE && why.length < 15) {
        toast(`امتیاز بالاتر از ${toFa(JUSTIFY_ABOVE)} باید با توضیح همراه باشد — دست‌کم ۱۵ نویسه`, 'danger');
        form.querySelector('[name="justification"]').focus();
      } else {
        const ok = await guard(() => API.review.decide(form.dataset.id, {
          decision: 'approved', score, justification: why || null,
        }));
        if (ok) { toast(`تأیید شد — امتیاز ${toFa(score)}`, 'ok'); await setView('review'); }
      }
    }

    if (kind === 'unit-score') {
      const score = Number(toEn(fd.score));
      const note = String(fd.note || '').trim();
      if (score > JUSTIFY_ABOVE && note.length < 15) {
        toast(`امتیاز بالاتر از ${toFa(JUSTIFY_ABOVE)} باید با توضیح همراه باشد — دست‌کم ۱۵ نویسه`, 'danger');
        form.querySelector('[name="note"]').focus();
      } else {
        const ok = await guard(() => API.units.score(form.dataset.id, {
          jy: state.month.jy, jm: state.month.jm, score, note: note || null,
        }));
        if (ok) {
          toast('امتیاز واحد ثبت شد', 'ok');
          const d = await guard(() => API.units.productivity(form.dataset.id,
            { jy: state.month.jy, jm: state.month.jm }), { silent: true });
          if (d) state.unitView = d;
          render();
        }
      }
    }

    if (kind === 'score') {
      const ok = await guard(() => API.scores.save({
        user_id: form.dataset.id,
        jy: state.month.jy, jm: state.month.jm,
        quality: Number(fd.quality), speed: Number(fd.speed),
        discipline: Number(fd.discipline), teamwork: Number(fd.teamwork),
        note: fd.note || null,
      }));
      if (ok) { closeModal(); toast('امتیاز ثبت شد', 'ok'); await refresh(); }
    }

    if (kind === 'comment') {
      const ok = await guard(() => API.tasks.comment(form.dataset.id, fd.body));
      if (ok) { await openTaskModal(form.dataset.id); await loadAll(); }
    }

    if (kind === 'check') {
      const ok = await guard(() => API.tasks.addCheck(form.dataset.id, fd.title));
      if (ok) { await openTaskModal(form.dataset.id); await loadAll(); }
    }

    if (kind === 'link') {
      const ok = await guard(() => API.tasks.addLink(form.dataset.id, { title: fd.title, url: fd.url }));
      if (ok) { await openTaskModal(form.dataset.id); }
    }

    if (kind === 'label') {
      const ok = await guard(() => API.labels.create({ name: fd.name, color: fd.color }));
      if (ok) {
        const d = await guard(() => API.labels.list(), { silent: true });
        if (d) state.labels = d.labels;
        labelManagerModal();
      }
    }

    if (kind === 'task-labels') {
      const ids = [...form.querySelectorAll('input[name="lbl"]:checked')].map((b) => b.value);
      const ok = await guard(() => API.labels.setOn(form.dataset.id, ids));
      if (ok) { await openTaskModal(form.dataset.id); await refresh(); }
    }

    if (kind === 'recurrence') {
      const weekdays = [...form.querySelectorAll('input[name="weekday"]:checked')].map((b) => Number(b.value));
      const ok = await guard(() => API.recurrences.create({
        title: fd.title,
        board_id: fd.board_id,
        assignee_id: fd.assignee_id || null,
        freq: fd.freq,
        weekdays,
        month_day: fd.month_day ? Number(fd.month_day) : null,
        due_offset: Number(fd.due_offset) || 0,
        priority: fd.priority,
        estimate_h: fd.estimate_h ? Number(toEn(fd.estimate_h)) : null,
        checklist: String(fd.checklist || '').split('\n').map((s) => s.trim()).filter(Boolean),
      }));
      if (ok) { closeModal(); toast('کار تکرارشونده ساخته شد', 'ok'); await setView('recurring'); }
    }

    if (kind === 'board') {
      const ok = await guard(() => API.boards.create({
        name: fd.name, description: fd.description || null, color: fd.color,
      }));
      if (ok) {
        closeModal(); toast('پروژه ساخته شد', 'ok');
        const d = await guard(() => API.boards.list(), { silent: true });
        if (d) { state.boards = d.boards; state.boardId = d.boards[d.boards.length - 1].id; }
        await refresh();
      }
    }

    if (kind === 'delete-user') {
      const typed = String(fd.confirm || '').trim().toLowerCase();
      if (typed !== form.dataset.username.toLowerCase()) {
        toast('نام کاربری درست تایپ نشده است', 'err');
        return;
      }
      const res = await guard(() => API.users.remove(form.dataset.id, typed));
      if (res) {
        closeModal();
        toast(`«${res.deleted}» حذف شد`, 'ok');
        await refresh();
      }
    }

    if (kind === 'password') {
      const ok = await guard(() => API.changePassword(fd.current, fd.next));
      if (ok) { toast('رمز عبور عوض شد', 'ok'); form.reset(); }
    }
  } finally {
    if (submit) submit.disabled = false;
  }
});

document.addEventListener('keydown', (e) => {
  // در گفت‌وگو: Enter می‌فرستد، Shift+Enter خط تازه. روی موبایل Enter خط تازه است
  // چون کلید فرستادن جلوی چشم است و شکستن خط با صفحه‌کلید لمسی راه دیگری ندارد.
  if (e.target.matches('#chat textarea[name="body"]')) {
    const touch = 'ontouchstart' in window;
    if (e.key === 'Enter' && !e.shiftKey && !touch) {
      e.preventDefault();
      const text = e.target.value;
      e.target.value = '';
      chatSend(text);
    }
    if (e.key === 'Escape') {
      if (state.chat.editing || state.chat.replyTo) {
        state.chat.editing = null; state.chat.replyTo = null; state.chat.draft = e.target.value;
        chatRenderAll();
      } else chatClose();
      e.stopPropagation();
    }
    return;
  }
  if (e.key === 'Escape') {
    if (state.chat.open && !modalEl) { chatClose(); return; }
    closeModal();
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) chatTick().then(chatSchedule);
  else chatSchedule();
});

// ───────────────────────────── راه‌اندازی ─────────────────────────────

async function boot() {
  const today = isoToJalali(todayIso());
  state.month = state.month || { jy: today.jy, jm: today.jm };
  state.filterMine = !can('tasks.view_all');
  // هر کس اول «امروز من» را می‌بیند؛ اگر دسترسی کار ندارد، داشبورد
  state.view = can('tasks.view') ? 'myday' : 'dashboard';
  await loadAll();
  render();
  if (can('chat.use')) { await chatLoadList({ quiet: true }); chatSchedule(); }
  // هر ۲ دقیقه اعلان‌های تازه را می‌گیریم
  clearInterval(state.poll);
  state.poll = setInterval(async () => {
    if (!state.user) return;
    const d = await guard(() => API.notifications.list(), { silent: true });
    if (d && d.unread !== state.unread) {
      state.unread = d.unread; state.notifications = d.notifications;
      const b = $('[data-action="bell"]');
      if (b) { b.classList.toggle('has', !!d.unread); b.innerHTML = `🔔${d.unread ? `<i>${toFa(d.unread)}</i>` : ''}`; }
    }
  }, 120000);
}

(async function start() {
  const res = await guard(() => API.me(), { silent: true });
  state.user = res?.user || null;
  if (state.user) await boot(); else render();
})();
