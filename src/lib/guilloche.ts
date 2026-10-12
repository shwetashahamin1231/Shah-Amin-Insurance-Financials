/**
 * Guilloché pattern maths — the fine engraved line work seen on banknotes and
 * certificates. Pure functions that return SVG path data, used at build time
 * (scripts/build-assets.mjs writes the pattern files) and by components that
 * inline a pattern so it can "draw" itself.
 *
 * All curves are sampled into compact relative-line paths ("M x y l dx dy …")
 * rounded to 0.1px, which keeps file sizes small without visible faceting.
 */

type Point = [number, number];

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : Math.abs(a);
}

/** Encode points as a compact path: absolute move, then relative lines. */
export function encode(points: Point[], close = true): string {
  if (!points.length) return '';
  const r = (n: number) => Math.round(n * 10) / 10;
  let [px, py] = [r(points[0][0]), r(points[0][1])];
  let d = `M${px} ${py}`;
  for (let i = 1; i < points.length; i++) {
    const x = r(points[i][0]);
    const y = r(points[i][1]);
    const dx = r(x - px);
    const dy = r(y - py);
    if (dx === 0 && dy === 0) continue;
    d += `l${dx} ${dy}`.replace(/ -/g, '-');
    px = x;
    py = y;
  }
  return close ? `${d}z` : d;
}

export interface TrochoidOptions {
  /** Fixed circle radius (integer). */
  R: number;
  /** Rolling circle radius (integer). */
  r: number;
  /** Pen distance from the rolling circle's centre. */
  d: number;
  cx?: number;
  cy?: number;
  /** Uniform scale applied after generation. */
  scale?: number;
  /** Rotation in degrees. */
  rotate?: number;
  /** Samples per full loop of the curve. */
  steps?: number;
  /** 'hypo' rolls inside the fixed circle, 'epi' outside. */
  kind?: 'hypo' | 'epi';
}

/** A closed hypotrochoid / epitrochoid (spirograph curve). */
export function trochoid(o: TrochoidOptions): string {
  const { R, r, d, cx = 0, cy = 0, scale = 1, rotate = 0, kind = 'hypo' } = o;
  const loops = r / gcd(R, r); // turns needed to close the curve
  const steps = Math.round((o.steps ?? 720) * loops);
  const rot = (rotate * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * loops;
    let x: number;
    let y: number;
    if (kind === 'hypo') {
      x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
      y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    } else {
      x = (R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t);
      y = (R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t);
    }
    x *= scale;
    y *= scale;
    pts.push([cx + x * cos - y * sin, cy + x * sin + y * cos]);
  }
  return encode(pts);
}

/**
 * A ring whose radius ripples: r(θ) = radius + amp·sin(lobes·θ + phase).
 * Several of these with shifted phases make the classic woven rosette band.
 */
export function rippleRing(cx: number, cy: number, radius: number, amp: number, lobes: number, phase = 0, steps = 900): string {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = radius + amp * Math.sin(lobes * a + phase);
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return encode(pts);
}

/** Woven rosette band: `count` ripple rings with evenly shifted phases. */
export function rosetteBand(cx: number, cy: number, radius: number, amp: number, lobes: number, count: number, steps = 900): string[] {
  // Phases spread across one full ripple so neighbouring rings cross and weave.
  return Array.from({ length: count }, (_, i) => rippleRing(cx, cy, radius, amp, lobes, (i / count) * Math.PI * 2, steps));
}

/**
 * Annular rosette: spirograph loops confined to a ring between `inner` and
 * `outer` radius (hollow centre, so a medallion can sit inside it).
 */
export function annularRosette(cx: number, cy: number, inner: number, outer: number, layers = 4, petals = 18, loops = 7, stepsPerLoop = 160): string[] {
  const R = petals * 5;
  const r = loops * 5;
  const mid = (inner + outer) / 2; // = (R - r) after scaling
  const scale = mid / (R - r);
  const paths: string[] = [];
  for (let i = 0; i < layers; i++) {
    const reach = ((outer - inner) / 2) * (1 - i * 0.12); // later layers sit slightly narrower
    paths.push(trochoid({ R, r, d: reach / scale, cx, cy, scale, rotate: (i * 360) / petals / layers / 2, steps: stepsPerLoop }));
  }
  return paths;
}

/**
 * Full medallion rosette — layered spirograph curves rotated a few degrees
 * apart, like the centre of a banknote.
 */
export function rosette(cx: number, cy: number, size: number, layers = 6, petals = 18, loops = 7, stepsPerLoop = 220): string[] {
  // R : r = petals : loops (coprime) → `petals`-fold symmetry, closing after `loops` turns.
  const R = petals * 5;
  const r = loops * 5;
  const paths: string[] = [];
  for (let i = 0; i < layers; i++) {
    const d = r * (0.86 + i * 0.075); // pen distance: how far each layer's loops reach
    const scale = size / 2 / (R - r + d);
    paths.push(trochoid({ R, r, d, cx, cy, scale, rotate: (i * 360) / petals / layers, steps: stepsPerLoop }));
  }
  return paths;
}

/** Interlaced sine waves for borders and section dividers (open paths). */
export function waveBand(width: number, height: number, waves = 5, cycles = 12, steps = 600): string[] {
  const mid = height / 2;
  return Array.from({ length: waves }, (_, w) => {
    const phase = (w / waves) * Math.PI;
    const pts: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * width;
      const t = (i / steps) * Math.PI * 2 * cycles;
      pts.push([x, mid + (mid * 0.92) * Math.sin(t + phase) * Math.cos(t / (cycles * 0.5) + phase * 0.5)]);
    }
    return encode(pts, false);
  });
}
