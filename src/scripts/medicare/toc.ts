/**
 * "On this page" table of contents (src/components/medicare/GuideToc.astro).
 *  • Highlights the section you are reading (IntersectionObserver — no scroll handlers).
 *  • Phones/tablets: the bar opens and closes the list; it closes again after you
 *    pick a section, press Escape or tap elsewhere.
 */
const toc = document.querySelector<HTMLElement>('[data-toc]');

if (toc) {
  const toggle = toc.querySelector<HTMLButtonElement>('[data-toc-toggle]');
  const current = toc.querySelector<HTMLElement>('[data-toc-current]');
  const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
  const targets = links
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter((el): el is HTMLElement => el !== null);

  const isOpen = () => toc.classList.contains('is-open');
  const setOpen = (open: boolean) => {
    toc.classList.toggle('is-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
  };

  toggle?.addEventListener('click', () => setOpen(!isOpen()));
  links.forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle?.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (isOpen() && !toc.contains(e.target as Node)) setOpen(false);
  });

  const setActive = (id: string) => {
    links.forEach((a) => {
      const on = a.hash === `#${id}`;
      a.classList.toggle('is-active', on);
      if (on) {
        a.setAttribute('aria-current', 'location');
        if (current) current.textContent = a.dataset.label ?? a.textContent ?? '';
      } else {
        a.removeAttribute('aria-current');
      }
    });
  };

  // A thin band just above the middle of the screen decides which section is "current".
  if ('IntersectionObserver' in window && targets.length) {
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
        const first = targets.find((t) => visible.has(t));
        if (first) setActive(first.id);
      },
      { rootMargin: '-32% 0px -62% 0px' },
    );
    targets.forEach((t) => observer.observe(t));
  }
}
