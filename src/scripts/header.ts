/**
 * Header behaviour: condense on scroll (IntersectionObserver, no scroll
 * handlers) and accessible dropdown menus (disclosure pattern — the link
 * navigates, the caret button opens the panel; hover opens on desktop).
 */
export function initHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  // Condense once the top of the page scrolls out of view.
  const sentinel = document.querySelector('[data-header-sentinel]');
  if (sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => header.classList.toggle('is-condensed', !entry.isIntersecting)).observe(sentinel);
  }

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let openItem: HTMLElement | null = null;
  let hoverTimer: number | undefined;

  const setOpen = (item: HTMLElement, open: boolean) => {
    const toggle = item.querySelector<HTMLButtonElement>('[data-nav-toggle]');
    const panel = item.querySelector<HTMLElement>('[data-nav-panel]');
    if (!toggle || !panel) return;
    if (open && openItem && openItem !== item) setOpen(openItem, false);
    toggle.setAttribute('aria-expanded', String(open));
    panel.toggleAttribute('data-open', open);
    openItem = open ? item : openItem === item ? null : openItem;
  };

  header.querySelectorAll<HTMLElement>('[data-nav-item]').forEach((item) => {
    const toggle = item.querySelector<HTMLButtonElement>('[data-nav-toggle]');
    if (!toggle) return;

    toggle.addEventListener('click', () => setOpen(item, toggle.getAttribute('aria-expanded') !== 'true'));

    item.addEventListener('mouseenter', () => {
      if (!finePointer.matches) return;
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => setOpen(item, true), 80);
    });
    item.addEventListener('mouseleave', () => {
      if (!finePointer.matches) return;
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => setOpen(item, false), 220);
    });
    item.addEventListener('focusout', (e) => {
      if (!item.contains(e.relatedTarget as Node | null)) setOpen(item, false);
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(item, false);
        toggle.focus();
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (openItem && !openItem.contains(e.target as Node)) setOpen(openItem, false);
  });
}
