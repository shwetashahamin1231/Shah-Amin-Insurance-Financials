/**
 * Peacock rig — finds the animatable parts of the server-rendered SVG
 * (src/components/Peacock.astro), sets their pivots and builds each move as a
 * GSAP timeline. Transforms, opacity, a gradient offset and one CSS variable
 * (--shine) only; every move finishes exactly on the rest pose.
 */
import { gsap } from 'gsap';

export interface Rig {
  svg: SVGSVGElement;
  bird: SVGGElement;
  shadow: SVGElement;
  tail: SVGGElement;
  feathers: SVGGElement[];
  /** Rest angle of each feather in degrees (0 = straight up, negative = viewer's left). */
  angles: number[];
  torso: SVGGElement;
  head: SVGGElement;
  crest: SVGGElement;
  plumes: SVGGElement[];
  face: SVGGElement;
  irises: SVGGElement[];
  /** Largest iris offset per eye [x, y] in SVG units (from data-max). */
  irisMax: Array<[number, number]>;
  lids: SVGElement[];
  /** Resting (open) lid offsets, read from the markup. */
  lidRest: number[];
  beakLower: SVGElement;
  wing: SVGGElement;
  /** Shared shimmer gradient swept across the feathers during a fan. */
  shine: SVGLinearGradientElement | null;
  sparkles: SVGPathElement[];
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const STAR = 'M0-5C.6-1.2 1.2-.6 5 0 1.2.6.6 1.2 0 5-.6 1.2-1.2.6-5 0-1.2-.6-.6-1.2 0-5Z';
/** Sparkle positions around the bird [x, y, size]. */
const SPARKS: Array<[number, number, number]> = [
  [22, 46, 1.1],
  [100, 20, 0.8],
  [160, 38, 1.2],
  [190, 98, 0.9],
  [8, 100, 0.85],
  [138, 12, 0.6],
];

function one<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`[peacock] missing ${selector}`);
  return el;
}

/** Feather angle from its <use transform="rotate(a) scale(s)">. */
function featherAngle(feather: SVGGElement): number {
  const use = feather.firstElementChild;
  if (!(use instanceof SVGGraphicsElement)) return 0;
  const m = use.transform.baseVal.consolidate()?.matrix;
  return m ? (Math.atan2(m.b, m.a) * 180) / Math.PI : 0;
}

export function createRig(svg: SVGSVGElement): Rig {
  const all = <T extends Element>(selector: string) => Array.from(svg.querySelectorAll<T>(selector));
  const feathers = all<SVGGElement>('.pk-feather');
  const irises = all<SVGGElement>('.pk-iris');
  const lids = all<SVGElement>('.pk-lid');

  const rig: Rig = {
    svg,
    bird: one(svg, '.pk-bird'),
    shadow: one(svg, '.pk-shadow'),
    tail: one(svg, '.pk-tail'),
    feathers,
    angles: feathers.map(featherAngle),
    torso: one(svg, '.pk-torso'),
    head: one(svg, '.pk-head'),
    crest: one(svg, '.pk-crest'),
    plumes: all<SVGGElement>('.pk-plume'),
    face: one(svg, '.pk-face'),
    irises,
    irisMax: irises.map((el) => {
      const [x = 0, y = 0] = (el.getAttribute('data-max') ?? '').split(' ').map(Number);
      return [x, y];
    }),
    lids,
    lidRest: lids.map((el) => Number(gsap.getProperty(el, 'y')) || -16),
    beakLower: one(svg, '.pk-beak-l'),
    wing: one(svg, '.pk-wing'),
    shine: svg.querySelector<SVGLinearGradientElement>('defs > [id$="_s"]'),
    sparkles: [],
  };

  // Pivots come from the artwork (data-origin, SVG user units). Feathers sit in a
  // group already translated to the tail base, so their own pivot is 0,0.
  for (const el of [rig.bird, rig.shadow, rig.tail, rig.torso, rig.head, rig.crest, rig.wing, rig.beakLower]) {
    gsap.set(el, { svgOrigin: el.dataset.origin ?? '0 0' });
  }
  gsap.set(rig.plumes, { svgOrigin: rig.crest.dataset.origin ?? '61 39' });
  gsap.set(rig.feathers, { svgOrigin: '0 0', '--shine': 0 });
  return rig;
}

/** Return the body parts to their rest pose (gaze parts — irises, face, head — belong to gaze.ts). */
export function restPose(r: Rig): void {
  gsap.killTweensOf([r.bird, r.shadow, r.tail, r.torso, r.crest, r.wing, r.beakLower, ...r.feathers, ...r.plumes, ...r.lids, ...r.sparkles]);
  gsap.set([r.bird, r.torso], { x: 0, y: 0, scale: 1, rotation: 0 });
  gsap.set([r.tail, r.crest, r.wing, r.beakLower, ...r.plumes], { rotation: 0, scale: 1 });
  gsap.set(r.shadow, { scale: 1, opacity: 1 });
  gsap.set(r.feathers, { rotation: 0, scale: 1, '--shine': 0 });
  gsap.set(r.lids, { y: (i: number) => r.lidRest[i] ?? -16 });
  if (r.sparkles.length) gsap.set(r.sparkles, { scale: 0, opacity: 0 });
  if (r.shine) r.shine.setAttribute('gradientTransform', 'translate(0 1)');
}

/** How far each feather swings outward when fanned (degrees). */
const spread = (angle: number) => angle * 0.17;

/** Every move uses overwrite:'auto' so a newer move cleanly takes over the same properties. */
const timeline = () => gsap.timeline({ defaults: { overwrite: 'auto' } });

/* ───────────── Moves ───────────── */

export function blink(r: Rig, double = false): gsap.core.Timeline {
  const close = { y: 0, duration: 0.07, ease: 'power2.in' };
  const open = { y: (i: number) => r.lidRest[i] ?? -16, duration: 0.12, ease: 'power2.out' };
  const tl = timeline().to(r.lids, close).to(r.lids, open);
  if (double) tl.to(r.lids, close, '+=0.07').to(r.lids, open);
  return tl;
}

/** The signature move: feathers fan out with a shimmer sweeping across, the crest bobs, then all settles (~1.6s). */
export function fan(r: Rig): gsap.core.Timeline {
  const angle = (i: number) => r.angles[i] ?? 0;
  const fromCentre = (i: number) => (Math.abs(angle(i)) / 90) * 0.1;
  const leftToRight = (i: number) => ((angle(i) + 90) / 180) * 0.42;
  const tl = timeline();
  tl.to(r.feathers, { rotation: (i: number) => spread(angle(i)), scale: 1.06, duration: 0.5, ease: 'back.out(1.6)', stagger: fromCentre }, 0)
    .to(r.tail, { scale: 1.04, duration: 0.5, ease: 'power3.out' }, 0)
    .to(r.crest, { scale: 1.08, duration: 0.18, ease: 'sine.out' }, 0.04)
    .to(r.crest, { scale: 1, duration: 0.3, ease: 'sine.inOut' }, 0.22)
    .to(r.plumes, { rotation: (i: number) => (i - 2) * 6, duration: 0.3, ease: 'back.out(3)', stagger: 0.03 }, 0.06)
    .to(r.plumes, { rotation: 0, duration: 0.85, ease: 'elastic.out(1, 0.35)', stagger: 0.03 }, 0.42)
    .to(r.feathers, { '--shine': 1, duration: 0.24, ease: 'sine.out', stagger: leftToRight }, 0.16)
    .to(r.feathers, { '--shine': 0, duration: 0.36, ease: 'sine.in', stagger: leftToRight }, 0.56)
    .to(r.feathers, { rotation: 0, scale: 1, duration: 0.58, ease: 'power3.inOut', stagger: fromCentre }, 0.92)
    .to(r.tail, { scale: 1, duration: 0.58, ease: 'power3.inOut' }, 0.92);
  if (r.shine) {
    tl.fromTo(r.shine, { attr: { gradientTransform: 'translate(0 1)' } }, { attr: { gradientTransform: 'translate(0 -1)' }, duration: 0.95, ease: 'sine.inOut' }, 0.16);
  }
  return tl;
}

/** A little hop with squash and stretch; the ground shadow shrinks while airborne. */
export function hop(r: Rig, height = 18): gsap.core.Timeline {
  return timeline()
    .to(r.bird, { scaleX: 1.05, scaleY: 0.93, duration: 0.09, ease: 'power2.out' })
    .to(r.bird, { y: -height, scaleX: 0.97, scaleY: 1.05, duration: 0.24, ease: 'power2.out' })
    .to(r.shadow, { scale: 0.72, opacity: 0.5, duration: 0.24, ease: 'power2.out' }, '<')
    .to(r.bird, { y: 0, scaleX: 1, scaleY: 1, duration: 0.2, ease: 'power2.in' })
    .to(r.shadow, { scale: 1, opacity: 1, duration: 0.2, ease: 'power2.in' }, '<')
    .to(r.bird, { scaleX: 1.04, scaleY: 0.95, duration: 0.07, ease: 'power1.out' })
    .to(r.bird, { scaleX: 1, scaleY: 1, duration: 0.4, ease: 'elastic.out(1, 0.45)' });
}

export function flap(r: Rig, beats = 2): gsap.core.Timeline {
  const tl = timeline();
  for (let n = 0; n < beats; n++) {
    tl.to(r.wing, { rotation: -28, scaleY: 1.03, duration: 0.13, ease: 'sine.out' }).to(r.wing, { rotation: -6, scaleY: 1, duration: 0.13, ease: 'sine.in' });
  }
  return tl.to(r.wing, { rotation: 0, duration: 0.3, ease: 'power2.out' });
}

/** A friendly wing wave (with a head tilt and a happy blink). */
export function wave(r: Rig): gsap.core.Timeline {
  const tl = timeline().to(r.wing, { rotation: -52, duration: 0.38, ease: 'back.out(1.6)' });
  for (let n = 0; n < 3; n++) {
    tl.to(r.wing, { rotation: -30, duration: 0.16, ease: 'sine.inOut' }).to(r.wing, { rotation: -54, duration: 0.16, ease: 'sine.inOut' });
  }
  tl.to(r.wing, { rotation: 0, duration: 0.5, ease: 'power3.inOut' });
  tl.add(blink(r), 0.15);
  return tl;
}

/** Opens the beak briefly (a happy "squawk"). */
export function chirp(r: Rig): gsap.core.Timeline {
  return timeline()
    .to(r.beakLower, { rotation: -14, duration: 0.12, ease: 'power2.out' })
    .to(r.beakLower, { rotation: 0, duration: 0.32, ease: 'back.out(2)' }, '+=0.2');
}

function ensureSparkles(r: Rig): SVGPathElement[] {
  if (r.sparkles.length) return r.sparkles;
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'pk-sparkles');
  group.setAttribute('fill', '#f6e2b8');
  r.sparkles = SPARKS.map(() => {
    const star = document.createElementNS(SVG_NS, 'path');
    star.setAttribute('d', STAR);
    return group.appendChild(star);
  });
  r.svg.insertBefore(group, r.svg.querySelector('.pk-hit'));
  gsap.set(r.sparkles, { x: (i: number) => SPARKS[i]?.[0] ?? 0, y: (i: number) => SPARKS[i]?.[1] ?? 0, scale: 0, opacity: 0, transformOrigin: '50% 50%' });
  return r.sparkles;
}

export function sparkle(r: Rig): gsap.core.Timeline {
  const stars = ensureSparkles(r);
  return timeline()
    .fromTo(
      stars,
      { scale: 0, rotation: -60, opacity: 1 },
      { scale: (i: number) => SPARKS[i]?.[2] ?? 1, rotation: 30, duration: 0.42, ease: 'back.out(3)', stagger: 0.07 },
    )
    .to(stars, { scale: 0, rotation: 90, opacity: 0, duration: 0.34, ease: 'power2.in', stagger: 0.07 }, 0.36);
}

/** Reduced motion: show the fanned pose as a simple crossfade (a static fanned copy of the tail). */
export function fanCrossfade(r: Rig): gsap.core.Timeline {
  let fanned = r.svg.querySelector<SVGGElement>('.pk-tail-fanned');
  if (!fanned) {
    fanned = r.tail.cloneNode(true) as SVGGElement;
    fanned.setAttribute('class', 'pk-tail-fanned');
    fanned.removeAttribute('transform');
    fanned.querySelectorAll<SVGGElement>('.pk-feather').forEach((f, i) => {
      f.setAttribute('class', 'pk-feather-fanned');
      f.style.removeProperty('--shine');
      f.setAttribute('transform', `rotate(${spread(r.angles[i] ?? 0).toFixed(2)}) scale(1.06)`);
    });
    fanned.setAttribute('opacity', '0');
    r.tail.after(fanned);
  }
  return gsap
    .timeline()
    .to(fanned, { opacity: 1, duration: 0.3, ease: 'power1.out' })
    .to(r.tail, { opacity: 0, duration: 0.3, ease: 'power1.out' }, 0)
    .to(fanned, { opacity: 0, duration: 0.35, ease: 'power1.inOut' }, 1.5)
    .to(r.tail, { opacity: 1, duration: 0.35, ease: 'power1.inOut' }, 1.5);
}

/** Remove the reduced-motion copy (when motion is switched back on). */
export function dropCrossfade(r: Rig): void {
  r.svg.querySelector('.pk-tail-fanned')?.remove();
  gsap.set(r.tail, { opacity: 1 });
}
