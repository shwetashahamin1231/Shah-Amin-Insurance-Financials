/**
 * Keeps the mascot out of the way. Toggles state classes on the fixed
 * container (the CSS in Peacock.astro moves its inner wrapper with
 * compositor-only transforms):
 *   .is-tucked  while the page scrolls (back ~700ms after it stops)
 *   .is-ducked  when a keyboard-focused element sits underneath it, or when the
 *               very end of the page (footer links, display switches) is in view
 *   .is-popped  phones: risen out of its peek (tap, focus, reactions)
 * Scroll handling is passive and read-only (scrollY); layout is only read when
 * scrolling stops or focus moves.
 */

export interface StageHooks {
  onScrollStart(): void;
  onScroll(dy: number): void;
  onScrollEnd(progress: number): void;
}

export interface Stage {
  readonly tucked: boolean;
  /** Phones only: rise out of the peek (or sink back). */
  pop(on: boolean): void;
  /** True on phones, where the bird peeks from the bottom-left corner. */
  isPeek(): boolean;
  /** Re-check the page-end / focus rules (after resize or layout changes). */
  refresh(): void;
}

const SETTLE_MS = 700;
const peekQuery = window.matchMedia('(max-width: 47.99rem)');

export function createStage(root: HTMLElement, hooks: StageHooks): Stage {
  const ducks = new Set<string>();
  let tucked = false;
  let travel = 0;
  let lastY = window.scrollY;
  let timer = 0;

  const setDuck = (reason: string, on: boolean) => {
    if (on) ducks.add(reason);
    else ducks.delete(reason);
    root.classList.toggle('is-ducked', ducks.size > 0);
  };

  const pop = (on: boolean) => root.classList.toggle('is-popped', on && peekQuery.matches);

  /** Where the bird sits when at rest (the container itself never moves). */
  function restBox() {
    const b = root.getBoundingClientRect();
    return { left: b.left, right: b.right, top: Math.max(b.top, 0), bottom: Math.min(b.bottom, window.innerHeight) };
  }

  /** At the very end of a scrolling page the footer's bottom bar (links, Motion/Peacock switches) needs the corner. */
  function checkEnd() {
    if (peekQuery.matches) return setDuck('end', false);
    const doc = document.documentElement;
    const reserve = root.offsetHeight + 40;
    const scrollable = doc.scrollHeight > window.innerHeight + reserve;
    setDuck('end', scrollable && window.scrollY + window.innerHeight >= doc.scrollHeight - reserve);
  }

  /** Duck when the keyboard-focused element is underneath the bird. */
  function checkFocus() {
    const el = document.activeElement;
    let covered = false;
    if (el instanceof HTMLElement && el !== document.body && !root.contains(el)) {
      let keyboard = true;
      try {
        keyboard = el.matches(':focus-visible');
      } catch {
        /* very old browsers: treat all focus as keyboard focus */
      }
      if (keyboard) {
        const a = el.getBoundingClientRect();
        const b = restBox();
        covered = a.width > 0 && a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
      }
    }
    setDuck('focus', covered);
  }

  function settle() {
    travel = 0;
    checkEnd();
    checkFocus();
    if (tucked) {
      tucked = false;
      root.classList.remove('is-tucked');
    }
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    hooks.onScrollEnd(max > 0 ? window.scrollY / max : 0);
  }

  function onScroll() {
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    hooks.onScroll(dy);
    if (!tucked) {
      travel += Math.abs(dy);
      if (travel > 6) {
        tucked = true;
        root.classList.add('is-tucked');
        pop(false);
        hooks.onScrollStart();
      }
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(settle, SETTLE_MS);
  }

  const onFocusChange = () => requestAnimationFrame(checkFocus);

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('focusin', onFocusChange);
  document.addEventListener('focusout', onFocusChange);
  peekQuery.addEventListener('change', () => {
    pop(false);
    checkEnd();
  });
  checkEnd();

  return {
    get tucked() {
      return tucked;
    },
    pop,
    isPeek: () => peekQuery.matches,
    refresh() {
      checkEnd();
      checkFocus();
    },
  };
}
