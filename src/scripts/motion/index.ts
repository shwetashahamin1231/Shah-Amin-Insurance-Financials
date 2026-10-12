/**
 * MOTION CORE — loaded on every page once it is shown.
 *
 * Declarative: add data attributes in the markup and this module wires them.
 *   data-reveal            fade up into view (data-reveal="fade" = no movement)
 *   data-split             heading reveals line by line when scrolled into view
 *   data-hero-split        page-hero heading: words rise in right after load
 *   data-draw (in an svg[data-draw-group])  stroke draws itself (needs pathLength="1")
 *   data-count="26"        number counts up from 0
 *   data-parallax="0.15"   decorative layer drifts at a different speed
 *   data-rosette           guilloché rosette sweeps in (conic mask)
 *   data-magnetic          button follows the cursor slightly (desktop)
 *
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

/* ───────────── Reveals ───────────── */
/** Lock elements in their final state and drop the inline animation styles. */
export function markRevealed(els: Element[] | NodeListOf<Element>) {
  els.forEach((el) => el.classList.add('is-revealed'));
  gsap.set(els, { clearProps: 'opacity,transform' });
}

function initReveals() {
  // While the home intro plays, it reveals the hero itself.
  const introPlaying = root.classList.contains('intro-play') && !root.classList.contains('intro-done');
  const els = gsap.utils.toArray<HTMLElement>('[data-reveal]').filter((el) => !(introPlaying && el.closest('[data-intro-hero]')));
  if (!els.length) return;
  const reduced = isReducedMotion();
  ScrollTrigger.batch(els, {
    start: 'top 97%',
    once: true,
    onEnter: (batch) =>
      gsap.fromTo(
        batch,
        { opacity: 0.01, y: reduced ? 0 : (_i, el: HTMLElement) => (el.dataset.reveal === 'fade' ? 0 : 26) },
        {
          opacity: 1,
          y: 0,
          duration: reduced ? 0.45 : 1,
          ease: reduced ? 'power1.out' : 'expo.out',
          stagger: reduced ? 0 : 0.09,
          overwrite: true,
          onComplete: () => markRevealed(batch as HTMLElement[]),
        },
      ),
  });
}

/* ───────────── Split headings ───────────── */
function splitOnScroll(el: HTMLElement) {
  if (el.querySelector('a')) {
    gsap.set(el, { opacity: 1 });
    return;
  }
  SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    tag: 'span',
    linesClass: 'split-line',
    autoSplit: true,
    onSplit(self) {
      gsap.set(el, { opacity: 1 });
      return gsap.from(self.lines, {
        yPercent: 108,
        duration: 1.15,
        stagger: 0.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    },
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
  gsap.utils.toArray<SVGElement>('[data-draw-group]').forEach((group) => {
    const paths = group.querySelectorAll<SVGGeometryElement>('[data-draw]');
    if (!paths.length) return;
    if (isReducedMotion()) {
      gsap.set(paths, { strokeDashoffset: 0 });
      return;
    }
    gsap.fromTo(
      paths,
      { strokeDasharray: 1, strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.12, scrollTrigger: { trigger: group, start: 'top 92%', once: true } },
    );
  });
}

/* ───────────── Count-ups ───────────── */
function initCounters() {
  gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (!Number.isFinite(end) || isReducedMotion()) return;
    const start = Number(el.dataset.countFrom ?? 0);
    const state = { v: start };
    el.textContent = String(start);
    gsap.to(state, {
      v: end,
      duration: 2,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: () => {
        el.textContent = String(Math.round(state.v));
      },
    });
  });
}

/* ───────────── Odometers (each digit spins a full turn, then lands) ───────────── */
function initOdometers() {
  if (isReducedMotion()) return;
  gsap.utils.toArray<HTMLElement>('[data-odometer]').forEach((el) => {
    el.querySelectorAll<HTMLElement>('.odo__strip').forEach((strip, i) => {
      const d = Number(getComputedStyle(strip.parentElement as HTMLElement).getPropertyValue('--d')) || 0;
      // y: 0 overrides the CSS resting offset so only yPercent drives the spin.
      gsap.fromTo(
        strip,
        { y: 0, yPercent: 0 },
        { y: 0, yPercent: -(10 + d) * 5, duration: 2.1, ease: 'power3.inOut', delay: i * 0.12, scrollTrigger: { trigger: el, start: 'top 92%', once: true } },
      );
    });
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
    gsap.fromTo(el, { '--sweep': '0deg' }, { '--sweep': '360deg', duration: 2.4, ease: 'power2.inOut', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
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
  // Evaluate every trigger now (fires reveals for content already in view), and
  // again after late layout changes (fonts, images) if the page is still loading.
  requestAnimationFrame(() => ScrollTrigger.refresh());
  if (document.readyState !== 'complete') window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

export { gsap, ScrollTrigger };
export const getLenis = () => lenis;
