// نسخهٔ نمایشی — همان رابط API، اما داده‌ها در مرورگر خودتان نگهداری می‌شود.
import { isoToJalali, todayIso, jalaliMonthRange, MONTH_NAMES } from './jalali.js';
import { effectivePermissions, can as canDo, ALL_KEYS, PRESETS, JUSTIFY_ABOVE } from './permissions.js';

// نسخهٔ کلید که بالا می‌رود، دادهٔ قبلی مرورگر دور ریخته می‌شود و همه از صفر شروع می‌کنند
const KEY = 'karnama-demo-v7';
const uid = () => Math.random().toString(36).slice(2, 11);
const now = () => new Date().toISOString();
const today = todayIso();
const J = isoToJalali(today);
const shift = (n) => new Date(new Date(today + 'T00:00:00Z').getTime() + n * 864e5).toISOString().slice(0, 10);

function seed() {
  const company = { id: 'c1', name: 'گروه صنعتی نمونه' };
  const mk = (username, full_name, role, job_title, department, permissions, monthly_target = 176) =>
    ({ id: uid(), company_id: 'c1', username, full_name, role, job_title, department,
      permissions, monthly_target, is_active: 1, company_name: company.name });

  const users = [
    mk('modir', 'مدیر سیستم', 'admin', 'مدیرعامل', 'مدیریت', null, 0),
    mk('ali', 'علی محمدی', 'member', 'سرپرست تولید', 'تولید', PRESETS.lead.keys, 192),
    mk('sara', 'سارا رضایی', 'member', 'کارشناس آزمایشگاه', 'کنترل کیفیت', PRESETS.member.keys),
    mk('nazanin', 'نازنین کریمی', 'member', 'کارشناس اداری', 'منابع انسانی',
      ['tasks.view', 'tasks.move_own', 'time.log', 'time.view_all', 'scores.view_own', 'chat.use']),
    mk('hamed', 'حامد اکبری', 'member', 'کارشناس فنی', 'فنی و مهندسی', PRESETS.member.keys),
  ];
  const by = (u) => users.find((x) => x.username === u).id;

  const boards = [
    { id: 'b1', company_id: 'c1', name: 'عملیات کارخانه', color: '#387F81', is_default: 1, archived_at: null },
    { id: 'b2', company_id: 'c1', name: 'ایزو و مستندسازی', color: '#2E9268', is_default: 0, archived_at: null },
  ];
  const COLS = [
    ['در انتظار شروع', 'backlog', '#93A7A8'],
    ['در حال انجام', 'normal', '#6E8FB8'],
    ['بررسی مدیر', 'review', '#C98B5E'],
    ['انجام شد', 'done', '#2E9268'],
  ];
  const columns = [];
  for (const b of boards) {
    COLS.forEach(([title, kind, color], i) => {
      columns.push({ id: `${b.id}k${i + 1}`, board_id: b.id, company_id: 'c1', title, position: i + 1, kind, color, wip_limit: null });
    });
  }

  const labels = [
    { id: 'l1', company_id: 'c1', name: 'تولید', color: '#6E8FB8' },
    { id: 'l2', company_id: 'c1', name: 'آزمایشگاه', color: '#8E7CB0' },
    { id: 'l3', company_id: 'c1', name: 'ایمنی', color: '#C14A43' },
    { id: 'l4', company_id: 'c1', name: 'اداری', color: '#C98B5E' },
  ];

  // [عنوان، مسئول، ستون، اولویت، مهلت، برآورد، برچسب‌ها، چک‌لیست]
  const spec = [
    ['کنترل کیفیت محموله باریت حفاری', 'sara', 'b1k2', 'high', shift(0), 6, ['l2'],
      ['نمونه‌برداری از ۳ نقطه', 'آزمون چگالی', 'آزمون ویسکوزیته', 'ثبت در فرم QC-07', 'تأیید سرپرست']],
    ['کالیبراسیون ترازوی آزمایشگاه', 'sara', 'b1k1', 'normal', shift(9), 4, ['l2'],
      ['هماهنگی با شرکت کالیبراسیون', 'دریافت گواهی', 'بایگانی در پرونده']],
    ['گزارش توقفات خط تولید هفتهٔ گذشته', 'ali', 'b1k3', 'urgent', shift(-2), 6, ['l1'],
      ['استخراج داده از PLC', 'تحلیل علت توقف', 'تهیهٔ جدول', 'ارائه به مدیر']],
    ['پیگیری قطعات یدکی سفارش ۱۲۰۴', 'ali', 'b1k2', 'normal', shift(6), 8, ['l1'], []],
    ['به‌روزرسانی پرونده‌های پرسنلی', 'nazanin', 'b1k2', 'normal', shift(11), 16, ['l4'],
      ['جمع‌آوری مدارک', 'اسکن و بایگانی دیجیتال', 'تطبیق با لیست بیمه']],
    ['تهیهٔ لیست بیمهٔ ماه جاری', 'nazanin', 'b1k4', 'high', shift(-3), 10, ['l4'], []],
    ['بازبینی نقشهٔ برق سالن ۲', 'hamed', 'b1k1', 'low', shift(19), 20, [], []],
    ['تعمیر پمپ شمارهٔ ۳', 'hamed', 'b1k4', 'urgent', shift(-6), 6, ['l1'], []],
    ['بازنگری چک‌لیست ایمنی انبار', null, 'b1k1', 'normal', shift(14), 5, ['l3'], []],
    ['تدوین روش اجرایی کنترل مدارک', 'sara', 'b2k2', 'high', shift(3), 12, ['l2'],
      ['پیش‌نویس روش اجرایی', 'بازبینی با مدیر کیفیت', 'تصویب و ابلاغ']],
    ['ممیزی داخلی بند ۸ استاندارد', 'ali', 'b2k1', 'normal', shift(16), 10, [], []],
    ['تکمیل شناسنامهٔ تجهیزات آزمایشگاه', 'sara', 'b2k1', 'normal', shift(-1), 8, ['l2'], []],
  ];

  const tasks = []; const checklist_items = []; const task_labels = [];
  spec.forEach(([title, who, col, priority, due, est, lbls, checks], i) => {
    const id = uid();
    const colObj = columns.find((c) => c.id === col);
    tasks.push({
      id, company_id: 'c1', board_id: colObj.board_id, column_id: col, parent_id: null,
      code: i + 1, title, description: '', assignee_id: who ? by(who) : null,
      created_by: by('modir'), priority, due_date: due, estimate_h: est,
      position: i + 1, archived_at: null,
      completed_at: colObj.kind === 'done' ? now() : null, created_at: now(), updated_at: now(),
    });
    lbls.forEach((lid) => task_labels.push({ id: uid(), company_id: 'c1', task_id: id, label_id: lid }));
    checks.forEach((t, k) => checklist_items.push({
      id: uid(), company_id: 'c1', task_id: id, title: t,
      is_done: k < Math.floor(checks.length / 3) ? 1 : 0, position: k + 1,
      done_by: k < Math.floor(checks.length / 3) ? (who ? by(who) : null) : null,
      done_at: k < Math.floor(checks.length / 3) ? now() : null, created_at: now(),
    }));
  });

  const time_logs = [];
  for (const u of users.filter((x) => x.role !== 'admin')) {
    for (let d = 1; d <= 40; d += 1) {
      const date = shift(-d);
      if (new Date(date + 'T00:00:00Z').getUTCDay() === 5) continue;
      const jj = isoToJalali(date);
      time_logs.push({
        id: uid(), company_id: 'c1', user_id: u.id, task_id: null, work_date: date,
        j_year: jj.jy, j_month: jj.jm, hours: [6, 7, 8, 8, 8, 9][d % 6],
        note: 'کار روزانه', status: d <= 4 ? 'pending' : 'approved',
        reviewed_by: null, reviewed_at: null, created_at: now(),
      });
    }
  }

  let py = J.jy, pm = J.jm - 1;
  if (pm < 1) { pm = 12; py -= 1; }
  const vals = { ali: [85, 90, 80, 88], sara: [92, 88, 95, 90], nazanin: [95, 85, 98, 92], hamed: [78, 82, 75, 85] };
  const performance_scores = Object.entries(vals).map(([u, [q, s, d, t]]) => ({
    id: uid(), company_id: 'c1', user_id: by(u), j_year: py, j_month: pm,
    quality: q, speed: s, discipline: d, teamwork: t,
    score: Math.round(((q + s + d + t) / 4) * 10) / 10,
    note: 'ارزیابی ماهانه', created_by: by('modir'), created_at: now(), updated_at: now(),
  }));

  const recurrences = [
    { id: uid(), company_id: 'c1', board_id: 'b1', column_id: 'b1k1', title: 'گزارش روزانهٔ تولید',
      assignee_id: by('ali'), priority: 'normal', estimate_h: 1, freq: 'daily', weekdays: null,
      month_day: null, due_offset: 0, is_active: 1, last_run_date: today,
      checklist: JSON.stringify(['ثبت تناژ تولید', 'ثبت توقفات خط', 'ارسال به مدیر']),
      created_by: by('modir'), created_at: now() },
    { id: uid(), company_id: 'c1', board_id: 'b1', column_id: 'b1k1', title: 'بازرسی ایمنی هفتگی',
      assignee_id: by('hamed'), priority: 'high', estimate_h: 2, freq: 'weekly', weekdays: '0',
      month_day: null, due_offset: 1, is_active: 1, last_run_date: null, checklist: null,
      created_by: by('modir'), created_at: now() },
    { id: uid(), company_id: 'c1', board_id: 'b2', column_id: 'b2k1', title: 'کالیبراسیون ماهانهٔ تجهیزات',
      assignee_id: by('sara'), priority: 'normal', estimate_h: 4, freq: 'monthly', weekdays: null,
      month_day: 1, due_offset: 3, is_active: 1, last_run_date: null, checklist: null,
      created_by: by('modir'), created_at: now() },
  ];

  const notifications = [
    { id: uid(), company_id: 'c1', user_id: by('sara'), kind: 'assigned',
      title: 'کار تازه به شما سپرده شد: کنترل کیفیت محموله باریت حفاری',
      body: 'مهلت: امروز', task_id: tasks[0].id, actor_id: by('modir'), read_at: null, created_at: now() },
    { id: uid(), company_id: 'c1', user_id: by('sara'), kind: 'comment',
      title: 'یادداشت تازه روی «تدوین روش اجرایی کنترل مدارک»',
      body: 'لطفاً پیش‌نویس را تا پنج‌شنبه آماده کنید', task_id: tasks[9].id,
      actor_id: by('modir'), read_at: null, created_at: now() },
    { id: uid(), company_id: 'c1', user_id: by('modir'), kind: 'moved',
      title: '«گزارش توقفات خط تولید هفتهٔ گذشته» به «بررسی مدیر» رفت',
      body: 'توسط علی محمدی', task_id: tasks[2].id, actor_id: by('ali'), read_at: null, created_at: now() },
  ];

  // ── ساختار سازمانی: واحدها، مدیر هر واحد، و زنجیرهٔ سرپرستی
  const units = [
    { id: 'un1', company_id: 'c1', name: 'کارخانه', parent_id: null, manager_id: by('ali'),
      color: '#387F81', archived_at: null, created_at: now() },
    { id: 'un2', company_id: 'c1', name: 'تولید', parent_id: 'un1', manager_id: by('ali'),
      color: '#6E8FB8', archived_at: null, created_at: now() },
    { id: 'un3', company_id: 'c1', name: 'کنترل کیفیت', parent_id: 'un1', manager_id: by('sara'),
      color: '#8E7CB0', archived_at: null, created_at: now() },
    { id: 'un4', company_id: 'c1', name: 'اداری و منابع انسانی', parent_id: null, manager_id: null,
      color: '#C98B5E', archived_at: null, created_at: now() },
  ];
  const place = {
    ali: ['un1', null], // مدیر کارخانه، زیر نظر مدیرعامل
    sara: ['un3', by('ali')],
    hamed: ['un2', by('ali')],
    nazanin: ['un4', null],
  };
  for (const [uname, [unit_id, supervisor_id]] of Object.entries(place)) {
    const t = users.find((x) => x.username === uname);
    t.unit_id = unit_id; t.supervisor_id = supervisor_id;
  }
  users.find((x) => x.username === 'ali').supervisor_id = by('modir');
  users.find((x) => x.username === 'nazanin').supervisor_id = by('modir');

  // کارها را به واحد صاحب‌کارشان بچسبان، تا چرخهٔ بررسی معنا پیدا کند
  const unitOfUser = (id) => users.find((x) => x.id === id)?.unit_id || null;
  for (const t of tasks) {
    t.unit_id = unitOfUser(t.assignee_id);
    t.review_status = null;
    t.return_count = 0;
    t.submitted_at = null;
  }
  // یک کار آماده در کارتابل سرپرست، تا چرخه از همان ابتدا دیده شود
  const ready = tasks.find((t) => t.assignee_id === by('hamed') && t.unit_id);
  if (ready) {
    ready.review_status = 'pending';
    ready.submitted_at = now();
    ready.completed_at = now();
  }

  // ───── انبار نمونه ─────
  const uoms = [];
  const uomIds = {};
  for (const [name, symbol, dec] of [['کیلوگرم', 'kg', 2], ['تن', 't', 3],
    ['عدد', '', 0], ['لیتر', 'L', 2]]) {
    const id = uid();
    uoms.push({ id, company_id: 'c1', name, symbol: symbol || null, decimals: dec,
      is_active: 1, created_at: now() });
    uomIds[name] = id;
  }
  const item_groups = [];
  const groupIds = {};
  for (const name of ['مواد اولیه', 'محصول', 'قطعات یدکی', 'مواد مصرفی']) {
    const id = uid();
    item_groups.push({ id, company_id: 'c1', name, parent_id: null, created_at: now() });
    groupIds[name] = id;
  }
  const warehouses = [];
  const whIds = {};
  for (const [name, code, unitId, keeper] of [
    ['انبار مواد اولیه', 'RAW', 'un2', 'hamed'],
    ['انبار محصول', 'FG', 'un2', 'hamed'],
    ['انبار قطعات یدکی', 'SPR', 'un1', 'ali'],
  ]) {
    const id = uid();
    warehouses.push({ id, company_id: 'c1', name, code, parent_id: null, unit_id: unitId,
      keeper_id: by(keeper), address: null, is_active: 1, created_at: now() });
    whIds[name] = id;
  }
  const items = [];
  const itemIds = {};
  for (const [code, nm, grp, uom, reorder, rqty] of [
    ['1001', 'سنگ باریت خام', 'مواد اولیه', 'تن', 50, 100],
    ['1002', 'پودر باریت حفاری API', 'محصول', 'تن', 20, 50],
    ['1003', 'کیسه بسته‌بندی ۵۰ کیلویی', 'مواد مصرفی', 'عدد', 2000, 5000],
    ['1004', 'یاتاقان آسیاب', 'قطعات یدکی', 'عدد', 4, 10],
    ['1005', 'روغن صنعتی ۶۸', 'مواد مصرفی', 'لیتر', 200, 400],
  ]) {
    const id = uid();
    items.push({ id, company_id: 'c1', code, name: nm, group_id: groupIds[grp],
      uom_id: uomIds[uom], description: null, barcode: null, reorder_level: reorder,
      reorder_qty: rqty, default_warehouse_id: null, is_active: 1,
      created_by: by('modir'), created_at: now(), updated_at: now() });
    itemIds[code] = id;
  }
  const stock_entries = [];
  const stock_entry_items = [];
  const stock_ledger = [];
  let scode = 0;
  const mkEntry = (kind, from, to, lines, ref, party, daysAgo) => {
    scode += 1;
    const id = uid();
    const date = shift(-daysAgo);
    stock_entries.push({ id, company_id: 'c1', code: scode, kind, status: 'submitted',
      entry_date: date, from_warehouse_id: from || null, to_warehouse_id: to || null,
      ref_no: ref, party, note: null, task_id: null, unit_id: 'un2',
      created_by: by('hamed'), submitted_by: by('hamed'), submitted_at: now(),
      cancelled_by: null, cancelled_at: null, cancel_reason: null,
      created_at: now(), updated_at: now() });
    lines.forEach(([code, qty], i) => {
      const lid = uid();
      const it = items.find((x) => x.id === itemIds[code]);
      stock_entry_items.push({ id: lid, company_id: 'c1', entry_id: id, item_id: it.id,
        qty, uom_id: it.uom_id, note: null, position: i });
      for (const [wh, sign] of [[from, -1], [to, 1]]) {
        if (!wh) continue;
        stock_ledger.push({ id: uid(), company_id: 'c1', item_id: it.id, warehouse_id: wh,
          entry_id: id, entry_item_id: lid, qty_change: sign * qty, is_reversal: 0,
          entry_date: date, created_by: by('hamed'), created_at: now() });
      }
    });
  };
  mkEntry('receipt', null, whIds['انبار مواد اولیه'],
    [['1001', 320], ['1003', 4000], ['1005', 600]], 'بارنامه ۸۸۴۱', 'معدن شهرضا', 9);
  mkEntry('receipt', null, whIds['انبار قطعات یدکی'], [['1004', 3]], 'فاکتور ۲۲۱۷', 'بازرگانی پارس‌یاتاقان', 6);
  mkEntry('issue', whIds['انبار مواد اولیه'], null,
    [['1001', 180], ['1005', 120]], 'حوالهٔ تولید ۳۱', 'خط تولید ۱', 4);
  mkEntry('receipt', null, whIds['انبار محصول'], [['1002', 150]], 'تولید شیفت صبح', 'خط تولید ۱', 4);
  mkEntry('transfer', whIds['انبار مواد اولیه'], whIds['انبار محصول'],
    [['1003', 1500]], 'انتقال بسته‌بندی', null, 3);

  // ───── گفت‌وگوی نمونه ─────
  // ساعت‌ها به وقت تهران نوشته شده‌اند، پس ۲۱۰ دقیقه (۳:۳۰) از زمان UTC کم می‌شود
  const at = (daysAgo, h, m) => new Date(
    new Date(`${shift(-daysAgo)}T00:00:00Z`).getTime() + ((h * 60 + m) - 210) * 60000,
  ).toISOString();

  const conversations = [];
  const conversation_members = [];
  const messages = [];
  const conv = (kind, title, memberNames, unitId = null) => {
    const id = `cv${conversations.length + 1}`;
    const key = kind === 'direct'
      ? `d:${memberNames.map(by).sort().join(':')}`
      : (kind === 'unit' ? `u:${unitId}` : null);
    conversations.push({ id, company_id: 'c1', kind, title, unit_id: unitId, dedupe_key: key,
      created_by: by(memberNames[0]), last_message_at: null, last_preview: null,
      last_sender_id: null, archived_at: null, created_at: now() });
    memberNames.forEach((nm, i) => conversation_members.push({
      id: uid(), company_id: 'c1', conversation_id: id, user_id: by(nm),
      member_role: i === 0 && kind === 'group' ? 'owner' : 'member',
      last_read_at: null, muted: 0, left_at: null, joined_at: now(),
    }));
    return id;
  };
  const say = (convId, who, body, when, taskId = null) => {
    const m = { id: uid(), company_id: 'c1', conversation_id: convId, sender_id: by(who),
      body, task_id: taskId, reply_to: null, edited_at: null, deleted_at: null, created_at: when };
    messages.push(m);
    const c = conversations.find((x) => x.id === convId);
    c.last_message_at = when; c.last_preview = body.slice(0, 90); c.last_sender_id = m.sender_id;
    return m.id;
  };

  const dm = conv('direct', null, ['modir', 'ali']);
  say(dm, 'modir', 'علی جان، گزارش توقفات خط را امروز می‌رسانی؟', at(1, 9, 12));
  say(dm, 'ali', 'بله، داده‌ها را از PLC گرفتم. تا بعد از ناهار تحلیلش را می‌فرستم.', at(1, 9, 31));
  say(dm, 'modir', 'ممنون. اگر توقف تکرارشونده دیدی، جدا علامت بزن.', at(1, 10, 5));

  const grp = conv('group', 'هماهنگی تولید', ['ali', 'sara', 'hamed', 'modir']);
  say(grp, 'ali', 'سلام. محموله باریت امروز می‌رسد؛ نمونه‌برداری را از سه نقطه انجام دهید.', at(0, 8, 2));
  say(grp, 'sara', 'نمونه‌ها را برداشتم. آزمون چگالی تا ساعت ۱۱ آماده می‌شود.', at(0, 8, 40));
  say(grp, 'hamed', 'پمپ شمارهٔ ۳ تعمیر شد و روی خط برگشت. @ali خروجی را چک کن.', at(0, 9, 15));
  say(grp, 'ali', 'دیدم، فشار نرمال است. دست همه درد نکند.', at(0, 9, 48));

  // سارا یک پیام را خوانده، بقیه نخوانده‌اند — تا نشان نخوانده در نسخهٔ نمایشی دیده شود
  const sm = conversation_members.find((m) => m.conversation_id === grp && m.user_id === by('sara'));
  if (sm) sm.last_read_at = at(0, 8, 45);

  // ── شاخص‌های نمونه، با سابقهٔ شش ماه تا روند واقعی دیده شود
  const indicators = [];
  const indicator_values = [];
  const jnow = isoToJalali(todayIso());
  const addInd = (code, name, domain, perspective, unitLabel, direction, target, source, unitName, series) => {
    const un = units.find((x) => x.name === unitName);
    indicators.push({ id: `ind${code}`, company_id: 'c1', code: String(code), name,
      domain, perspective, unit_label: unitLabel, direction, target, warn_pct: 90,
      source: source || 'manual', unit_id: un ? un.id : null, owner_id: null,
      is_active: 1, position: indicators.length + 1, created_by: by('modir'),
      created_at: now(), updated_at: now() });
    if (!series) return;
    let y = jnow.jy; let m = jnow.jm;
    // سری از قدیم به جدید داده می‌شود؛ رو به عقب نوشته می‌شود، پس وارونه
    for (const v of [...series].reverse()) {
      if (v !== null) {
        indicator_values.push({ id: uid(), indicator_id: `ind${code}`, j_year: y, j_month: m,
          value: v, note: null, recorded_by: by('modir'), recorded_at: now() });
      }
      m -= 1; if (m < 1) { m = 12; y -= 1; }
    }
  };
  addInd(1001, 'تناژ تولید پودر باریت', 'production', 'financial', 'تن', 'up', 1200, 'manual', 'تولید',
    [1145, 1210, 1188, 1025, 1160, 1240]);
  addInd(1002, 'درصد ضایعات خط آسیاب', 'production', 'process', 'درصد', 'down', 3, 'manual', 'تولید',
    [4.6, 4.1, 3.8, 3.4, 3.1, 2.9]);
  addInd(1003, 'ساعت توقف ناخواستهٔ خط', 'production', 'process', 'ساعت', 'down', 24, 'manual', 'کارخانه',
    [41, 33, 28, 26, 22, 25]);
  addInd(1004, 'راندمان کلی تجهیزات (OEE)', 'production', 'process', 'درصد', 'up', 75, 'manual', 'کارخانه',
    [62, 65, 68, 71, 73, 69]);
  addInd(1005, 'انطباق محموله با مشخصات API', 'sales', 'customer', 'درصد', 'up', 98, 'manual', 'کنترل کیفیت',
    [96.5, 97.2, 98.1, 98.4, 97.9, 98.6]);
  addInd(1006, 'تحویل سروقت به مشتری', 'sales', 'customer', 'درصد', 'up', 95, 'manual', null,
    [88, 91, 93, 90, 94, 92]);
  addInd(1007, 'محمولهٔ برگشتی از مشتری', 'sales', 'customer', 'محموله', 'down', 0, 'manual', 'کنترل کیفیت',
    [3, 2, 1, 2, 0, 1]);
  addInd(1008, 'موجودی نقد پایان ماه', 'finance', 'financial', 'میلیون تومان', 'up', 5000,
    'external:accounting', null, null);
  addInd(1009, 'چک‌های سررسید ماه آینده', 'finance', 'financial', 'میلیون تومان', 'down', 3000,
    'external:accounting', null, null);
  addInd(1010, 'مطالبات وصول‌نشده', 'finance', 'financial', 'میلیون تومان', 'down', 2000,
    'external:accounting', null, null);
  addInd(1011, 'بهای تمام‌شدهٔ هر تن', 'finance', 'financial', 'هزار تومان', 'down', 4200,
    'external:accounting', null, null);
  addInd(1012, 'اقلام زیر نقطهٔ سفارش', 'stock', 'process', 'قلم', 'down', 0, 'auto:stock_low', null, null);
  addInd(1013, 'ساعت کاری تأییدشدهٔ ماه', 'hr', 'growth', 'ساعت', 'up', 600, 'auto:approved_hours', null, null);

  return { company, units, users, boards, columns, labels, task_labels, tasks, checklist_items,
    task_links: [], time_logs, performance_scores, recurrences, notifications,
    task_reviews: [], unit_scores: [],
    uoms, item_groups, warehouses, items, stock_entries, stock_entry_items, stock_ledger,
    indicators, indicator_values,
    conversations, conversation_members, messages,
    comments: [], events: [], board_members: [], session: null };
}

let db;
try {
  const raw = localStorage.getItem(KEY);
  db = raw ? JSON.parse(raw) : seed();
} catch { db = seed(); }

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* بی‌اهمیت */ }
}

const wait = (v) => new Promise((r) => setTimeout(() => r(v), 80));
const fail = (msg, status = 400) => { const e = new Error(msg); e.status = status; throw e; };

const me = () => db.users.find((x) => x.id === db.session) || null;
function auth() { const u = me(); if (!u) fail('ابتدا وارد شوید', 401); return u; }
const allow = (u, key) => canDo({ ...u, perms: effectivePermissions(u) }, key);
function need(u, key) { if (!allow(u, key)) fail('این دسترسی برای شما فعال نیست', 403); }
const pub = (u) => ({
  ...u,
  is_active: !!u.is_active,
  perms: effectivePermissions(u),
  company_name: db.company.name,
  unit_name: u.unit_id ? db.units.find((x) => x.id === u.unit_id)?.name || null : null,
  supervisor_name: u.supervisor_id ? db.users.find((x) => x.id === u.supervisor_id)?.full_name || null : null,
});

const userName = (id) => db.users.find((x) => x.id === id)?.full_name || null;
const colOf = (id) => db.columns.find((c) => c.id === id);
const boardOf = (id) => db.boards.find((b) => b.id === id);

/** افزودن برچسب، پیشرفت چک‌لیست و نام‌ها به کار */
function deco(t) {
  const col = colOf(t.column_id);
  const b = boardOf(t.board_id);
  const checks = db.checklist_items.filter((c) => c.task_id === t.id);
  return {
    ...t,
    assignee_name: userName(t.assignee_id),
    creator_name: userName(t.created_by),
    board_name: b?.name, board_color: b?.color,
    column_title: col?.title, column_kind: col?.kind,
    labels: db.task_labels.filter((tl) => tl.task_id === t.id)
      .map((tl) => db.labels.find((l) => l.id === tl.label_id)).filter(Boolean),
    checklist_total: checks.length,
    checklist_done: checks.filter((c) => c.is_done).length,
    subtask_count: db.tasks.filter((x) => x.parent_id === t.id).length,
    comment_count: db.comments.filter((c) => c.task_id === t.id).length,
    logged_hours: db.time_logs.filter((l) => l.task_id === t.id && l.status === 'approved')
      .reduce((a, l) => a + l.hours, 0),
  };
}

function notify(userId, kind, title, body, taskId, actorId) {
  if (!userId || userId === actorId) return;
  db.notifications.unshift({ id: uid(), company_id: 'c1', user_id: userId, kind, title,
    body: body || null, task_id: taskId || null, actor_id: actorId || null, read_at: null, created_at: now() });
}

// ───────────────────────── کمکی‌های انبار ─────────────────────────

for (const k of ['uoms', 'item_groups', 'warehouses', 'items',
  'stock_entries', 'stock_entry_items', 'stock_ledger']) {
  if (!Array.isArray(db[k])) db[k] = [];
}

/** انبارهایی که این فرد حق دیدنشان را دارد — همان قاعدهٔ سرور */
function visibleWh(u) {
  const act = db.warehouses.filter((w) => w.is_active);
  if (allow(u, 'stock.view_all')) return act;
  return act.filter((w) => !w.unit_id || w.unit_id === u.unit_id || w.keeper_id === u.id);
}

const onHandOf = (itemId, whId) => db.stock_ledger
  .filter((l) => l.item_id === itemId && l.warehouse_id === whId)
  .reduce((a, l) => a + l.qty_change, 0);

function whOr404(u, id) {
  const w = db.warehouses.find((x) => x.id === id && x.is_active);
  if (!w) fail('انبار یافت نشد', 404);
  const mine = allow(u, 'stock.view_all') || !w.unit_id || w.unit_id === u.unit_id || w.keeper_id === u.id;
  if (!mine) fail('انبار یافت نشد', 404);
  return w;
}

function entryWarehouses(u, kind, d) {
  let from = null;
  let to = null;
  if (kind === 'issue' || kind === 'transfer') {
    if (!d.from_warehouse_id) fail('انبار مبدأ را انتخاب کنید');
    from = whOr404(u, d.from_warehouse_id).id;
  }
  if (kind === 'receipt' || kind === 'transfer' || kind === 'adjust') {
    if (!d.to_warehouse_id) fail(kind === 'transfer' ? 'انبار مقصد را انتخاب کنید' : 'انبار را انتخاب کنید');
    to = whOr404(u, d.to_warehouse_id).id;
  }
  if (kind === 'transfer' && from === to) fail('انبار مبدأ و مقصد یکی است');
  return { from, to };
}

function readLines(d) {
  const raw = Array.isArray(d.lines) ? d.lines : [];
  if (!raw.length) fail('حداقل یک قلم کالا به سند اضافه کنید');
  const out = [];
  const seen = new Set();
  raw.forEach((l, i) => {
    const it = db.items.find((x) => x.id === l.item_id);
    if (!it) fail(`ردیف ${i + 1}: کالا انتخاب نشده است`);
    if (!it.is_active) fail(`ردیف ${i + 1}: «${it.name}» غیرفعال است`);
    const qty = Number(l.qty);
    if (!Number.isFinite(qty) || qty <= 0) fail(`ردیف ${i + 1}: مقدار «${it.name}» باید عددی بزرگ‌تر از صفر باشد`);
    if (seen.has(it.id)) fail(`«${it.name}» دو بار در سند آمده — ردیف‌ها را یکی کنید`);
    seen.add(it.id);
    out.push({ item_id: it.id, qty, uom_id: l.uom_id || it.uom_id });
  });
  return out;
}

function doSubmit(u, entryId) {
  const e = db.stock_entries.find((x) => x.id === entryId);
  if (!e) fail('سند یافت نشد', 404);
  if (e.status === 'submitted') fail('این سند قبلاً قطعی شده است');
  if (e.status === 'cancelled') fail('سند باطل‌شده دوباره قطعی نمی‌شود');
  const lines = db.stock_entry_items.filter((x) => x.entry_id === entryId);
  if (!lines.length) fail('سند بدون قلم کالا قطعی نمی‌شود');

  if (e.from_warehouse_id) {
    const w = db.warehouses.find((x) => x.id === e.from_warehouse_id);
    for (const l of lines) {
      const have = onHandOf(l.item_id, e.from_warehouse_id);
      if (l.qty - have > 1e-9) {
        const it = db.items.find((x) => x.id === l.item_id);
        const uo = db.uoms.find((x) => x.id === l.uom_id);
        fail(`موجودی «${it?.name}» در انبار ${w?.name} کافی نیست: `
          + `${faNum(have)} ${uo?.name} هست و ${faNum(l.qty)} ${uo?.name} خواسته شده`);
      }
    }
  }
  for (const l of lines) {
    for (const [wh, sign] of [[e.from_warehouse_id, -1], [e.to_warehouse_id, 1]]) {
      if (!wh) continue;
      db.stock_ledger.push({ id: uid(), company_id: 'c1', item_id: l.item_id,
        warehouse_id: wh, entry_id: e.id, entry_item_id: l.id, qty_change: sign * l.qty,
        is_reversal: 0, entry_date: e.entry_date, created_by: u.id, created_at: now() });
    }
  }
  Object.assign(e, { status: 'submitted', submitted_by: u.id, submitted_at: now(), updated_at: now() });
}

function entryCard(u, e) {
  const lines = db.stock_entry_items.filter((x) => x.entry_id === e.id)
    .sort((a, b) => a.position - b.position)
    .map((l) => {
      const it = db.items.find((x) => x.id === l.item_id);
      const uo = db.uoms.find((x) => x.id === l.uom_id);
      return { id: l.id, item_id: l.item_id, item_code: it?.code, item_name: it?.name,
        qty: l.qty, uom_id: l.uom_id, uom_name: uo?.name, uom_decimals: uo?.decimals ?? 2,
        note: l.note };
    });
  const whName = (id) => db.warehouses.find((w) => w.id === id)?.name || null;
  const LAB = { receipt: 'رسید', issue: 'حواله', transfer: 'انتقال', adjust: 'اصلاح' };
  return {
    id: e.id, code: e.code, kind: e.kind, kind_label: LAB[e.kind], status: e.status,
    entry_date: e.entry_date,
    from_warehouse_id: e.from_warehouse_id, to_warehouse_id: e.to_warehouse_id,
    from_warehouse: whName(e.from_warehouse_id), to_warehouse: whName(e.to_warehouse_id),
    ref_no: e.ref_no, party: e.party, note: e.note, task_id: e.task_id,
    created_by_name: userName(e.created_by),
    submitted_by_name: userName(e.submitted_by), submitted_at: e.submitted_at,
    cancelled_by_name: userName(e.cancelled_by), cancelled_at: e.cancelled_at,
    cancel_reason: e.cancel_reason, created_at: e.created_at, lines,
    can_edit: e.status === 'draft' && (e.created_by === u.id || allow(u, 'stock.manage')),
    can_submit: e.status === 'draft' && allow(u, 'stock.submit'),
    can_cancel: e.status === 'submitted' && allow(u, 'stock.submit'),
  };
}

// ───────────────────────── کمکی‌های گفت‌وگو ─────────────────────────

// دادهٔ ذخیره‌شدهٔ قدیمی ممکن است این آرایه‌ها را نداشته باشد
for (const k of ['conversations', 'conversation_members', 'messages']) {
  if (!Array.isArray(db[k])) db[k] = [];
}

const memberOf = (convId, userId) => db.conversation_members
  .find((m) => m.conversation_id === convId && m.user_id === userId) || null;

function joinChat(convId, userId, role = 'member') {
  const have = memberOf(convId, userId);
  if (have) { have.left_at = null; return; }
  db.conversation_members.push({ id: uid(), company_id: 'c1', conversation_id: convId,
    user_id: userId, member_role: role, last_read_at: null, muted: 0, left_at: null, joined_at: now() });
}

function unreadCount(convId, userId, lastReadAt) {
  return db.messages.filter((m) => m.conversation_id === convId
    && m.sender_id !== userId && !m.deleted_at
    && (!lastReadAt || m.created_at > lastReadAt)).length;
}

function ensureUnitChat(unitId) {
  const unit = db.units.find((x) => x.id === unitId && !x.archived_at);
  if (!unit) return null;
  const key = `u:${unitId}`;
  let c = db.conversations.find((x) => x.dedupe_key === key);
  if (!c) {
    c = { id: uid(), company_id: 'c1', kind: 'unit', title: unit.name, unit_id: unitId,
      dedupe_key: key, created_by: null, last_message_at: null, last_preview: null,
      last_sender_id: null, archived_at: null, created_at: now() };
    db.conversations.push(c);
  } else if (c.title !== unit.name) c.title = unit.name;
  const ids = new Set(db.users.filter((x) => x.is_active && x.unit_id === unitId).map((x) => x.id));
  if (unit.manager_id) ids.add(unit.manager_id);
  for (const id of ids) joinChat(c.id, id, id === unit.manager_id ? 'owner' : 'member');
  return c;
}

function syncUnitChats(u) {
  if (u.unit_id) ensureUnitChat(u.unit_id);
  for (const un of db.units.filter((x) => x.manager_id === u.id && !x.archived_at)) ensureUnitChat(un.id);
}

const faNum = (x) => (typeof x === 'number' && !Number.isInteger(x)
  ? String(Math.round(x * 1000) / 1000) : String(x)).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

function chatCard(c, mine, u) {
  const members = db.conversation_members
    .filter((m) => m.conversation_id === c.id && !m.left_at)
    .map((m) => db.users.find((x) => x.id === m.user_id))
    .filter(Boolean);
  const others = members.filter((m) => m.id !== u.id);
  let title = c.title || 'گفت‌وگو';
  if (c.kind === 'direct') title = others[0]?.full_name || 'گفت‌وگوی خالی';
  else if (c.kind === 'unit') title = `واحد ${c.title}`;
  return {
    id: c.id,
    kind: c.kind,
    title,
    subtitle: c.kind === 'direct' ? (others[0]?.job_title || '') : `${faNum(members.length)} عضو`,
    unit_id: c.unit_id || null,
    peer_id: c.kind === 'direct' ? (others[0]?.id || null) : null,
    members: members.map((m) => ({ id: m.id, full_name: m.full_name, job_title: m.job_title })),
    member_count: members.length,
    last_message_at: c.last_message_at || null,
    last_preview: c.last_preview || null,
    last_sender_id: c.last_sender_id || null,
    last_sender_name: userName(c.last_sender_id),
    muted: !!(mine && mine.muted),
    my_role: mine ? mine.member_role : 'member',
    unread: unreadCount(c.id, u.id, mine ? mine.last_read_at : null),
  };
}

function chatMsg(r) {
  const t = r.task_id ? db.tasks.find((x) => x.id === r.task_id) : null;
  const s = db.users.find((x) => x.id === r.sender_id);
  return {
    id: r.id,
    sender_id: r.sender_id,
    sender_name: s?.full_name || '—',
    sender_title: s?.job_title || '',
    body: r.deleted_at ? '' : r.body,
    deleted: !!r.deleted_at,
    edited: !!r.edited_at,
    task_id: r.task_id || null,
    task_title: t?.title || null,
    task_code: t?.code || null,
    reply_to: r.reply_to || null,
    created_at: r.created_at,
  };
}

// ───────────────────────────── ساختار سازمانی ─────────────────────────────

const unitOf = (id) => db.units.find((x) => x.id === id) || null;

/** زنجیرهٔ بالادستی یک نفر — با محافظ حلقه */
function chainOf(userId, max = 12) {
  const out = [];
  let cur = db.users.find((x) => x.id === userId)?.supervisor_id || null;
  const seen = new Set([userId]);
  while (cur && out.length < max && !seen.has(cur)) {
    seen.add(cur); out.push(cur);
    cur = db.users.find((x) => x.id === cur)?.supervisor_id || null;
  }
  return out;
}

/** یک واحد و همهٔ زیرمجموعه‌هایش */
function subtree(unitId) {
  const out = [unitId];
  for (let i = 0; i < out.length && out.length < 200; i += 1) {
    for (const c of db.units.filter((x) => x.parent_id === out[i])) {
      if (!out.includes(c.id)) out.push(c.id);
    }
  }
  return out;
}

/** واحدهایی که این شخص مدیرشان است (به‌علاوهٔ زیرمجموعه‌هایشان) */
function managedUnits(u) {
  const out = new Set();
  for (const un of db.units.filter((x) => x.manager_id === u.id && !x.archived_at)) {
    for (const id of subtree(un.id)) out.add(id);
  }
  return [...out];
}

/** زیردست هرگز به بالادست خودش امتیاز نمی‌دهد */
function canReview(reviewer, targetId) {
  if (!targetId || targetId === reviewer.id) return false;
  if (chainOf(reviewer.id).includes(targetId)) return false; // بالادست من است
  const t = db.users.find((x) => x.id === targetId);
  if (!t) return false;
  if (t.supervisor_id === reviewer.id) return true;
  if (t.unit_id && managedUnits(reviewer).includes(t.unit_id)) return true;
  return false;
}

/** محرمانگی: کار خودم + کار ارجاع‌شده به واحدم + کل زیرمجموعهٔ من */
function visibleTask(u, t) {
  if (allow(u, 'tasks.view_all')) return true;
  if (t.assignee_id === u.id) return true;
  if (!t.unit_id) return false;
  if (u.unit_id === t.unit_id) return true;
  return managedUnits(u).includes(t.unit_id);
}

/** حقایق ثبت‌شدهٔ کار — تا قضاوت سرپرست بر مبنای واقعیت باشد */
function taskFacts(t) {
  const checks = db.checklist_items.filter((c) => c.task_id === t.id);
  const finished = t.submitted_at ? t.submitted_at.slice(0, 10) : today;
  return {
    checklist_pct: checks.length
      ? Math.round((checks.filter((c) => c.is_done).length / checks.length) * 100) : null,
    on_time: t.due_date ? (finished <= t.due_date ? 1 : 0) : null,
    due_date: t.due_date,
    finished_on: finished,
    return_count: t.return_count || 0,
    estimate_h: t.estimate_h ?? null,
    logged_h: db.time_logs.filter((l) => l.task_id === t.id && l.status !== 'rejected')
      .reduce((a, l) => a + l.hours, 0),
  };
}

/** امتیاز ماهانهٔ فرد: خودکار از امتیاز کارهای تأییدشده، وزن‌دار با برآورد ساعت */
function personMonthScore(userId, jy, jm) {
  const rows = db.task_reviews.filter((r) => r.assignee_id === userId && r.j_year === jy
    && r.j_month === jm && r.decision === 'approved' && r.score !== null);
  const returns = db.task_reviews.filter((r) => r.assignee_id === userId && r.j_year === jy
    && r.j_month === jm && r.decision === 'returned').length;
  if (!rows.length) return { score: null, tasks: 0, returns, on_time_pct: null, weight: 0 };
  let sum = 0, wsum = 0, onTime = 0, known = 0;
  for (const r of rows) {
    const w = Math.max(0.5, db.tasks.find((t) => t.id === r.task_id)?.estimate_h || 1);
    sum += r.score * w; wsum += w;
    if (r.on_time !== null) { known += 1; onTime += r.on_time; }
  }
  return {
    score: Math.round((sum / wsum) * 10) / 10,
    tasks: rows.length,
    returns,
    on_time_pct: known ? Math.round((onTime / known) * 100) : null,
    weight: Math.round(wsum * 10) / 10,
  };
}

function userMonth(userId, jy, jm) {
  const logs = db.time_logs.filter((l) => l.user_id === userId && l.j_year === jy && l.j_month === jm);
  const sum = (st) => logs.filter((l) => l.status === st).reduce((a, l) => a + l.hours, 0);
  const { from, to } = jalaliMonthRange(jy, jm);
  const perf = personMonthScore(userId, jy, jm);
  return {
    approved_hours: sum('approved'), pending_hours: sum('pending'), rejected_hours: sum('rejected'),
    open_tasks: db.tasks.filter((t) => t.assignee_id === userId && colOf(t.column_id)?.kind !== 'done' && !t.archived_at).length,
    done_tasks: db.tasks.filter((t) => t.assignee_id === userId && t.completed_at
      && t.completed_at.slice(0, 10) >= from && t.completed_at.slice(0, 10) <= to).length,
    score: perf.score,
    reviewed_tasks: perf.tasks,
    returns: perf.returns,
    on_time_pct: perf.on_time_pct,
  };
}


// ───────────── پایشگر شاخص‌ها (آینهٔ سرور) ─────────────
const KPI_DOMAINS = {
  production: 'تولید',
  finance: 'مالی',
  sales: 'فروش و مشتری',
  stock: 'انبار و تدارکات',
  hr: 'منابع انسانی',
  quality: 'کیفیت',
  other: 'سایر',
};

const KPI_EXTERNAL = { 'external:accounting': 'نرم‌افزار حسابداری' };

const KPI_PERSPECTIVES = {
  financial: 'مالی',
  customer: 'مشتری و بازار',
  process: 'فرایند داخلی',
  growth: 'یادگیری و رشد',
};

const KPI_AUTO = {
  'auto:approved_hours': {
    label: 'ساعت کاری تأییدشدهٔ ماه',
    unit: 'ساعت',
    value: (jy, jm) => db.time_logs
      .filter((l) => l.j_year === jy && l.j_month === jm && l.status === 'approved')
      .reduce((a, l) => a + Number(l.hours), 0),
  },
  'auto:avg_score': {
    label: 'میانگین امتیاز عملکرد ماه',
    unit: 'از ۱۰۰',
    value: (jy, jm) => {
      const rs = db.task_reviews.filter((r) => r.j_year === jy && r.j_month === jm);
      if (!rs.length) return null;
      return Math.round((rs.reduce((a, r) => a + Number(r.score), 0) / rs.length) * 10) / 10;
    },
  },
  'auto:on_time_pct': {
    label: 'درصد کارهای سروقت ماه',
    unit: 'درصد',
    value: (jy, jm) => {
      const rs = db.task_reviews.filter((r) => r.j_year === jy && r.j_month === jm);
      if (!rs.length) return null;
      return Math.round((rs.filter((r) => r.on_time).length / rs.length) * 1000) / 10;
    },
  },
  'auto:tasks_overdue': {
    label: 'کارهای عقب‌افتاده (اکنون)',
    unit: 'کار',
    now: true,
    value: () => db.tasks.filter((t) => {
      if (t.archived_at || !t.due_date) return false;
      const col = db.columns.find((c) => c.id === t.column_id);
      return col && col.kind !== 'done' && t.due_date < todayIso();
    }).length,
  },
  'auto:stock_low': {
    label: 'اقلام زیر نقطهٔ سفارش (اکنون)',
    unit: 'قلم',
    now: true,
    value: () => db.items.filter((it) => {
      if (!it.is_active || it.reorder_level === null || it.reorder_level === undefined) return false;
      const qty = db.stock_ledger.filter((l) => l.item_id === it.id)
        .reduce((a, l) => a + Number(l.qty_change), 0);
      return qty < Number(it.reorder_level);
    }).length,
  },
};

function kpiStatus(ind, value) {
  if (value === null || value === undefined) return 'none';
  if (ind.target === null || ind.target === undefined) return 'none';
  const target = Number(ind.target);
  const warn = Number(ind.warn_pct) || 90;
  const pct = ind.direction === 'down'
    ? (value <= 0 ? 200 : (target / value) * 100)
    : (target <= 0 ? 100 : (value / target) * 100);
  if (pct >= 100) return 'ok';
  if (pct >= warn) return 'warn';
  return 'danger';
}

/** ماه درخواستی، وگرنه ماه جاری — همان قاعدهٔ سرور */
const kpiMonth = (o = {}) => ({ jy: Number(o.jy) || J.jy, jm: Number(o.jm) || J.jm });

function kpiPeriods(jy, jm, count = 6) {
  const out = []; let y = jy; let m = jm;
  for (let i = 0; i < count; i += 1) {
    out.unshift({ jy: y, jm: m });
    m -= 1; if (m < 1) { m = 12; y -= 1; }
  }
  return out;
}

function kpiPayload({ jy, jm }) {
  const todayJ = isoToJalali(todayIso());
  const isCurrent = jy === todayJ.jy && jm === todayJ.jm;
  const inds = (db.indicators || []).filter((i) => i.is_active)
    .sort((a, b) => a.position - b.position);
  const out = inds.map((ind) => {
    const auto = KPI_AUTO[ind.source];
    const history = kpiPeriods(jy, jm).map((p) => {
      let v = null;
      if (auto) {
        if (!auto.now) v = auto.value(p.jy, p.jm);
        else if (isCurrent && p.jy === jy && p.jm === jm) v = auto.value();
      } else {
        const r = (db.indicator_values || []).find(
          (x) => x.indicator_id === ind.id && x.j_year === p.jy && x.j_month === p.jm);
        v = r ? Number(r.value) : null;
      }
      return { jy: p.jy, jm: p.jm, value: v };
    });
    const current = history[history.length - 1].value;
    const prev = [...history.slice(0, -1)].reverse().find((h) => h.value !== null);
    const prevStatus = prev ? kpiStatus(ind, prev.value) : 'none';
    const un = db.units.find((x) => x.id === ind.unit_id);
    const ow = db.users.find((x) => x.id === ind.owner_id);
    const rec = auto ? null : (db.indicator_values || []).find(
      (x) => x.indicator_id === ind.id && x.j_year === jy && x.j_month === jm);
    return {
      id: ind.id, code: ind.code, name: ind.name,
      domain: ind.domain || 'other',
      domain_label: KPI_DOMAINS[ind.domain] || KPI_DOMAINS.other,
      perspective: ind.perspective,
      perspective_label: KPI_PERSPECTIVES[ind.perspective] || ind.perspective,
      unit_label: ind.unit_label || (auto ? auto.unit : null),
      direction: ind.direction,
      target: ind.target === null || ind.target === undefined ? null : Number(ind.target),
      warn_pct: Number(ind.warn_pct) || 90,
      source: ind.source, auto: !!auto, auto_label: auto ? auto.label : null,
      external: !!KPI_EXTERNAL[ind.source], external_label: KPI_EXTERNAL[ind.source] || null,
      unit_id: ind.unit_id, unit_name: un ? un.name : null,
      owner_id: ind.owner_id, owner_name: ow ? ow.full_name : null,
      position: ind.position,
      value: current, previous: prev ? prev.value : null, prev_status: prevStatus,
      note: rec ? rec.note : null,
      history, status: kpiStatus(ind, current),
    };
  });
  const tally = { ok: 0, warn: 0, danger: 0, none: 0 };
  out.forEach((i) => { tally[i.status] += 1; });
  const byDomain = {};
  for (const i of out) {
    const dm = i.domain || 'other';
    byDomain[dm] = byDomain[dm] || { ok: 0, warn: 0, danger: 0, none: 0, total: 0 };
    byDomain[dm][i.status] += 1;
    byDomain[dm].total += 1;
  }
  return {
    jy, jm, indicators: out, tally, by_domain: byDomain,
    perspectives: KPI_PERSPECTIVES,
    domains: KPI_DOMAINS,
    sources: Object.entries(KPI_AUTO).map(([k, v]) => ({ key: k, label: v.label, unit: v.unit })),
    external_sources: Object.entries(KPI_EXTERNAL).map(([k, v]) => ({ key: k, label: v })),
  };
}

export const API = {
  mode: 'demo',

  async login(username) {
    const u = db.users.find((x) => x.username === String(username).trim().toLowerCase());
    if (!u) fail('در این نسخهٔ نمایشی با modir یا sara وارد شوید', 401);
    db.session = u.id; save();
    return wait({ user: pub(u) });
  },
  async logout() { db.session = null; save(); return wait({ ok: true }); },
  async me() { const u = me(); return wait({ user: u ? pub(u) : null }); },
  async changePassword() { return wait({ ok: true }); },

  users: {
    async list() {
      const u = auth();
      const visible = ['users.view', 'users.manage', 'tasks.create', 'tasks.view_all', 'time.view_all', 'scores.view_all']
        .some((k) => allow(u, k));
      return wait({ users: visible ? db.users.map(pub) : [pub(u)] });
    },
    async create(d) {
      const u = auth(); need(u, 'users.manage');
      if (db.users.some((x) => x.username === d.username)) fail('این نام کاربری قبلاً ثبت شده است');
      const nu = { id: uid(), company_id: 'c1', username: d.username, full_name: d.full_name,
        role: d.role || 'member', job_title: d.job_title || '', department: d.department || '',
        unit_id: d.unit_id || null, supervisor_id: d.supervisor_id || null,
        chat_id: d.chat_id || null, notify_out: 1,
        monthly_target: d.monthly_target || 176, is_active: 1,
        permissions: Array.isArray(d.permissions) ? d.permissions.filter((k) => ALL_KEYS.includes(k)) : null };
      db.users.push(nu); save();
      return wait({ user: pub(nu) });
    },
    async update(id, d) {
      const u = auth(); need(u, 'users.manage');
      const t = db.users.find((x) => x.id === id);
      if (!t) fail('کاربر یافت نشد', 404);
      if (d.permissions !== undefined) {
        need(u, 'users.permissions');
        if (t.id === u.id) fail('سطح دسترسی خودتان را نمی‌توانید تغییر دهید');
        t.permissions = Array.isArray(d.permissions) ? d.permissions.filter((k) => ALL_KEYS.includes(k)) : null;
      }
      if (d.supervisor_id !== undefined && d.supervisor_id) {
        if (d.supervisor_id === t.id) fail('کسی نمی‌تواند سرپرست خودش باشد');
        // حلقهٔ سرپرستی: اگر سرپرست جدید خودش زیردست این شخص باشد
        if ([d.supervisor_id, ...chainOf(d.supervisor_id)].includes(t.id)) {
          fail('این کار حلقه در زنجیرهٔ سرپرستی می‌سازد');
        }
      }
      for (const k of ['full_name', 'job_title', 'department', 'monthly_target', 'role']) {
        if (d[k] !== undefined) t[k] = d[k];
      }
      for (const k of ['unit_id', 'supervisor_id', 'chat_id']) {
        if (d[k] !== undefined) t[k] = d[k] || null;
      }
      if (d.notify_out !== undefined) t.notify_out = d.notify_out ? 1 : 0;
      if (d.is_active !== undefined) t.is_active = d.is_active ? 1 : 0;
      save();
      return wait({ user: pub(t) });
    },
    async setPassword() { return wait({ ok: true }); },

    async impact(id) {
      const u = auth(); need(u, 'users.delete');
      const t = db.users.find((x) => x.id === id);
      if (!t) fail('کاربر یافت نشد', 404);
      const logs = db.time_logs.filter((l) => l.user_id === id);
      const impact = {
        time_logs: logs.length,
        approved_hours: logs.filter((l) => l.status === 'approved').reduce((a, l) => a + l.hours, 0),
        scores: db.performance_scores.filter((s) => s.user_id === id).length,
        comments: db.comments.filter((c) => c.user_id === id).length,
        notifications: db.notifications.filter((n) => n.user_id === id).length,
        tasks_assigned: db.tasks.filter((x) => x.assignee_id === id && !x.archived_at
          && colOf(x.column_id)?.kind !== 'done').length,
        tasks_created: db.tasks.filter((x) => x.created_by === id).length,
        recurrences: db.recurrences.filter((r) => r.created_by === id).length,
        scores_authored: db.performance_scores.filter((s) => s.created_by === id).length,
        approvals_given: db.time_logs.filter((l) => l.reviewed_by === id).length,
      };
      const clean = impact.time_logs + impact.scores + impact.comments
        + impact.tasks_created + impact.tasks_assigned === 0;
      return wait({ user: pub(t), impact, clean });
    },

    async remove(id, confirmUsername) {
      const u = auth(); need(u, 'users.delete');
      const t = db.users.find((x) => x.id === id);
      if (!t) fail('کاربر یافت نشد', 404);
      if (t.id === u.id) fail('حساب خودتان را نمی‌توانید حذف کنید');
      if (t.role !== 'member' && u.role !== 'admin') fail('حذف مدیر فقط توسط مدیر ارشد ممکن است', 403);
      if (t.role === 'admin' && db.users.filter((x) => x.role === 'admin' && x.is_active).length <= 1) {
        fail('آخرین مدیر ارشد را نمی‌توان حذف کرد');
      }
      if (String(confirmUsername || '').trim().toLowerCase() !== t.username) {
        fail(`برای تأیید باید دقیقاً «${t.username}» را تایپ کنید`);
      }
      // سوابق شخصی پاک می‌شود
      db.time_logs = db.time_logs.filter((l) => l.user_id !== id);
      db.performance_scores = db.performance_scores.filter((s) => s.user_id !== id);
      db.comments = db.comments.filter((c) => c.user_id !== id);
      db.notifications = db.notifications.filter((n) => n.user_id !== id && n.actor_id !== id);
      db.board_members = db.board_members.filter((m) => m.user_id !== id);
      // ارجاع‌های اختیاری باز می‌شود
      db.tasks.forEach((x) => { if (x.assignee_id === id) x.assignee_id = null; });
      db.users.forEach((x) => { if (x.supervisor_id === id) x.supervisor_id = null; });
      db.units.forEach((x) => { if (x.manager_id === id) x.manager_id = null; });
      db.task_reviews = db.task_reviews.filter((r) => r.assignee_id !== id);
      db.task_reviews.forEach((r) => { if (r.reviewer_id === id) r.reviewer_id = null; });
      db.time_logs.forEach((l) => { if (l.reviewed_by === id) l.reviewed_by = null; });
      db.checklist_items.forEach((c) => { if (c.done_by === id) c.done_by = null; });
      db.events.forEach((e) => { if (e.user_id === id) e.user_id = null; });
      // مالکیت کارهای مشترک به حذف‌کننده منتقل می‌شود
      db.tasks.forEach((x) => { if (x.created_by === id) x.created_by = u.id; });
      db.task_links.forEach((l) => { if (l.created_by === id) l.created_by = u.id; });
      db.recurrences.forEach((r) => { if (r.created_by === id) r.created_by = u.id; });
      db.performance_scores.forEach((s) => { if (s.created_by === id) s.created_by = u.id; });
      const username = t.username;
      db.users = db.users.filter((x) => x.id !== id);
      save();
      return wait({ ok: true, deleted: username });
    },
  },

  boards: {
    async list() {
      const u = auth(); need(u, 'tasks.view');
      const seeAll = allow(u, 'tasks.view_all');
      return wait({
        boards: db.boards.filter((b) => !b.archived_at).map((b) => ({
          ...b,
          open_tasks: db.tasks.filter((t) => t.board_id === b.id && !t.archived_at
            && colOf(t.column_id)?.kind !== 'done' && visibleTask(u, t)).length,
        })),
      });
    },
    async create(d) {
      const u = auth(); need(u, 'boards.manage');
      const id = uid();
      db.boards.push({ id, company_id: 'c1', name: d.name, description: d.description || null,
        color: d.color || '#387F81', is_default: 0, archived_at: null });
      [['در انتظار شروع', 'backlog', '#93A7A8'], ['در حال انجام', 'normal', '#6E8FB8'],
        ['بررسی مدیر', 'review', '#C98B5E'], ['انجام شد', 'done', '#2E9268']]
        .forEach(([title, kind, color], i) => {
          db.columns.push({ id: `${id}k${i + 1}`, board_id: id, company_id: 'c1', title, position: i + 1, kind, color, wip_limit: null });
        });
      save();
      return wait({ board: boardOf(id) });
    },
    async update(id, d) {
      const u = auth(); need(u, 'boards.manage');
      const b = boardOf(id);
      if (!b) fail('پروژه یافت نشد', 404);
      Object.assign(b, d.name !== undefined ? { name: d.name } : {},
        d.color !== undefined ? { color: d.color } : {});
      save();
      return wait({ board: b });
    },
  },

  board: {
    async get(boardId) {
      const u = auth(); need(u, 'tasks.view');
      const b = boardId ? boardOf(boardId) : db.boards[0];
      if (!b) fail('پروژه یافت نشد', 404);
      const seeAll = allow(u, 'tasks.view_all');
      const tasks = db.tasks
        .filter((t) => t.board_id === b.id && !t.archived_at && !t.parent_id && visibleTask(u, t))
        .map(deco);
      return wait({
        board: b, can_see_all: seeAll,
        columns: db.columns.filter((c) => c.board_id === b.id).sort((x, y) => x.position - y.position),
        tasks, labels: db.labels,
      });
    },
    async addColumn(d) {
      const u = auth(); need(u, 'columns.manage');
      const b = db.boards[0];
      db.columns.push({ id: uid(), board_id: b.id, company_id: 'c1', title: d.title,
        position: db.columns.filter((c) => c.board_id === b.id).length + 1,
        kind: 'normal', color: '#387F81', wip_limit: null });
      save(); return wait({ ok: true });
    },
    async updateColumn() { return wait({ ok: true }); },
    async removeColumn() { return wait({ ok: true }); },
  },

  labels: {
    async list() { auth(); return wait({ labels: db.labels }); },
    async create(d) {
      const u = auth(); need(u, 'labels.manage');
      const l = { id: uid(), company_id: 'c1', name: d.name, color: d.color || '#387F81' };
      db.labels.push(l); save();
      return wait({ label: l });
    },
    async remove(id) {
      const u = auth(); need(u, 'labels.manage');
      db.labels = db.labels.filter((l) => l.id !== id);
      db.task_labels = db.task_labels.filter((tl) => tl.label_id !== id);
      save(); return wait({ ok: true });
    },
    async setOn(taskId, ids) {
      auth();
      db.task_labels = db.task_labels.filter((tl) => tl.task_id !== taskId);
      for (const lid of ids) db.task_labels.push({ id: uid(), company_id: 'c1', task_id: taskId, label_id: lid });
      save(); return wait({ ok: true });
    },
  },

  tasks: {
    async get(id) {
      auth();
      const t = db.tasks.find((x) => x.id === id);
      if (!t) fail('کار یافت نشد', 404);
      return wait({
        task: deco(t),
        comments: db.comments.filter((c) => c.task_id === id).map((c) => ({ ...c, full_name: userName(c.user_id) })),
        events: db.events.filter((e) => e.task_id === id).slice(-20).reverse()
          .map((e) => ({ ...e, full_name: userName(e.user_id) })),
        checklist: db.checklist_items.filter((c) => c.task_id === id)
          .sort((a, b) => a.position - b.position)
          .map((c) => ({ ...c, is_done: !!c.is_done, done_by_name: userName(c.done_by) })),
        links: db.task_links.filter((l) => l.task_id === id),
        subtasks: db.tasks.filter((x) => x.parent_id === id).map(deco),
        logs: db.time_logs.filter((l) => l.task_id === id).map((l) => ({ ...l, full_name: userName(l.user_id) })),
      });
    },
    async create(d) {
      const u = auth(); need(u, 'tasks.create');
      const colId = d.column_id || db.columns.find((c) => c.board_id === (d.board_id || db.boards[0].id)).id;
      const col = colOf(colId);
      const id = uid();
      db.tasks.push({ id, company_id: 'c1', board_id: col.board_id, column_id: colId,
        unit_id: d.unit_id || null, review_status: null, return_count: 0, submitted_at: null,
        parent_id: d.parent_id || null, recurrence_id: d.recurrence_id || null,
        code: Math.max(0, ...db.tasks.map((x) => x.code)) + 1, title: d.title,
        description: d.description || '', assignee_id: d.assignee_id || null, created_by: u.id,
        priority: d.priority || 'normal', due_date: d.due_date || null,
        estimate_h: d.estimate_h || null, position: db.tasks.length + 1, archived_at: null,
        completed_at: null, created_at: now(), updated_at: now() });
      for (const lid of d.label_ids || []) db.task_labels.push({ id: uid(), company_id: 'c1', task_id: id, label_id: lid });
      (d.checklist || []).forEach((title, i) => db.checklist_items.push({
        id: uid(), company_id: 'c1', task_id: id, title, is_done: 0, position: i + 1,
        done_by: null, done_at: null, created_at: now() }));
      db.events.push({ id: uid(), task_id: id, user_id: u.id, action: 'created', detail: d.title, created_at: now() });
      if (d.assignee_id) notify(d.assignee_id, 'assigned', `کار تازه به شما سپرده شد: ${d.title}`, null, id, u.id);
      save();
      return wait({ task: db.tasks.find((x) => x.id === id) });
    },
    async update(id, d) {
      const u = auth();
      const t = db.tasks.find((x) => x.id === id);
      if (!t) fail('کار یافت نشد', 404);
      const mine = t.assignee_id === u.id;
      if (!mine && !allow(u, 'tasks.edit')) fail('این کار به شما سپرده نشده است', 403);
      if (mine && !allow(u, 'tasks.move_own') && !allow(u, 'tasks.edit')) fail('اجازهٔ جابه‌جایی ندارید', 403);
      if (d.column_id && d.column_id !== t.column_id) {
        const col = colOf(d.column_id);
        t.column_id = col.id;
        t.board_id = col.board_id;
        t.completed_at = col.kind === 'done' ? now() : null;
        db.events.push({ id: uid(), task_id: t.id, user_id: u.id, action: 'moved', detail: col.title, created_at: now() });
        if (col.kind === 'review' || col.kind === 'done') {
          notify(t.created_by, 'moved', `«${t.title}» به «${col.title}» رفت`, `توسط ${u.full_name}`, t.id, u.id);
        }
      }
      if (allow(u, 'tasks.edit')) {
        for (const k of ['title', 'assignee_id', 'priority', 'due_date', 'estimate_h']) {
          if (d[k] !== undefined) t[k] = d[k];
        }
        if (d.unit_id !== undefined) t.unit_id = d.unit_id || null;
        if (d.board_id && d.board_id !== t.board_id) {
          t.board_id = d.board_id;
          t.column_id = db.columns.find((c) => c.board_id === d.board_id).id;
        }
      }
      if (d.description !== undefined) t.description = d.description;
      t.updated_at = now(); save();
      return wait({ task: t });
    },
    async remove(id) {
      const u = auth(); need(u, 'tasks.delete');
      // کار امتیازگرفته حذف نمی‌شود — امتیازش در کارنامهٔ ماهانهٔ یک نفر نشسته است
      if (db.task_reviews.some((r) => r.task_id === id)) {
        fail('این کار بررسی و امتیازدهی شده و حذف نمی‌شود — آن را بایگانی کنید تا سابقهٔ امتیاز دست‌نخورده بماند');
      }
      // ساعات کاری و زیرکارها پاک نمی‌شوند؛ فقط ارجاعشان باز می‌شود (مثل سرور واقعی)
      db.time_logs.forEach((l) => { if (l.task_id === id) l.task_id = null; });
      db.messages.forEach((m) => { if (m.task_id === id) m.task_id = null; });
      db.tasks.forEach((t) => { if (t.parent_id === id) t.parent_id = null; });
      db.checklist_items = db.checklist_items.filter((c) => c.task_id !== id);
      db.task_labels = db.task_labels.filter((tl) => tl.task_id !== id);
      db.task_links = db.task_links.filter((l) => l.task_id !== id);
      db.comments = db.comments.filter((c) => c.task_id !== id);
      db.events = db.events.filter((e) => e.task_id !== id);
      db.notifications = db.notifications.filter((n) => n.task_id !== id);
      db.tasks = db.tasks.filter((t) => t.id !== id);
      save(); return wait({ ok: true });
    },
    async comment(id, body) {
      const u = auth();
      db.comments.push({ id: uid(), task_id: id, user_id: u.id, body, created_at: now() });
      db.events.push({ id: uid(), task_id: id, user_id: u.id, action: 'commented', created_at: now() });
      const t = db.tasks.find((x) => x.id === id);
      if (t) notify(t.assignee_id, 'comment', `یادداشت تازه روی «${t.title}»`, body.slice(0, 120), id, u.id);
      save(); return wait({ ok: true });
    },
    async addCheck(id, title) {
      auth();
      db.checklist_items.push({ id: uid(), company_id: 'c1', task_id: id, title, is_done: 0,
        position: db.checklist_items.filter((c) => c.task_id === id).length + 1,
        done_by: null, done_at: null, created_at: now() });
      save(); return wait({ ok: true });
    },
    async setCheck(cid, d) {
      const u = auth();
      const it = db.checklist_items.find((c) => c.id === cid);
      if (!it) fail('مورد یافت نشد', 404);
      if (d.is_done !== undefined) {
        it.is_done = d.is_done ? 1 : 0;
        it.done_by = d.is_done ? u.id : null;
        it.done_at = d.is_done ? now() : null;
      }
      if (d.title !== undefined) it.title = d.title;
      save(); return wait({ ok: true });
    },
    async delCheck(cid) {
      auth();
      db.checklist_items = db.checklist_items.filter((c) => c.id !== cid);
      save(); return wait({ ok: true });
    },
    async addLink(id, d) {
      const u = auth();
      db.task_links.push({ id: uid(), company_id: 'c1', task_id: id,
        title: d.title || d.url, url: d.url, created_by: u.id, created_at: now() });
      save(); return wait({ ok: true });
    },
    async delLink(lid) {
      auth();
      db.task_links = db.task_links.filter((l) => l.id !== lid);
      save(); return wait({ ok: true });
    },
  },

  notifications: {
    async list() {
      const u = auth();
      const rows = db.notifications.filter((nt) => nt.user_id === u.id)
        .map((nt) => ({ ...nt, actor_name: userName(nt.actor_id) }));
      return wait({ notifications: rows, unread: rows.filter((r) => !r.read_at).length });
    },
    async markRead(ids) {
      const u = auth();
      db.notifications.forEach((nt) => {
        if (nt.user_id === u.id && (!ids || !ids.length || ids.includes(nt.id))) nt.read_at = nt.read_at || now();
      });
      save(); return wait({ ok: true });
    },
  },

  // ───────────────────────── انبار ─────────────────────────
  // همان سه قاعدهٔ سرور: موجودی از دفتر، سند قطعی دست‌نخوردنی، انبار بدون منفی.
  kpi: {
    async list(query) {
      const u = auth(); need(u, 'kpi.view');
      return wait(kpiPayload(kpiMonth(query)));
    },
    async create(d) {
      const u = auth(); need(u, 'kpi.manage');
      const name = String(d.name || '').trim();
      if (name.length < 2) fail('نام شاخص را بنویسید');
      if (!KPI_PERSPECTIVES[d.perspective]) fail('منظر نامعتبر است');
      const domain = String(d.domain || 'other');
      if (!KPI_DOMAINS[domain]) fail('دامنه نامعتبر است');
      const source = String(d.source || 'manual');
      if (source !== 'manual' && !KPI_AUTO[source] && !KPI_EXTERNAL[source]) fail('منبع شاخص نامعتبر است');
      const target = d.target === '' || d.target === null || d.target === undefined
        ? null : Number(d.target);
      if (target !== null && !Number.isFinite(target)) fail('هدف باید عدد باشد');
      const warn = Number(d.warn_pct);
      const code = String(1001 + db.indicators.length);
      const ind = { id: uid(), company_id: 'c1', code, name,
        domain, perspective: d.perspective,
        unit_label: String(d.unit_label || '').trim() || null,
        direction: d.direction === 'down' ? 'down' : 'up', target,
        warn_pct: Number.isFinite(warn) && warn > 0 && warn <= 100 ? warn : 90,
        source, unit_id: d.unit_id || null, owner_id: d.owner_id || null,
        is_active: 1, position: db.indicators.length + 1,
        created_by: u.id, created_at: now(), updated_at: now() };
      db.indicators.push(ind); save();
      return wait({ indicator: ind });
    },
    async update(id, d) {
      const u = auth(); need(u, 'kpi.manage');
      const ind = db.indicators.find((x) => x.id === id);
      if (!ind) fail('شاخص یافت نشد');
      if (d.name !== undefined) {
        const nm = String(d.name).trim();
        if (nm.length < 2) fail('نام شاخص را بنویسید');
        ind.name = nm;
      }
      if (d.domain !== undefined) {
        if (!KPI_DOMAINS[d.domain]) fail('دامنه نامعتبر است');
        ind.domain = d.domain;
      }
      if (d.perspective !== undefined) {
        if (!KPI_PERSPECTIVES[d.perspective]) fail('منظر نامعتبر است');
        ind.perspective = d.perspective;
      }
      if (d.unit_label !== undefined) ind.unit_label = String(d.unit_label).trim() || null;
      if (d.direction !== undefined) ind.direction = d.direction === 'down' ? 'down' : 'up';
      if (d.target !== undefined) {
        const t = d.target === '' || d.target === null ? null : Number(d.target);
        if (t !== null && !Number.isFinite(t)) fail('هدف باید عدد باشد');
        ind.target = t;
      }
      if (d.warn_pct !== undefined) {
        const w = Number(d.warn_pct);
        ind.warn_pct = Number.isFinite(w) && w > 0 && w <= 100 ? w : 90;
      }
      if (d.unit_id !== undefined) ind.unit_id = d.unit_id || null;
      if (d.owner_id !== undefined) ind.owner_id = d.owner_id || null;
      if (d.is_active !== undefined) ind.is_active = d.is_active ? 1 : 0;
      ind.updated_at = now(); save();
      return wait({ indicator: ind });
    },
    async remove(id) {
      const u = auth(); need(u, 'kpi.manage');
      const ind = db.indicators.find((x) => x.id === id);
      if (!ind) fail('شاخص یافت نشد');
      const hasValues = db.indicator_values.some((v) => v.indicator_id === id);
      if (hasValues) { ind.is_active = 0; ind.updated_at = now(); save(); return wait({ ok: true, archived: true }); }
      db.indicators = db.indicators.filter((x) => x.id !== id); save();
      return wait({ ok: true, archived: false });
    },
    async setValue(id, d) {
      const u = auth(); need(u, 'kpi.record');
      const ind = db.indicators.find((x) => x.id === id);
      if (!ind) fail('شاخص یافت نشد');
      if (KPI_AUTO[ind.source]) fail('این شاخص خودکار است و عددش دستی ثبت نمی‌شود');
      const { jy, jm } = kpiMonth(d);
      const value = Number(d.value);
      if (!Number.isFinite(value)) fail('مقدار را به عدد بنویسید');
      const note = String(d.note || '').trim() || null;
      const ex = db.indicator_values.find((v) => v.indicator_id === id && v.j_year === jy && v.j_month === jm);
      if (ex) { ex.value = value; ex.note = note; ex.recorded_by = u.id; ex.recorded_at = now(); } else {
        db.indicator_values.push({ id: uid(), indicator_id: id, j_year: jy, j_month: jm,
          value, note, recorded_by: u.id, recorded_at: now() });
      }
      save();
      return wait(kpiPayload({ jy, jm }));
    },
  },

  stock: {
    async setup() {
      const u = auth(); need(u, 'stock.view');
      return wait({
        uoms: db.uoms.filter((x) => x.is_active),
        groups: db.item_groups,
        warehouses: visibleWh(u),
        can_manage: allow(u, 'stock.manage'),
        can_entry: allow(u, 'stock.entry'),
        can_submit: allow(u, 'stock.submit'),
      });
    },
    async createUom(d) {
      const u = auth(); need(u, 'stock.manage');
      if (!String(d.name || '').trim()) fail('نام واحد سنجش را بنویسید');
      const uom = { id: uid(), company_id: 'c1', name: String(d.name).trim(),
        symbol: d.symbol || null, decimals: Number(d.decimals) || 0, is_active: 1, created_at: now() };
      db.uoms.push(uom); save();
      return wait({ uom });
    },
    async createGroup(d) {
      const u = auth(); need(u, 'stock.manage');
      const g = { id: uid(), company_id: 'c1', name: String(d.name || '').trim(),
        parent_id: d.parent_id || null, created_at: now() };
      if (g.name.length < 2) fail('نام گروه کالا را بنویسید');
      db.item_groups.push(g); save();
      return wait({ group: g });
    },
    async warehouses() {
      const u = auth(); need(u, 'stock.view');
      return wait({
        warehouses: visibleWh(u).map((w) => ({
          ...w,
          unit_name: db.units.find((x) => x.id === w.unit_id)?.name || null,
          keeper_name: db.users.find((x) => x.id === w.keeper_id)?.full_name || null,
          item_kinds: new Set(db.stock_ledger.filter((l) => l.warehouse_id === w.id)
            .map((l) => l.item_id)).size,
        })),
        can_manage: allow(u, 'stock.manage'),
      });
    },
    async createWarehouse(d) {
      const u = auth(); need(u, 'stock.manage');
      const name = String(d.name || '').trim();
      if (name.length < 2) fail('نام انبار را بنویسید');
      if (db.warehouses.some((w) => w.name === name)) fail('انباری با همین نام هست');
      const w = { id: uid(), company_id: 'c1', name, code: d.code || null, parent_id: null,
        unit_id: d.unit_id || null, keeper_id: d.keeper_id || null, address: d.address || null,
        is_active: 1, created_at: now() };
      db.warehouses.push(w); save();
      return wait({ warehouse: w });
    },
    async updateWarehouse(id, d) {
      const u = auth(); need(u, 'stock.manage');
      const w = db.warehouses.find((x) => x.id === id);
      if (!w) fail('انبار یافت نشد', 404);
      for (const k of ['name', 'code', 'unit_id', 'keeper_id', 'address']) {
        if (d[k] !== undefined) w[k] = d[k] || null;
      }
      if (d.is_active !== undefined) w.is_active = d.is_active ? 1 : 0;
      save();
      return wait({ warehouse: w });
    },
    async items() {
      const u = auth(); need(u, 'stock.view');
      const ids = visibleWh(u).map((w) => w.id);
      return wait({
        items: db.items.filter((it) => it.is_active).map((it) => {
          const onHand = db.stock_ledger
            .filter((l) => l.item_id === it.id && ids.includes(l.warehouse_id))
            .reduce((a, l) => a + l.qty_change, 0);
          const uo = db.uoms.find((x) => x.id === it.uom_id);
          return { ...it,
            group_name: db.item_groups.find((g) => g.id === it.group_id)?.name || null,
            uom_name: uo?.name || '—',
            uom_decimals: uo?.decimals ?? 2,
            on_hand: onHand,
            low: it.reorder_level != null && onHand < it.reorder_level };
        }).sort((a, b) => a.name.localeCompare(b.name, 'fa')),
        can_manage: allow(u, 'stock.manage'),
      });
    },
    async createItem(d) {
      const u = auth(); need(u, 'stock.manage');
      const name = String(d.name || '').trim();
      if (name.length < 2) fail('نام کالا را بنویسید');
      if (!db.uoms.some((x) => x.id === d.uom_id)) fail('واحد سنجش کالا را انتخاب کنید');
      let code = String(d.code || '').trim();
      if (!code) code = String(db.items.reduce((m, r) => Math.max(m, Number(r.code) || 0), 1000) + 1);
      if (db.items.some((x) => x.code === code)) fail('کالایی با همین کد هست');
      const it = { id: uid(), company_id: 'c1', code, name, group_id: d.group_id || null,
        uom_id: d.uom_id, description: d.description || null, barcode: null,
        reorder_level: d.reorder_level == null || d.reorder_level === '' ? null : Number(d.reorder_level),
        reorder_qty: d.reorder_qty == null || d.reorder_qty === '' ? null : Number(d.reorder_qty),
        default_warehouse_id: null, is_active: 1, created_by: u.id,
        created_at: now(), updated_at: now() };
      db.items.push(it); save();
      return wait({ item: it });
    },
    async updateItem(id, d) {
      const u = auth(); need(u, 'stock.manage');
      const it = db.items.find((x) => x.id === id);
      if (!it) fail('کالا یافت نشد', 404);
      for (const k of ['name', 'group_id', 'uom_id', 'description']) {
        if (d[k] !== undefined) it[k] = d[k] || null;
      }
      for (const k of ['reorder_level', 'reorder_qty']) {
        if (d[k] !== undefined) it[k] = d[k] === '' || d[k] == null ? null : Number(d[k]);
      }
      if (d.is_active !== undefined) it.is_active = d.is_active ? 1 : 0;
      it.updated_at = now(); save();
      return wait({ item: it });
    },
    async onHand(query = {}) {
      const u = auth(); need(u, 'stock.view');
      const seen = visibleWh(u);
      if (!seen.length) return wait({ rows: [], warehouses: [], low: [], totals: { kinds: 0, low: 0 } });
      const wanted = query.warehouse_id ? seen.filter((w) => w.id === query.warehouse_id) : seen;
      if (!wanted.length) fail('انبار یافت نشد', 404);
      const ids = wanted.map((w) => w.id);

      const agg = new Map();
      for (const l of db.stock_ledger) {
        if (!ids.includes(l.warehouse_id)) continue;
        const k = `${l.item_id}|${l.warehouse_id}`;
        agg.set(k, (agg.get(k) || 0) + l.qty_change);
      }
      const rows = [];
      const totalByItem = new Map();
      for (const [k, qty] of agg) {
        if (Math.abs(qty) < 1e-9) continue;
        const [itemId, whId] = k.split('|');
        const it = db.items.find((x) => x.id === itemId);
        if (!it) continue;
        const uo = db.uoms.find((x) => x.id === it.uom_id);
        rows.push({ item_id: itemId, code: it.code, name: it.name,
          group_name: db.item_groups.find((g) => g.id === it.group_id)?.name || null,
          uom_name: uo?.name || '—', uom_decimals: uo?.decimals ?? 2,
          warehouse_id: whId, warehouse_name: wanted.find((w) => w.id === whId)?.name || '—',
          qty, reorder_level: it.reorder_level });
        totalByItem.set(itemId, (totalByItem.get(itemId) || 0) + qty);
      }
      rows.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
      const low = db.items.filter((it) => it.reorder_level != null
        && (totalByItem.get(it.id) || 0) < it.reorder_level)
        .map((it) => ({ item_id: it.id, code: it.code, name: it.name,
          uom_name: db.uoms.find((x) => x.id === it.uom_id)?.name || '—',
          on_hand: totalByItem.get(it.id) || 0, reorder_level: it.reorder_level }));
      return wait({ rows, warehouses: seen, low, totals: { kinds: totalByItem.size, low: low.length } });
    },
    async card(query = {}) {
      const u = auth(); need(u, 'stock.report');
      const it = db.items.find((x) => x.id === query.item_id);
      if (!it) fail('کالا یافت نشد', 404);
      const uo = db.uoms.find((x) => x.id === it.uom_id);
      const ids = visibleWh(u).map((w) => w.id);
      const moves = db.stock_ledger
        .filter((l) => l.item_id === it.id && ids.includes(l.warehouse_id))
        .sort((a, b) => (a.entry_date === b.entry_date
          ? (a.created_at < b.created_at ? -1 : 1) : (a.entry_date < b.entry_date ? -1 : 1)));
      let running = 0;
      const out = moves.map((m) => {
        running += m.qty_change;
        const e = db.stock_entries.find((x) => x.id === m.entry_id);
        return { id: m.id, entry_id: m.entry_id, entry_code: e?.code, kind: e?.kind,
          ref_no: e?.ref_no, party: e?.party,
          warehouse_name: db.warehouses.find((w) => w.id === m.warehouse_id)?.name || '—',
          qty_change: m.qty_change, is_reversal: !!m.is_reversal, balance: running,
          entry_date: m.entry_date, who: userName(m.created_by), created_at: m.created_at };
      });
      return wait({ item: { ...it, uom_name: uo?.name, uom_decimals: uo?.decimals ?? 2 },
        moves: out.reverse(), balance: running });
    },
    async entries(query = {}) {
      const u = auth(); need(u, 'stock.view');
      const ids = visibleWh(u).map((w) => w.id);
      const rows = db.stock_entries
        .filter((e) => ids.includes(e.from_warehouse_id) || ids.includes(e.to_warehouse_id))
        .filter((e) => !query.status || e.status === query.status)
        .sort((a, b) => (a.entry_date === b.entry_date
          ? (a.created_at < b.created_at ? 1 : -1) : (a.entry_date < b.entry_date ? 1 : -1)));
      return wait({ entries: rows.map((e) => entryCard(u, e)),
        can_entry: allow(u, 'stock.entry'), can_submit: allow(u, 'stock.submit') });
    },
    async entry(id) {
      const u = auth(); need(u, 'stock.view');
      const e = db.stock_entries.find((x) => x.id === id);
      if (!e) fail('سند یافت نشد', 404);
      return wait({ entry: entryCard(u, e) });
    },
    async createEntry(d) {
      const u = auth(); need(u, 'stock.entry');
      const kind = String(d.kind || '');
      if (!['receipt', 'issue', 'transfer', 'adjust'].includes(kind)) fail('نوع سند نامعتبر است');
      const { from, to } = entryWarehouses(u, kind, d);
      const lines = readLines(d);
      const id = uid();
      const code = db.stock_entries.reduce((m, r) => Math.max(m, r.code || 0), 0) + 1;
      db.stock_entries.push({ id, company_id: 'c1', code, kind, status: 'draft',
        entry_date: /^\d{4}-\d{2}-\d{2}$/.test(String(d.entry_date || '')) ? d.entry_date : todayIso(),
        from_warehouse_id: from, to_warehouse_id: to,
        ref_no: d.ref_no || null, party: d.party || null, note: d.note || null,
        task_id: d.task_id || null, unit_id: u.unit_id || null, created_by: u.id,
        submitted_by: null, submitted_at: null, cancelled_by: null, cancelled_at: null,
        cancel_reason: null, created_at: now(), updated_at: now() });
      lines.forEach((l, i) => db.stock_entry_items.push({ id: uid(), company_id: 'c1',
        entry_id: id, item_id: l.item_id, qty: l.qty, uom_id: l.uom_id, note: null, position: i }));
      if (d.submit && allow(u, 'stock.submit')) doSubmit(u, id);
      save();
      return wait({ entry: entryCard(u, db.stock_entries.find((x) => x.id === id)) });
    },
    async updateEntry(id, d) {
      const u = auth(); need(u, 'stock.entry');
      const e = db.stock_entries.find((x) => x.id === id);
      if (!e) fail('سند یافت نشد', 404);
      if (e.status !== 'draft') fail('سند قطعی‌شده ویرایش نمی‌شود — اگر اشتباه است باطلش کنید و سند تازه بزنید');
      const { from, to } = entryWarehouses(u, e.kind, {
        from_warehouse_id: d.from_warehouse_id ?? e.from_warehouse_id,
        to_warehouse_id: d.to_warehouse_id ?? e.to_warehouse_id,
      });
      const lines = readLines(d);
      Object.assign(e, { from_warehouse_id: from, to_warehouse_id: to,
        entry_date: /^\d{4}-\d{2}-\d{2}$/.test(String(d.entry_date || '')) ? d.entry_date : e.entry_date,
        ref_no: d.ref_no !== undefined ? (d.ref_no || null) : e.ref_no,
        party: d.party !== undefined ? (d.party || null) : e.party,
        note: d.note !== undefined ? (d.note || null) : e.note,
        updated_at: now() });
      db.stock_entry_items = db.stock_entry_items.filter((x) => x.entry_id !== id);
      lines.forEach((l, i) => db.stock_entry_items.push({ id: uid(), company_id: 'c1',
        entry_id: id, item_id: l.item_id, qty: l.qty, uom_id: l.uom_id, note: null, position: i }));
      if (d.submit && allow(u, 'stock.submit')) doSubmit(u, id);
      save();
      return wait({ entry: entryCard(u, e) });
    },
    async removeEntry(id) {
      const u = auth(); need(u, 'stock.entry');
      const e = db.stock_entries.find((x) => x.id === id);
      if (!e) fail('سند یافت نشد', 404);
      if (e.status !== 'draft') fail('فقط پیش‌نویس حذف می‌شود؛ سند قطعی‌شده را باید باطل کرد');
      db.stock_entry_items = db.stock_entry_items.filter((x) => x.entry_id !== id);
      db.stock_entries = db.stock_entries.filter((x) => x.id !== id);
      save();
      return wait({ ok: true });
    },
    async submitEntry(id) {
      const u = auth(); need(u, 'stock.submit');
      doSubmit(u, id);
      save();
      return wait({ entry: entryCard(u, db.stock_entries.find((x) => x.id === id)) });
    },
    async cancelEntry(id, reason) {
      const u = auth(); need(u, 'stock.submit');
      const e = db.stock_entries.find((x) => x.id === id);
      if (!e) fail('سند یافت نشد', 404);
      if (e.status !== 'submitted') fail('فقط سند قطعی‌شده باطل می‌شود');
      if (String(reason || '').trim().length < 5) {
        fail('دلیل ابطال را بنویسید — سند باطل بی‌دلیل، سابقه را بی‌معنا می‌کند');
      }
      const rows = db.stock_ledger.filter((l) => l.entry_id === id && !l.is_reversal);
      if (!rows.length) fail('این سند در دفتر انبار اثری ندارد');
      for (const r of rows) {
        if (r.qty_change <= 0) continue;
        const have = onHandOf(r.item_id, r.warehouse_id);
        if (r.qty_change - have > 1e-9) {
          const it = db.items.find((x) => x.id === r.item_id);
          const w = db.warehouses.find((x) => x.id === r.warehouse_id);
          fail(`ابطال ممکن نیست: از «${it?.name}» در انبار ${w?.name} فقط ${faNum(have)} مانده و بقیه مصرف شده. اول سندهای بعدی را باطل کنید.`);
        }
      }
      for (const r of rows) {
        db.stock_ledger.push({ id: uid(), company_id: 'c1', item_id: r.item_id,
          warehouse_id: r.warehouse_id, entry_id: id, entry_item_id: r.entry_item_id,
          qty_change: -r.qty_change, is_reversal: 1, entry_date: e.entry_date,
          created_by: u.id, created_at: now() });
      }
      Object.assign(e, { status: 'cancelled', cancelled_by: u.id, cancelled_at: now(),
        cancel_reason: String(reason).trim(), updated_at: now() });
      save();
      return wait({ entry: entryCard(u, e) });
    },
  },

  // ───────────────────────── گفت‌وگو ─────────────────────────
  // همان قاعده‌های سرور: نخوانده‌ها از last_read_at می‌آید نه از جدول اعلان‌ها،
  // و گروه واحد خودکار با ساختار سازمانی هم‌تراز می‌شود.
  chat: {
    async list() {
      const u = auth(); need(u, 'chat.use');
      syncUnitChats(u);
      const rows = db.conversation_members
        .filter((m) => m.user_id === u.id && !m.left_at)
        .map((m) => ({ m, c: db.conversations.find((x) => x.id === m.conversation_id) }))
        .filter(({ c }) => c && !c.archived_at)
        .sort((a, b) => ((a.c.last_message_at || a.c.created_at) < (b.c.last_message_at || b.c.created_at) ? 1 : -1));
      const conversations = rows.map(({ m, c }) => chatCard(c, m, u));
      save();
      return wait({ conversations, unread: conversations.reduce((a, c) => a + c.unread, 0) });
    },
    async unread() {
      const u = auth();
      if (!allow(u, 'chat.use')) return wait({ total: 0, items: [], latest_at: null });
      const items = [];
      let total = 0; let latest = null;
      for (const m of db.conversation_members.filter((x) => x.user_id === u.id && !x.left_at)) {
        const c = db.conversations.find((x) => x.id === m.conversation_id);
        if (!c || c.archived_at) continue;
        if (c.last_message_at && (!latest || c.last_message_at > latest)) latest = c.last_message_at;
        const k = unreadCount(c.id, u.id, m.last_read_at);
        if (k) { items.push({ id: c.id, unread: k }); total += k; }
      }
      return wait({ total, items, latest_at: latest });
    },
    async directory() {
      const u = auth(); need(u, 'chat.use');
      return wait({
        people: db.users.filter((x) => x.is_active && x.id !== u.id)
          .map((x) => ({ id: x.id, full_name: x.full_name, job_title: x.job_title,
            unit_name: x.unit_id ? db.units.find((n) => n.id === x.unit_id)?.name || null : null }))
          .sort((a, b) => a.full_name.localeCompare(b.full_name, 'fa')),
        can_group: allow(u, 'chat.group'),
      });
    },
    async direct(userId) {
      const u = auth(); need(u, 'chat.use');
      const peer = db.users.find((x) => x.id === userId && x.is_active);
      if (!peer || peer.id === u.id) fail('مخاطب را انتخاب کنید');
      const key = `d:${[u.id, peer.id].sort().join(':')}`;
      let c = db.conversations.find((x) => x.dedupe_key === key);
      if (!c) {
        c = { id: uid(), company_id: 'c1', kind: 'direct', title: null, unit_id: null,
          dedupe_key: key, created_by: u.id, last_message_at: null, last_preview: null,
          last_sender_id: null, archived_at: null, created_at: now() };
        db.conversations.push(c);
      }
      joinChat(c.id, u.id); joinChat(c.id, peer.id);
      save();
      const m = memberOf(c.id, u.id);
      return wait({ conversation: chatCard(c, m, u) });
    },
    async group(title, userIds) {
      const u = auth(); need(u, 'chat.group');
      if (String(title || '').trim().length < 2) fail('نام گروه را بنویسید');
      const c = { id: uid(), company_id: 'c1', kind: 'group', title: String(title).trim(),
        unit_id: null, dedupe_key: null, created_by: u.id, last_message_at: null,
        last_preview: null, last_sender_id: null, archived_at: null, created_at: now() };
      db.conversations.push(c);
      joinChat(c.id, u.id, 'owner');
      for (const id of userIds || []) {
        if (id !== u.id && db.users.some((x) => x.id === id && x.is_active)) joinChat(c.id, id);
      }
      save();
      return wait({ conversation: chatCard(c, memberOf(c.id, u.id), u) });
    },
    async messages(id, query = {}) {
      const u = auth(); need(u, 'chat.use');
      const m = memberOf(id, u.id);
      if (!m || m.left_at) fail('گفت‌وگو یافت نشد', 404);
      const limit = Math.min(200, Number(query.limit) || 60);
      let rows = db.messages.filter((x) => x.conversation_id === id)
        .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
      if (query.after) rows = rows.filter((x) => x.created_at > query.after).slice(0, limit);
      else rows = rows.slice(-limit);
      m.last_read_at = now();
      save();
      return wait({ conversation_id: id, messages: rows.map(chatMsg), has_more: false });
    },
    async send(id, d) {
      const u = auth(); need(u, 'chat.use');
      const m = memberOf(id, u.id);
      if (!m || m.left_at) fail('گفت‌وگو یافت نشد', 404);
      const body = String(d.body || '').trim();
      if (!body) fail('متن پیام خالی است');
      const c = db.conversations.find((x) => x.id === id);
      const at = now();
      const msg = { id: uid(), company_id: 'c1', conversation_id: id, sender_id: u.id, body,
        task_id: d.task_id || null, reply_to: d.reply_to || null,
        edited_at: null, deleted_at: null, created_at: at };
      db.messages.push(msg);
      c.last_message_at = at; c.last_preview = body.slice(0, 90); c.last_sender_id = u.id;
      m.last_read_at = at;
      // صدا زدن با @ اعلان می‌سازد؛ پیام عادی فقط شمارندهٔ نخوانده را بالا می‌برد
      for (const raw of body.match(/@([a-zA-Z0-9._-]{3,32})/g) || []) {
        const who = db.users.find((x) => x.username === raw.slice(1).toLowerCase() && x.is_active);
        if (who && db.conversation_members.some((x) => x.conversation_id === id && x.user_id === who.id && !x.left_at)) {
          notify(who.id, 'chat_mention', `${u.full_name} در گفت‌وگو شما را صدا زد`,
            body.slice(0, 160), null, u.id);
        }
      }
      save();
      return wait({ message: chatMsg(msg) });
    },
    async update(id, d) {
      const u = auth(); need(u, 'chat.use');
      const m = memberOf(id, u.id);
      const c = db.conversations.find((x) => x.id === id);
      if (!m || !c) fail('گفت‌وگو یافت نشد', 404);
      if (c.kind !== 'group') fail('فقط گروه دلخواه را می‌توان ویرایش کرد');
      if (m.member_role !== 'owner' && !allow(u, 'users.manage')) fail('تنها سازندهٔ گروه می‌تواند آن را تغییر دهد', 403);
      if (d.title !== undefined) c.title = String(d.title).trim();
      for (const uid2 of d.add || []) if (db.users.some((x) => x.id === uid2)) joinChat(id, uid2);
      for (const uid2 of d.remove || []) {
        if (uid2 === u.id) continue;
        const mm = memberOf(id, uid2);
        if (mm) mm.left_at = now();
      }
      save();
      return wait({ conversation: chatCard(c, m, u) });
    },
    async mute(id, muted) {
      const u = auth(); need(u, 'chat.use');
      const m = memberOf(id, u.id);
      if (!m) fail('گفت‌وگو یافت نشد', 404);
      m.muted = muted ? 1 : 0;
      save();
      return wait({ ok: true, muted: !!muted });
    },
    async leave(id) {
      const u = auth(); need(u, 'chat.use');
      const m = memberOf(id, u.id);
      const c = db.conversations.find((x) => x.id === id);
      if (!m || !c) fail('گفت‌وگو یافت نشد', 404);
      if (c.kind === 'unit') fail('عضویت گروه واحد از ساختار سازمانی می‌آید و دستی تغییر نمی‌کند');
      m.left_at = now();
      save();
      return wait({ ok: true });
    },
    async editMessage(mid, body) {
      const u = auth(); need(u, 'chat.use');
      const msg = db.messages.find((x) => x.id === mid);
      if (!msg) fail('پیام یافت نشد', 404);
      if (msg.sender_id !== u.id) fail('فقط پیام خودتان را می‌توانید ویرایش کنید', 403);
      if (msg.deleted_at) fail('این پیام حذف شده است');
      msg.body = String(body).trim(); msg.edited_at = now();
      const c = db.conversations.find((x) => x.id === msg.conversation_id);
      if (c && c.last_message_at === msg.created_at) c.last_preview = msg.body.slice(0, 90);
      save();
      return wait({ ok: true });
    },
    async removeMessage(mid) {
      const u = auth(); need(u, 'chat.use');
      const msg = db.messages.find((x) => x.id === mid);
      if (!msg) fail('پیام یافت نشد', 404);
      if (msg.sender_id !== u.id) fail('فقط پیام خودتان را می‌توانید حذف کنید', 403);
      msg.deleted_at = now();
      const c = db.conversations.find((x) => x.id === msg.conversation_id);
      if (c && c.last_message_at === msg.created_at) c.last_preview = 'پیام حذف شد';
      save();
      return wait({ ok: true });
    },
  },

  recurrences: {
    async list() {
      const u = auth(); need(u, 'recurrence.manage');
      return wait({
        recurrences: db.recurrences.map((r) => ({
          ...r, is_active: !!r.is_active,
          board_name: boardOf(r.board_id)?.name,
          column_title: colOf(r.column_id)?.title,
          assignee_name: userName(r.assignee_id),
        })),
      });
    },
    async create(d) {
      const u = auth(); need(u, 'recurrence.manage');
      const boardId = d.board_id || db.boards[0].id;
      const r = { id: uid(), company_id: 'c1', board_id: boardId,
        column_id: d.column_id || db.columns.find((c) => c.board_id === boardId).id,
        title: d.title, description: d.description || null, assignee_id: d.assignee_id || null,
        priority: d.priority || 'normal', estimate_h: d.estimate_h || null,
        checklist: (d.checklist || []).length ? JSON.stringify(d.checklist) : null,
        freq: d.freq, weekdays: (d.weekdays || []).join(',') || null,
        month_day: d.month_day || null, due_offset: d.due_offset || 0,
        is_active: 1, last_run_date: null, created_by: u.id, created_at: now() };
      db.recurrences.push(r);
      // بلافاصله یک نمونه بساز تا اثرش دیده شود
      const j = isoToJalali(today);
      await API.tasks.create({
        board_id: r.board_id, column_id: r.column_id,
        title: `${r.title} — ${j.jd} ${MONTH_NAMES[j.jm - 1]}`,
        assignee_id: r.assignee_id, priority: r.priority, estimate_h: r.estimate_h,
        due_date: shift(r.due_offset), checklist: d.checklist || [], recurrence_id: r.id,
      });
      r.last_run_date = today;
      save(); return wait({ recurrence: r });
    },
    async update(id, d) {
      const u = auth(); need(u, 'recurrence.manage');
      const r = db.recurrences.find((x) => x.id === id);
      if (!r) fail('یافت نشد', 404);
      if (d.is_active !== undefined) r.is_active = d.is_active ? 1 : 0;
      save(); return wait({ recurrence: r });
    },
    async remove(id) {
      const u = auth(); need(u, 'recurrence.manage');
      db.recurrences = db.recurrences.filter((r) => r.id !== id);
      save(); return wait({ ok: true });
    },
  },

  units: {
    async list() {
      const u = auth();
      const rows = db.units.filter((x) => !x.archived_at).map((un) => ({
        ...un,
        manager_name: userName(un.manager_id),
        parent_name: un.parent_id ? unitOf(un.parent_id)?.name || null : null,
        headcount: db.users.filter((x) => x.unit_id === un.id && x.is_active).length,
        open_tasks: db.tasks.filter((t) => t.unit_id === un.id && !t.archived_at
          && colOf(t.column_id)?.kind !== 'done').length,
      }));
      return wait({ units: rows, managed: managedUnits(u) });
    },
    async create(d) {
      const u = auth(); need(u, 'units.manage');
      const name = String(d.name || '').trim();
      if (!name) fail('نام واحد لازم است');
      const un = { id: uid(), company_id: 'c1', name, parent_id: d.parent_id || null,
        manager_id: d.manager_id || null, color: d.color || '#387F81',
        archived_at: null, created_at: now() };
      db.units.push(un); save();
      return wait({ unit: un });
    },
    async update(id, d) {
      const u = auth(); need(u, 'units.manage');
      const un = unitOf(id);
      if (!un) fail('واحد یافت نشد', 404);
      if (d.parent_id !== undefined) {
        if (d.parent_id === un.id) fail('واحد نمی‌تواند بالادست خودش باشد');
        if (d.parent_id && subtree(un.id).includes(d.parent_id)) {
          fail('این کار حلقه در ساختار سازمانی می‌سازد');
        }
        un.parent_id = d.parent_id || null;
      }
      for (const k of ['name', 'color', 'manager_id']) if (d[k] !== undefined) un[k] = d[k] || null;
      if (d.archived !== undefined) {
        if (d.archived && db.users.some((x) => x.unit_id === un.id && x.is_active)) {
          fail('ابتدا افراد این واحد را به واحد دیگری منتقل کنید');
        }
        un.archived_at = d.archived ? now() : null;
      }
      save();
      return wait({ unit: un });
    },
    async productivity(id, query = {}) {
      const u = auth();
      const un = unitOf(id);
      if (!un) fail('واحد یافت نشد', 404);
      const jy = Number(query.jy) || J.jy, jm = Number(query.jm) || J.jm;
      const mine = managedUnits(u);
      const allowed = allow(u, 'scores.unit') || allow(u, 'reports.unit')
        || allow(u, 'scores.view_all') || mine.includes(un.id) || u.unit_id === un.id;
      if (!allowed) fail('این واحد در دسترس شما نیست', 403);

      const ids = subtree(un.id);
      const reviews = db.task_reviews
        .filter((r) => r.j_year === jy && r.j_month === jm && ids.includes(r.unit_id))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .map((r) => {
          const t = db.tasks.find((x) => x.id === r.task_id);
          return { ...r, task_title: t?.title || '—', task_code: t?.code || 0,
            estimate_h: t?.estimate_h ?? null,
            assignee_name: userName(r.assignee_id), reviewer_name: userName(r.reviewer_id) };
        });
      const approved = reviews.filter((r) => r.decision === 'approved');
      const returned = reviews.filter((r) => r.decision === 'returned');
      const scores = approved.map((r) => r.score);
      const known = approved.filter((r) => r.on_time !== null);
      const members = db.users.filter((x) => x.is_active && ids.includes(x.unit_id))
        .sort((a, b) => a.full_name.localeCompare(b.full_name, 'fa'));

      return wait({
        unit: un,
        month: { jy, jm },
        summary: {
          approved: approved.length,
          returned: returned.length,
          rework_rate: reviews.length ? Math.round((returned.length / reviews.length) * 100) : 0,
          avg_score: scores.length
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
          on_time_pct: known.length
            ? Math.round((known.filter((r) => r.on_time === 1).length / known.length) * 100) : null,
          headcount: members.length,
        },
        people: members.map((m) => ({ id: m.id, full_name: m.full_name, job_title: m.job_title,
          ...personMonthScore(m.id, jy, jm) })),
        reviews: reviews.slice(0, 60),
        unit_score: db.unit_scores.find((s) => s.unit_id === un.id && s.j_year === jy && s.j_month === jm) || null,
      });
    },
    async score(id, d) {
      const u = auth(); need(u, 'scores.unit');
      const un = unitOf(id);
      if (!un) fail('واحد یافت نشد', 404);
      const jy = Number(d.jy) || J.jy, jm = Number(d.jm) || J.jm;
      const score = Number(d.score);
      if (!(score >= 0 && score <= 100)) fail('امتیاز باید بین ۰ تا ۱۰۰ باشد');
      const note = String(d.note || '').trim();
      if (score > JUSTIFY_ABOVE && note.length < 15) {
        fail(`امتیاز بالاتر از ${JUSTIFY_ABOVE} باید با توضیح همراه باشد — دست‌کم ۱۵ نویسه`);
      }
      const ex = db.unit_scores.find((s) => s.unit_id === un.id && s.j_year === jy && s.j_month === jm);
      if (ex) { Object.assign(ex, { score, note: note || null, created_by: u.id, updated_at: now() }); } else {
        db.unit_scores.push({ id: uid(), company_id: 'c1', unit_id: un.id, j_year: jy, j_month: jm,
          score, note: note || null, created_by: u.id, created_at: now(), updated_at: now() });
      }
      for (const m of db.users.filter((x) => x.unit_id === un.id && x.is_active)) {
        notify(m.id, 'unit_score', `واحد «${un.name}» امتیاز ${score} گرفت`, note || null, null, u.id);
      }
      save();
      return wait({ ok: true, score });
    },
  },

  review: {
    async list() {
      const u = auth(); need(u, 'review.do');
      const rows = db.tasks
        .filter((t) => t.review_status === 'pending' && !t.archived_at && canReview(u, t.assignee_id))
        .sort((a, b) => ((a.submitted_at || '') < (b.submitted_at || '') ? -1 : 1))
        .map((t) => {
          const un = unitOf(t.unit_id);
          return { ...deco(t), unit_name: un?.name || null, unit_color: un?.color || null,
            facts: taskFacts(t) };
        });
      return wait({ tasks: rows, justify_above: JUSTIFY_ABOVE });
    },
    async submit(taskId) {
      const u = auth();
      const t = db.tasks.find((x) => x.id === taskId);
      if (!t) fail('کار یافت نشد', 404);
      if (t.assignee_id !== u.id && !allow(u, 'tasks.edit')) fail('این کار به شما سپرده نشده است', 403);
      if (!t.unit_id) fail('این کار برای واحدی تعریف نشده، پس بررسی سرپرست لازم ندارد');
      if (t.review_status === 'pending') fail('این کار از قبل در کارتابل بررسی است');
      if (t.review_status === 'approved') fail('این کار قبلاً تأیید شده است');

      const target = db.columns.find((c) => c.board_id === t.board_id && c.kind === 'review')
        || db.columns.find((c) => c.board_id === t.board_id && c.kind === 'done');
      t.review_status = 'pending';
      t.submitted_at = now();
      t.completed_at = now();
      if (target) t.column_id = target.id;
      t.updated_at = now();
      db.events.push({ id: uid(), task_id: t.id, user_id: u.id, action: 'submitted', detail: null, created_at: now() });

      const owner = db.users.find((x) => x.id === (t.assignee_id || u.id));
      const reviewer = owner?.supervisor_id || unitOf(owner?.unit_id)?.manager_id || null;
      if (reviewer) {
        notify(reviewer, 'review', `«${t.title}» برای بررسی آماده است`,
          `از ${owner.full_name}`, t.id, u.id);
      }
      save();
      return wait({ task: t });
    },
    async decide(taskId, d) {
      const u = auth(); need(u, 'review.do');
      const t = db.tasks.find((x) => x.id === taskId);
      if (!t) fail('کار یافت نشد', 404);
      if (t.review_status !== 'pending') fail('این کار در کارتابل بررسی نیست');
      if (!canReview(u, t.assignee_id)) {
        fail('بررسی این کار در اختیار شما نیست — فقط سرپرست مستقیم یا مدیر واحد', 403);
      }
      if (!['approved', 'returned'].includes(d.decision)) fail('تصمیم نامعتبر است');
      const comment = String(d.comment || '').trim();
      const justification = String(d.justification || '').trim();

      let score = null;
      if (d.decision === 'approved') {
        if (d.score === undefined || d.score === null || d.score === '') fail('برای تأیید باید امتیاز این کار را بدهید');
        score = Number(d.score);
        if (!(score >= 0 && score <= 100)) fail('امتیاز باید بین ۰ تا ۱۰۰ باشد');
        if (score > JUSTIFY_ABOVE && justification.length < 15) {
          fail(`امتیاز بالاتر از ${JUSTIFY_ABOVE} باید با توجیه همراه باشد — دست‌کم ۱۵ نویسه بنویسید`);
        }
      } else if (!comment) {
        fail('برای بازگرداندن کار باید بنویسید چه چیزی باید اصلاح شود');
      }

      const facts = taskFacts(t);
      db.task_reviews.push({ id: uid(), company_id: 'c1', task_id: t.id, assignee_id: t.assignee_id,
        reviewer_id: u.id, unit_id: t.unit_id, decision: d.decision, score,
        justification: justification || null, comment: comment || null,
        on_time: facts.on_time, checklist_pct: facts.checklist_pct,
        j_year: J.jy, j_month: J.jm, created_at: now() });

      if (d.decision === 'approved') {
        t.review_status = 'approved';
        t.approved_at = now();
        db.events.push({ id: uid(), task_id: t.id, user_id: u.id, action: 'approved', detail: String(score), created_at: now() });
        notify(t.assignee_id, 'approved', `«${t.title}» تأیید شد — امتیاز ${score}`, comment || null, t.id, u.id);
      } else {
        const back = db.columns.find((c) => c.board_id === t.board_id && c.kind === 'normal');
        t.review_status = 'returned';
        t.return_count = (t.return_count || 0) + 1;
        t.completed_at = null;
        t.submitted_at = null;
        if (back) t.column_id = back.id;
        db.events.push({ id: uid(), task_id: t.id, user_id: u.id, action: 'returned', detail: comment, created_at: now() });
        notify(t.assignee_id, 'returned', `«${t.title}» برای اصلاح برگشت`, comment, t.id, u.id);
      }
      t.updated_at = now();
      save();
      return wait({ ok: true, decision: d.decision, score });
    },
  },

  // در نسخهٔ نمایشی مرورگری، پل اعلان ذاتاً نمی‌تواند روشن باشد — پیام بیرونی
  // از سرور می‌رود، نه از مرورگر. اینجا فقط وضعیت را صادقانه گزارش می‌کنیم.
  notify: {
    async status() {
      const u = auth();
      return wait({
        enabled: false,
        driver: 'none',
        demo: true,
        linked: db.users.filter((x) => x.is_active && x.chat_id).length,
        total: db.users.filter((x) => x.is_active).length,
        me_linked: !!u.chat_id,
        stats: { sent: 0, failed: 0, dropped: 0, driver: 'none' },
      });
    },
    async test() {
      fail('در نسخهٔ نمایشی پیام واقعی فرستاده نمی‌شود — این کار از سرور انجام می‌گیرد');
    },
  },

  reports: {
    async units(query = {}) {
      const u = auth(); need(u, 'reports.unit');
      const jy = Number(query.jy) || J.jy, jm = Number(query.jm) || J.jm;
      const out = db.units.filter((x) => !x.archived_at)
        .sort((a, b) => a.name.localeCompare(b.name, 'fa'))
        .map((un) => {
          const ids = subtree(un.id);
          const reviews = db.task_reviews.filter((r) => r.j_year === jy && r.j_month === jm
            && ids.includes(r.unit_id));
          const approved = reviews.filter((r) => r.decision === 'approved');
          const returned = reviews.filter((r) => r.decision === 'returned');
          const scores = approved.map((r) => r.score);
          const known = approved.filter((r) => r.on_time !== null);
          const given = db.unit_scores.find((s) => s.unit_id === un.id && s.j_year === jy && s.j_month === jm);

          const byReviewer = new Map();
          for (const r of approved) {
            if (!byReviewer.has(r.reviewer_id)) byReviewer.set(r.reviewer_id, []);
            byReviewer.get(r.reviewer_id).push(r);
          }
          const reviewers = [...byReviewer].map(([rid, rs]) => {
            const sc = rs.map((r) => r.score);
            return {
              reviewer_id: rid, name: userName(rid) || '—', count: rs.length,
              avg_score: Math.round((sc.reduce((a, b) => a + b, 0) / sc.length) * 10) / 10,
              min_score: Math.min(...sc), max_score: Math.max(...sc),
              top_share: Math.round((sc.filter((s) => s > JUSTIFY_ABOVE).length / sc.length) * 100),
              late_but_scored_high: rs.filter((r) => r.on_time === 0 && r.score > JUSTIFY_ABOVE).length,
              late_count: rs.filter((r) => r.on_time === 0).length,
            };
          }).sort((a, b) => b.count - a.count);

          return {
            unit: { id: un.id, name: un.name, manager_name: userName(un.manager_id), color: un.color },
            headcount: db.users.filter((x) => x.is_active && ids.includes(x.unit_id)).length,
            approved: approved.length,
            returned: returned.length,
            rework_rate: reviews.length ? Math.round((returned.length / reviews.length) * 100) : 0,
            avg_score: scores.length
              ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
            on_time_pct: known.length
              ? Math.round((known.filter((r) => r.on_time === 1).length / known.length) * 100) : null,
            approved_hours: db.time_logs.filter((l) => l.j_year === jy && l.j_month === jm
              && l.status === 'approved'
              && ids.includes(db.users.find((x) => x.id === l.user_id)?.unit_id))
              .reduce((a, l) => a + l.hours, 0),
            unit_score: given ? given.score : null,
            unit_note: given ? given.note : null,
            reviewers,
          };
        });
      return wait({ month: { jy, jm }, units: out, justify_above: JUSTIFY_ABOVE });
    },
  },

  async myday() {
    const u = auth(); need(u, 'tasks.view');
    const mine = db.tasks
      .filter((t) => t.assignee_id === u.id && !t.archived_at && colOf(t.column_id)?.kind !== 'done')
      .map(deco)
      .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
    const soon = shift(3);
    const groups = { overdue: [], today: [], doing: [], soon: [], later: [] };
    for (const t of mine) {
      if (t.due_date && t.due_date < today) groups.overdue.push(t);
      else if (t.due_date === today) groups.today.push(t);
      else if (t.column_kind === 'normal' || t.column_kind === 'review') groups.doing.push(t);
      else if (t.due_date && t.due_date <= soon) groups.soon.push(t);
      else groups.later.push(t);
    }
    const logged = db.time_logs.filter((l) => l.user_id === u.id && l.work_date === today && l.status !== 'rejected')
      .reduce((a, l) => a + l.hours, 0);
    return wait({ today, groups, logged_today: logged, total: mine.length });
  },

  async workload() {
    const u = auth(); need(u, 'tasks.view_all');
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const team = db.users.filter((x) => x.is_active).map((m) => {
      const open = db.tasks.filter((t) => t.assignee_id === m.id && !t.archived_at && colOf(t.column_id)?.kind !== 'done');
      return {
        id: m.id, full_name: m.full_name, job_title: m.job_title, monthly_target: m.monthly_target,
        open_tasks: open.length,
        estimate_h: open.reduce((a, t) => a + (t.estimate_h || 0), 0),
        overdue: open.filter((t) => t.due_date && t.due_date < today).length,
        hot: open.filter((t) => ['urgent', 'high'].includes(t.priority)).length,
        stale: open.filter((t) => colOf(t.column_id)?.kind === 'normal' && t.updated_at < weekAgo).length,
      };
    });
    const unassigned = db.tasks
      .filter((t) => !t.assignee_id && !t.archived_at && colOf(t.column_id)?.kind !== 'done').map(deco);
    return wait({ team, unassigned });
  },

  timelogs: {
    async list(query = {}) {
      const u = auth();
      let rows = db.time_logs;
      if (allow(u, 'time.view_all')) { if (query.user_id) rows = rows.filter((l) => l.user_id === query.user_id); }
      else rows = rows.filter((l) => l.user_id === u.id);
      if (query.status) rows = rows.filter((l) => l.status === query.status);
      if (query.jy) rows = rows.filter((l) => l.j_year === Number(query.jy));
      if (query.jm) rows = rows.filter((l) => l.j_month === Number(query.jm));
      return wait({
        logs: rows.slice().sort((a, b) => (a.work_date < b.work_date ? 1 : -1)).map((l) => ({
          ...l, full_name: userName(l.user_id),
          task_title: db.tasks.find((t) => t.id === l.task_id)?.title || null,
          task_code: db.tasks.find((t) => t.id === l.task_id)?.code || null,
        })),
      });
    },
    async create(d) {
      const u = auth(); need(u, 'time.log');
      if (d.work_date > today) fail('برای روز آینده نمی‌توان ساعت ثبت کرد');
      const sum = db.time_logs.filter((l) => l.user_id === u.id && l.work_date === d.work_date
        && l.status !== 'rejected').reduce((a, l) => a + l.hours, 0);
      if (sum + Number(d.hours) > 24) fail('مجموع ساعات این روز از ۲۴ بیشتر می‌شود');
      const jj = isoToJalali(d.work_date);
      db.time_logs.push({ id: uid(), company_id: 'c1', user_id: u.id, task_id: d.task_id || null,
        work_date: d.work_date, j_year: jj.jy, j_month: jj.jm, hours: Number(d.hours),
        note: d.note || '', status: 'pending', created_at: now() });
      save(); return wait({ ok: true });
    },
    async update(id, d) {
      const u = auth();
      const l = db.time_logs.find((x) => x.id === id);
      if (!l) fail('رکورد یافت نشد', 404);
      if (d.status) { need(u, 'time.approve'); l.status = d.status; l.reviewed_by = u.id; l.reviewed_at = now(); }
      save(); return wait({ ok: true });
    },
    async remove(id) {
      const u = auth();
      const l = db.time_logs.find((x) => x.id === id);
      if (!l) fail('رکورد یافت نشد', 404);
      if (l.user_id !== u.id && !allow(u, 'time.approve')) fail('دسترسی ندارید', 403);
      db.time_logs = db.time_logs.filter((x) => x.id !== id); save();
      return wait({ ok: true });
    },
    async review(ids, status) {
      const u = auth(); need(u, 'time.approve');
      db.time_logs.forEach((l) => {
        if (ids.includes(l.id)) { l.status = status; l.reviewed_by = u.id; l.reviewed_at = now(); }
      });
      save(); return wait({ ok: true, count: ids.length });
    },
  },

  scores: {
    /** امتیاز فرد دیگر دستی ثبت نمی‌شود — از امتیاز کارهای تأییدشده‌اش ساخته می‌شود */
    async list(query = {}) {
      const u = auth();
      const target = query.user_id || u.id;
      if (target !== u.id) {
        const t = db.users.find((x) => x.id === target);
        const seeUnit = allow(u, 'scores.view_unit') && t?.unit_id
          && (managedUnits(u).includes(t.unit_id) || t.unit_id === u.unit_id);
        if (!allow(u, 'scores.view_all') && !seeUnit) fail('امتیاز این فرد در دسترس شما نیست', 403);
      } else if (!allow(u, 'scores.view_own')) {
        fail('دیدن امتیاز عملکرد برای شما فعال نیست', 403);
      }
      const jy = Number(query.jy) || J.jy, jm = Number(query.jm) || J.jm;
      const months = [];
      for (let i = 5; i >= 0; i -= 1) {
        let ty = jy, tm = jm - i;
        while (tm < 1) { tm += 12; ty -= 1; }
        months.push({ j_year: ty, j_month: tm, user_id: target, full_name: userName(target),
          ...personMonthScore(target, ty, tm) });
      }
      const detail = db.task_reviews
        .filter((r) => r.assignee_id === target && r.j_year === jy && r.j_month === jm)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .map((r) => {
          const t = db.tasks.find((x) => x.id === r.task_id);
          return { score: r.score, comment: r.comment, justification: r.justification,
            on_time: r.on_time, checklist_pct: r.checklist_pct, created_at: r.created_at,
            task_title: t?.title || '—', task_code: t?.code || 0, estimate_h: t?.estimate_h ?? null,
            reviewer_name: userName(r.reviewer_id) };
        });
      return wait({ scores: months.reverse(), current: months[0], detail, is_self: target === u.id });
    },
    async save(d) {
      const u = auth(); need(u, 'scores.manage');
      const parts = [d.quality, d.speed, d.discipline, d.teamwork].map(Number);
      const score = Math.round((parts.reduce((a, b) => a + b, 0) / 4) * 10) / 10;
      let row = db.performance_scores.find((s) => s.user_id === d.user_id && s.j_year === d.jy && s.j_month === d.jm);
      if (!row) {
        row = { id: uid(), company_id: 'c1', user_id: d.user_id, j_year: d.jy, j_month: d.jm, created_by: u.id, created_at: now() };
        db.performance_scores.push(row);
      }
      Object.assign(row, { quality: parts[0], speed: parts[1], discipline: parts[2],
        teamwork: parts[3], score, note: d.note || '', updated_at: now() });
      save(); return wait({ score: row });
    },
  },

  async stats(query = {}) {
    const u = auth();
    const jy = Number(query.jy) || J.jy;
    const jm = Number(query.jm) || J.jm;
    const payload = { month: { jy, jm }, me: { ...userMonth(u.id, jy, jm), monthly_target: u.monthly_target } };

    const trend = [];
    for (let i = 5; i >= 0; i -= 1) {
      let ty = jy, tm = jm - i;
      while (tm < 1) { tm += 12; ty -= 1; }
      const h = db.time_logs.filter((l) => l.user_id === u.id && l.j_year === ty && l.j_month === tm && l.status === 'approved')
        .reduce((a, l) => a + l.hours, 0);
      const sc = db.performance_scores.find((s) => s.user_id === u.id && s.j_year === ty && s.j_month === tm);
      trend.push({ jy: ty, jm: tm, hours: h, score: sc ? sc.score : null });
    }
    payload.trend = trend;

    if (allow(u, 'users.view') || allow(u, 'time.view_all') || allow(u, 'scores.view_all')) {
      const team = db.users.filter((x) => x.is_active).map((m) => ({
        id: m.id, full_name: m.full_name, job_title: m.job_title, department: m.department,
        monthly_target: m.monthly_target, role: m.role, ...userMonth(m.id, jy, jm),
      }));
      const pending = db.time_logs.filter((l) => l.status === 'pending');
      const open = db.tasks.filter((t) => colOf(t.column_id)?.kind !== 'done' && !t.archived_at);
      const scored = team.map((t) => t.score).filter((s) => s !== null);
      payload.team = team;
      payload.company = {
        headcount: team.length,
        pending_logs: pending.length,
        pending_hours: pending.reduce((a, l) => a + l.hours, 0),
        open_tasks: open.length,
        overdue_tasks: open.filter((t) => t.due_date && t.due_date < today).length,
        unassigned_tasks: open.filter((t) => !t.assignee_id).length,
        review_queue: open.filter((t) => {
          const col = db.columns.find((c) => c.id === t.column_id);
          return col && col.kind === 'review';
        }).length,
        draft_entries: allow(u, 'stock.view')
          ? db.stock_entries.filter((e) => e.status === 'draft').length : 0,
        approved_hours: team.reduce((a, t) => a + t.approved_hours, 0),
        done_tasks: team.reduce((a, t) => a + t.done_tasks, 0),
        avg_score: scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : null,
      };
    }
    return wait(payload);
  },
};

window.karnamaReset = () => { try { localStorage.removeItem(KEY); } catch { /* */ } location.reload(); };

/**
 * شروع خالی: فقط حساب مدیر می‌ماند و هیچ دادهٔ نمونه‌ای ساخته نمی‌شود.
 * برای وقتی که می‌خواهید ساختار واقعی سازمان را از صفر و بدون شلوغی وارد کنید.
 */
window.karnamaResetEmpty = () => {
  try {
    const fresh = seed();
    const admin = fresh.users.find((x) => x.username === 'modir');
    localStorage.setItem(KEY, JSON.stringify({
      company: fresh.company,
      users: admin ? [{ ...admin, unit_id: null, supervisor_id: null }] : [],
      units: [], boards: fresh.boards, columns: fresh.columns,
      labels: [], task_labels: [], tasks: [], checklist_items: [], task_links: [],
      time_logs: [], performance_scores: [], recurrences: [], notifications: [],
      task_reviews: [], unit_scores: [],
      uoms: fresh.uoms, item_groups: [], warehouses: [], items: [],
      stock_entries: [], stock_entry_items: [], stock_ledger: [],
      indicators: [], indicator_values: [],
      conversations: [], conversation_members: [], messages: [],
      comments: [], events: [], board_members: [], session: null,
    }));
  } catch { /* حافظهٔ مرورگر در دسترس نیست */ }
  location.reload();
};
