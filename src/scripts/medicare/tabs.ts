/**
 * Accessible tabs (WAI-ARIA tabs pattern) for any element with [data-tabs]:
 *   buttons [role=tab][data-tab] with aria-controls → panels [role=tabpanel].
 * Click or arrow keys (Left/Right/Up/Down) choose a tab; Home/End jump to the
 * first/last. Only the selected tab is in the Tab order (roving tabindex).
 */
document.querySelectorAll<HTMLElement>('[data-tabs]').forEach((root) => {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls') ?? ''));

  const select = (index: number, focus = false) => {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      tab.classList.toggle('is-active', on);
      const panel = panels[i];
      if (panel) {
        panel.classList.toggle('is-active', on);
        panel.hidden = !on;
      }
    });
    if (focus) tabs[index]?.focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      const last = tabs.length - 1;
      const next =
        e.key === 'ArrowRight' || e.key === 'ArrowDown'
          ? (i + 1) % tabs.length
          : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
            ? (i - 1 + tabs.length) % tabs.length
            : e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? last
                : -1;
      if (next < 0) return;
      e.preventDefault();
      select(next, true);
    });
  });

  select(Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')));
});
