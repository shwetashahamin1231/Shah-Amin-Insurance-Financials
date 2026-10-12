/**
 * ════════════════════════════════════════════════════════════════════
 *  BOOKING CALENDAR — a month grid following the WAI-ARIA date-grid pattern
 * ════════════════════════════════════════════════════════════════════
 *  Markup: src/components/forms/BookingCalendar.astro (a <table role="grid">
 *  with 6 weeks × 7 days that this file fills in).
 *
 *  Keyboard, when a day has focus:
 *    ← / →            previous / next day
 *    ↑ / ↓            same weekday, previous / next week
 *    Home / End       first / last day of that week
 *    Page Up / Down   previous / next month (with Shift: previous / next year)
 *    Enter / Space    choose the day
 *  Only one day sits in the Tab order at a time ("roving tabindex").
 *  Unavailable days stay focusable so their reason is read out —
 *  "Monday, October 12, 2026 — Columbus Day — closed" — but can't be chosen.
 *  Months are limited to the booking horizon (src/config/forms.ts).
 * ════════════════════════════════════════════════════════════════════
 */
import { addDays, addMonths, daysInMonth, formatDateLong, formatDateNoYear, formatMonthYear, parseDate, toDateString, weekdayOf } from '../../lib/time';
import { bookableMonths, bookingWindow, firstBookableDate, getDayStatus, isMonthInRange, monthMatrix } from '../../lib/slots';
import { getClosuresBetween } from '../../lib/holidays';

export type SelectVia = 'pointer' | 'keyboard';

export interface CalendarOptions {
  /** Prefix for the day cells' ids (unique per page). */
  idPrefix: string;
  /** Called when the visitor chooses an available day. */
  onSelect: (date: string, via: SelectVia) => void;
  /** Polite screen-reader message (e.g. why a day can't be chosen). */
  announce?: (message: string) => void;
}

export interface BookingCalendar {
  /** Redraw using the current time (after the page was hidden, or when returning to the step). */
  refresh(): void;
  /** The chosen date ('YYYY-MM-DD') or null. */
  selected(): string | null;
  /** Id of the day that currently takes keyboard focus. */
  activeCellId(): string;
  /** Move keyboard focus into the calendar. */
  focus(): void;
}

const ym = (date: string) => {
  const { year, month } = parseDate(date);
  return { year, month };
};

export function createCalendar(root: HTMLElement, options: CalendarOptions): BookingCalendar {
  const grid = root.querySelector<HTMLTableElement>('[data-cal-grid]');
  const monthLabel = root.querySelector<HTMLElement>('[data-cal-month]');
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-cal-prev]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-cal-next]');
  const closuresEl = root.querySelector<HTMLElement>('[data-cal-closures]');
  const field = root.querySelector<HTMLElement>('[data-field]');
  if (!grid || !monthLabel || !prevBtn || !nextBtn) throw new Error('[calendar] markup is missing');

  const cells = Array.from(grid.querySelectorAll<HTMLTableCellElement>('tbody td'));
  const cellId = (date: string) => `${options.idPrefix}-day-${date}`;

  let now = new Date();
  let selected: string | null = null;
  let active = firstBookableDate(now) ?? bookingWindow(now).today;
  let view = ym(active);

  /** Every day the calendar may show: the 1st of this month → the end of the horizon month. */
  const inRange = (date: string) => {
    const { first, last } = bookableMonths(now);
    return date >= toDateString(first.year, first.month, 1) && date <= toDateString(last.year, last.month, daysInMonth(last.year, last.month));
  };

  /** Which day should take focus when a month is shown: the chosen day, the first open day, or the 1st. */
  const defaultActiveFor = (year: number, month: number) => {
    if (selected && ym(selected).year === year && ym(selected).month === month) return selected;
    for (let d = 1; d <= daysInMonth(year, month); d++) {
      const date = toDateString(year, month, d);
      if (getDayStatus(date, now).bookable) return date;
    }
    return toDateString(year, month, 1);
  };

  function render() {
    monthLabel!.textContent = formatMonthYear(view.year, view.month);
    monthMatrix(view.year, view.month)
      .flat()
      .forEach((date, i) => {
        const td = cells[i];
        if (!td) return;
        td.className = 'cal__day';
        for (const attr of ['aria-selected', 'aria-disabled', 'aria-current', 'aria-label', 'title', 'id', 'tabindex']) td.removeAttribute(attr);
        delete td.dataset.date;
        if (!date) {
          td.classList.add('is-blank');
          td.textContent = '';
          return;
        }
        const status = getDayStatus(date, now);
        td.dataset.date = date;
        td.id = cellId(date);
        td.textContent = String(parseDate(date).day);
        td.tabIndex = date === active ? 0 : -1;

        const label = [formatDateLong(date) + (status.isToday ? ' (today)' : '')];
        if (!status.bookable && status.note) label.push(status.note);
        td.setAttribute('aria-label', label.join(' — '));

        if (status.isToday) {
          td.setAttribute('aria-current', 'date');
          td.classList.add('is-today');
        }
        if (!status.bookable) {
          td.setAttribute('aria-disabled', 'true');
          td.classList.add('is-unavailable', `is-${status.reason ?? 'closed'}`);
          if (status.note) td.title = status.note;
        }
        if (date === selected) {
          td.setAttribute('aria-selected', 'true');
          td.classList.add('is-selected');
        }
      });

    const prev = addMonths(view.year, view.month, -1);
    const next = addMonths(view.year, view.month, 1);
    prevBtn!.setAttribute('aria-disabled', String(!isMonthInRange(prev.year, prev.month, now)));
    nextBtn!.setAttribute('aria-disabled', String(!isMonthInRange(next.year, next.month, now)));

    // Spell out holiday closures for this month in words, too.
    if (closuresEl) {
      const { today, last } = bookingWindow(now);
      const monthStart = toDateString(view.year, view.month, 1);
      const monthEnd = toDateString(view.year, view.month, daysInMonth(view.year, view.month));
      const from = monthStart > today ? monthStart : today;
      const to = monthEnd < last ? monthEnd : last;
      const closures = from <= to ? getClosuresBetween(from, to) : [];
      closuresEl.textContent = closures.length ? `Closed for holidays: ${closures.map((c) => `${formatDateNoYear(c.date)} (${c.name})`).join('; ')}.` : '';
      closuresEl.hidden = closures.length === 0;
    }

    // Error-summary links for "Please choose a date" land on the active day.
    if (field) field.dataset.focusId = cellId(active);
  }

  const focusActive = () => document.getElementById(cellId(active))?.focus();

  /** Move the active day (and the month, when needed) and focus it. */
  function moveTo(date: string) {
    if (!inRange(date)) return; // stay put at the edges of the booking window
    active = date;
    const target = ym(date);
    if (target.year !== view.year || target.month !== view.month) view = target;
    render();
    focusActive();
  }

  function choose(date: string, via: SelectVia) {
    now = new Date();
    const status = getDayStatus(date, now);
    active = date;
    if (!status.bookable) {
      render();
      focusActive();
      options.announce?.(`${formatDateNoYear(date)}: ${status.note ?? 'not available'}. Please choose another day.`);
      return;
    }
    selected = date;
    render();
    focusActive();
    options.onSelect(date, via);
  }

  function changeMonth(delta: number) {
    now = new Date();
    const target = addMonths(view.year, view.month, delta);
    if (!isMonthInRange(target.year, target.month, now)) return;
    view = target;
    active = defaultActiveFor(target.year, target.month);
    render();
  }

  const shiftMonths = (date: string, delta: number) => {
    const { year, month, day } = parseDate(date);
    const target = addMonths(year, month, delta);
    return toDateString(target.year, target.month, Math.min(day, daysInMonth(target.year, target.month)));
  };

  grid.addEventListener('keydown', (e) => {
    if (!(e.target instanceof Element) || !e.target.closest('td[data-date]')) return;
    let target: string;
    switch (e.key) {
      case 'ArrowLeft':
        target = addDays(active, -1);
        break;
      case 'ArrowRight':
        target = addDays(active, 1);
        break;
      case 'ArrowUp':
        target = addDays(active, -7);
        break;
      case 'ArrowDown':
        target = addDays(active, 7);
        break;
      case 'Home':
        target = addDays(active, -weekdayOf(active));
        break;
      case 'End':
        target = addDays(active, 6 - weekdayOf(active));
        break;
      case 'PageUp':
        target = shiftMonths(active, e.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        target = shiftMonths(active, e.shiftKey ? 12 : 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(active, 'keyboard');
        return;
      default:
        return;
    }
    e.preventDefault();
    moveTo(target);
  });

  grid.addEventListener('click', (e) => {
    const td = e.target instanceof Element ? e.target.closest<HTMLTableCellElement>('td[data-date]') : null;
    if (td?.dataset.date) choose(td.dataset.date, 'pointer');
  });

  prevBtn.addEventListener('click', () => {
    if (prevBtn.getAttribute('aria-disabled') !== 'true') changeMonth(-1);
  });
  nextBtn.addEventListener('click', () => {
    if (nextBtn.getAttribute('aria-disabled') !== 'true') changeMonth(1);
  });

  render();

  return {
    refresh() {
      now = new Date();
      if (!inRange(active)) active = firstBookableDate(now) ?? bookingWindow(now).today;
      if (!isMonthInRange(view.year, view.month, now)) view = ym(active);
      const hadFocus = grid.contains(document.activeElement);
      render();
      if (hadFocus) focusActive();
    },
    selected: () => selected,
    activeCellId: () => cellId(active),
    focus: focusActive,
  };
}
