/**
 * ════════════════════════════════════════════════════════════════════
 *  EASTERN-TIME HELPERS
 * ════════════════════════════════════════════════════════════════════
 *  The office runs on Eastern Time (New York), but visitors can be
 *  anywhere and their computer clock can be set to any zone. Everything
 *  here uses the browser's/Node's built-in Intl time-zone data, so it
 *  handles daylight-saving changes correctly without any library.
 *
 *  Vocabulary used in this file:
 *   • "date"  — a calendar day written 'YYYY-MM-DD', e.g. '2026-10-19'.
 *               A date has no time zone; it is simply that day.
 *   • "time"  — a wall-clock time written 'HH:MM' (24-hour), e.g. '18:30'.
 *   • "instant" — a real moment (a JavaScript Date).
 * ════════════════════════════════════════════════════════════════════
 */
import { HOURS } from '../config/site';

/** The office time zone ('America/New_York'). */
export const ET_ZONE: string = HOURS.timeZone;
/** Short label shown after times ("ET"). */
export const ET_LABEL: string = HOURS.timeZoneLabel;

const MINUTE = 60_000;
const DAY = 86_400_000;

/* ───────────── Plain date & time arithmetic (no time zones involved) ───────────── */

export interface DateParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** (2026, 10, 19) → '2026-10-19' */
export function toDateString(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** '2026-10-19' → { year: 2026, month: 10, day: 19 } */
export function parseDate(date: string): DateParts {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

/** True for a real calendar date written 'YYYY-MM-DD' (rejects '2026-02-30'). */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const { year, month, day } = parseDate(date);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Noon UTC on that date — a safe instant for "which weekday / how to print this date". */
function dateToUtcNoon(date: string): Date {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** '2026-10-19' + 3 → '2026-10-22' (negative numbers go back). */
export function addDays(date: string, days: number): string {
  const d = dateToUtcNoon(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Whole days from `from` to `to` ('2026-10-11' → '2026-10-19' = 8). */
export function daysBetween(from: string, to: string): number {
  return Math.round((dateToUtcNoon(to).getTime() - dateToUtcNoon(from).getTime()) / DAY);
}

/** Day of the week for a calendar date: 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: string): number {
  return dateToUtcNoon(date).getUTCDay();
}

/** Number of days in a month (month is 1–12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Move a (year, month) pair by `delta` months. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** '18:30' → 1110 (minutes after midnight). */
export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** 1110 → '18:30' */
export function timeFromMinutes(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/* ───────────── Time-zone conversion (Intl based, DST-safe) ───────────── */

export interface ZonedParts extends DateParts {
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** 'YYYY-MM-DD' in that zone */
  date: string;
  /** 'HH:MM' in that zone */
  time: string;
  /** Minutes after midnight in that zone */
  minutes: number;
}

// Creating Intl formatters is slow, so keep one per time zone.
const partsFormatters = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

/** What a clock in `timeZone` shows at `instant` (defaults to Eastern Time). */
export function zonedParts(instant: Date | number = new Date(), timeZone: string = ET_ZONE): ZonedParts {
  const values: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(new Date(instant))) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  const { year, month, day, minute, second } = values;
  const hour = values.hour === 24 ? 0 : values.hour; // some engines print midnight as 24
  const date = toDateString(year, month, day);
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    date,
    weekday: weekdayOf(date),
    time: `${pad(hour)}:${pad(minute)}`,
    minutes: hour * 60 + minute,
  };
}

/** Offset of `timeZone` from UTC at `instant`, in minutes (New York: −240 in summer, −300 in winter). */
export function zoneOffsetMinutes(instant: Date | number, timeZone: string = ET_ZONE): number {
  const ms = new Date(instant).getTime();
  const p = zonedParts(ms, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((wallAsUtc - Math.floor(ms / 1000) * 1000) / MINUTE);
}

/**
 * Turn a wall-clock date + time in a zone into the real instant.
 *   zonedTimeToUtc('2026-11-01', '11:00') → 2026-11-01T16:00:00Z (EST, after the clocks fell back)
 *   zonedTimeToUtc('2026-10-31', '11:00') → 2026-10-31T15:00:00Z (EDT)
 * Times that don't exist (the skipped hour in March) move forward; repeated
 * times (the doubled hour in November) use the first occurrence.
 */
export function zonedTimeToUtc(date: string, time: string, timeZone: string = ET_ZONE): Date {
  const { year, month, day } = parseDate(date);
  const [h, m] = time.split(':').map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, h, m || 0);
  // Guess the offset, check it, and correct once if a DST change sits in between.
  const o1 = zoneOffsetMinutes(wallAsUtc, timeZone);
  let guess = wallAsUtc - o1 * MINUTE;
  const o2 = zoneOffsetMinutes(guess, timeZone);
  if (o1 === o2) return new Date(guess);
  guess -= (o2 - o1) * MINUTE;
  const o3 = zoneOffsetMinutes(guess, timeZone);
  if (o2 === o3) return new Date(guess);
  // Inside the skipped hour: keep the clock time moving forward.
  return new Date(wallAsUtc - Math.min(o2, o3) * MINUTE);
}

/** Shorthand: an Eastern wall-clock date + time → instant. */
export const etToUtc = (date: string, time: string): Date => zonedTimeToUtc(date, time, ET_ZONE);

/** Today's date in Eastern Time ('YYYY-MM-DD'). */
export function todayET(now: Date | number = new Date()): string {
  return zonedParts(now, ET_ZONE).date;
}

/** The current hour and minute in Eastern Time. */
export function nowET(now: Date | number = new Date()): { date: string; hour: number; minute: number; minutes: number; weekday: number } {
  const p = zonedParts(now, ET_ZONE);
  return { date: p.date, hour: p.hour, minute: p.minute, minutes: p.minutes, weekday: p.weekday };
}

/** Day of the week of an Eastern date (same as any calendar date): 0 = Sunday … 6 = Saturday. */
export const weekdayET = weekdayOf;

/** The visitor's own time zone (e.g. 'America/Los_Angeles'), or ET if the browser won't say. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ET_ZONE;
  } catch {
    return ET_ZONE;
  }
}

/* ───────────── Formatting for people ───────────── */

const textFormatters = new Map<string, Intl.DateTimeFormat>();
function textFormatter(key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  let f = textFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', options);
    textFormatters.set(key, f);
  }
  return f;
}

/** '2026-10-19' → 'Monday, October 19, 2026' */
export function formatDateLong(date: string): string {
  return textFormatter('long', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(dateToUtcNoon(date));
}

/** '2026-10-19' → 'Monday, October 19' */
export function formatDateNoYear(date: string): string {
  return textFormatter('noyear', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' }).format(dateToUtcNoon(date));
}

/** '2026-10-19' → 'Mon, Oct 19' */
export function formatDateShort(date: string): string {
  return textFormatter('short', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(dateToUtcNoon(date));
}

/** '2026-10-19' → 'Monday' */
export function formatWeekday(date: string): string {
  return textFormatter('weekday', { timeZone: 'UTC', weekday: 'long' }).format(dateToUtcNoon(date));
}

/** (2026, 10) → 'October 2026' */
export function formatMonthYear(year: number, month: number): string {
  return textFormatter('monthyear', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(year, month - 1, 15)));
}

/** '18:30' → '6:30 PM'  ·  '11:00' → '11:00 AM'  ·  '12:00' → '12:00 PM' */
export function formatTime12(time: string): string {
  const total = minutesOf(time);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** '18:30' → '6:30 PM ET' (the value the booking form sends). */
export function formatTimeET(time: string): string {
  return `${formatTime12(time)} ${ET_LABEL}`;
}

export interface LocalSlotTime {
  /** False when the visitor's clock already shows Eastern Time (nothing extra to show). */
  differs: boolean;
  /** '8:30 AM' in the visitor's zone */
  time: string;
  /** Short zone name, e.g. 'PDT', 'CST', 'GMT+1' */
  zone: string;
  /** −1 / 0 / +1 when the local calendar day is before / same / after the Eastern day */
  dayShift: number;
  /** 'Mon' — the local weekday, useful when dayShift ≠ 0 */
  weekday: string;
  /** Ready-made text: '8:30 AM PDT' or '4:00 AM GMT+5:30 (Tue)' */
  label: string;
}

/**
 * How an Eastern slot reads on the visitor's clock.
 *   localSlotTime('2026-10-19', '11:30', 'America/Los_Angeles')
 *     → { differs: true, time: '8:30 AM', zone: 'PDT', label: '8:30 AM PDT', … }
 */
export function localSlotTime(date: string, time: string, timeZone: string = localTimeZone()): LocalSlotTime {
  const instant = zonedTimeToUtc(date, time, ET_ZONE);
  const differs = zoneOffsetMinutes(instant, timeZone) !== zoneOffsetMinutes(instant, ET_ZONE);
  const local = zonedParts(instant, timeZone);
  let zone = '';
  try {
    zone =
      textFormatter(`zone:${timeZone}`, { timeZone, timeZoneName: 'short' })
        .formatToParts(instant)
        .find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    zone = '';
  }
  const dayShift = Math.sign(daysBetween(date, local.date));
  const weekday = formatDateShort(local.date).slice(0, 3);
  const localTime = formatTime12(local.time);
  const label = `${localTime}${zone ? ` ${zone}` : ''}${dayShift !== 0 ? ` (${weekday})` : ''}`;
  return { differs, time: localTime, zone, dayShift, weekday, label };
}
