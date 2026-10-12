import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  daysBetween,
  etToUtc,
  formatDateLong,
  formatDateShort,
  formatMonthYear,
  formatTime12,
  formatTimeET,
  isValidDate,
  localSlotTime,
  nowET,
  todayET,
  weekdayOf,
  zonedParts,
  zoneOffsetMinutes,
  zonedTimeToUtc,
} from '../src/lib/time';
import { getOpenStatus } from '../src/lib/hours';
import { buildIcs, escapeIcsText, foldIcsLine, googleCalendarUrl, icsDate } from '../src/lib/ics';

const at = (iso: string) => new Date(iso);

describe('test environment', () => {
  it('runs with a non-Eastern system clock (Asia/Kolkata) so ET logic is proven independent of it', () => {
    expect(new Date('2026-10-11T12:00:00Z').getTimezoneOffset()).toBe(-330);
  });
});

describe('today and now in Eastern Time', () => {
  it('uses the Eastern date, not the computer’s', () => {
    // 20:00 UTC on Oct 11 is already Oct 12 in India, but still Oct 11 (4 PM) in New York.
    expect(todayET(at('2026-10-11T20:00:00Z'))).toBe('2026-10-11');
    expect(todayET(at('2026-10-12T03:30:00Z'))).toBe('2026-10-11'); // 11:30 PM EDT
    expect(todayET(at('2026-10-12T04:00:00Z'))).toBe('2026-10-12'); // midnight EDT
    expect(todayET(at('2026-12-01T04:59:00Z'))).toBe('2026-11-30'); // 11:59 PM EST
    expect(todayET(at('2026-12-01T05:00:00Z'))).toBe('2026-12-01'); // midnight EST
  });

  it('reports the Eastern hour and minute', () => {
    expect(nowET(at('2026-10-11T19:10:00Z'))).toMatchObject({ date: '2026-10-11', hour: 15, minute: 10, minutes: 910, weekday: 0 });
    expect(nowET(at('2027-01-15T16:05:00Z'))).toMatchObject({ hour: 11, minute: 5 }); // EST
    expect(zonedParts(at('2026-10-12T04:00:00Z')).hour).toBe(0); // midnight reads 0, not 24
  });
});

describe('Eastern wall-clock time → UTC (DST-safe)', () => {
  it('handles both sides of the November 1, 2026 change', () => {
    expect(etToUtc('2026-10-31', '11:00').toISOString()).toBe('2026-10-31T15:00:00.000Z'); // EDT
    expect(etToUtc('2026-11-01', '11:00').toISOString()).toBe('2026-11-01T16:00:00.000Z'); // EST
    expect(etToUtc('2026-11-01', '18:30').toISOString()).toBe('2026-11-01T23:30:00.000Z');
  });

  it('handles both sides of the March 14, 2027 change', () => {
    expect(etToUtc('2027-03-13', '11:00').toISOString()).toBe('2027-03-13T16:00:00.000Z'); // EST
    expect(etToUtc('2027-03-14', '11:00').toISOString()).toBe('2027-03-14T15:00:00.000Z'); // EDT
  });

  it('copes with the skipped and repeated hours', () => {
    expect(etToUtc('2027-03-14', '02:30').toISOString()).toBe('2027-03-14T07:30:00.000Z'); // doesn't exist → 3:30 AM EDT
    expect(etToUtc('2026-11-01', '01:30').toISOString()).toBe('2026-11-01T05:30:00.000Z'); // happens twice → first (EDT)
  });

  it('round-trips every half hour of the business day for two full years', () => {
    let date = '2026-01-01';
    while (date <= '2027-12-31') {
      for (let m = 11 * 60; m <= 18 * 60 + 30; m += 30) {
        const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        const p = zonedParts(etToUtc(date, time));
        expect(`${p.date} ${p.time}`).toBe(`${date} ${time}`);
      }
      date = addDays(date, 1);
    }
  });

  it('works for other zones too', () => {
    expect(zonedTimeToUtc('2026-10-19', '08:30', 'America/Los_Angeles').toISOString()).toBe('2026-10-19T15:30:00.000Z');
    expect(zoneOffsetMinutes(at('2026-07-01T12:00:00Z'))).toBe(-240);
    expect(zoneOffsetMinutes(at('2026-12-01T12:00:00Z'))).toBe(-300);
  });
});

describe('plain date helpers', () => {
  it('adds days across months, years and DST changes', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-13', 1)).toBe('2027-03-14');
    expect(addDays('2026-10-11', 90)).toBe('2027-01-09');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-10-11', '2027-01-09')).toBe(90);
  });

  it('weekdays, months and validity', () => {
    expect(weekdayOf('2026-10-11')).toBe(0); // Sunday
    expect(weekdayOf('2026-10-12')).toBe(1); // Monday (Columbus Day)
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2027, 1, -1)).toEqual({ year: 2026, month: 12 });
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('19-10-2026')).toBe(false);
  });
});

describe('formatting', () => {
  it('dates', () => {
    expect(formatDateLong('2026-10-19')).toBe('Monday, October 19, 2026');
    expect(formatDateShort('2026-10-19')).toBe('Mon, Oct 19');
    expect(formatMonthYear(2026, 10)).toBe('October 2026');
  });

  it('times', () => {
    expect(formatTime12('11:30')).toBe('11:30 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
    expect(formatTime12('18:30')).toBe('6:30 PM');
    expect(formatTime12('00:15')).toBe('12:15 AM');
    expect(formatTimeET('11:30')).toBe('11:30 AM ET');
  });

  it('shows the visitor’s local time only when their clock differs from Eastern', () => {
    const la = localSlotTime('2026-10-19', '11:30', 'America/Los_Angeles');
    expect(la).toMatchObject({ differs: true, time: '8:30 AM', zone: 'PDT', dayShift: 0, label: '8:30 AM PDT' });

    expect(localSlotTime('2026-10-19', '11:30', 'America/New_York').differs).toBe(false);
    expect(localSlotTime('2026-10-19', '11:30', 'America/Detroit').differs).toBe(false); // also Eastern

    const india = localSlotTime('2026-10-19', '18:30', 'Asia/Kolkata'); // 4:00 AM the next morning
    expect(india.differs).toBe(true);
    expect(india.dayShift).toBe(1);
    expect(india.label).toContain('4:00 AM');
    expect(india.label).toContain('(Tue)');

    // Winter: Chicago is one hour behind.
    expect(localSlotTime('2026-12-01', '11:00', 'America/Chicago').label).toBe('10:00 AM CST');
  });
});

describe('getOpenStatus (Eastern Time)', () => {
  it('open during business hours', () => {
    expect(getOpenStatus(at('2026-10-13T16:00:00Z'))).toEqual({ open: true, label: 'Open now · until 7:00 PM ET' }); // Tue noon
    expect(getOpenStatus(at('2026-10-13T22:35:00Z'))).toEqual({ open: true, label: 'Open now · until 7:00 PM ET', detail: 'Closing in 25 minutes' });
  });

  it('before opening', () => {
    expect(getOpenStatus(at('2026-10-13T13:00:00Z'))).toEqual({ open: false, label: 'Opens today at 11:00 AM ET' }); // 9 AM
  });

  it('after closing, with tomorrow’s holiday noted', () => {
    // Sunday Oct 11, 8 PM: Monday is Columbus Day, so we reopen Tuesday.
    expect(getOpenStatus(at('2026-10-12T00:00:00Z'))).toEqual({
      open: false,
      label: 'Closed now · Opens Tuesday at 11:00 AM ET',
      detail: 'Closed Monday for Columbus Day',
    });
  });

  it('closed all day for a holiday', () => {
    expect(getOpenStatus(at('2026-10-12T15:00:00Z'))).toEqual({ open: false, label: 'Closed today for Columbus Day · Opens Tuesday at 11:00 AM ET' });
    expect(getOpenStatus(at('2026-07-03T15:00:00Z')).label).toBe('Closed today for Independence Day (observed) · Opens Sunday at 11:00 AM ET');
  });

  it('Christmas Eve 2027 → closed Dec 24 & 25, reopens Sunday', () => {
    expect(getOpenStatus(at('2027-12-24T15:00:00Z'))).toEqual({
      open: false,
      label: 'Closed today for Christmas Day (observed) · Opens Sunday at 11:00 AM ET',
      detail: 'Closed Saturday for Christmas Day',
    });
  });
});

describe('calendar files (.ics) and Google Calendar links', () => {
  const event = {
    uid: 'member-appreciation-breakfast-2026@shahaminfinancial.com',
    title: 'Member Appreciation Breakfast',
    start: etToUtc('2026-10-19', '10:00'),
    end: etToUtc('2026-10-19', '12:00'),
    location: 'Guru Palace, 2215 US-1, North Brunswick Township, NJ 08902',
    description: 'Breakfast; chai, and a presentation\non Clover plans for 2027.',
    url: 'https://www.shahaminfinancial.com/events/member-appreciation-breakfast-2026/',
  };

  it('writes UTC times and escapes text', () => {
    expect(icsDate(event.start)).toBe('20261019T140000Z');
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
    const ics = buildIcs(event, at('2026-10-11T12:00:00Z'));
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('\r\nDTSTART:20261019T140000Z\r\n');
    expect(ics).toContain('\r\nDTEND:20261019T160000Z\r\n');
    expect(ics).toContain('\r\nDTSTAMP:20261011T120000Z\r\n');
    expect(ics).toContain('LOCATION:Guru Palace\\, 2215 US-1\\, North Brunswick Township\\, NJ 08902');
    expect(ics.replace(/\r\n /g, '')).toContain('DESCRIPTION:Breakfast\\; chai\\, and a presentation\\non Clover plans for 2027.');
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/); // only CRLF line breaks
  });

  it('folds long lines at 75 bytes without splitting characters', () => {
    const long = `DESCRIPTION:${'Café — retirement planning ’ '.repeat(12)}`;
    const folded = foldIcsLine(long);
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    lines.slice(1).forEach((l) => expect(l.startsWith(' ')).toBe(true));
    expect(lines.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe(long);
  });

  it('builds a Google Calendar link', () => {
    const link = new URL(googleCalendarUrl(event));
    expect(link.origin + link.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(link.searchParams.get('action')).toBe('TEMPLATE');
    expect(link.searchParams.get('text')).toBe('Member Appreciation Breakfast');
    expect(link.searchParams.get('dates')).toBe('20261019T140000Z/20261019T160000Z');
    expect(link.searchParams.get('location')).toBe(event.location);
    expect(link.searchParams.get('details')).toContain(event.url);
  });
});
