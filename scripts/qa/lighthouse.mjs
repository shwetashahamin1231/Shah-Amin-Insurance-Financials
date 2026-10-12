/**
 * Lighthouse runner — scores every page on mobile and desktop using your
 * installed Chrome. Run against the production preview:
 *
 *   npm run build && npm run preview          # port 4322
 *   node scripts/qa/lighthouse.mjs [--base http://localhost:4322] [--pages /,/about/] [--only mobile|desktop]
 *
 * Reports land in .qa/lighthouse/ (one JSON per page/form factor) plus a
 * summary table in the terminal and .qa/lighthouse/summary.json.
 */
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const BASE = opt('base', 'http://localhost:4322');
const PAGES = opt(
  'pages',
  '/,/about/,/services/,/services/life-insurance/,/medicare-101/,/faq/,/events/,/events/member-appreciation-breakfast-2026/,/gallery/,/reviews/,/book/,/contact/',
).split(',');
const FORMS = opt('only', 'mobile,desktop').split(',');
const OUT = path.resolve('.qa/lighthouse');
await mkdir(OUT, { recursive: true });

const slug = (p) => (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '__'));
const summary = [];

for (const form of FORMS) {
  for (const p of PAGES) {
    const file = path.join(OUT, `${slug(p)}.${form}.json`);
    const args = [
      '-y',
      'lighthouse@13.5.0',
      BASE + p,
      '--output=json',
      `--output-path=${file}`,
      '--quiet',
      '--chrome-flags=--headless=new',
      '--only-categories=performance,accessibility,best-practices,seo',
    ];
    if (form === 'desktop') args.push('--preset=desktop');
    try {
      await run('npx', args, { maxBuffer: 1024 * 1024 * 64 });
    } catch (e) {
      console.error(`✗ ${form} ${p}: ${e.message.split('\n')[0]}`);
      continue;
    }
    const report = JSON.parse(await readFile(file, 'utf8'));
    const score = (k) => Math.round((report.categories[k]?.score ?? 0) * 100);
    const metric = (id) => report.audits[id]?.displayValue ?? '';
    const failing = Object.values(report.categories)
      .flatMap((c) => c.auditRefs.filter((r) => r.weight > 0).map((r) => report.audits[r.id]))
      .filter((a) => a && a.score !== null && a.score < 0.9)
      .map((a) => `${a.id}${a.displayValue ? ` (${a.displayValue})` : ''}`);
    const row = {
      form,
      page: p,
      performance: score('performance'),
      accessibility: score('accessibility'),
      bestPractices: score('best-practices'),
      seo: score('seo'),
      lcp: metric('largest-contentful-paint'),
      cls: metric('cumulative-layout-shift'),
      tbt: metric('total-blocking-time'),
      fcp: metric('first-contentful-paint'),
      si: metric('speed-index'),
      failing: [...new Set(failing)],
    };
    summary.push(row);
    console.log(
      `${form.padEnd(8)} ${p.padEnd(46)} P ${String(row.performance).padStart(3)}  A ${String(row.accessibility).padStart(3)}  BP ${String(row.bestPractices).padStart(3)}  SEO ${String(row.seo).padStart(3)}  | LCP ${row.lcp}  CLS ${row.cls}  TBT ${row.tbt}${row.failing.length ? `\n         ↳ ${row.failing.join(', ')}` : ''}`,
    );
  }
}
await writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
