/**
 * ════════════════════════════════════════════════════════════════════
 *  U.S. FEDERAL HOLIDAYS — calculated for any year (no yearly updates)
 * ════════════════════════════════════════════════════════════════════
 *  The office closes on federal holidays (see HOURS in
 *  src/config/site.ts). These are the same rules the U.S. Office of
 *  Personnel Management (OPM) uses:
 *
 *    New Year’s Day ............ January 1
 *    Birthday of MLK Jr. ....... 3rd Monday in January
 *    Washington’s Birthday ..... 3rd Monday in February
 *    Memorial Day .............. last Monday in May
 *    Juneteenth ................ June 19 (a federal holiday since 2021)
 *    Independence Day .......... July 4
 *    Labor Day ................. 1st Monday in September
 *    Columbus Day .............. 2nd Monday in October
 *    Veterans Day .............. November 11
 *    Thanksgiving Day .......... 4th Thursday in November
 *    Christmas Day ............. December 25
 *
 *  "Observed" days: when a fixed-date holiday falls on a Saturday it is
 *  observed the Friday before; on a Sunday, the Monday after. (So when
 *  January 1 is a Saturday, the observed day is December 31 of the
 *  previous year — e.g. Friday, December 31, 2027 for New Year’s 2028.)
 * ════════════════════════════════════════════════════════════════════
 */
import { HOURS } from '../config/site';
import { addDays, daysInMonth, toDateString, weekdayOf } from './time';

export interface FederalHoliday {
  /** Official name, e.g. 'Independence Day'. */
  name: string;
  /** The holiday's actual date ('YYYY-MM-DD'). */
  date: string;
  /** The weekday the government observes it (same as `date` unless it falls on a weekend). */
  observed: string;
}

export interface ClosureRules {
  /** Close on the holiday itself. */
  closeOnHoliday: boolean;
  /** Also close on the observed weekday when the holiday falls on a weekend. */
  closeOnObservedDay: boolean;
}

/** The n-th (1 = first) given weekday of a month, e.g. 2nd Monday of October. Weekday: 0 = Sun … 6 = Sat. */
export function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): string {
  const first = weekdayOf(toDateString(year, month, 1));
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  return toDateString(year, month, day);
}

/** The last given weekday of a month, e.g. last Monday of May. */
export function lastWeekdayOfMonth(year: number, month: number, weekday: number): string {
  const lastDay = daysInMonth(year, month);
  const last = weekdayOf(toDateString(year, month, lastDay));
  return toDateString(year, month, lastDay - ((last - weekday + 7) % 7));
}

/** Saturday → the Friday before; Sunday → the Monday after; weekdays unchanged. */
export function observedDate(date: string): string {
  const wd = weekdayOf(date);
  if (wd === 6) return addDays(date, -1);
  if (wd === 0) return addDays(date, 1);
  return date;
}

const MONDAY = 1;
const THURSDAY = 4;
const cache = new Map<number, FederalHoliday[]>();

/** Every federal holiday of `year`, in calendar order, with its actual and observed date. */
export function getFederalHolidays(year: number): FederalHoliday[] {
  const cached = cache.get(year);
  if (cached) return cached;

  const fixed = (name: string, month: number, day: number): FederalHoliday => {
    const date = toDateString(year, month, day);
    return { name, date, observed: observedDate(date) };
  };
  const onWeekday = (name: string, date: string): FederalHoliday => ({ name, date, observed: date });

  const list: FederalHoliday[] = [
    fixed('New Year’s Day', 1, 1),
    onWeekday('Birthday of Martin Luther King Jr.', nthWeekdayOfMonth(year, 1, MONDAY, 3)),
    onWeekday('Washington’s Birthday', nthWeekdayOfMonth(year, 2, MONDAY, 3)),
    onWeekday('Memorial Day', lastWeekdayOfMonth(year, 5, MONDAY)),
    ...(year >= 2021 ? [fixed('Juneteenth', 6, 19)] : []),
    fixed('Independence Day', 7, 4),
    onWeekday('Labor Day', nthWeekdayOfMonth(year, 9, MONDAY, 1)),
    onWeekday('Columbus Day', nthWeekdayOfMonth(year, 10, MONDAY, 2)),
    fixed('Veterans Day', 11, 11),
    onWeekday('Thanksgiving Day', nthWeekdayOfMonth(year, 11, THURSDAY, 4)),
    fixed('Christmas Day', 12, 25),
  ];
  cache.set(year, list);
  return list;
}

export interface HolidayMatch {
  holiday: FederalHoliday;
  /** True when `date` is the weekday observance of a weekend holiday (not the holiday itself). */
  isObservance: boolean;
}

/** Is this date a federal holiday or the observed day of one? (Ignores the office's closing rules.) */
export function findHoliday(date: string): HolidayMatch | null {
  const year = Number(date.slice(0, 4));
  // Next year's list is checked too: New Year’s Day can be observed on December 31.
  const candidates = [...getFederalHolidays(year), ...getFederalHolidays(year + 1)];
  const actual = candidates.find((h) => h.date === date);
  if (actual) return { holiday: actual, isObservance: false };
  const observance = candidates.find((h) => h.observed === date && h.observed !== h.date);
  if (observance) return { holiday: observance, isObservance: true };
  return null;
}

/**
 * Why the office is closed on an Eastern date — or null when it's open.
 *   getClosure('2026-10-12') → 'Columbus Day'
 *   getClosure('2026-07-03') → 'Independence Day (observed)'
 *   getClosure('2026-10-13') → null
 * Follows HOURS.closeOnHoliday / HOURS.closeOnObservedDay in src/config/site.ts.
 */
export function getClosure(date: string, rules: ClosureRules = HOURS): string | null {
  const match = findHoliday(date);
  if (!match) return null;
  if (!match.isObservance) return rules.closeOnHoliday ? match.holiday.name : null;
  return rules.closeOnObservedDay ? `${match.holiday.name} (observed)` : null;
}

export interface Closure {
  date: string;
  name: string;
}

/** Holiday closures from `from` to `to` (both included), in date order. */
export function getClosuresBetween(from: string, to: string, rules: ClosureRules = HOURS): Closure[] {
  const out: Closure[] = [];
  const startYear = Number(from.slice(0, 4));
  const endYear = Number(to.slice(0, 4));
  for (let year = startYear; year <= endYear + 1; year++) {
    for (const h of getFederalHolidays(year)) {
      for (const date of new Set([h.date, h.observed])) {
        if (date < from || date > to) continue;
        const name = getClosure(date, rules);
        if (name && !out.some((c) => c.date === date)) out.push({ date, name });
      }
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** The next holiday closure on or after `from` (looks up to ~13 months ahead). */
export function getNextClosure(from: string, rules: ClosureRules = HOURS): Closure | null {
  return getClosuresBetween(from, addDays(from, 400), rules)[0] ?? null;
}
