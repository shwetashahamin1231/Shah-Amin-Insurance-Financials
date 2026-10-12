/**
 * One-off asset builder — run with `npm run assets`.
 *
 * Generates every derived brand asset from the originals in docs/reference/:
 *   1. Logo medallion  — circular crop of the logo with a transparent outside
 *   2. Logo line art   — gold outlines traced from the logo (for the intro "drawing")
 *   3. Textures        — film grain + linen/paper tiles
 *   4. Poster          — web copy for Astro to optimise + a high-quality JPG for download
 *   5. Favicons / app icons / web manifest
 *   6. Social share (Open Graph) image
 *
 * Outputs are committed, so this only needs re-running if an original changes.
 * `potrace` (GPL) is used only here as a dev tool; none of its code ships with the site.
 */
import sharp from 'sharp';
import potrace from 'potrace';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...parts) => path.join(root, ...parts);
const REF = p('docs/reference');

// ── Brand colours (measured from the logo; mirrored in src/styles/tokens.css) ──
const C = {
  green950: '#061206', green900: '#0E240F', green800: '#1A3719', green700: '#20401E',
  gold700: '#8D6127', gold600: '#AF8243', gold400: '#DDB579', gold300: '#EFCB90', gold200: '#F6E2B8',
  paper: '#EDE1CB', ivory: '#F6EEDD',
};

// Medallion geometry in the original 1254×1254 logo (measured: outer gold edge at r≈574).
const LOGO_CENTER = 627;
const LOGO_RADIUS = 576;
const MEDALLION = LOGO_RADIUS * 2; // 1152px square crop
const TRACE_SIZE = 720; // line art is traced at this size (viewBox 0 0 720 720)

async function ensureDirs() {
  for (const d of ['src/assets/brand', 'src/assets/textures', 'src/assets/posters', 'public/posters', 'public/og', 'src/components/brand']) {
    await mkdir(p(d), { recursive: true });
  }
}

/* ───────────────────────── 1. Medallion ───────────────────────── */
async function buildMedallion() {
  const left = LOGO_CENTER - LOGO_RADIUS;
  const circle = Buffer.from(
    `<svg width="${MEDALLION}" height="${MEDALLION}"><circle cx="${LOGO_RADIUS}" cy="${LOGO_RADIUS}" r="${LOGO_RADIUS - 1}" fill="#fff"/></svg>`,
  );
  const cropped = await sharp(path.join(REF, 'logo-original.webp'))
    .extract({ left, top: left, width: MEDALLION, height: MEDALLION })
    .ensureAlpha()
    .composite([{ input: circle, blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(p('src/assets/brand/logo-medallion.png'), cropped);
  return cropped;
}

/* ───────────────────────── 2. Line-art trace ───────────────────────── */
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

/** Black-on-white PNG mask of the pixels matching `test`, lightly blurred to calm the emboss texture. */
async function maskFrom(medallionPng, test, blur = 1.1) {
  const { data, info } = await sharp(medallionPng)
    .resize(TRACE_SIZE, TRACE_SIZE, { kernel: 'lanczos3' })
    .flatten({ background: C.paper })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height);
  for (let i = 0, j = 0; i < data.length; i += info.channels, j++) {
    const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    out[j] = test(h, s, v) ? 0 : 255;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 1 } })
    .blur(blur)
    .threshold(128)
    .png()
    .toBuffer();
}

function trace(pngBuffer, params) {
  return new Promise((resolve, reject) => {
    const t = new potrace.Potrace();
    t.setParameters({ threshold: 128, blackOnWhite: true, ...params });
    t.loadImage(pngBuffer, (err) => {
      if (err) return reject(err);
      const tag = t.getPathTag();
      const d = /d="([^"]+)"/.exec(tag)?.[1] ?? '';
      resolve(d);
    });
  });
}

/** Split a potrace path into its closed sub-paths, with bounding boxes, rounded to 1 decimal. */
function splitSubpaths(d) {
  const parts = d.split(/(?=M)/).map((s) => s.trim()).filter(Boolean);
  return parts.map((part) => {
    const rounded = part.replace(/-?\d+\.\d+/g, (n) => String(Math.round(parseFloat(n) * 10) / 10));
    const nums = (rounded.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
      minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
    }
    return { d: rounded, minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  });
}

async function buildLineArt(medallionPng) {
  const isGreen = (h, s, v) => h >= 80 && h <= 175 && s > 0.25 && v < 0.66;
  const isGold = (h, s, v) => h >= 18 && h <= 62 && s > 0.27 && v > 0.24;
  const params = { turdSize: 18, optTolerance: 0.45, alphaMax: 1.0 };
  const [greenD, goldD] = await Promise.all([
    maskFrom(medallionPng, isGreen).then((m) => trace(m, params)),
    maskFrom(medallionPng, isGold, 0.7).then((m) => trace(m, params)),
  ]);
  // Drop tiny specks left over from the embossed paper texture.
  const mid = TRACE_SIZE / 2;
  const subpaths = [...splitSubpaths(greenD), ...splitSubpaths(goldD)].filter((sp) => {
    if (sp.w <= 6 && sp.h <= 6) return false; // specks
    if (sp.h < 4.5 && sp.w < 26) return false; // thin horizontal glints on the emboss (keeps letter "I"s)
    if (sp.w < 16 && sp.h < 8 && sp.cy < TRACE_SIZE * 0.55 && sp.cx > TRACE_SIZE * 0.5) return false; // glints on the swoosh
    const big = sp.w > TRACE_SIZE * 0.6 || sp.h > TRACE_SIZE * 0.6;
    const dist = Math.hypot(sp.cx - mid, sp.cy - mid);
    if (!big && dist > mid * 0.86) return false; // texture bits caught between the ring lines
    return true;
  });

  // Group by position so the intro can draw them in a deliberate order.
  // (Coordinates are in the 720×720 trace space; the medallion centre is 360,360.)
  const y = (orig) => (orig - (LOGO_CENTER - LOGO_RADIUS)) * (TRACE_SIZE / MEDALLION); // original-logo y → trace y
  const groups = { rings: [], monogram: [], wordmark: [], tagline: [], leaf: [] };
  for (const sp of subpaths) {
    if (sp.w > TRACE_SIZE * 0.6 || sp.h > TRACE_SIZE * 0.6) groups.rings.push(sp);
    else if (sp.cy < y(725)) groups.monogram.push(sp);
    else if (sp.cy < y(855)) groups.wordmark.push(sp);
    else if (sp.cy < y(935)) groups.tagline.push(sp);
    else groups.leaf.push(sp);
  }
  // Within each group draw left → right (rings: largest first).
  groups.rings.sort((a, b) => b.w - a.w);
  for (const k of ['monogram', 'wordmark', 'tagline', 'leaf']) groups[k].sort((a, b) => a.minX - b.minX);

  const module = `// GENERATED by scripts/build-assets.mjs — do not edit by hand.
// Gold outline paths traced from the Shah & Amin logo, grouped in drawing order.
// viewBox: 0 0 ${TRACE_SIZE} ${TRACE_SIZE} (aligned with logo-medallion.png).
export const LINEART_VIEWBOX = '0 0 ${TRACE_SIZE} ${TRACE_SIZE}';
export const LINEART_GROUPS = ${JSON.stringify(
    Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.map((sp) => sp.d)])),
  )} as const;
`;
  await writeFile(p('src/components/brand/logo-lineart.ts'), module);

  // Preview for visual QA: gold strokes on green.
  const strokes = Object.values(groups).flat().map((sp) => `<path d="${sp.d}"/>`).join('');
  await mkdir(p('.qa'), { recursive: true });
  await sharp(Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TRACE_SIZE}" height="${TRACE_SIZE}"><rect width="100%" height="100%" fill="${C.green800}"/><g fill="none" stroke="${C.gold400}" stroke-width="1.1" stroke-linejoin="round">${strokes}</g></svg>`,
  )).png().toFile(p('.qa/lineart-on-green.png'));
  const counts = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length]));
  console.log('  line art sub-paths per group:', counts, `| module ${(module.length / 1024).toFixed(1)} KB`);

  // Monogram-only fills (S & A + swoosh) for the favicon: keep the raw contours so holes survive (even-odd).
  const inMonogram = (sp) => sp.cy < y(725) && sp.w < TRACE_SIZE * 0.6 && Math.hypot(sp.cx - mid, sp.cy - mid) < mid * 0.8;
  return {
    greenMono: splitSubpaths(greenD).filter(inMonogram).map((sp) => sp.d).join(''),
    goldMono: splitSubpaths(goldD).filter((sp) => inMonogram(sp) && sp.w > 10 && sp.h > 10).map((sp) => sp.d).join(''),
  };
}

/* ───────────────────────── 3. Guilloché pattern files ───────────────────────── */
async function buildPatterns() {
  const { annularRosette, rosetteBand, rippleRing, rosette, waveBand } = await import('../src/lib/guilloche.ts');
  const svgDoc = (w, h, body, extra = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${extra}><g fill="none" stroke="currentColor" stroke-width="0.9" vector-effect="non-scaling-stroke">${body}</g></svg>`;
  const paths = (list) => list.map((d) => `<path d="${d}"/>`).join('');
  const dir = p('src/assets/patterns');
  await mkdir(dir, { recursive: true });

  // Hero rosette: hollow centre (logo sits inside), woven braids, sweeping loops.
  const c = 450;
  const hero = [
    ...rosetteBand(c, c, 428, 7, 72, 4, 720),
    rippleRing(c, c, 446, 0, 1, 0, 240),
    rippleRing(c, c, 410, 0, 1, 0, 240),
    ...annularRosette(c, c, 250, 398, 4, 24, 7, 96),
    ...rosetteBand(c, c, 236, 5, 48, 3, 480),
  ];
  // Colour-agnostic files use currentColor; CSS mask-image recolours them anywhere.
  await writeFile(path.join(dir, 'rosette-hero.svg'), svgDoc(900, 900, paths(hero)));

  // Corner / section rosette: full flower, lighter weight.
  await writeFile(path.join(dir, 'rosette-flower.svg'), svgDoc(600, 600, paths([
    ...rosette(300, 300, 560, 4, 18, 7, 80),
    ...rosetteBand(300, 300, 288, 4, 60, 3, 540),
  ])));

  // Seamless horizontal wave band for dividers and certificate borders.
  await writeFile(path.join(dir, 'wave-band.svg'), svgDoc(1200, 60, paths(waveBand(1200, 60, 6, 14, 380)), 'preserveAspectRatio="none"'));

  // Seamless background tile: interlaced ripple rings on a 240px grid (tiles in both directions).
  const tile = [];
  for (const [x, y] of [[0, 0], [240, 0], [0, 240], [240, 240], [120, 120]]) {
    tile.push(...rosetteBand(x, y, 96, 6, 24, 3, 220));
  }
  await writeFile(path.join(dir, 'guilloche-tile.svg'), svgDoc(240, 240, paths(tile)));

  const sizes = [];
  for (const f of ['rosette-hero.svg', 'rosette-flower.svg', 'wave-band.svg', 'guilloche-tile.svg']) {
    const { size } = await import('node:fs').then((fs) => fs.promises.stat(path.join(dir, f)));
    sizes.push(`${f} ${(size / 1024).toFixed(0)}KB`);
  }
  console.log('  patterns:', sizes.join(' · '));
}

/* ───────────────────────── 4. Textures ───────────────────────── */
function seeded(seed) {
  // Small deterministic PRNG so textures are identical on every rebuild.
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

async function buildTextures() {
  // Film grain: per-pixel noise as black/white specks in the alpha channel (tiles seamlessly).
  {
    const N = 192, rnd = seeded(2000), px = Buffer.alloc(N * N * 4);
    for (let i = 0; i < N * N; i++) {
      const v = (rnd() + rnd() + rnd()) / 3 - 0.5; // soft bell curve around 0
      const light = v > 0 ? 255 : 0;
      px.set([light, light, light, Math.min(255, Math.round(Math.abs(v) * 2 * 255))], i * 4);
    }
    await sharp(px, { raw: { width: N, height: N, channels: 4 } }).webp({ quality: 60, alphaQuality: 70 }).toFile(p('src/assets/textures/grain.webp'));
  }
  // Linen / paper: woven threads (periodic rows + columns) and fine fibre noise, baked at low alpha.
  {
    const N = 320, rnd = seeded(1254), px = Buffer.alloc(N * N * 4);
    const smooth = (arr) => arr.map((_, i) => (arr[(i - 1 + N) % N] + 2 * arr[i] + arr[(i + 1) % N]) / 4);
    const rows = smooth(Array.from({ length: N }, () => rnd() * 2 - 1));
    const cols = smooth(Array.from({ length: N }, () => rnd() * 2 - 1));
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const blotch = 0.5 * Math.sin((2 * Math.PI * x) / N * 2 + Math.sin((2 * Math.PI * y) / N * 3)) * Math.cos((2 * Math.PI * y) / N * 2);
        const v = 0.42 * rows[y] + 0.42 * cols[x] + 0.32 * (rnd() * 2 - 1) + 0.22 * blotch;
        const dark = v < 0;
        const a = Math.min(1, Math.abs(v)) * (dark ? 0.075 : 0.11);
        const i = (y * N + x) * 4;
        px.set(dark ? [74, 56, 28, Math.round(a * 255)] : [255, 252, 244, Math.round(a * 255)], i);
      }
    }
    await sharp(px, { raw: { width: N, height: N, channels: 4 } }).webp({ quality: 72, alphaQuality: 80 }).toFile(p('src/assets/textures/paper.webp'));
  }
  console.log('  textures: grain.webp, paper.webp');
}

/* ───────────────────────── 5. Poster ───────────────────────── */
async function buildPoster() {
  await copyFile(path.join(REF, 'poster-2026-10-19-original.webp'), p('src/assets/posters/2026-10-19-member-appreciation-breakfast.webp'));
  await sharp(path.join(REF, 'poster-2026-10-19-original.webp'))
    .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(p('public/posters/shah-amin-member-appreciation-breakfast-2026-10-19.jpg'));
  console.log('  poster: optimised source + download JPG');
}

/* ───────────────────────── 6. Icons + manifest ───────────────────────── */
async function buildIcons(medallionPng, mono) {
  // Vector favicon: the S&A monogram in gold on the brand green, inside a gold ring.
  // Centre the circle on the monogram's bounding box.
  const nums = (mono.greenMono + mono.goldMono).match(/-?\d+(?:\.\d+)?/g).map(Number);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const r = Math.max(maxX - minX, maxY - minY) / 2 * 1.32;
  const vb = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(cx - r).toFixed(1)} ${(cy - r).toFixed(1)} ${(2 * r).toFixed(1)} ${(2 * r).toFixed(1)}">`;
  const favSvg = `${vb}<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r - 2).toFixed(1)}" fill="${C.green800}"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 0.94).toFixed(1)}" fill="none" stroke="${C.gold600}" stroke-width="${(r * 0.035).toFixed(1)}"/><g fill="${C.gold400}" fill-rule="evenodd"><path d="${mono.greenMono}"/><path d="${mono.goldMono}"/></g></svg>`;
  await writeFile(p('public/favicon.svg'), favSvg);
  await sharp(Buffer.from(favSvg)).resize(32, 32).png().toFile(p('public/favicon-32.png'));
  // favicon.ico (browsers request it by default): an ICO wrapper around 32px and 16px PNGs.
  const pngs = await Promise.all([32, 16].map((n) => sharp(Buffer.from(favSvg)).resize(n, n).png().toBuffer()));
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach((png, i) => {
    const size = i === 0 ? 32 : 16;
    const e = 6 + i * 16;
    header.writeUInt8(size, e);
    header.writeUInt8(size, e + 1);
    header.writeUInt8(0, e + 2); // palette
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4); // colour planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(png.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  await writeFile(p('public/favicon.ico'), Buffer.concat([header, ...pngs]));
  await sharp(Buffer.from(favSvg)).resize(512, 512).png().toFile(p('.qa/favicon-preview.png'));

  // App icons: the real medallion on deep green with breathing room.
  const icon = async (size, pad, file) => {
    const inner = Math.round(size * (1 - pad * 2));
    const logo = await sharp(medallionPng).resize(inner, inner).toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: C.green800 } })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(p(`public/${file}`));
  };
  await icon(180, 0.08, 'apple-touch-icon.png');
  await icon(192, 0.1, 'icon-192.png');
  await icon(512, 0.1, 'icon-512.png');
  await writeFile(p('public/site.webmanifest'), JSON.stringify({
    name: 'Shah & Amin Financial Services',
    short_name: 'Shah & Amin',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: C.green800,
    background_color: C.green900,
    display: 'standalone',
  }, null, 2));
  console.log('  icons: favicon.svg/png, apple-touch, 192, 512, manifest');
}

/* ───────────────────────── 7. Open Graph image ───────────────────────── */
async function buildOg(medallionPng) {
  const { annularRosette, rosetteBand, waveBand } = await import('../src/lib/guilloche.ts');
  const W = 1200, H = 630;
  const lines = [
    ...annularRosette(W / 2, H / 2, 268, 420, 3, 24, 7, 90),
    ...rosetteBand(W / 2, H / 2, 252, 5, 60, 3, 700),
  ].map((d) => `<path d="${d}"/>`).join('');
  const waves = waveBand(W - 120, 26, 4, 18, 400).map((d) => `<path d="${d}"/>`).join('');
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="${C.green700}"/><stop offset=".6" stop-color="${C.green800}"/><stop offset="1" stop-color="${C.green900}"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g fill="none" stroke="${C.gold400}" stroke-width="0.9" opacity=".32">${lines}</g>
    <g fill="none" stroke="${C.gold600}" stroke-width="0.8" opacity=".55"><g transform="translate(60,34)">${waves}</g><g transform="translate(60,570)">${waves}</g></g>
    <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="${C.gold600}" stroke-width="1.2" opacity=".8"/>
    <rect x="32" y="32" width="${W - 64}" height="${H - 64}" fill="none" stroke="${C.gold600}" stroke-width="0.6" opacity=".6"/>
  </svg>`;
  const logo = await sharp(medallionPng).resize(470, 470).toBuffer();
  await sharp(Buffer.from(bg))
    .composite([{ input: logo, gravity: 'center' }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(p('public/og/default.jpg'));
  console.log('  og: public/og/default.jpg');
}

/* ───────────────────────── run ───────────────────────── */
const only = process.argv[2];
await ensureDirs();
console.log('• medallion');
const medallion = await buildMedallion();
console.log('• line art');
const mono = await buildLineArt(medallion);
if (!only || only === 'patterns') { console.log('• patterns'); await buildPatterns(); }
if (!only || only === 'textures') { console.log('• textures'); await buildTextures(); }
if (!only || only === 'poster') { console.log('• poster'); await buildPoster(); }
if (!only || only === 'icons') { console.log('• icons'); await buildIcons(medallion, mono); }
if (!only || only === 'og') { console.log('• og'); await buildOg(medallion); }
console.log('done');
