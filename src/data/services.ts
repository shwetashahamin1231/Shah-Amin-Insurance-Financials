/**
 * ════════════════════════════════════════════════════════════════════
 *  SERVICES — the master list (names, order, icons, one-line summaries).
 * ════════════════════════════════════════════════════════════════════
 *  Used by the menu, the home page, the footer, the booking "topic"
 *  dropdown and the service pages. The full write-up for each service
 *  lives in src/content/services/<slug>.md (same slug as below).
 *  Order here = order on the site (shown as Roman numerals I–VIII).
 */
import type { IconName } from '../lib/icons';

export interface Service {
  slug: string;
  name: string;
  /** Shorter label for tight spaces (menus). */
  shortName?: string;
  /** One sentence, plain English. */
  summary: string;
  icon: IconName;
}

export const SERVICES: Service[] = [
  {
    slug: 'life-insurance',
    name: 'Life Insurance',
    summary: 'Term and permanent coverage that keeps your family secure — and your plans on track — if the unexpected happens.',
    icon: 'shield-check',
  },
  {
    slug: 'annuities',
    name: 'Annuities',
    summary: 'Turn savings into dependable income, with options designed for growth, protection or lifetime payments.',
    icon: 'hourglass',
  },
  {
    slug: 'iras',
    name: 'IRAs',
    summary: 'Traditional and Roth IRAs that let your retirement savings grow with valuable tax advantages.',
    icon: 'piggy-bank',
  },
  {
    slug: 'retirement-planning',
    name: '401(k) Rollovers & Retirement Planning',
    shortName: '401(k) Rollovers & Retirement',
    summary: 'Changing jobs or retiring? We help you move old workplace plans carefully and map out retirement income.',
    icon: 'arrows-clockwise',
  },
  {
    slug: 'health-insurance',
    name: 'Health Insurance',
    summary: 'Individual and family health plans explained clearly, so you can choose coverage that fits your doctors and budget.',
    icon: 'heartbeat',
  },
  {
    slug: 'medicare-plans',
    name: 'Medicare Plans',
    summary: 'Medicare Advantage, Medicare Supplement and Part D drug plans — compared side by side, in plain English.',
    icon: 'stethoscope',
  },
  {
    slug: 'long-term-care',
    name: 'Long-Term Care',
    summary: 'Plan ahead for care at home or in a facility, protecting your savings and your independence.',
    icon: 'hand-heart',
  },
  {
    slug: 'disability-income-insurance',
    name: 'Disability Income Insurance',
    shortName: 'Disability Income',
    summary: 'Replace part of your paycheck if illness or injury keeps you from working.',
    icon: 'umbrella',
  },
];

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function getService(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
