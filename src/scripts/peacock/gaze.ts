/**
 * Where the peacock looks.
 *  • Desktop (fine pointer): the eyes follow the cursor with a slight head lean
 *    and face shift; when the cursor rests for a few seconds it glances around.
 *  • Touch / phones: the eyes follow the scroll — down while scrolling down,
 *    up while scrolling up, back to centre when the page settles.
 * The last gaze is kept in sessionStorage; an inline script in Peacock.astro
 * re-applies it before the next page paints, so the eyes never snap.
 */
import { gsap } from 'gsap';
import type { Rig } from './rig';

export const GAZE_KEY = 'sa-peacock-gaze';

/** Midpoint between the eyes, as fractions of the 200×250 artwork. */
const EYE_FX = 50 / 200;
const EYE_FY = 61 / 250;
/** Distance (px) at which the gaze is half way to its limit. */
const SOFTNESS = 140;

interface SavedGaze {
  x: number;
  y: number;
  w: number;
  h: number;
  gx: number;
  gy: number;
}

export interface Gaze {
  /** Look in a direction: -1…1 per axis (+x = viewer's right, +y = down). */
  look(x: number, y: number, instant?: boolean): void;
  /** Extra head tilt in degrees, added to the lean that follows the gaze. */
  tilt(deg: number): void;
  /** Follow the cursor (desktop) or not. */
  track(on: boolean): void;
  /** Touch mode: react to a scroll step. */
  scrolled(dy: number): void;
  /** Touch mode: settle after scrolling (progress 0 = top … 1 = bottom of the page). */
  settle(progress: number): void;
  /** Idle life: look somewhere at random. */
  glance(): void;
  /** Milliseconds since the cursor last moved. */
  idleFor(): number;
  /** Re-measure where the eyes are on screen (after resize). */
  measure(): void;
}

const clamp = gsap.utils.clamp(-1, 1);
const round = (v: number) => Math.round(v * 1000) / 1000;

export function createGaze(r: Rig, root: HTMLElement): Gaze {
  const ease = 'power3.out';
  const irisX = r.irises.map((el) => gsap.quickTo(el, 'x', { duration: 0.45, ease }));
  const irisY = r.irises.map((el) => gsap.quickTo(el, 'y', { duration: 0.45, ease }));
  const faceX = gsap.quickTo(r.face, 'x', { duration: 0.7, ease });
  const faceY = gsap.quickTo(r.face, 'y', { duration: 0.7, ease });
  const headR = gsap.quickTo(r.head, 'rotation', { duration: 0.6, ease });

  let gx = 0;
  let gy = 0;
  let tiltDeg = 0;
  let tracking = false;
  let px = Number.NaN;
  let py = Number.NaN;
  let lastMove = 0;
  let frame = 0;
  const eye = { x: 0, y: 0 };

  // The face shifts less toward the beak side (it would leave the head outline).
  const faceFor = (x: number, y: number) => [x < 0 ? x * 1.1 : x * 2.2, y * 1.2] as const;

  function apply(instant = false) {
    // A quickTo setter given a start value jumps there instead of easing.
    const to = (set: gsap.QuickToFunc, v: number) => (instant ? set(v, v) : set(v));
    const [fx, fy] = faceFor(gx, gy);
    r.irises.forEach((_, i) => {
      const [mx, my] = r.irisMax[i] ?? [0, 0];
      const sx = irisX[i];
      const sy = irisY[i];
      if (sx) to(sx, gx * mx);
      if (sy) to(sy, gy * my);
    });
    to(faceX, fx);
    to(faceY, fy);
    to(headR, gx * 3 + tiltDeg);
  }

  function look(x: number, y: number, instant = false) {
    gx = clamp(x);
    gy = clamp(y);
    apply(instant);
  }

  function measure() {
    const b = root.getBoundingClientRect(); // the fixed container never moves (its inner lift does)
    eye.x = b.left + b.width * EYE_FX;
    eye.y = b.top + b.height * EYE_FY;
  }

  function follow() {
    frame = 0;
    if (!tracking || !Number.isFinite(px)) return;
    const dx = px - eye.x;
    const dy = py - eye.y;
    const d = Math.hypot(dx, dy) || 1;
    const k = d / (d + SOFTNESS);
    look((dx / d) * k, (dy / d) * k * 0.9);
  }

  function onMove(e: PointerEvent) {
    if (e.pointerType === 'touch') return;
    px = e.clientX;
    py = e.clientY;
    lastMove = performance.now();
    if (!frame) frame = requestAnimationFrame(follow);
  }

  function save() {
    if (!Number.isFinite(px)) return;
    try {
      const data: SavedGaze = { x: Math.round(px), y: Math.round(py), w: innerWidth, h: innerHeight, gx: round(gx), gy: round(gy) };
      sessionStorage.setItem(GAZE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable */
    }
  }

  function restore() {
    try {
      const s = JSON.parse(sessionStorage.getItem(GAZE_KEY) ?? 'null') as SavedGaze | null;
      if (!s || !Number.isFinite(s.gx) || !Number.isFinite(s.gy)) return;
      px = s.x * (innerWidth / (s.w || innerWidth));
      py = s.y * (innerHeight / (s.h || innerHeight));
      // The irises were already placed before paint; the face and head ease in.
      gx = clamp(s.gx);
      gy = clamp(s.gy);
      apply();
    } catch {
      /* ignore malformed data */
    }
  }

  function track(on: boolean) {
    if (on === tracking) return;
    tracking = on;
    if (on) {
      measure();
      window.addEventListener('pointermove', onMove, { passive: true });
      if (!Number.isFinite(px)) restore();
      else follow();
    } else {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  // Remember the gaze when leaving (link clicks start with pointerdown; pagehide covers the rest).
  window.addEventListener('pagehide', save);
  window.addEventListener('pointerdown', save, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
  });

  return {
    look,
    tilt(deg) {
      tiltDeg = deg;
      headR(gx * 3 + tiltDeg);
    },
    track,
    scrolled(dy) {
      if (Math.abs(dy) < 0.5) return;
      look(gx * 0.5, dy > 0 ? 0.85 : -0.8);
    },
    settle(progress) {
      look(0, (clamp(progress * 2 - 1) * 0.25));
    },
    glance() {
      // Mostly toward the page (left/up of the corner), sometimes back at the visitor.
      look(gsap.utils.random(-0.95, 0.5), gsap.utils.random(-0.8, 0.45));
    },
    idleFor: () => performance.now() - lastMove,
    measure,
  };
}
