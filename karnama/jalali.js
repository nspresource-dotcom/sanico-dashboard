// تقویم شمسی (جلالی) — مشترک بین سرور و مرورگر
// الگوریتم استاندارد تبدیل جلالی/میلادی

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

// تقسیم و باقی‌ماندهٔ «کوتاه‌شده به سمت صفر» — الگوریتم جلالی به همین شکل تعریف شده
const div = (a, b) => Math.trunc(a / b);
const mod = (a, b) => a - Math.trunc(a / b) * b;

function jalCal(jy) {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14, jp = BREAKS[0], jm, jump = 0, leap, n, i;
  if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error('سال شمسی نامعتبر: ' + jy);
  for (i = 1; i < bl; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

export function toJalali(gy, gm, gd) {
  const jdn = g2d(gy, gm, gd);
  let g = d2g(jdn).gy, jy = g - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(g, 3, r.march);
  let k = jdn - jdn1f, jm, jd;
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

export function toGregorian(jy, jm, jd) {
  const r = jalCal(jy);
  return d2g(g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1);
}

export function isLeapJalali(jy) {
  return jalCal(jy).leap === 0;
}

export function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalali(jy) ? 30 : 29;
}

export const MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

export const DAY_NAMES = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

const pad = (n) => String(n).padStart(2, '0');

/** '2026-10-25' → {jy,jm,jd} */
export function isoToJalali(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return toJalali(y, m, d);
}

/** {jy,jm,jd} → '2026-10-25' */
export function jalaliToIso(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd);
  return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`;
}

/** '2026-10-25' → '۱۴۰۵/۰۸/۰۳' */
export function formatJalali(iso, { withDay = false, long = false } = {}) {
  if (!iso) return '—';
  const j = isoToJalali(iso);
  if (long) {
    const base = `${toFa(j.jd)} ${MONTH_NAMES[j.jm - 1]} ${toFa(j.jy)}`;
    return withDay ? `${DAY_NAMES[weekdayIndex(iso)]} ${base}` : base;
  }
  return toFa(`${j.jy}/${pad(j.jm)}/${pad(j.jd)}`);
}

/** شنبه = 0 */
export function weekdayIndex(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // یکشنبه = 0
  return (dow + 1) % 7;
}

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** ارقام لاتین → فارسی */
export function toFa(v) {
  return String(v).replace(/\d/g, (d) => FA_DIGITS[+d]);
}

/** ارقام فارسی/عربی → لاتین */
export function toEn(v) {
  return String(v)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/** تاریخ امروز به صورت ISO در منطقهٔ زمانی تهران */
export function todayIso(tz = 'Asia/Tehran') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  return parts;
}

/** بازهٔ میلادی یک ماه شمسی → {from, to} */
export function jalaliMonthRange(jy, jm) {
  return {
    from: jalaliToIso(jy, jm, 1),
    to: jalaliToIso(jy, jm, jalaliMonthLength(jy, jm)),
  };
}

export function monthLabel(jy, jm) {
  return `${MONTH_NAMES[jm - 1]} ${toFa(jy)}`;
}
