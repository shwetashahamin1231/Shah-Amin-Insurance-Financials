import { describe, expect, it } from 'vitest';
import {
  findHoliday,
  getClosure,
  getClosuresBetween,
  getFederalHolidays,
  getNextClosure,
  lastWeekdayOfMonth,
  nthWeekdayOfMonth,
  observedDate,
} from '../src/lib/holidays';

const observed = (year: number) => getFederalHolidays(year).map((h) => h.observed);

describe('federal holidays — must match OPM', () => {
  it('2026', () => {
    expect(observed(2026)).toEqual([
      '2026-01-01', // New Year’s Day
      '2026-01-19', // Birthday of Martin Luther King Jr.
      '2026-02-16', // Washington’s Birthday
      '2026-05-25', // Memorial Day
      '2026-06-19', // Juneteenth
      '2026-07-03', // Independence Day (observed — July 4 is a Saturday)
      '2026-09-07', // Labor Day
      '2026-10-12', // Columbus Day
      '2026-11-11', // Veterans Day
      '2026-11-26', // Thanksgiving Day
      '2026-12-25', // Christmas Day
    ]);
  });

  it('2027', () => {
    expect(observed(2027)).toEqual([
      '2027-01-01',
      '2027-01-18',
      '2027-02-15',
      '2027-05-31',
      '2027-06-18', // Juneteenth observed (June 19 is a Saturday)
      '2027-07-05', // Independence Day observed (July 4 is a Sunday)
      '2027-09-06',
      '2027-10-11',
      '2027-11-11',
      '2027-11-25',
      '2027-12-24', // Christmas observed (December 25 is a Saturday)
    ]);
  });

  it('New Year’s Day 2028 (a Saturday) is observed on Friday, December 31, 2027', () => {
    expect(getFederalHolidays(2028)[0]).toEqual({ name: 'New Year’s Day', date: '2028-01-01', observed: '2027-12-31' });
    expect(findHoliday('2027-12-31')).toMatchObject({ isObservance: true, holiday: { name: 'New Year’s Day' } });
    expect(getClosure('2027-12-31')).toBe('New Year’s Day (observed)');
  });

  it('keeps the actual date alongside the observed one, with names', () => {
    const july4 = getFederalHolidays(2026).find((h) => h.name === 'Independence Day');
    expect(july4).toEqual({ name: 'Independence Day', date: '2026-07-04', observed: '2026-07-03' });
    expect(getFederalHolidays(2026).map((h) => h.name)).toEqual([
      'New Year’s Day',
      'Birthday of Martin Luther King Jr.',
      'Washington’s Birthday',
      'Memorial Day',
      'Juneteenth',
      'Independence Day',
      'Labor Day',
      'Columbus Day',
      'Veterans Day',
      'Thanksgiving Day',
      'Christmas Day',
    ]);
  });

  it('other years spot-checked against OPM', () => {
    // 2022: New Year’s Day observed Dec 31, 2021; Juneteenth Jun 20; Christmas Dec 26.
    expect(getFederalHolidays(2022)[0].observed).toBe('2021-12-31');
    expect(observed(2022)).toContain('2022-06-20');
    expect(observed(2022)).toContain('2022-12-26');
    // 2023: New Year’s Day observed Mon Jan 2.
    expect(getFederalHolidays(2023)[0].observed).toBe('2023-01-02');
    // 2032: Thanksgiving Nov 25, Columbus Day Oct 11, Memorial Day May 31.
    expect(observed(2032)).toEqual(expect.arrayContaining(['2032-11-25', '2032-10-11', '2032-05-31']));
    // Juneteenth only exists from 2021.
    expect(getFederalHolidays(2020)).toHaveLength(10);
    expect(getFederalHolidays(2021)).toHaveLength(11);
  });

  it('weekday helpers', () => {
    expect(nthWeekdayOfMonth(2026, 10, 1, 2)).toBe('2026-10-12');
    expect(nthWeekdayOfMonth(2026, 11, 4, 4)).toBe('2026-11-26');
    expect(lastWeekdayOfMonth(2026, 5, 1)).toBe('2026-05-25');
    expect(lastWeekdayOfMonth(2027, 5, 1)).toBe('2027-05-31');
    expect(observedDate('2026-07-04')).toBe('2026-07-03'); // Saturday → Friday
    expect(observedDate('2027-07-04')).toBe('2027-07-05'); // Sunday → Monday
    expect(observedDate('2026-12-25')).toBe('2026-12-25'); // weekday unchanged
  });
});

describe('getClosure — office closing rules', () => {
  it('Columbus Day 2026 (tomorrow) is closed', () => {
    expect(getClosure('2026-10-12')).toBe('Columbus Day');
  });

  it('ordinary days are open', () => {
    expect(getClosure('2026-10-11')).toBeNull();
    expect(getClosure('2026-10-13')).toBeNull();
    expect(getClosure('2026-07-02')).toBeNull();
  });

  it('closes on both the weekend holiday and its observed weekday by default', () => {
    expect(getClosure('2026-07-04')).toBe('Independence Day');
    expect(getClosure('2026-07-03')).toBe('Independence Day (observed)');
    expect(getClosure('2027-07-05')).toBe('Independence Day (observed)');
  });

  it('honours closeOnObservedDay / closeOnHoliday', () => {
    const noObserved = { closeOnHoliday: true, closeOnObservedDay: false };
    expect(getClosure('2026-07-03', noObserved)).toBeNull();
    expect(getClosure('2026-07-04', noObserved)).toBe('Independence Day');

    const observedOnly = { closeOnHoliday: false, closeOnObservedDay: true };
    expect(getClosure('2026-07-04', observedOnly)).toBeNull();
    expect(getClosure('2026-07-03', observedOnly)).toBe('Independence Day (observed)');
    expect(getClosure('2026-10-12', observedOnly)).toBeNull();
  });

  it('lists closures in a range, across the new year', () => {
    expect(getClosuresBetween('2026-10-11', '2027-01-09')).toEqual([
      { date: '2026-10-12', name: 'Columbus Day' },
      { date: '2026-11-11', name: 'Veterans Day' },
      { date: '2026-11-26', name: 'Thanksgiving Day' },
      { date: '2026-12-25', name: 'Christmas Day' },
      { date: '2027-01-01', name: 'New Year’s Day' },
    ]);
    expect(getClosuresBetween('2027-12-20', '2028-01-05')).toEqual([
      { date: '2027-12-24', name: 'Christmas Day (observed)' },
      { date: '2027-12-25', name: 'Christmas Day' },
      { date: '2027-12-31', name: 'New Year’s Day (observed)' },
      { date: '2028-01-01', name: 'New Year’s Day' },
    ]);
  });

  it('finds the next closure', () => {
    expect(getNextClosure('2026-10-11')).toEqual({ date: '2026-10-12', name: 'Columbus Day' });
    expect(getNextClosure('2026-10-13')).toEqual({ date: '2026-11-11', name: 'Veterans Day' });
  });
});
