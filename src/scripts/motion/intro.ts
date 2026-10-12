/**
 * Home-page signature intro — ≈2.8s, first page of a visit only, skippable.
 *
 *   0.15–1.4s  the logo draws itself in gold line work (rings → monogram →
 *              wordmark → tagline → leaf), exactly over the hero medallion
 *   1.35–1.8s  the curtain fades: the real logo is revealed beneath the lines
 *   1.6–2.3s   the lines melt away while a foil shimmer crosses the medallion
 *   1.9–2.9s   the rosette engraves itself around the seal, light sweeps the green
 *   2.0–3.0s   the headline rises word by word; lead, buttons and header follow
 *
 * Any key, click, wheel or touch (or the "Skip intro" button) fast-forwards.
 */
import { gsap } from 'gsap';
import type Lenis from 'lenis';
import { afterFontsAndPaint } from '../lib/env';

interface IntroDeps {
  lenis: Lenis | null;
  playHeroSplit: (el: HTMLElement, delay?: number) => gsap.core.Tween | null;
  markRevealed: (els: Element[]) => void;
}

const root = document.documentElement;

function releasePage() {
  root.classList.add('intro-done');
  root.classList.remove('intro-running');
  document.querySelectorAll<HTMLElement>('[data-intro-inert]').forEach((el) => (el.inert = false));
}

export async function playIntro({ lenis, playHeroSplit, markRevealed }: IntroDeps): Promise<void> {
  const intro = document.querySelector<HTMLElement>('[data-intro]');
  const hero = document.querySelector<HTMLElement>('[data-intro-hero]');
  const title = hero?.querySelector<HTMLElement>('[data-hero-split]') ?? null;
  const reveals = hero ? Array.from(hero.querySelectorAll<HTMLElement>('[data-reveal]')) : [];

  // The safety timeout already lifted the curtain (slow network) — just reveal the hero normally.
  if (!intro || !hero || root.classList.contains('intro-done')) {
    releasePage();
    intro?.remove();
    if (title) playHeroSplit(title, 0.05);
    gsap.to(reveals, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, onComplete: () => markRevealed(reveals) });
    hero?.querySelectorAll<HTMLElement>('[data-rosette]').forEach((el) => gsap.fromTo(el, { '--sweep': '0deg' }, { '--sweep': '360deg', duration: 2, ease: 'power2.inOut' }));
    return;
  }

  root.classList.add('intro-running');
  lenis?.stop();

  const curtain = intro.querySelector<HTMLElement>('[data-intro-curtain]');
  const lineart = intro.querySelector<SVGSVGElement>('[data-intro-lineart]');
  const skipBtn = intro.querySelector<HTMLButtonElement>('[data-intro-skip]');
  const medallion = hero.querySelector<HTMLElement>('[data-hero-medallion]');
  const shine = hero.querySelector<HTMLElement>('.hero__shine');
  const rosette = hero.querySelector<HTMLElement>('[data-rosette]');
  const sweep = hero.querySelector<HTMLElement>('.hero__sweep');
  const header = document.querySelector<HTMLElement>('[data-header]');

  // Place the line art exactly over the real medallion (and keep it there on resize).
  const place = () => {
    if (!medallion || !lineart) return;
    const r = medallion.getBoundingClientRect();
    lineart.style.setProperty('--lineart-top', `${r.top}px`);
    lineart.style.setProperty('--lineart-left', `${r.left}px`);
    lineart.style.setProperty('--lineart-size', `${r.width}px`);
    lineart.style.setProperty('--lineart-translate', '0 0');
  };
  place();
  window.addEventListener('resize', place);

  // Split the headline into words while the curtain still hides it (fonts must be ready).
  await afterFontsAndPaint();
  place();
  let titleTween: gsap.core.Tween | null = null;
  if (title) {
    titleTween = playHeroSplit(title, 0);
    titleTween?.pause(0);
  }
  gsap.set(reveals, { opacity: 0.01, y: (_i, el: HTMLElement) => (el.dataset.reveal === 'fade' ? 0 : 22) });
  if (header) gsap.set(header, { opacity: 0, y: -18 });
  if (shine) gsap.set(shine, { xPercent: -70 });
  // The skip button fades in via CSS; hand it to GSAP so it can fade out again.
  if (skipBtn) {
    const current = getComputedStyle(skipBtn).opacity;
    skipBtn.style.animation = 'none';
    gsap.fromTo(skipBtn, { opacity: Number(current) }, { opacity: 1, duration: 0.4 });
  }

  const paths = (name: string) => lineart?.querySelectorAll<SVGPathElement>(`[data-group="${name}"] path`) ?? [];

  const skipEvents: (keyof WindowEventMap)[] = ['keydown', 'wheel', 'touchstart', 'pointerdown'];
  let tl: gsap.core.Timeline;
  const skip = () => {
    if (tl && tl.progress() < 1) tl.timeScale(6);
    titleTween?.timeScale(4);
  };
  const finish = () => {
    releasePage();
    window.removeEventListener('resize', place);
    skipEvents.forEach((ev) => window.removeEventListener(ev, skip));
    lenis?.start();
    window.setTimeout(() => intro.remove(), 50);
  };

  tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, onComplete: finish });
  tl.to(paths('rings'), { strokeDashoffset: 0, duration: 1.0, stagger: 0.05 }, 0.15)
    .to(paths('monogram'), { strokeDashoffset: 0, duration: 1.0, stagger: 0.012 }, 0.32)
    .to(paths('wordmark'), { strokeDashoffset: 0, duration: 0.75, stagger: 0.008 }, 0.55)
    .to(paths('tagline'), { strokeDashoffset: 0, duration: 0.6, stagger: 0.008 }, 0.72)
    .to(paths('leaf'), { strokeDashoffset: 0, duration: 0.6, stagger: 0.04 }, 0.85);
  // Reveal the real logo beneath the gold lines, then let the lines melt away.
  if (curtain) tl.to(curtain, { opacity: 0, duration: 0.55, ease: 'power2.out' }, 1.35);
  if (lineart) tl.to(lineart, { opacity: 0, duration: 0.7, ease: 'power1.out' }, 1.65);
  if (skipBtn) tl.to(skipBtn, { opacity: 0, duration: 0.3 }, 1.4);
  if (shine) tl.to(shine, { xPercent: 70, duration: 1.1, ease: 'power2.inOut' }, 1.55);
  if (rosette) tl.fromTo(rosette, { '--sweep': '0deg' }, { '--sweep': '360deg', duration: 1.6, ease: 'power2.inOut' }, 1.85);
  if (sweep) tl.fromTo(sweep, { xPercent: -45 }, { xPercent: 0, duration: 2.2, ease: 'power2.out', clearProps: 'transform' }, 1.4);
  if (titleTween) tl.add(() => void titleTween?.play(0), 2.0);
  tl.to(reveals, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.09, onComplete: () => markRevealed(reveals) }, 2.3);
  if (header) tl.to(header, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', clearProps: 'opacity,transform' }, 2.4);
  tl.to({}, { duration: 0.01 }, 3.05); // hold until the headline settles

  skipEvents.forEach((ev) => window.addEventListener(ev, skip, { once: true, passive: true }));
  skipBtn?.addEventListener('click', skip);
}
