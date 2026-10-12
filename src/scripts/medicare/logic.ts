/**
 * MEDICARE MATH — small, pure functions shared by the Medicare components
 * (at build time, to print sensible defaults) and by their browser scripts
 * (to update live). No page code lives here, only calculations:
 *   • enrollment-period status ("Opens in 4 days" / "Open now — ends in 9 days")
 *   • the 7-month Initial Enrollment Period around a 65th birthday
 *   • Part B and Part D late-enrollment penalty estimates
 *   • money and date formatting
 * Dates are calendar dates in New York (Eastern) time — the office's time zone.
 */

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A calendar date (month is 1–12). */
export interface YMD {
  y: number;
  m: number;
  d: number;
}
/** A calendar month (month is 1–12). */
export interface YM {
  y: number;
  m: number;
}
/** [month 1–12, day] — e.g. [10, 15] for October 15. */
export type MonthDay = readonly [number, number];

/* ───────────── Dates ───────────── */

/** Today's date in New York. */
export function todayET(now: Date = new Date()): YMD {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get('year'), m: get('month'), d: get('day') };
}

/** Whole days since 1970 for a calendar date (time-zone safe for day differences). */
const dayIndex = ({ y, m, d }: YMD): number => Math.round(Date.UTC(y, m - 1, d) / 86_400_000);

/** Month arithmetic: addMonths({y:2026,m:11}, 3) → {y:2027,m:2}. */
export function addMonths({ y, m }: YM, n: number): YM {
  const index = y * 12 + (m - 1) + n;
  return { y: Math.floor(index / 12), m: (((index % 12) + 12) % 12) + 1 };
}
export const monthIndex = ({ y, m }: YM): number => y * 12 + (m - 1);

export const formatMonth = ({ y, m }: YM, short = false): string => `${(short ? MONTHS_SHORT : MONTHS)[m - 1]} ${y}`;
export const formatFirstOf = ({ y, m }: YM): string => `${MONTHS[m - 1]} 1, ${y}`;
/** Last calendar day of a month. */
export const lastDayOf = ({ y, m }: YM): number => new Date(Date.UTC(y, m, 0)).getUTCDate();

/* ───────────── Yearly enrollment periods ───────────── */

export interface PeriodState {
  open: boolean;
  /** Days until it opens (when closed) or until its last day (when open; 0 = last day is today). */
  days: number;
  start: YMD;
  end: YMD;
}

/**
 * Status of a period that repeats every year on fixed dates (e.g. Oct 15 – Dec 7).
 * If this year's window has already ended, it looks ahead to next year's.
 */
export function yearlyPeriodState(start: MonthDay, end: MonthDay, now: Date = new Date()): PeriodState {
  const t = todayET(now);
  const today = dayIndex(t);
  let year = t.y;
  if (today > dayIndex({ y: year, m: end[0], d: end[1] })) year += 1;
  const s: YMD = { y: year, m: start[0], d: start[1] };
  const e: YMD = { y: year, m: end[0], d: end[1] };
  const open = today >= dayIndex(s);
  return { open, days: open ? dayIndex(e) - today : dayIndex(s) - today, start: s, end: e };
}

export function periodStatusText(state: PeriodState): string {
  if (state.open) {
    if (state.days <= 0) return 'Open now — last day is today';
    if (state.days === 1) return 'Open now — ends tomorrow';
    return `Open now — ends in ${state.days} days`;
  }
  if (state.days === 1) return 'Opens tomorrow';
  return `Opens in ${state.days} days`;
}

/** "October 15 – December 7, 2026" */
export function formatRange(s: YMD, e: YMD): string {
  const startText = `${MONTHS[s.m - 1]} ${s.d}${s.y !== e.y ? `, ${s.y}` : ''}`;
  return `${startText} – ${MONTHS[e.m - 1]} ${e.d}, ${e.y}`;
}

/* ───────────── Initial Enrollment Period ───────────── */

export interface IepMonth extends YM {
  /** −3 … +3 relative to the month Medicare treats as your 65th-birthday month. */
  offset: number;
  /** When Part B coverage would start if you sign up during this month. */
  coverage: YM;
}

/**
 * The 7-month Initial Enrollment Period: the 3 months before the month you
 * turn 65, that month, and the 3 months after.
 *  • Sign up in the 3 months before → coverage starts the first day of your birthday month.
 *  • Sign up in your birthday month or later → coverage starts the first day of the next month.
 *  • Born on the 1st? Medicare counts you as turning 65 the month before, so everything moves one month earlier.
 */
export function initialEnrollment(birthdayMonth: YM, bornOnFirst = false) {
  const eligible = bornOnFirst ? addMonths(birthdayMonth, -1) : birthdayMonth;
  const months: IepMonth[] = [];
  for (let offset = -3; offset <= 3; offset++) {
    const month = addMonths(eligible, offset);
    months.push({ ...month, offset, coverage: offset < 0 ? eligible : addMonths(month, 1) });
  }
  return { eligible, months, first: months[0], last: months[months.length - 1] };
}

/** "3 months before" … "Your 65th-birthday month" … "3 months after". */
export function iepOffsetLabel(offset: number): string {
  if (offset === 0) return 'The month you turn 65';
  const n = Math.abs(offset);
  return `${n} month${n === 1 ? '' : 's'} ${offset < 0 ? 'before' : 'after'}`;
}

/** Where today falls relative to the window: 'before' it opens, 'during' or 'after' it closed. */
export function iepTiming(iep: ReturnType<typeof initialEnrollment>, today: YM): 'before' | 'during' | 'after' {
  const now = monthIndex(today);
  if (now < monthIndex(iep.first)) return 'before';
  if (now > monthIndex(iep.last)) return 'after';
  return 'during';
}

/** The plain-English summary shown above the calculator's timeline. */
export function iepSummary(iep: ReturnType<typeof initialEnrollment>, today: YM): string {
  const opens = formatFirstOf(iep.first);
  const closes = `${MONTHS[iep.last.m - 1]} ${lastDayOf(iep.last)}, ${iep.last.y}`;
  const earliest = formatFirstOf(iep.eligible);
  const timing = iepTiming(iep, today);
  if (timing === 'after') {
    return `Your Initial Enrollment Period ran from ${opens} to ${closes}. If you have coverage from a current job, you may qualify for a Special Enrollment Period; otherwise you can sign up during the General Enrollment Period, January 1 – March 31.`;
  }
  if (timing === 'during') {
    const thisMonth = iep.months.find((m) => monthIndex(m) === monthIndex(today));
    const starts = thisMonth ? formatFirstOf(thisMonth.coverage) : earliest;
    return `You are in your Initial Enrollment Period now — it ends ${closes}. Sign up this month and your coverage would start ${starts}.`;
  }
  return `Your Initial Enrollment Period runs from ${opens} to ${closes}. Sign up in the first three months and your coverage starts ${earliest} — the earliest date possible.`;
}

/* ───────────── Late-enrollment penalties ───────────── */

/** Medicare rounds penalty amounts to the nearest 10 cents. */
export const roundToDime = (n: number): number => Math.round(n * 10) / 10;

/**
 * Part B: 10% of the standard premium for each FULL 12-month period you could
 * have had Part B but didn't. Medicare.gov example: 24 months → 20% →
 * $202.90 × 1.2 = $243.48, rounded to $243.50.
 */
export function partBPenalty(monthsWithout: number, standardPremium: number) {
  const months = Math.max(0, Math.floor(monthsWithout || 0));
  const periods = Math.floor(months / 12);
  const percent = periods * 10;
  const total = roundToDime(standardPremium * (1 + percent / 100));
  return { months, periods, percent, total, added: Math.max(0, Math.round((total - standardPremium) * 100) / 100) };
}

/**
 * Part D: 1% of the national base beneficiary premium for each full month
 * without Part D or other creditable drug coverage, rounded to the nearest
 * $0.10. Medicare.gov example: 14 months × 1% × $38.99 = $5.46 → $5.50.
 */
export function partDPenalty(monthsWithout: number, basePremium: number) {
  const months = Math.max(0, Math.floor(monthsWithout || 0));
  const raw = (basePremium * months) / 100;
  return { months, percent: months, raw, monthly: roundToDime(raw) };
}

/* ───────────── Formatting ───────────── */

/** $1,736 · $202.90 */
export function money(n: number, cents = true): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n);
}
