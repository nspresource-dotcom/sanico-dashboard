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
    keys: ['tasks.view', 'tasks.move_own', 'time.log', 'scores.view_own'],
  },
  lead: {
    label: 'مدیر واحد',
    hint: 'کار واحد را بین افراد تقسیم می‌کند و کارشان را بررسی و امتیازدهی می‌کند',
    keys: ['tasks.view', 'tasks.move_own', 'tasks.view_all', 'tasks.create', 'tasks.edit',
      'labels.manage', 'recurrence.manage', 'units.assign',
      'review.do', 'time.log', 'time.view_all', 'time.approve',
      'scores.view_own', 'scores.view_unit'],
  },
  manager: {
    label: 'مدیر ارشد',
    hint: 'به واحدها امتیاز می‌دهد و گزارش تفصیلی می‌گیرد — به افراد امتیاز نمی‌دهد',
    keys: ['tasks.view', 'tasks.move_own', 'tasks.view_all', 'tasks.create', 'tasks.edit',
      'tasks.delete', 'columns.manage', 'boards.manage', 'labels.manage', 'recurrence.manage',
      'units.manage', 'units.assign', 'review.do',
      'time.log', 'time.view_all', 'time.log_others', 'time.approve',
      'users.view', 'users.manage',
      'scores.view_own', 'scores.view_unit', 'scores.view_all', 'scores.unit', 'reports.unit'],
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
  admin: [...ALL_KEYS],
  manager: PRESETS.manager.keys,
  member: PRESETS.member.keys,
};

/** فهرست دسترسی مؤثر یک کاربر */
export function effectivePermissions(user) {
  if (!user) return [];
  if (user.role === 'admin') return [...ALL_KEYS];
  let list = user.permissions;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch { list = null; }
  }
  if (!Array.isArray(list)) list = ROLE_DEFAULTS[user.role] || ROLE_DEFAULTS.member;
  return list.filter((k) => ALL_KEYS.includes(k));
}

/** آیا کاربر این دسترسی را دارد؟ */
export function can(user, key) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const list = Array.isArray(user.perms) ? user.perms : effectivePermissions(user);
  return list.includes(key);
}

/** پاک‌سازی ورودی کاربر */
export function sanitize(list) {
  if (!Array.isArray(list)) return null;
  return ALL_KEYS.filter((k) => list.includes(k));
}
