/**
 * Live enrollment-period status (see src/components/medicare/PeriodStatus.astro).
 * The page was printed with the build date; this recalculates every status on
 * the page for the visitor's "today" (Eastern time):
 *   [data-period-status data-start="10-15" data-end="12-7"]
 *     [data-period-text]            → "Opens in 4 days" / "Open now — ends in 9 days"
 *     [data-period-dates]           → "October 15 – December 7, 2026"
 *     [data-period-following-year]  → "2027" (the year after the window)
 */
import { formatRange, periodStatusText, todayET, yearlyPeriodState, type MonthDay } from './logic';

function parse(value?: string): MonthDay | null {
  const [m, d] = (value ?? '').split('-').map(Number);
  return m && d ? [m, d] : null;
}

export function updatePeriodStatuses(now: Date = new Date()): void {
  document.querySelectorAll<HTMLElement>('[data-period-status]').forEach((el) => {
    const start = parse(el.dataset.start);
    const end = parse(el.dataset.end);
    if (!start || !end) return;
    const state = yearlyPeriodState(start, end, now);
    el.classList.toggle('is-open', state.open);
    el.querySelectorAll('[data-period-text]').forEach((n) => (n.textContent = periodStatusText(state)));
    el.querySelectorAll('[data-period-dates]').forEach((n) => (n.textContent = formatRange(state.start, state.end)));
    el.querySelectorAll('[data-period-following-year]').forEach((n) => (n.textContent = String(state.end.y + 1)));
  });

  // The "Today" marker on the year ruler (EnrollmentPeriods.astro).
  const t = todayET(now);
  const day = (Date.UTC(2025, t.m - 1, t.d) - Date.UTC(2025, 0, 1)) / 86_400_000;
  document.querySelectorAll<HTMLElement>('[data-year-today]').forEach((el) => el.style.setProperty('--today', `${Math.round((day / 365) * 1000) / 10}%`));
}

updatePeriodStatuses();
// Keep it right if the page stays open past midnight.
window.setInterval(() => updatePeriodStatuses(), 30 * 60 * 1000);
