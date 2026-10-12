/**
 * Desktop cursor accent: a small gold ring that trails the real cursor
 * (which stays visible) and grows over links and buttons. Over elements
 * with [data-cursor="view"] it shows a "View" label.
 */
import { gsap } from 'gsap';

export function initCursor(): { destroy: () => void } {
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');
  ring.innerHTML = '<span class="cursor-ring__label">View</span>';
  document.body.appendChild(ring);

  const xTo = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
  const yTo = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });
  let visible = false;

  const interactive = 'a, button, [role="button"], input, select, textarea, label, summary, [data-cursor]';

  const move = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if (!visible) {
      gsap.set(ring, { x: e.clientX, y: e.clientY });
      ring.classList.add('is-visible');
      visible = true;
    }
    xTo(e.clientX);
    yTo(e.clientY);
    const target = (e.target as Element).closest?.(interactive);
    ring.classList.toggle('is-hover', !!target);
    ring.classList.toggle('is-view', !!target && target.getAttribute('data-cursor') === 'view');
  };
  const hide = () => {
    ring.classList.remove('is-visible');
    visible = false;
  };
  const down = () => ring.classList.add('is-down');
  const up = () => ring.classList.remove('is-down');

  window.addEventListener('pointermove', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);

  return {
    destroy() {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', hide);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      ring.remove();
    },
  };
}
