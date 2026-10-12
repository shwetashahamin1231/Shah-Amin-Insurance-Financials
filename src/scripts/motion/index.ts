/**
 * MOTION CORE — loaded on every page once it is shown.
 *
 * Declarative: add data attributes in the markup and this module wires them.
 *   data-reveal            fade up into view (data-reveal="fade" = no movement)
 *   data-split             heading reveals line by line when scrolled into view
 *   data-hero-split        page-hero heading: words rise in right after load
 *   data-draw (in an element with data-draw-group)  stroke draws itself (needs pathLength="1")
 *   data-count="26"        number counts up from 0
 *   data-odometer          digits spin into place (see components/ui/Odometer.astro)
 *   data-parallax="0.15"   decorative layer drifts at a different speed
 *   data-rosette           guilloché rosette sweeps in (conic mask)
 *   data-magnetic          button follows the cursor slightly (desktop)
 *
 * "Play once when visible" effects use a single IntersectionObserver, so they
 * fire correctly however the visitor arrives (top of page, #anchor link,
 * back/forward). Continuous effects (parallax) use ScrollTrigger.
 * Everything degrades to the final state for reduced motion, and the CSS in
 * src/styles/motion.css reveals content anyway if this file never loads.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { afterFontsAndPaint, isFinePointer, isReducedMotion } from '../lib/env';

gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.defaults({ ease: 'expo.out', duration: 0.9 });

const root = document.documentElement;
let lenis: Lenis | null = null;
let pointerExtras: { destroy: () => void }[] = [];
/** Every one-shot animation, so the Motion switch can jump them to the end. */
const oneShots: gsap.core.Animation[] = [];

/* ───────────── Smooth scrolling ───────────── */
function lenisRaf(time: number) {
  lenis?.raf(time * 1000);
}
function startLenis() {
  if (lenis) return;
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(lenisRaf);
  gsap.ticker.lagSmoothing(0);
}
function stopLenis() {
  if (!lenis) return;
  gsap.ticker.remove(lenisRaf);
  lenis.destroy();
  lenis = null;
}

/* ───────────── "When visible" observer ───────────── */
const pending = new Map<Element, () => void>();
let viewObserver: IntersectionObserver | null = null;

/** Run `cb` once, the first time `el` enters the viewport (immediately if it already is). */
export function onEnterView(el: Element, cb: () => void): void {
  if (!viewObserver) {
    viewObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const fn = pending.get(entry.target);
          viewObserver?.unobserve(entry.target);
          pending.delete(entry.target);
          fn?.();
        }
      },
      { rootMargin: '0px 0px -4% 0px' },
    );
  }
  pending.set(el, cb);
  viewObserver.observe(el);
}

/* ───────────── Reveals ───────────── */
/** Lock elements in their final state and drop the inline animation styles. */
export function markRevealed(els: Element[] | NodeListOf<Element>) {
  els.forEach((el) => el.classList.add('is-revealed'));
  gsap.set(els, { clearProps: 'opacity,transform' });
}

let revealQueue: HTMLElement[] = [];
let revealScheduled = false;
function flushReveals() {
  revealScheduled = false;
  const batch = revealQueue.splice(0).sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });
  if (!batch.length) return;
  const reduced = isReducedMotion();
  const tween = gsap.fromTo(
    batch,
    { opacity: 0, y: reduced ? 0 : (_i, el: HTMLElement) => (el.dataset.reveal === 'fade' ? 0 : 26) },
    {
      opacity: 1,
      y: 0,
      duration: reduced ? 0.45 : 1,
      ease: reduced ? 'power1.out' : 'expo.out',
      stagger: reduced ? 0 : 0.09,
      overwrite: true,
      onComplete: () => markRevealed(batch),
    },
  );
  oneShots.push(tween);
}
function queueReveal(el: HTMLElement) {
  revealQueue.push(el);
  if (!revealScheduled) {
    revealScheduled = true;
    requestAnimationFrame(flushReveals);
  }
}

function initReveals() {
  // While the home intro plays, it reveals the hero itself.
  const introPlaying = root.classList.contains('intro-play') && !root.classList.contains('intro-done');
  gsap.utils
    .toArray<HTMLElement>('[data-reveal]')
    .filter((el) => !el.classList.contains('is-revealed') && !(introPlaying && el.closest('[data-intro-hero]')))
    .forEach((el) => onEnterView(el, () => queueReveal(el)));
}

/* ───────────── Split headings ───────────── */
function splitOnScroll(el: HTMLElement) {
  if (el.querySelector('a')) {
    gsap.set(el, { opacity: 1 });
    return;
  }
  let entered = false;
  let tween: gsap.core.Tween | null = null;
  SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    tag: 'span',
    linesClass: 'split-line',
    autoSplit: true,
    onSplit(self) {
      gsap.set(el, { opacity: 1 });
      tween = gsap.from(self.lines, { yPercent: 108, duration: 1.15, stagger: 0.1, ease: 'expo.out', paused: true });
      oneShots.push(tween);
      if (entered) tween.progress(1); // re-split (fonts/resize) after it already played
      return tween;
    },
  });
  onEnterView(el, () => {
    entered = true;
    tween?.play();
  });
}

/** Page-hero heading: words rise in once fonts are ready (the heading is painted at 1% opacity first, so it still counts for LCP). */
export function playHeroSplit(el: HTMLElement, delay = 0): gsap.core.Tween | null {
  if (el.querySelector('a')) {
    gsap.set(el, { opacity: 1 });
    return null;
  }
  let tween: gsap.core.Tween | null = null;
  SplitText.create(el, {
    type: 'words',
    mask: 'words',
    tag: 'span',
    wordsClass: 'split-word',
    autoSplit: true,
    onSplit(self) {
      gsap.set(el, { opacity: 1 });
      tween = gsap.from(self.words, { yPercent: 115, duration: 1.2, stagger: 0.06, ease: 'expo.out', delay });
      oneShots.push(tween);
      return tween;
    },
  });
  return tween;
}

async function initSplits() {
  const scrollHeads = gsap.utils.toArray<HTMLElement>('[data-split]');
  const heroHeads = gsap.utils.toArray<HTMLElement>('[data-hero-split]').filter((el) => !el.closest('[data-intro-hero]') || !root.classList.contains('intro-play'));
  if (isReducedMotion()) {
    gsap.set([...scrollHeads, ...heroHeads], { opacity: 1 });
    return;
  }
  await afterFontsAndPaint();
  heroHeads.forEach((el) => playHeroSplit(el, 0.05));
  scrollHeads.forEach(splitOnScroll);
}

/* ───────────── Line drawing ───────────── */
function initDraw() {
  gsap.utils.toArray<Element>('[data-draw-group]').forEach((group) => {
    const paths = group.querySelectorAll<SVGGeometryElement>('[data-draw]');
    if (!paths.length) return;
    if (isReducedMotion()) {
      gsap.set(paths, { strokeDashoffset: 0 });
      return;
    }
    const tween = gsap.fromTo(paths, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.12, paused: true });
    oneShots.push(tween);
    onEnterView(group, () => tween.play());
  });
}

/* ───────────── Count-ups ───────────── */
function initCounters() {
  if (isReducedMotion()) return;
  gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (!Number.isFinite(end)) return;
    const start = Number(el.dataset.countFrom ?? 0);
    const state = { v: start };
    el.textContent = String(start);
    const tween = gsap.to(state, {
      v: end,
      duration: 2,
      ease: 'power3.out',
      paused: true,
      onUpdate: () => {
        el.textContent = String(Math.round(state.v));
      },
    });
    oneShots.push(tween);
    onEnterView(el, () => tween.play());
  });
}

/* ───────────── Odometers (each digit spins a full turn, then lands) ───────────── */
function initOdometers() {
  if (isReducedMotion()) return;
  gsap.utils.toArray<HTMLElement>('[data-odometer]').forEach((el) => {
    const tl = gsap.timeline({ paused: true });
    el.querySelectorAll<HTMLElement>('.odo__strip').forEach((strip, i) => {
      const d = Number(getComputedStyle(strip.parentElement as HTMLElement).getPropertyValue('--d')) || 0;
      // y: 0 overrides the CSS resting offset so only yPercent drives the spin.
      tl.fromTo(strip, { y: 0, yPercent: 0 }, { y: 0, yPercent: -(10 + d) * 5, duration: 2.1, ease: 'power3.inOut', immediateRender: true }, i * 0.12);
    });
    oneShots.push(tl);
    onEnterView(el, () => tl.play());
  });
}

/* ───────────── Parallax (decorative layers only) ───────────── */
function initParallax() {
  if (isReducedMotion()) return;
  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
    const speed = Number(el.dataset.parallax || 0.15);
    gsap.fromTo(
      el,
      { yPercent: -speed * 50 },
      { yPercent: speed * 50, ease: 'none', scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } },
    );
  });
}

/* ───────────── Rosette sweep ───────────── */
function initRosettes() {
  gsap.utils.toArray<HTMLElement>('[data-rosette]').forEach((el) => {
    if (el.closest('[data-intro-hero]') && root.classList.contains('intro-play')) return; // the intro plays this one
    if (isReducedMotion()) {
      el.style.setProperty('--sweep', '360deg');
      return;
    }
    const tween = gsap.fromTo(el, { '--sweep': '0deg' }, { '--sweep': '360deg', duration: 2.4, ease: 'power2.inOut', paused: true });
    oneShots.push(tween);
    onEnterView(el, () => tween.play());
  });
}

/* ───────────── Pointer extras (desktop) ───────────── */
async function startPointerExtras() {
  if (!isFinePointer() || isReducedMotion() || pointerExtras.length) return;
  const [{ initMagnetic }, { initCursor }] = await Promise.all([import('./magnetic'), import('./cursor')]);
  pointerExtras = [initMagnetic(), initCursor()];
}
function stopPointerExtras() {
  pointerExtras.forEach((x) => x.destroy());
  pointerExtras = [];
}

/* ───────────── Motion switch ───────────── */
function onMotionChange() {
  if (isReducedMotion()) {
    stopLenis();
    stopPointerExtras();
    // Jump every pending animation to its end state.
    viewObserver?.disconnect();
    pending.clear();
    oneShots.forEach((a) => a.progress(1));
    ScrollTrigger.getAll().forEach((st) => {
      st.animation?.progress(1);
      st.kill();
    });
    markRevealed(document.querySelectorAll('[data-reveal]'));
    gsap.set('[data-split], [data-hero-split]', { opacity: 1 });
    gsap.set('[data-draw]', { strokeDashoffset: 0 });
    gsap.set('.odo__strip', { clearProps: 'transform' });
    document.querySelectorAll<HTMLElement>('[data-rosette]').forEach((el) => el.style.setProperty('--sweep', '360deg'));
  } else {
    startLenis();
    startPointerExtras();
  }
}

/* ───────────── Boot ───────────── */
export async function initMotion(): Promise<void> {
  root.classList.add('motion-ready');
  if (!isReducedMotion()) startLenis();

  initReveals();
  initDraw();
  initCounters();
  initOdometers();
  initParallax();
  initRosettes();
  initSplits();
  startPointerExtras();

  if (root.classList.contains('intro-play')) {
    const { playIntro } = await import('./intro');
    playIntro({ lenis, playHeroSplit, markRevealed });
  }

  window.addEventListener('sa:motion-change', onMotionChange);
  window.addEventListener('sa:scroll-lock', () => lenis?.stop());
  window.addEventListener('sa:scroll-unlock', () => lenis?.start());
  // Parallax positions: recalculate after fonts and images settle.
  requestAnimationFrame(() => ScrollTrigger.refresh());
  if (document.readyState !== 'complete') window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

export { gsap, ScrollTrigger };
export const getLenis = () => lenis;
