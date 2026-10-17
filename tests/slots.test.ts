import { describe, expect, it } from 'vitest';
import {
  bookableMonths,
  bookingWindow,
  DEFAULT_RULES,
  firstBookableDate,
  getAvailableSlots,
  getDayStatus,
  getSlots,
  groupByPeriod,
  isMonthInRange,
  isSlotBookable,
  monthMatrix,
  periodOf,
  slotTimes,
} from '../src/lib/slots';
import { formatPhone, normalizePhone, validateEmail, validateGuests, validateName, validatePhone, validateText } from '../src/lib/validation';

const at = (iso: string) => new Date(iso);
const times = (date: string, now: Date) => getAvailableSlots(date, now).map((s) => s.time);

// "Now" for most tests: Sunday, October 11, 2026 at 3:10 PM Eastern (EDT = UTC−4).
const SUNDAY_3_10PM = at('2026-10-11T19:10:00Z');

describe('slot times', () => {
  it('runs every 30 minutes from 11:00 AM to the last start at 6:30 PM', () => {
    const all = slotTimes();
    expect(all).toHaveLength(16);
    expect(all[0]).toBe('11:00');
    expect(all.at(-1)).toBe('18:30');
  });

  it('labels each slot for people and for the form', () => {
    const slot = getSlots('2026-10-13', SUNDAY_3_10PM)[1];
    expect(slot).toMatchObject({ time: '11:30', label: '11:30 AM', value: '11:30 AM ET', period: 'morning', available: true });
    expect(slot.end.getTime() - slot.start.getTime()).toBe(30 * 60_000);
  });

  it('groups into Morning / Afternoon / Evening', () => {
    expect(periodOf('11:30')).toBe('morning');
    expect(periodOf('12:00')).toBe('afternoon');
    expect(periodOf('16:30')).toBe('afternoon');
    expect(periodOf('17:00')).toBe('evening');
    const groups = groupByPeriod(getSlots('2026-10-13', SUNDAY_3_10PM));
    expect(groups.map((g) => [g.label, g.slots.length])).toEqual([
      ['Morning', 2],
      ['Afternoon', 10],
      ['Evening', 4],
    ]);
  });
});

describe('minimum notice (2 hours) on today’s times', () => {
  it('hides anything sooner than 2 hours from now', () => {
    // 3:10 PM + 2 h = 5:10 PM → 5:30, 6:00 and 6:30 remain.
    expect(times('2026-10-11', SUNDAY_3_10PM)).toEqual(['17:30', '18:00', '18:30']);
  });

  it('a slot exactly 2 hours away is still bookable', () => {
    expect(times('2026-10-11', at('2026-10-11T19:00:00Z'))[0]).toBe('17:00'); // 3:00 PM
  });

  it('early in the morning, the first two slots are inside the notice period', () => {
    expect(times('2026-10-13', at('2026-10-13T14:00:00Z'))[0]).toBe('12:00'); // 10:00 AM → noon
  });

  it('marks today as having no times left late in the afternoon', () => {
    const late = at('2026-10-11T20:31:00Z'); // 4:31 PM
    expect(times('2026-10-11', late)).toEqual([]);
    expect(getDayStatus('2026-10-11', late)).toMatchObject({ bookable: false, isToday: true, reason: 'no-times-left', note: 'No times left today' });
  });

  it('isSlotBookable re-checks a chosen slot at send time', () => {
    expect(isSlotBookable('2026-10-11', '17:30', SUNDAY_3_10PM)).toBe(true);
    expect(isSlotBookable('2026-10-11', '17:30', at('2026-10-11T19:45:00Z'))).toBe(false); // 3:45 PM — now too soon
    expect(isSlotBookable('2026-10-13', '10:30', SUNDAY_3_10PM)).toBe(false); // not a slot
  });
});

describe('closed and out-of-range days', () => {
  it('past dates are disabled', () => {
    expect(getDayStatus('2026-10-10', SUNDAY_3_10PM)).toMatchObject({ bookable: false, reason: 'past' });
  });

  it('Columbus Day 2026 (Monday, October 12) is closed', () => {
    expect(getDayStatus('2026-10-12', SUNDAY_3_10PM)).toEqual({
      date: '2026-10-12',
      bookable: false,
      isToday: false,
      reason: 'holiday',
      note: 'Columbus Day — closed',
      holiday: 'Columbus Day',
    });
    expect(getAvailableSlots('2026-10-12', SUNDAY_3_10PM)).toEqual([]);
    expect(isSlotBookable('2026-10-12', '12:00', SUNDAY_3_10PM)).toBe(false);
  });

  it('observed holidays are closed too (unless the rule is switched off)', () => {
    const july1 = at('2026-07-01T16:00:00Z');
    expect(getDayStatus('2026-07-03', july1)).toMatchObject({ bookable: false, note: 'Independence Day (observed) — closed' });
    expect(getDayStatus('2026-07-03', july1, { ...DEFAULT_RULES, closeOnObservedDay: false }).bookable).toBe(true);
  });

  it('the day after the holiday is fully open', () => {
    expect(getDayStatus('2026-10-13', SUNDAY_3_10PM)).toEqual({ date: '2026-10-13', bookable: true, isToday: false });
    expect(times('2026-10-13', SUNDAY_3_10PM)).toHaveLength(16);
  });

  it('respects the 90-day horizon', () => {
    expect(bookingWindow(SUNDAY_3_10PM)).toEqual({ today: '2026-10-11', last: '2027-01-09' });
    expect(getDayStatus('2027-01-09', SUNDAY_3_10PM).bookable).toBe(true);
    expect(getDayStatus('2027-01-10', SUNDAY_3_10PM)).toMatchObject({ bookable: false, reason: 'beyond-horizon' });
    expect(getAvailableSlots('2027-01-10', SUNDAY_3_10PM)).toEqual([]);
  });

  it('closed weekdays (if the office ever stops opening every day)', () => {
    const noSundays = { ...DEFAULT_RULES, openDays: [1, 2, 3, 4, 5, 6] };
    expect(getDayStatus('2026-10-18', SUNDAY_3_10PM, noSundays)).toMatchObject({ bookable: false, reason: 'closed' });
  });

  it('first bookable date skips today and holidays when needed', () => {
    expect(firstBookableDate(SUNDAY_3_10PM)).toBe('2026-10-11');
    expect(firstBookableDate(at('2026-10-11T20:31:00Z'))).toBe('2026-10-13'); // 4:31 PM Sunday → Monday is Columbus Day
    // 11:30 PM Sunday: the Eastern date is still the 11th.
    const lateNight = at('2026-10-12T03:30:00Z');
    expect(getDayStatus('2026-10-11', lateNight)).toMatchObject({ isToday: true, reason: 'no-times-left' });
    expect(firstBookableDate(lateNight)).toBe('2026-10-13');
  });
});

describe('daylight-saving changes', () => {
  it('November 1, 2026 (clocks fall back): slots stay at 11:00 AM–6:30 PM Eastern', () => {
    const before = at('2026-10-20T16:00:00Z');
    const oct31 = getSlots('2026-10-31', before);
    const nov1 = getSlots('2026-11-01', before);
    expect(oct31[0].start.toISOString()).toBe('2026-10-31T15:00:00.000Z'); // EDT
    expect(nov1[0].start.toISOString()).toBe('2026-11-01T16:00:00.000Z'); // EST
    expect(nov1.at(-1)?.start.toISOString()).toBe('2026-11-01T23:30:00.000Z');
    expect(nov1).toHaveLength(16);
    nov1.slice(1).forEach((s, i) => expect(s.start.getTime() - nov1[i].start.getTime()).toBe(30 * 60_000));
  });

  it('November 1, 2026: notice period is measured in real time', () => {
    // 14:30 UTC = 9:30 AM EST (it would be 10:30 AM if the code wrongly used EDT).
    expect(times('2026-11-01', at('2026-11-01T14:30:00Z'))[0]).toBe('11:30');
  });

  it('March 14, 2027 (clocks spring forward): slots stay at 11:00 AM–6:30 PM Eastern', () => {
    const before = at('2027-03-01T16:00:00Z');
    expect(getSlots('2027-03-13', before)[0].start.toISOString()).toBe('2027-03-13T16:00:00.000Z'); // EST
    const mar14 = getSlots('2027-03-14', before);
    expect(mar14[0].start.toISOString()).toBe('2027-03-14T15:00:00.000Z'); // EDT
    expect(mar14).toHaveLength(16);
    mar14.slice(1).forEach((s, i) => expect(s.start.getTime() - mar14[i].start.getTime()).toBe(30 * 60_000));
  });

  it('March 14, 2027: notice period is measured in real time', () => {
    // 13:30 UTC = 9:30 AM EDT (it would be 8:30 AM if the code wrongly used EST, making 11:00 bookable).
    expect(times('2027-03-14', at('2027-03-14T13:30:00Z'))[0]).toBe('11:30');
  });
});

describe('month calendar', () => {
  it('lays out October 2026 in 6 weeks starting Sunday', () => {
    const weeks = monthMatrix(2026, 10);
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks[2][1]).toBe('2026-10-12');
  });

  it('limits month navigation to the booking horizon', () => {
    expect(bookableMonths(SUNDAY_3_10PM)).toEqual({ first: { year: 2026, month: 10 }, last: { year: 2027, month: 1 } });
    expect(isMonthInRange(2026, 9, SUNDAY_3_10PM)).toBe(false);
    expect(isMonthInRange(2026, 12, SUNDAY_3_10PM)).toBe(true);
    expect(isMonthInRange(2027, 2, SUNDAY_3_10PM)).toBe(false);
  });
});

describe('booking form field validation', () => {
  it('names', () => {
    expect(validateName('')).toBe('Please enter your name.');
    expect(validateName('A')).toBe('Please enter your full name.');
    expect(validateName('Shweta Shah Amin')).toBeNull();
  });

  it('email', () => {
    expect(validateEmail('')).toBe('Please enter your email address.');
    expect(validateEmail('name@example')).not.toBeNull();
    expect(validateEmail('name@@example.com')).not.toBeNull();
    expect(validateEmail('first.last+plans@example.co.uk')).toBeNull();
  });

  it('U.S. phone numbers in common formats', () => {
    for (const ok of ['(973) 722-9191', '973-722-9191', '973.722.9191', '9737229191', '+1 973 722 9191', '1-973-722-9191', '+1 (732) 543-9835']) {
      expect(validatePhone(ok)).toBeNull();
    }
    for (const bad of ['722-9191', '123-456-7890', '973-722-919', '+44 20 7946 0958', 'call me']) {
      expect(validatePhone(bad)).not.toBeNull();
    }
    expect(validatePhone('', { required: false })).toBeNull();
    expect(validatePhone('')).toBe('Please enter your phone number.');
    expect(normalizePhone('+1 (973) 722-9191')).toBe('9737229191');
    expect(formatPhone('9737229191')).toBe('(973) 722-9191');
    expect(formatPhone('not a number')).toBe('not a number');
  });

  it('guests and free text', () => {
    expect(validateGuests('1', 6)).toBeNull();
    expect(validateGuests('6', 6)).toBeNull();
    expect(validateGuests('7', 6)).toBe('Please choose between 1 and 6 people.');
    expect(validateGuests('0', 6)).not.toBeNull();
    expect(validateGuests('2.5', 6)).not.toBeNull();
    expect(validateText('x'.repeat(1001))).toBe('Please shorten this to 1,000 characters or fewer.');
    expect(validateText('')).toBeNull();
  });
});

describe('2-hour appointment blocks from the appointments calendar', () => {
  // Monday Oct 26, 2026 (EDT). "now" is a week earlier, so notice rules don't interfere.
  const now = new Date('2026-10-19T12:00:00-04:00');
  const at = (hhmm: string) => Date.parse(`2026-10-26T${hhmm}:00-04:00`);
  const times = (busy: [number, number][]) => getAvailableSlots('2026-10-26', now, { ...DEFAULT_RULES, busy }).map((s) => s.time);

  it('offers every time when the calendar is empty', () => {
    expect(times([])).toContain('13:00');
    expect(times([])).toHaveLength(16);
  });

  it('a 1:00 PM booking (1:00–3:00) hides every start whose 2 hours would overlap it', () => {
    const t = times([[at('13:00'), at('15:00')]]);
    for (const gone of ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30']) expect(t).not.toContain(gone);
    expect(t).toContain('11:00'); // 11:00–1:00 ends exactly when it starts
    expect(t).toContain('15:00'); // free again from 3:00
  });

  it('a time blocked off by hand (3:00–4:00) also blocks the starts that would run into it', () => {
    const t = times([[at('15:00'), at('16:00')]]);
    expect(t).not.toContain('13:30');
    expect(t).toContain('13:00');
    expect(t).toContain('16:00');
  });

  it('an all-day block closes the whole day', () => {
    const busy: [number, number][] = [[Date.parse('2026-10-26T00:00:00-04:00'), Date.parse('2026-10-27T00:00:00-04:00')]];
    expect(times(busy)).toHaveLength(0);
    expect(getDayStatus('2026-10-26', now, { ...DEFAULT_RULES, busy }).bookable).toBe(false);
  });
});
