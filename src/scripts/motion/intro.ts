/**
 * Home-page signature intro (first page of a visit only). Placeholder that
 * simply lifts the curtain; the full choreography is built in Stage 1.
 */
import type Lenis from 'lenis';
import type { gsap } from 'gsap';

interface IntroDeps {
  lenis: Lenis | null;
  playHeroSplit: (el: HTMLElement, delay?: number) => gsap.core.Tween | null;
}

export function playIntro({ playHeroSplit }: IntroDeps): void {
  const root = document.documentElement;
  root.classList.add('intro-running', 'intro-done');
  document.querySelectorAll<HTMLElement>('[data-intro-inert]').forEach((el) => (el.inert = false));
  document.querySelectorAll<HTMLElement>('[data-intro-hero] [data-hero-split]').forEach((el) => playHeroSplit(el, 0.1));
}
