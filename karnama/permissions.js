// سطوح دسترسی — مشترک بین سرور و مرورگر
// هر کاربر فهرستی از کلیدهای دسترسی دارد؛ اگر تعیین نشده باشد، پیش‌فرض نقشش اعمال می‌شود.

export const CATALOG = [
  {
    group: 'tasks',
    title: 'تخته کارها',
    icon: '▤',
    items: [
      { key: 'tasks.view', label: 'دیدن تخته کارها', hint: 'کارهای سپرده‌شده به خودش را می‌بیند' },
      { key: 'tasks.move_own', label: 'جابه‌جایی کارهای خودش بین ستون‌ها' },
      { key: 'tasks.view_all', label: 'دیدن کارهای همهٔ کارکنان' },
      { key: 'tasks.create', label: 'ایجاد کار و واگذاری به دیگران' },
      { key: 'tasks.edit', label: 'ویرایش کارهای دیگران' },
      { key: 'tasks.delete', label: 'حذف کار' },
      { key: 'columns.manage', label: 'ساخت و ویرایش ستون‌های تخته' },
    ],
  },
  {
    group: 'projects',
    title: 'پروژه‌ها',
    icon: '◈',
    items: [
      { key: 'boards.manage', label: 'ساخت و ویرایش پروژه', hint: 'هر پروژه تختهٔ کار مستقل خودش را دارد' },
      { key: 'labels.manage', label: 'تعریف برچسب‌های رنگی' },
      { key: 'recurrence.manage', label: 'تعریف کارهای تکرارشونده', hint: 'کار روتین خودکار ساخته می‌شود' },
    ],
  },
  {
    group: 'time',
    title: 'ساعت کاری',
    icon: '◷',
    items: [
      { key: 'time.log', label: 'ثبت ساعت کاری خودش' },
      { key: 'time.view_all', label: 'دیدن ساعات همهٔ کارکنان' },
      { key: 'time.log_others', label: 'ثبت ساعت به‌جای دیگران' },
      { key: 'time.approve', label: 'تأیید یا رد ساعت کاری', hint: 'پنل «تأیید ساعات» برایش باز می‌شود' },
    ],
  },
  {
    group: 'org',
    title: 'چارت سازمانی',
    icon: '⌸',
    items: [
      { key: 'org.view', label: 'دیدن چارت سازمانی و سمت‌ها' },
      { key: 'org.manage', label: 'تعریف و ویرایش سمت',
        hint: 'شرح وظایف، اختیارات، صلاحیت لازم و قالب دسترسی سمت' },
      { key: 'org.assign', label: 'گماردن افراد به سمت' },
    ],
  },
  {
    group: 'kpi',
    title: 'پایشگر شاخص‌ها',
    icon: '◎',
    items: [
      { key: 'kpi.view', label: 'دیدن پایشگر شاخص‌ها', hint: 'شاخص‌های سازمان و انحراف‌هایشان' },
      { key: 'kpi.record', label: 'ثبت مقدار ماهانهٔ شاخص' },
      { key: 'kpi.manage', label: 'تعریف و ویرایش شاخص', hint: 'هدف، منظر، و واحد مسئول را تعیین می‌کند' },
    ],
  },
  {
    group: 'team',
    title: 'کارکنان',
    icon: '☷',
    items: [
      { key: 'users.view', label: 'دیدن فهرست کارکنان' },
      { key: 'users.manage', label: 'ساخت کاربر، ویرایش و تغییر رمز' },
      { key: 'users.permissions', label: 'تعیین سطح دسترسی دیگران', hint: 'دسترسی حساس' },
      { key: 'users.delete', label: 'حذف کامل کاربر', hint: 'برگشت‌ناپذیر — سوابق شخصی پاک می‌شود' },
    ],
  },
  {
    group: 'org',
    title: 'ساختار سازمانی',
    icon: '⌂',
    items: [
      { key: 'units.manage', label: 'تعریف واحد و تعیین مدیر واحد' },
      { key: 'units.assign', label: 'سپردن کار به واحد', hint: 'کار اول به واحد می‌رود، بعد تقسیم می‌شود' },
    ],
  },
  {
    group: 'stock',
    title: 'انبارداری',
    icon: '▦',
    items: [
      { key: 'stock.view', label: 'دیدن موجودی انبار', hint: 'فقط انبارهای واحد خودش' },
      { key: 'stock.view_all', label: 'دیدن همهٔ انبارها', hint: 'بدون محدودیت واحد سازمانی' },
      { key: 'stock.entry', label: 'ثبت سند انبار', hint: 'رسید، حواله و انتقال — به‌صورت پیش‌نویس' },
      { key: 'stock.submit', label: 'قطعی کردن سند انبار', hint: 'سند قطعی دیگر ویرایش نمی‌شود' },
      { key: 'stock.manage', label: 'تعریف کالا و انبار', hint: 'کالا، گروه کالا، واحد سنجش، انبار' },
      { key: 'stock.report', label: 'کاردکس و گزارش انبار', hint: 'دفتر انبار، گردش کالا، کمبودها' },
    ],
  },
  {
    group: 'chat',
    title: 'گفت‌وگو',
    icon: '✉',
    items: [
      { key: 'chat.use', label: 'گفت‌وگوی درون‌سازمانی', hint: 'پیام دونفره و گروه واحد خودش' },
      { key: 'chat.group', label: 'ساخت گروه گفت‌وگو', hint: 'گروه دلخواه با افراد انتخابی' },
    ],
  },
  {
    group: 'review',
    title: 'بررسی و امتیازدهی',
    icon: '✍',
    items: [
      { key: 'review.do', label: 'بررسی کار زیردستان', hint: 'کارتابل بررسی برایش باز می‌شود' },
      { key: 'scores.view_own', label: 'دیدن امتیاز خودش' },
      { key: 'scores.view_unit', label: 'دیدن امتیاز اعضای واحد خودش' },
      { key: 'scores.view_all', label: 'دیدن امتیاز همهٔ کارکنان' },
      { key: 'scores.unit', label: 'امتیاز دادن به واحد', hint: 'مخصوص مدیر ارشد — امتیاز واحد، نه فرد' },
      { key: 'reports.unit', label: 'گزارش تفصیلی ماهانهٔ واحدها' },
    ],
  },
];

export const ALL_KEYS = CATALOG.flatMap((g) => g.items.map((i) => i.key));

export const LABELS = Object.fromEntries(
  CATALOG.flatMap((g) => g.items.map((i) => [i.key, i.label])),
);

/** قالب‌های آماده برای شروع سریع */
export const PRESETS = {
  member: {
    label: 'کارمند',
    hint: 'کار خودش و کارهای واحدش را می‌بیند، ساعت ثبت می‌کند، امتیاز خودش را می‌بیند',
    keys: ['tasks.view', 'tasks.move_own', 'time.log', 'scores.view_own', 'chat.use'],
  },
  lead: {
    label: 'مدیر واحد',
    hint: 'کار واحد را بین افراد تقسیم می‌کند و کارشان را بررسی و امتیازدهی می‌کند',
    keys: ['tasks.view', 'tasks.move_own', 'tasks.view_all', 'tasks.create', 'tasks.edit',
      'labels.manage', 'recurrence.manage', 'units.assign',
      'review.do', 'time.log', 'time.view_all', 'time.approve',
      'chat.use', 'chat.group',
      'kpi.view', 'kpi.record',
      'org.view',
      'scores.view_own', 'scores.view_unit'],
  },
  // انبارداری عمداً در قالب کارمند و مدیر واحد نیست: دسترسی به موجودی و سند
  // انبار را مدیر برای همان چند نفری که واقعاً انبار دستشان است تیک می‌زند.
  keeper: {
    label: 'انباردار',
    hint: 'کالا را تحویل می‌گیرد و تحویل می‌دهد و سند انبار می‌زند — انبارهای واحد خودش',
    keys: ['tasks.view', 'tasks.move_own', 'time.log', 'scores.view_own', 'chat.use',
      'stock.view', 'stock.entry', 'stock.submit', 'stock.report'],
  },
  manager: {
    label: 'مدیر ارشد',
    hint: 'به واحدها امتیاز می‌دهد و گزارش تفصیلی می‌گیرد — به افراد امتیاز نمی‌دهد',
    keys: ['tasks.view', 'tasks.move_own', 'tasks.view_all', 'tasks.create', 'tasks.edit',
      'tasks.delete', 'columns.manage', 'boards.manage', 'labels.manage', 'recurrence.manage',
      'units.manage', 'units.assign', 'review.do',
      'time.log', 'time.view_all', 'time.log_others', 'time.approve',
      'users.view', 'users.manage',
      'chat.use', 'chat.group',
      'stock.view', 'stock.view_all', 'stock.entry', 'stock.submit', 'stock.manage', 'stock.report',
      'kpi.view', 'kpi.record',
      'org.view', 'org.assign',
      'scores.view_own', 'scores.view_unit', 'scores.view_all', 'scores.unit', 'reports.unit'],
  },
  // مدیرعامل ساعت کاری ثبت نمی‌کند — ساعت دیگران را می‌بیند و تأیید می‌کند،
  // ولی فرم «ثبت ساعت خودم» برایش بی‌معنی است و صفحه را شلوغ می‌کند.
  ceo: {
    label: 'مدیرعامل',
    hint: 'همهٔ اختیارات، بدون ثبت ساعت کاری برای خودش',
    keys: ALL_KEYS.filter((k) => k !== 'time.log'),
  },
  full: {
    label: 'دسترسی کامل',
    hint: 'همهٔ اختیارات، شامل تعیین دسترسی دیگران و حذف کاربر',
    keys: [...ALL_KEYS],
  },
};

/** امتیاز بالاتر از این عدد بدون نوشتن توجیه ثبت نمی‌شود */
export const JUSTIFY_ABOVE = 85;

export const ROLE_DEFAULTS = {
  // مدیرعامل ساعت کاری خودش را ثبت نمی‌کند. اگر کسی واقعاً بخواهد،
  // همان تیک را در صفحهٔ دسترسی‌ها روشن می‌کند یا «دسترسی کامل» می‌دهد.
  admin: PRESETS.ceo.keys,
  manager: PRESETS.manager.keys,
  member: PRESETS.member.keys,
};

/** فهرست دسترسی مؤثر یک کاربر */
// مدیر ارشد را نمی‌شود از سامانه بیرون انداخت: این چند کلید همیشه برایش
// روشن می‌ماند، حتی اگر از فهرست سفارشی‌اش برداشته شوند. بقیهٔ کلیدها —
// از جمله «ثبت ساعت کاری خودش» — قابل خاموش کردن‌اند، چون مدیرعامل
// همهٔ صفحه‌های سامانه را لازم ندارد.
export const ADMIN_FLOOR = ['users.view', 'users.manage', 'users.permissions'];

const parseList = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return null;
  try { const x = JSON.parse(v); return Array.isArray(x) ? x : null; } catch { return null; }
};

/**
 * دسترسی مؤثر، در سه لایه و به همین ترتیب:
 *   ۱ دسترسی اختصاصی خودِ شخص، اگر برایش تعیین شده باشد (استثنا)
 *   ۲ قالب دسترسی سمتش — جای معمول و درست تعریف دسترسی
 *   ۳ پیش‌فرض نقش، برای کسی که هنوز سمتی ندارد
 * این‌طور یک‌بار برای «سرپرست تولید» تیک می‌زنید و هر کسی که به آن سمت
 * برود همان را می‌گیرد؛ ولی استثنا برای یک نفر هم ممکن می‌ماند.
 * `position_permissions` را سرور کنار کاربر می‌گذارد.
 */
export function effectivePermissions(user) {
  if (!user) return [];
  const own = parseList(user.permissions);
  const fromPosition = parseList(user.position_permissions);
  const list = own || fromPosition || ROLE_DEFAULTS[user.role] || ROLE_DEFAULTS.member;
  const out = list.filter((k) => ALL_KEYS.includes(k));
  if (user.role === 'admin') return [...new Set([...out, ...ADMIN_FLOOR])];
  return out;
}

/** دسترسی از کجا آمده — برای اینکه رابط بتواند صادقانه بگوید */
export function permissionSource(user) {
  if (!user) return 'none';
  if (parseList(user.permissions)) return 'own';
  if (parseList(user.position_permissions)) return 'position';
  return 'role';
}

/** آیا کاربر این دسترسی را دارد؟ */
export function can(user, key) {
  if (!user) return false;
  // مدیر ارشد هم از همان فهرست خوانده می‌شود، نه با یک «همیشه بله».
  // فهرست خودش ADMIN_FLOOR را دارد، پس از سامانه بیرون نمی‌افتد؛ ولی
  // می‌تواند صفحه‌هایی را که لازم ندارد — مثل ثبت ساعت — خاموش کند.
  const list = Array.isArray(user.perms) ? user.perms : effectivePermissions(user);
  return list.includes(key);
}

/** پاک‌سازی ورودی کاربر */
export function sanitize(list) {
  if (!Array.isArray(list)) return null;
  return ALL_KEYS.filter((k) => list.includes(k));
}
