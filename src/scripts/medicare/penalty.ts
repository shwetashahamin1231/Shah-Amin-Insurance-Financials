/**
 * Late-penalty estimator (src/components/medicare/PenaltyEstimator.astro).
 * Recalculates as the visitor types or uses the − / + buttons. Results update
 * on screen immediately; screen readers hear a short summary once typing pauses.
 * Figures come from data attributes printed by the component (single source:
 * src/data/medicare.ts).
 */
import { money, partBPenalty, partDPenalty } from './logic';

const root = document.querySelector<HTMLElement>('[data-penalty]');

if (root) {
  const premium = Number(root.dataset.bPremium);
  const base = Number(root.dataset.dBase);
  const year = root.dataset.year ?? '';
  const announcer = root.querySelector<HTMLElement>('[data-penalty-announce]');
  let announceTimer: number | undefined;

  const announce = (text: string) => {
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      if (announcer) announcer.textContent = text;
    }, 700);
  };

  root.querySelectorAll<HTMLFormElement>('[data-penalty-form]').forEach((form) => {
    const kind = form.dataset.penaltyForm;
    const input = form.querySelector<HTMLInputElement>('[data-penalty-input]');
    const added = form.querySelector<HTMLElement>('[data-out="added"]');
    const detail = form.querySelector<HTMLElement>('[data-out="detail"]');
    if (!input) return;

    const update = (speak = true) => {
      const max = Number(input.max) || 480;
      const months = Math.min(max, Math.max(0, Math.floor(Number(input.value) || 0)));
      if (kind === 'b') {
        const r = partBPenalty(months, premium);
        if (added) added.textContent = `+${money(r.added)}`;
        if (detail)
          detail.textContent = `${r.periods} full ${r.periods === 1 ? 'year' : 'years'} × 10% = ${r.percent}% of ${money(premium)} · your ${year} premium would be about ${money(r.total)} a month`;
        if (speak) announce(`Part B estimate: ${money(r.added)} a month added, about ${money(r.total)} in total.`);
      } else {
        const r = partDPenalty(months, base);
        if (added) added.textContent = `+${money(r.monthly)}`;
        if (detail) detail.textContent = `${r.months} ${r.months === 1 ? 'month' : 'months'} × 1% × ${money(base)} = ${money(r.raw)}, rounded to ${money(r.monthly)}`;
        if (speak) announce(`Part D estimate: ${money(r.monthly)} a month added.`);
      }
    };

    input.addEventListener('input', () => update());
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      update();
    });
    form.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const next = Math.max(0, (Math.floor(Number(input.value) || 0)) + Number(btn.dataset.step));
        input.value = String(Math.min(Number(input.max) || 480, next));
        update();
      }),
    );
    update(false);
  });
}
