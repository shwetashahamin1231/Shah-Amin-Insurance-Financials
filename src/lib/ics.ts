/**
 * "Add to calendar" helpers.
 *
 *   buildIcs(event)          → the text of an .ics calendar file (Apple Calendar, Outlook, Google…)
 *   googleCalendarUrl(event) → a link that opens Google Calendar with the event filled in
 *   downloadIcs(name, ics)   → (browser only) saves the .ics file
 *
 * Times are written in UTC, so the event lands at the right moment in
 * every time zone. The file follows the iCalendar standard (RFC 5545):
 * CRLF line endings, escaped text, and lines folded at 75 bytes.
 */

export interface CalendarEvent {
  /** Unique, stable id, e.g. 'member-appreciation-breakfast-2026@shahandamin.com'. */
  uid: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  url?: string;
}

const PRODID = '-//Shah & Amin Financial Services//Website//EN';

/** Date → '20261019T140000Z' */
export function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Escape text values: backslash, semicolon, comma and line breaks. */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** UTF-8 byte length of one character. */
function byteLength(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code < 0x80) return 1;
  if (code < 0x800) return 2;
  if (code < 0x10000) return 3;
  return 4;
}

/** Fold a content line so no physical line exceeds 75 bytes (continuations start with a space). Never splits a character. */
export function foldIcsLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = byteLength(char);
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
      limit = 74; // the leading space of a continuation line counts as one byte
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** The complete .ics file for one event. `stamp` (the file's creation time) is only passed by tests. */
export function buildIcs(event: CalendarEvent, stamp: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${icsDate(stamp)}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

/** A Google Calendar "add event" link with everything filled in. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const details = [event.description, event.url].filter(Boolean).join('\n\n');
  const params = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(event.title)}`,
    `dates=${icsDate(event.start)}/${icsDate(event.end)}`,
    details ? `details=${encodeURIComponent(details)}` : '',
    event.location ? `location=${encodeURIComponent(event.location)}` : '',
  ].filter(Boolean);
  return `https://calendar.google.com/calendar/render?${params.join('&')}`;
}

/** Browser only: save an .ics file (most phones offer to add it to the calendar straight away). */
export function downloadIcs(filename: string, ics: string): void {
  const name = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before releasing the file.
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}
