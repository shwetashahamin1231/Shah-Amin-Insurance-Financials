/**
 * Initial Enrollment Period calculator (src/components/medicare/IepCalculator.astro).
 * Re-draws the 7-month timeline and the summary whenever the visitor changes the
 * month, the year or the "born on the 1st" box. The summary is announced politely
 * to screen readers (aria-live on the paragraph).
 */
import { iepOffsetLabel, iepSummary, initialEnrollment, monthIndex, MONTHS_SHORT, todayET, type YM } from './logic';

const root = document.querySelector<HTMLElement>('[data-iep]');

if (root) {
  const monthSelect = root.querySelector<HTMLSelectElement>('[data-iep-month]');
  const yearSelect = root.querySelector<HTMLSelectElement>('[data-iep-year]');
  const firstBox = root.querySelector<HTMLInputElement>('[data-iep-first]');
  const summary = root.querySelector<HTMLElement>('[data-iep-summary]');
  const cells = Array.from(root.querySelectorAll<HTMLElement>('[data-iep-cell]'));
  const form = root.querySelector<HTMLFormElement>('[data-iep-form]');
  const short = (ym: YM) => `${MONTHS_SHORT[ym.m - 1]} 1, ${ym.y}`;

  const update = () => {
    const birthday: YM = { y: Number(yearSelect?.value), m: Number(monthSelect?.value) };
    if (!birthday.y || !birthday.m) return;
    const iep = initialEnrollment(birthday, Boolean(firstBox?.checked));
    const t = todayET();
    const today: YM = { y: t.y, m: t.m };
    const nowIndex = monthIndex(today);

    iep.months.forEach((m, i) => {
      const cell = cells[i];
      if (!cell) return;
      cell.classList.toggle('is-birthday', m.offset === 0);
      cell.classList.toggle('is-past', monthIndex(m) < nowIndex);
      cell.classList.toggle('is-now', monthIndex(m) === nowIndex);
      const set = (sel: string, text: string) => {
        const el = cell.querySelector(sel);
        if (el) el.textContent = text;
      };
      set('[data-iep-when]', iepOffsetLabel(m.offset));
      set('[data-iep-name]', `${MONTHS_SHORT[m.m - 1]} ${m.y}`);
      set('[data-iep-cov]', short(m.coverage));
    });
    // Only touch the live region when the words really change (avoids a needless announcement on load).
    const text = iepSummary(iep, today);
    if (summary && summary.textContent !== text) summary.textContent = text;
  };

  form?.addEventListener('submit', (e) => e.preventDefault());
  [monthSelect, yearSelect, firstBox].forEach((el) => el?.addEventListener('change', update));
  update(); // the visitor's "today" may differ from the build date
}
