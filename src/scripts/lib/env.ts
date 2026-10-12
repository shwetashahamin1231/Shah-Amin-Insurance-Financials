/** Small environment helpers shared by the site scripts. */

const root = document.documentElement;

/** Run `fn` once the page is actually shown — not while Chrome prerenders it in the background. */
export function whenActivated(fn: () => void): void {
  if ((document as Document & { prerendering?: boolean }).prerendering) {
    document.addEventListener('prerenderingchange', () => fn(), { once: true });
  } else {
    fn();
  }
}

/** True when motion should be reduced (OS setting or the footer "Motion" switch). */
export const isReducedMotion = (): boolean => root.classList.contains('reduce-motion');

/** True on devices with a real mouse/trackpad (no hover effects on touch screens). */
export const isFinePointer = (): boolean => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Resolve after web fonts are ready and two frames have painted (safe moment to measure/split text). */
export async function afterFontsAndPaint(): Promise<void> {
  try {
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

/** Fire a site-wide custom event. */
export function emit<T>(name: string, detail?: T): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Call when the browser is idle (or after a short delay where unsupported). */
export function onIdle(fn: () => void, timeout = 2500): void {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(fn, { timeout });
  else setTimeout(fn, 1200);
}
