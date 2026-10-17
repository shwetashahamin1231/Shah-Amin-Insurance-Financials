/**
 * ════════════════════════════════════════════════════════════════════
 *  BOOKING SLOTS — which days and times can be requested online
 * ════════════════════════════════════════════════════════════════════
 *  Rules come from two config files:
 *   • src/config/site.ts  → HOURS (open/close, open days, holiday rules)
 *   • src/config/forms.ts → BOOKING (slot length, last start, notice, horizon)
 *
 *  Every function takes `now` as an argument (defaulting to the real
 *  clock) so the rules can be tested for any moment — e.g. "what does
 *  the calendar look like at 3 PM on Columbus Day?".
 *  All dates and times are Eastern Time.
 * ════════════════════════════════════════════════════════════════════
 */
import { HOURS } from '../config/site';
import { BOOKING } from '../config/forms';
import { getClosure, type ClosureRules } from './holidays';
import {
  addDays,
  daysInMonth,
  ET_LABEL,
  formatTime12,
  isValidDate,
  minutesOf,
  parseDate,
  timeFromMinutes,
  toDateString,
  weekdayOf,
  zonedParts,
  zonedTimeToUtc,
} from './time';

const MINUTE = 60_000;

export interface BookingRules extends ClosureRules {
  timeZone: string;
  /** Opening time, 'HH:MM' (24-hour). */
  open: string;
  /** Closing time, 'HH:MM' (24-hour). */
  close: string;
  /** Days the office is open: 0 = Sunday … 6 = Saturday. */
  openDays: readonly number[];
  slotMinutes: number;
  /** How long one appointment occupies the calendar (minutes). */
  blockMinutes: number;
  lastStart: string;
  minNoticeMinutes: number;
  horizonDays: number;
  /** Busy times from the appointments calendar, as [start, end) in epoch ms. */
  busy: ReadonlyArray<readonly [number, number]>;
}

/** The live rules, assembled from site.ts + forms.ts. */
export const DEFAULT_RULES: BookingRules = {
  timeZone: HOURS.timeZone,
  open: HOURS.open,
  close: HOURS.close,
  openDays: HOURS.openDays,
  closeOnHoliday: HOURS.closeOnHoliday,
  closeOnObservedDay: HOURS.closeOnObservedDay,
  slotMinutes: BOOKING.slotMinutes,
  blockMinutes: BOOKING.blockMinutes,
  lastStart: BOOKING.lastStart,
  minNoticeMinutes: BOOKING.minNoticeMinutes,
  horizonDays: BOOKING.horizonDays,
  busy: [],
};

/** Replace the busy times the live rules use (fetched from the appointments calendar). */
export function setBusyTimes(busy: ReadonlyArray<readonly [number, number]>): void {
  DEFAULT_RULES.busy = busy;
}

/** Would an appointment starting at `start` (lasting blockMinutes) overlap anything busy? */
export function overlapsBusy(start: number, rules: BookingRules = DEFAULT_RULES): boolean {
  const end = start + rules.blockMinutes * MINUTE;
  return rules.busy.some(([s, e]) => start < e && s < end);
}

export type DayPeriod = 'morning' | 'afternoon' | 'evening';
export const PERIOD_LABELS: Record<DayPeriod, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

export interface Slot {
  /** '11:30' (24-hour, Eastern) */
  time: string;
  /** '11:30 AM' */
  label: string;
  /** '11:30 AM ET' — exactly what the booking form sends */
  value: string;
  start: Date;
  end: Date;
  period: DayPeriod;
  /** False when the slot is too soon (inside the notice period) or the day is closed. */
  available: boolean;
}

export type UnavailableReason = 'past' | 'beyond-horizon' | 'holiday' | 'closed' | 'no-times-left';

export interface DayStatus {
  date: string;
  bookable: boolean;
  isToday: boolean;
  reason?: UnavailableReason;
  /** Short explanation for screen readers and tooltips, e.g. 'Columbus Day — closed'. */
  note?: string;
  /** Holiday name when the office is closed for one. */
  holiday?: string;
}

/** Morning before noon, afternoon until 5 PM, evening after. */
export function periodOf(time: string): DayPeriod {
  const m = minutesOf(time);
  if (m < 12 * 60) return 'morning';
  if (m < 17 * 60) return 'afternoon';
  return 'evening';
}

/** Every start time offered on an open day: ['11:00', '11:30', … '18:30']. */
export function slotTimes(rules: BookingRules = DEFAULT_RULES): string[] {
  const out: string[] = [];
  const first = minutesOf(rules.open);
  const last = Math.min(minutesOf(rules.lastStart), minutesOf(rules.close) - rules.slotMinutes);
  for (let m = first; m <= last; m += rules.slotMinutes) out.push(timeFromMinutes(m));
  return out;
}

/** Today (Eastern) and the last date that can be booked. */
export function bookingWindow(now: Date = new Date(), rules: BookingRules = DEFAULT_RULES): { today: string; last: string } {
  const today = zonedParts(now, rules.timeZone).date;
  return { today, last: addDays(today, rules.horizonDays) };
}

/** Why a whole day can't be booked (past, too far ahead, holiday, closed weekday) — or null. */
function dayBlock(date: string, now: Date, rules: BookingRules): Pick<DayStatus, 'reason' | 'note' | 'holiday'> | null {
  const { today, last } = bookingWindow(now, rules);
  if (date < today) return { reason: 'past', note: 'Past date' };
  if (date > last) return { reason: 'beyond-horizon', note: `Not open for booking yet (we book up to ${rules.horizonDays} days ahead)` };
  const holiday = getClosure(date, rules);
  if (holiday) return { reason: 'holiday', note: `${holiday} — closed`, holiday };
  if (!rules.openDays.includes(weekdayOf(date))) return { reason: 'closed', note: 'Closed' };
  return null;
}

/** All slots for a date, each marked available or not. Returns [] for invalid dates. */
export function getSlots(date: string, now: Date = new Date(), rules: BookingRules = DEFAULT_RULES): Slot[] {
  if (!isValidDate(date)) return [];
  const blocked = dayBlock(date, now, rules) !== null;
  const earliest = now.getTime() + rules.minNoticeMinutes * MINUTE;
  return slotTimes(rules).map((time) => {
    const start = zonedTimeToUtc(date, time, rules.timeZone);
    const label = formatTime12(time);
    return {
      time,
      label,
      value: `${label} ${ET_LABEL}`,
      start,
      end: new Date(start.getTime() + rules.slotMinutes * MINUTE),
      period: periodOf(time),
      available: !blocked && start.getTime() >= earliest && !overlapsBusy(start.getTime(), rules),
    };
  });
}

/** Only the slots that can still be requested. */
export function getAvailableSlots(date: string, now: Date = new Date(), rules: BookingRules = DEFAULT_RULES): Slot[] {
  return getSlots(date, now, rules).filter((s) => s.available);
}

/** Does an open day still have at least one slot outside the notice period? (Fast for most days.) */
function hasAvailableSlot(date: string, now: Date, rules: BookingRules): boolean {
  const earliest = new Date(now.getTime() + rules.minNoticeMinutes * MINUTE);
  const earliestDate = zonedParts(earliest, rules.timeZone).date;
  if (date > earliestDate && !rules.busy.length) return slotTimes(rules).length > 0;
  if (date < earliestDate) return false;
  return getSlots(date, now, rules).some((s) => s.available);
}

/** Can this date be booked? If not, why not (for the calendar's labels). */
export function getDayStatus(date: string, now: Date = new Date(), rules: BookingRules = DEFAULT_RULES): DayStatus {
  const { today } = bookingWindow(now, rules);
  const isToday = date === today;
  const block = dayBlock(date, now, rules);
  if (block) return { date, bookable: false, isToday, ...block };
  if (!hasAvailableSlot(date, now, rules)) {
    return { date, bookable: false, isToday, reason: 'no-times-left', note: isToday ? 'No times left today' : 'No times available' };
  }
  return { date, bookable: true, isToday };
}

/** Final check before sending: is this exact date + time still bookable right now? */
export function isSlotBookable(date: string, time: string, now: Date = new Date(), rules: BookingRules = DEFAULT_RULES): boolean {
  return getSlots(date, now, rules).some((s) => s.time === time && s.available);
}

/** The first date with an open slot (usually today or tomorrow), or null if none in the horizon. */
export function firstBookableDate(now: Date = new Date(), rules: BookingRules = DEFAULT_RULES): string | null {
  const { today } = bookingWindow(now, rules);
  for (let i = 0; i <= rules.horizonDays; i++) {
    const date = addDays(today, i);
    if (getDayStatus(date, now, rules).bookable) return date;
  }
  return null;
}

/** Slots grouped for display: Morning / Afternoon / Evening (empty groups left out). */
export function groupByPeriod(slots: Slot[]): { period: DayPeriod; label: string; slots: Slot[] }[] {
  return (Object.keys(PERIOD_LABELS) as DayPeriod[])
    .map((period) => ({ period, label: PERIOD_LABELS[period], slots: slots.filter((s) => s.period === period) }))
    .filter((g) => g.slots.length > 0);
}

/** The month calendar as 6 weeks × 7 days (Sunday first); days outside the month are null. */
export function monthMatrix(year: number, month: number): (string | null)[][] {
  const offset = weekdayOf(toDateString(year, month, 1));
  const total = daysInMonth(year, month);
  const weeks: (string | null)[][] = [];
  let day = 1 - offset;
  for (let w = 0; w < 6; w++) {
    const week: (string | null)[] = [];
    for (let d = 0; d < 7; d++, day++) week.push(day >= 1 && day <= total ? toDateString(year, month, day) : null);
    weeks.push(week);
  }
  return weeks;
}

/** First and last month the calendar may show (this month → the month of the last bookable day). */
export function bookableMonths(now: Date = new Date(), rules: BookingRules = DEFAULT_RULES) {
  const { today, last } = bookingWindow(now, rules);
  const a = parseDate(today);
  const b = parseDate(last);
  return { first: { year: a.year, month: a.month }, last: { year: b.year, month: b.month } };
}

/** Is (year, month) inside the navigable range? */
export function isMonthInRange(year: number, month: number, now: Date = new Date(), rules: BookingRules = DEFAULT_RULES): boolean {
  const { first, last } = bookableMonths(now, rules);
  const key = year * 12 + month;
  return key >= first.year * 12 + first.month && key <= last.year * 12 + last.month;
}

