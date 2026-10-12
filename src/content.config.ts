/**
 * Content collections — Markdown files you can edit without touching code.
 *   src/content/services/<slug>.md   one page per service (slug must match src/data/services.ts)
 *   src/content/team/<name>.md       advisor bios
 * The fields at the top of each file (between the --- lines) are checked
 * against the shapes below when the site builds.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const services = defineCollection({
  loader: glob({ base: './src/content/services', pattern: '**/*.md' }),
  schema: z.object({
    /** Page title, e.g. "Life Insurance". */
    title: z.string(),
    /** Position in lists (1–8). */
    order: z.number(),
    /** Large intro line under the heading. */
    lead: z.string(),
    /** Search-engine description (150–160 characters). */
    description: z.string(),
    /** "Is this right for you?" checklist. */
    whoItsFor: z.array(z.string()).default([]),
    /** Key options or benefits shown as engraved cards. */
    highlights: z.array(z.object({ title: z.string(), text: z.string() })).default([]),
    /** Service-specific questions (also used on the FAQ page if desired). */
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

const team = defineCollection({
  loader: glob({ base: './src/content/team', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      /** Matches an advisor in src/config/site.ts (phone, email and title come from there). */
      advisor: z.enum(['gautam', 'shweta']),
      order: z.number(),
      /** Optional headshot: drop the photo in src/assets/team/ and write its path, e.g. ../../assets/team/gautam-shah.jpg */
      headshot: image().optional(),
      headshotAlt: z.string().optional(),
      /** Set to false once the biography text below is filled in. */
      bioComingSoon: z.boolean().default(false),
      /** Short pull quote shown beside the bio (optional). */
      quote: z.string().optional(),
      specialties: z.array(z.string()).default([]),
    }),
});

export const collections = { services, team };
