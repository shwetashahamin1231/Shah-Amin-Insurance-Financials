/**
 * Event status & formatting. Works at build time and in the browser, so an
 * event flips to "Past Event / RSVP closed" on time even without a rebuild.
 * All display uses Eastern Time.
 */
import type { EventItem, EventVenue } from '../data/events';

export type EventStatus = 'upcoming' | 'today' | 'past';

const TZ = 'America/New_York';

/** "2026-10-19T10:00:00-04:00" → "2026-10-19T23:59:59-04:00" (end of that day, same offset). */
export function endOfDay(iso: string): string {
  const date = iso.slice(0, 10);
  const offset = iso.match(/([+-]\d{2}:\d{2}|Z)$/)?.[1] ?? '-05:00';
  return `${date}T23:59:59${offset}`;
}
export function startOfDay(iso: string): string {
  return `${iso.slice(0, 10)}T00:00:00${iso.match(/([+-]\d{2}:\d{2}|Z)$/)?.[1] ?? '-05:00'}`;
}

export function eventTimes(e: Pick<EventItem, 'start' | 'end' | 'rsvpCloses'>) {
  return {
    start: Date.parse(e.start),
    end: Date.parse(e.end ?? endOfDay(e.start)),
    dayStart: Date.parse(startOfDay(e.start)),
    rsvpCloses: Date.parse(e.rsvpCloses ?? e.start),
  };
}

export function eventStatus(e: EventItem, now: number = Date.now()): EventStatus {
  const t = eventTimes(e);
  if (now > t.end) return 'past';
  if (now >= t.dayStart) return 'today';
  return 'upcoming';
}

export function isRsvpOpen(e: EventItem, now: number = Date.now()): boolean {
  return e.rsvp && now < eventTimes(e).rsvpCloses;
}

/** Upcoming first (soonest first), then past events (most recent first). */
export function sortEvents(list: EventItem[], now: number = Date.now()) {
  const upcoming = list.filter((e) => eventStatus(e, now) !== 'past').sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const past = list.filter((e) => eventStatus(e, now) === 'past').sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  return { upcoming, past };
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts });

export function formatEventDate(e: EventItem): string {
  return fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(e.start));
}
export function formatEventTime(e: EventItem): string {
  if (e.timeTBA) return 'Time to be announced';
  const t = fmt({ hour: 'numeric', minute: '2-digit' });
  const start = t.format(new Date(e.start));
  return e.end ? `${start} – ${t.format(new Date(e.end))} ET` : `${start} ET`;
}
/** Parts for the engraved date block on cards. */
export function dateParts(e: EventItem) {
  const d = new Date(e.start);
  return {
    month: fmt({ month: 'short' }).format(d).toUpperCase(),
    day: fmt({ day: 'numeric' }).format(d),
    weekday: fmt({ weekday: 'long' }).format(d),
    year: fmt({ year: 'numeric' }).format(d),
  };
}

export function formatVenue(v?: EventVenue): { name: string; address: string } | null {
  if (!v) return null;
  const line = [v.street, [v.city, [v.state, v.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(', ');
  return { name: v.name, address: line };
}

export function venueMapUrl(v?: EventVenue): string | null {
  if (!v?.street) return null;
  const q = encodeURIComponent([v.name, v.street, v.city, v.state, v.zip].filter(Boolean).join(', '));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
