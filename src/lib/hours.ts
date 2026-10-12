/**
 * "Open now" indicator, worked out in Eastern Time from HOURS in
 * src/config/site.ts (opening hours, open days, holiday closures).
 *
 *   getOpenStatus() →
 *     { open: true,  label: 'Open now · until 7:00 PM ET' }
 *     { open: false, label: 'Opens today at 11:00 AM ET' }
 *     { open: false, label: 'Closed now · Opens Monday at 11:00 AM ET', detail: 'Closed Monday for Columbus Day' }
 *     { open: false, label: 'Closed today for Columbus Day · Opens Tuesday at 11:00 AM ET' }
 *
 * The page is static, so call this in the browser (and refresh it every
 * minute or so) to keep it accurate.
 */
import { HOURS } from '../config/site';
import { getClosure } from './holidays';
import { addDays, daysBetween, formatDateNoYear, formatTime12, formatWeekday, minutesOf, weekdayOf, zonedParts } from './time';

export interface OpenStatus {
  open: boolean;
  /** One line for display, e.g. 'Open now · until 7:00 PM ET'. */
  label: string;
  /** Optional second line, e.g. 'Closing in 25 minutes' or 'Closed Monday for Columbus Day'. */
  detail?: string;
}

/** Is the office closed all day on this Eastern date? Returns the reason, or null when open. */
export function getDayClosure(date: string): { holiday: string | null } | null {
  const holiday = getClosure(date);
  if (holiday) return { holiday };
  if (!(HOURS.openDays as readonly number[]).includes(weekdayOf(date))) return { holiday: null };
  return null;
}

export function getOpenStatus(now: Date = new Date()): OpenStatus {
  const tz = HOURS.timeZoneLabel;
  const openAt = formatTime12(HOURS.open);
  const closeAt = formatTime12(HOURS.close);
  const openMin = minutesOf(HOURS.open);
  const closeMin = minutesOf(HOURS.close);

  const clock = zonedParts(now, HOURS.timeZone);
  const today = clock.date;
  const todayClosure = getDayClosure(today);

  if (!todayClosure) {
    if (clock.minutes >= openMin && clock.minutes < closeMin) {
      const left = closeMin - clock.minutes;
      const status: OpenStatus = { open: true, label: `Open now · until ${closeAt} ${tz}` };
      if (left <= 60) status.detail = `Closing in ${left} minute${left === 1 ? '' : 's'}`;
      return status;
    }
    if (clock.minutes < openMin) return { open: false, label: `Opens today at ${openAt} ${tz}` };
  }

  // Closed for the rest of today: find the next open day, noting any holidays skipped on the way.
  let next = addDays(today, 1);
  let skipped: { date: string; holiday: string } | null = null;
  for (let i = 0; i < 31; i++) {
    const closure = getDayClosure(next);
    if (!closure) break;
    if (closure.holiday && !skipped) skipped = { date: next, holiday: closure.holiday };
    next = addDays(next, 1);
  }
  const when = daysBetween(today, next) <= 6 ? formatWeekday(next) : formatDateNoYear(next);
  const opens = `Opens ${when} at ${openAt} ${tz}`;

  let label = `Closed now · ${opens}`;
  if (todayClosure?.holiday) label = `Closed today for ${todayClosure.holiday} · ${opens}`;
  else if (todayClosure) label = `Closed today · ${opens}`;

  const status: OpenStatus = { open: false, label };
  if (skipped) status.detail = `Closed ${formatWeekday(skipped.date)} for ${skipped.holiday}`;
  return status;
}
