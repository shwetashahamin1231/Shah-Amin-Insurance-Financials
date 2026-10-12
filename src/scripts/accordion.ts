/**
 * ACCORDION behaviour for src/components/ui/Accordion.astro.
 *  • Click a question (or press Enter / Space) to open or close its answer.
 *  • Arrow Up / Down move between questions in the same accordion;
 *    Home / End jump to the first / last question.
 *  • Accordions marked data-accordion-exclusive keep only one answer open.
 *  • A link to  page/#item-id  opens that item (on load and when the hash changes).
 *  • The open/close animation is pure CSS and switches off for reduced motion.
 * Other scripts (e.g. the FAQ filter) can import the helpers below.
 */

const ITEM = '[data-accordion-item]';
const TRIGGER = '[data-accordion-trigger]';

declare global {
  interface Window {
    __saAccordion?: boolean;
  }
}

/** Let other scripts know the page height changed (e.g. to refresh scroll animations). */
let layoutTimer: number | undefined;
function notifyLayoutChange(): void {
  window.clearTimeout(layoutTimer);
  layoutTimer = window.setTimeout(() => window.dispatchEvent(new CustomEvent('sa:layout-change')), 450);
}

/** The trigger button that belongs to this item (not one from a nested accordion). */
function triggerOf(item: HTMLElement): HTMLButtonElement | null {
  return item.querySelector<HTMLButtonElement>(`:scope > * > ${TRIGGER}`);
}

/** Open or close one item. */
export function setItemOpen(item: HTMLElement, open: boolean): void {
  const trigger = triggerOf(item);
  if (!trigger) return;
  if (open) {
    const group = item.closest<HTMLElement>('[data-accordion-exclusive]');
    group?.querySelectorAll<HTMLElement>(`${ITEM}.is-open`).forEach((other) => {
      if (other !== item && other.closest('[data-accordion-exclusive]') === group) setItemOpen(other, false);
    });
  }
  item.classList.toggle('is-open', open);
  trigger.setAttribute('aria-expanded', String(open));
  notifyLayoutChange();
}

export function toggleItem(item: HTMLElement): void {
  setItemOpen(item, !item.classList.contains('is-open'));
}

/** Open the item the URL hash points to (or that contains the target), including any closed parents. */
export function openFromHash(focus = false): void {
  let id = '';
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return;
  }
  if (!id) return;
  const target = document.getElementById(id);
  const item = target?.closest<HTMLElement>(ITEM);
  if (!target || !item) return;

  let current: HTMLElement | null = item;
  while (current) {
    if (!current.classList.contains('is-open')) setItemOpen(current, true);
    current = current.parentElement?.closest<HTMLElement>(ITEM) ?? null;
  }
  if (focus) triggerOf(item)?.focus({ preventScroll: true });
}

/** Arrow-key movement between visible questions of one accordion. */
function onKeydown(e: KeyboardEvent): void {
  const trigger = (e.target as Element | null)?.closest<HTMLButtonElement>(TRIGGER);
  if (!trigger || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
  const root = trigger.closest('[data-accordion]');
  if (!root) return;
  const triggers = Array.from(root.querySelectorAll<HTMLButtonElement>(TRIGGER)).filter(
    (t) => t.closest('[data-accordion]') === root && !t.closest('[hidden]'),
  );
  const i = triggers.indexOf(trigger);
  if (i < 0) return;
  e.preventDefault();
  const next =
    e.key === 'Home' ? 0 : e.key === 'End' ? triggers.length - 1 : e.key === 'ArrowDown' ? (i + 1) % triggers.length : (i - 1 + triggers.length) % triggers.length;
  triggers[next]?.focus();
}

export function initAccordions(): void {
  if (window.__saAccordion) return; // already wired (script shared by several components)
  window.__saAccordion = true;

  document.addEventListener('click', (e) => {
    const trigger = (e.target as Element | null)?.closest<HTMLButtonElement>(TRIGGER);
    const item = trigger?.closest<HTMLElement>(ITEM);
    if (item) toggleItem(item);
  });
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('hashchange', () => openFromHash(true));
  openFromHash();
}

initAccordions();
