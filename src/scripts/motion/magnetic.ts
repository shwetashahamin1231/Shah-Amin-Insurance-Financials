/**
 * Magnetic buttons: elements with [data-magnetic] drift toward the cursor
 * (max ~10px) and spring back when it leaves. Desktop + full motion only.
 */
import { gsap } from 'gsap';

export function initMagnetic(): { destroy: () => void } {
  const cleanups: (() => void)[] = [];

  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    const strength = 0.28;
    const max = 10;

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      xTo(gsap.utils.clamp(-max, max, dx));
      yTo(gsap.utils.clamp(-max * 0.6, max * 0.6, dy));
    };
    const leave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' });
    };

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    cleanups.push(() => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      gsap.set(el, { clearProps: 'x,y,transform' });
    });
  });

  return { destroy: () => cleanups.forEach((fn) => fn()) };
}
