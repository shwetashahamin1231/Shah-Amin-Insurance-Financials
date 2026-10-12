/**
 * Local QA runner — full-page screenshots and performance probes in headless
 * Google Chrome (uses your installed Chrome through playwright-core).
 *
 *   npm run preview                     # in another terminal (port 4322)
 *   node scripts/qa/run-qa.mjs shots    # screenshots → .qa/shots/<width>/<page>.png
 *   node scripts/qa/run-qa.mjs perf     # frame times + layout shift → .qa/perf.json
 *   options: --base http://localhost:4322  --pages /,/about/
 *
 * Screenshots are taken with the site's Motion switch OFF so every section is
 * in its final state. Performance runs use full motion (and play the intro).
 */
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const mode = argv.find((a) => !a.startsWith('--')) ?? 'shots';
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const BASE = opt('base', 'http://localhost:4322');
const PAGES = opt(
  'pages',
  '/,/about/,/services/,/services/life-insurance/,/medicare-101/,/faq/,/events/,/events/member-appreciation-breakfast-2026/,/gallery/,/reviews/,/book/,/contact/,/privacy/,/disclaimers/',
).split(',');
const VIEWPORTS = [
  { name: '1440', viewport: { width: 1440, height: 900 } },
  { name: '768', viewport: { width: 768, height: 1024 }, hasTouch: true },
  { name: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
];
const slug = (p) => (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '__'));
const OUT = path.resolve('.qa');

const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function scrollThrough(page) {
  // Walk the page so lazy images load and one-shot effects fire.
  await page.evaluate(async () => {
    const step = Math.round(innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  });
}

async function shots() {
  for (const vp of VIEWPORTS) {
    const dir = path.join(OUT, 'shots', vp.name);
    await mkdir(dir, { recursive: true });
    const context = await browser.newContext({ ...vp, reducedMotion: 'no-preference' });
    await context.addInitScript(() => {
      try {
        localStorage.setItem('sa-motion', 'off');
        sessionStorage.setItem('sa-visited', '1');
      } catch {}
    });
    for (const p of PAGES) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      const res = await page.goto(BASE + p, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await scrollThrough(page);
      await page.waitForTimeout(400);
      const file = path.join(dir, `${slug(p)}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      console.log(`${vp.name.padEnd(5)} ${String(res?.status()).padEnd(4)} ${p.padEnd(46)} overflow:${overflow}px ${errors.length ? `ERRORS: ${errors.join(' | ')}` : ''}`);
      await page.close();
    }
    await context.close();
  }
}

async function perf() {
  const results = [];
  for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
    for (const p of PAGES) {
      const context = await browser.newContext({ ...vp });
      await context.addInitScript(() => {
        const qa = (window.__qa = { shifts: [], frames: [], loaf: [] });
        new PerformanceObserver((l) =>
          l.getEntries().forEach((e) => {
            if (!e.hadRecentInput) qa.shifts.push({ v: e.value, t: Math.round(e.startTime), src: (e.sources || []).map((s) => (s.node ? `${s.node.nodeName}.${String(s.node.className || '').slice(0, 40)}` : '?')) });
          }),
        ).observe({ type: 'layout-shift', buffered: true });
        try {
          new PerformanceObserver((l) => l.getEntries().forEach((e) => qa.loaf.push({ d: Math.round(e.duration), t: Math.round(e.startTime) }))).observe({ type: 'long-animation-frame', buffered: true });
        } catch {}
        let last = 0;
        const tick = (t) => {
          if (last) qa.frames.push(t - last);
          last = t;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      const page = await context.newPage();
      await page.goto(BASE + p, { waitUntil: 'load' });
      await page.waitForTimeout(p === '/' ? 4200 : 2200); // let the intro / hero animations run
      // Real wheel scrolling (drives smooth scroll + scroll-triggered effects).
      const box = vp.viewport;
      await page.mouse.move(box.width / 2, box.height / 2);
      for (let i = 0; i < 70; i++) {
        await page.mouse.wheel(0, 140);
        await page.waitForTimeout(45);
      }
      await page.waitForTimeout(1500);
      const qa = await page.evaluate(() => window.__qa);
      const frames = qa.frames.slice(5).sort((a, b) => a - b);
      const pct = (n) => frames[Math.min(frames.length - 1, Math.floor(frames.length * n))] ?? 0;
      const cls = qa.shifts.reduce((s, e) => s + e.v, 0);
      const row = {
        page: p,
        viewport: vp.name,
        cls: Number(cls.toFixed(4)),
        frames: frames.length,
        jankPct: Number(((frames.filter((f) => f > 20).length / Math.max(1, frames.length)) * 100).toFixed(1)),
        p95: Number(pct(0.95).toFixed(1)),
        max: Number((frames.at(-1) ?? 0).toFixed(1)),
        longFrames: qa.loaf.filter((l) => l.d > 50).length,
        shifts: qa.shifts.filter((s) => s.v > 0.001).slice(0, 5),
      };
      results.push(row);
      console.log(`${row.viewport.padEnd(5)} ${p.padEnd(46)} CLS ${String(row.cls).padEnd(7)} jank ${String(row.jankPct).padEnd(5)}% p95 ${String(row.p95).padEnd(5)}ms max ${String(row.max).padEnd(6)}ms LoAF>50 ${row.longFrames}`);
      await context.close();
    }
  }
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'perf.json'), JSON.stringify(results, null, 2));
}

try {
  if (mode === 'perf') await perf();
  else await shots();
} finally {
  await browser.close();
}
