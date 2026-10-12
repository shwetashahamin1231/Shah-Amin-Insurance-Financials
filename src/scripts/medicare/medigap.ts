/**
 * Medigap matrix "Show plans" buttons (src/components/medicare/MedigapMatrix.astro).
 * Each button hides or shows one plan's column; at least one plan always stays
 * visible. The visible-plan count is announced politely to screen readers.
 */
const root = document.querySelector<HTMLElement>('[data-medigap]');

if (root) {
  const toggles = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-plan-toggle]'));
  const showAll = root.querySelector<HTMLButtonElement>('[data-plan-all]');
  const status = root.querySelector<HTMLElement>('[data-medigap-status]');

  const apply = (announce = true) => {
    const shown = toggles.filter((t) => t.getAttribute('aria-pressed') === 'true').map((t) => t.dataset.planToggle ?? '');
    root.querySelectorAll<HTMLElement>('[data-col]').forEach((cell) => {
      cell.hidden = !shown.includes(cell.dataset.col ?? '');
    });
    if (showAll) showAll.hidden = shown.length === toggles.length;
    if (announce && status) {
      status.textContent = shown.length === toggles.length ? 'Showing all plans.' : `Showing ${shown.length === 1 ? 'Plan' : 'Plans'} ${shown.join(', ')}.`;
    }
  };

  toggles.forEach((t) =>
    t.addEventListener('click', () => {
      const pressed = t.getAttribute('aria-pressed') === 'true';
      const visible = toggles.filter((x) => x.getAttribute('aria-pressed') === 'true').length;
      if (pressed && visible === 1) return; // keep at least one plan on screen
      t.setAttribute('aria-pressed', String(!pressed));
      apply();
    }),
  );
  showAll?.addEventListener('click', () => {
    toggles.forEach((t) => t.setAttribute('aria-pressed', 'true'));
    apply();
    toggles[0]?.focus();
  });

  apply(false);
}
