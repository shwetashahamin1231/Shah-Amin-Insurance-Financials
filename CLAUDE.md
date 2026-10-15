# Shah & Amin Financial Services — website

Flagship site for a family-owned insurance & financial services practice (founded 2000 by Gautam Shah; with Shweta Shah Amin). Feels like a **private bank / luxury estate brand**: deep logo green, metallic gold, engraved textures, calm-but-rich motion, and a peacock mascot. Many visitors are 60+ (Medicare, retirement): legibility, big targets and plain English matter as much as polish.

## Stack & commands
- **Astro 7** static site (Vite 8, Rust compiler — invalid HTML nesting fails the build), strict TypeScript, vanilla CSS. No UI kits, no Tailwind.
- **GSAP 3.15** (ScrollTrigger, SplitText) + **Lenis** smooth scroll. Native cross-document **View Transitions** (`src/styles/transitions.css`) — no `<ClientRouter/>`.
- Fonts via Astro Fonts API (`astro.config.ts` → `fonts`), self-hosted with metric fallbacks.
- `npm run dev` (port 4321) · `npm run build` · `npm run preview` (4322) · `npm run check` · `npm test` (Vitest) · `npm run assets` (regenerates brand assets from `docs/reference/`).
- `.claude/launch.json` has `dev` and `preview` configs for the browser pane.
- Hosting: GitHub Pages via Actions (`.github/workflows/deploy.yml`) from `shwetashahamin1231/Shah-Amin-Insurance-Financials`; live at **https://www.shahandamin.com** (GoDaddy DNS). The client pushes with GitHub Desktop.

## Where things live (single sources of truth)
| What | File |
|---|---|
| Phones, each advisor's email (no shared email, no office address — meetings are phone/video/in person at the client's choice), titles, hours, holidays rule, licensed states, review link, licenses, disclaimers | `src/config/site.ts` |
| Apps Script URLs + booking rules | `src/config/forms.ts` |
| Services list (names, order, icons, summaries) | `src/data/services.ts` · long copy in `src/content/services/<slug>.md` |
| Advisor bios | `src/content/team/*.md` (Shweta: `bioComingSoon: true` until filled) |
| Events + posters | `src/data/events.ts` (status/past logic: `src/lib/events.ts`) |
| Gallery | `src/data/gallery.ts` + images in `src/assets/gallery/` (resolved by `src/lib/gallery.ts`; an event's photos also show on its event page) |
| Reviews (real only) | `src/data/reviews.ts` |
| FAQs | `src/data/faqs.ts` |
| Medicare yearly figures | `src/data/medicare.ts` |
| Navigation | `src/data/nav.ts` |
| Design tokens | `src/styles/tokens.css` |
| Internal links | always `url('/path/')` from `src/lib/url.ts` (base-path safe) |
| Booking / RSVP forms | `src/components/forms/*`, engine in `src/scripts/forms/*`, date logic in `src/lib/{time,holidays,slots,hours,ics,validation}.ts` (tests in `tests/`) |
| Peacock mascot | `src/components/Peacock.astro` + `src/scripts/peacock/*` (test page `/dev/peacock/`) |
| Apps Script (Google Sheets) | `apps-script/bookings`, `apps-script/rsvps`, setup guide `apps-script/SETUP.md` |
| QA tooling | `node scripts/qa/run-qa.mjs shots|perf`, `node scripts/qa/lighthouse.mjs` (against `npm run preview`) |

## Design system
### Colour (measured from the logo — ★ = exact logo colour)
| Token | Hex | Use |
|---|---|---|
| green-950 / 900 | #061206 / #0E240F | deepest bands, footer, intro curtain |
| ★ green-800 | #1A3719 | **dominant background** |
| green-700 / 600 / 500 | #20401E / #345431 / #50714B | raised cards / decorative hairlines / highlight |
| gold-800 | #623E11 | "bronze": gold-toned **text on light** surfaces (7.3:1) |
| gold-700 | #8D6127 | large text (≥24px) on light only |
| ★ gold-600 | #AF8243 | ornaments; display text on green **≥24px only** (3.8:1) |
| gold-500 / 400 | #C49D64 / #DDB579 | gold text on green (5.2:1 / 6.8:1); gold button fill |
| gold-300 / 200 | #EFCB90 / #F6E2B8 | foil highlight, **focus ring on dark** / sheen |
| ivory-50 / 100 / muted | #FBF7EF / #F6EEDD / #CFC6B0 | light cards / body text on green (11.3:1) / secondary on green (7.7:1) |
| ★ paper-200 / 300 | #EDE1CB / #E2D3B6 | light sections (linen texture) |
| ink-muted | #465244 | secondary text on paper (6.4:1) |
| garnet / blush | #8E2A1F / #F2A493 | errors on light / on green |

- Foil: `--foil` (decoration, light surfaces), `--foil-on-dark` (text on green — darkest stop #AF8243), `--foil-on-light` (bronze foil for large text on paper). Never put gold-600 or foil text under 24px.
- **Surfaces**: wrap sections in `.surface-paper`, `.surface-ivory`, `.surface-deep` (green is the body default). Components must use the semantic vars (`--text`, `--text-muted`, `--heading`, `--accent`, `--accent-large`, `--rule`, `--rule-strong`, `--focus`, `--error`, `--bg-raised`, `--field-bg`, `--field-border`) so they adapt automatically.

### Type
- Display/headings: **Cormorant Garamond** 500/600 (+ 500 italic for `<em>` accent words, rendered in `--accent-large`). Never below 22px.
- Body/UI: **Jost** 400–600. Body 17–19px (`--fs-body`), never under 16px. Labels: `.eyebrow` (14px, uppercase, 0.18em).
- Scale tokens: `--fs-display` 48→112, `--fs-h1` 44→84, `--fs-h2` 36→60, `--fs-h3` 28→38, `--fs-h4` 24, `--fs-lead` 20→24.
- Line-height: display 1.02, headings 1.1, body 1.65; measure ≤ 68ch (`.prose`, `.measure`). Numbers that animate: `.num` (tabular).
- Links inside running text are **always underlined** (`.prose a`, `.text-link`).

### Space, layout, shape
- 4px base: `--space-3xs`(4) `2xs`(8) `xs`(12) `s`(16) `m`(24) `l`(32) `xl`(48) `2xl`(64) `3xl`(96) `4xl`(128) `5xl`(160); sections `--section-pad` 80→160.
- `.container` (1280 max, gutters 20→64), `.container--narrow`, `.section`, `.stack`, `.cluster`, `.grid-12`, `.auto-grid`.
- Editorial asymmetry: 7/5 and 5/7 splits, hanging Roman numerals, pull quotes. Avoid centring everything.
- Corners square (0) on panels/cards; 2px on inputs/buttons; round only for icon buttons. Gold hairlines (`--rule`), double-rule certificate frames.
- Shadows: `--shadow-s/m/l/poster` (warm green-black). Card hover: lift `translateY(calc(-4px * var(--motion)))` + deeper shadow.
- Header height: use `var(--header-total)` to offset page heroes (already done in `PageHero`).
- Tap targets ≥ 44px; no text under 14px (phone audit: every page at iPhone + Pixel size). Visible focus everywhere (`:focus-visible` uses `--focus`).

### Texture (always faint)
- Fixed film grain `.grain` (in layout). Linen on `.surface-paper/.surface-ivory`. `.guilloche-field` for engraved backgrounds, `.wave-band` divider, `<Ornament />` (leaf divider), rosettes via `data-rosette` + mask (see `PageHero`). Pattern files: `src/assets/patterns/` (generated by `npm run assets`).

### Motion rules
- Animate **only** transform, opacity, clip-path, SVG strokes, CSS vars. Entrances ease out (`--ease-silk` = GSAP `expo.out`), exits ≈70% of entrance. Durations: press 160ms · hover 240ms · UI 400ms · reveal 900ms · draws 1.2–1.6s.
- Declarative attributes handled by `src/scripts/motion/index.ts`: `data-reveal` (`="fade"` for no movement), `data-split` (headings, line reveal on scroll), `data-hero-split` (page-hero h1), `data-draw` inside `svg[data-draw-group]` (needs `pathLength="1"`), `data-count="26"`, `data-parallax="0.15"` (decorative only), `data-rosette`, `data-magnetic`, `data-cursor="view"`.
- Initial hidden states use **opacity 0.01** (not 0) so content still counts as painted; CSS failsafe reveals after 2.6s if JS fails (`src/styles/motion.css`). Never hide above-the-fold text with `opacity:0`.
- Only split **headings** (never paragraphs or text containing links) — SplitText uses `tag:'span'`, after fonts are ready.
- Reduced motion = OS setting **or** footer switch → `html.reduce-motion`, `--motion: 0`. Every effect must have a calm fallback (simple fade or final state). Listen for `sa:motion-change` if you run your own animations.
- Animation code runs via `whenActivated()` (`src/scripts/lib/env.ts`) — never during prerender.
- Site events: `sa:scroll-lock` / `sa:scroll-unlock` (dialogs), `sa:motion-change`, `sa:peacock-visibility`, `sa:peacock` (detail `{ action: 'celebrate' | 'wave' }`).
- `view-transition-name`s in use: `site-header`, `peacock`, `grain`, `call-fab` — each must appear once per page.

### Components to reuse
`BaseLayout` (`title`, `description`, `image`, `schema`, `noindex`, `intro`) · `PageHero` · `Button` (`variant` gold/outline/ghost, `size`, `icon`, `magnetic`) · `Icon` (Phosphor Light registry in `src/lib/icons.ts`) · `Ornament` · `Logo`. Dialogs: `<dialog>` + `data-dialog-open="id"` / `data-dialog-close` (`src/scripts/dialogs.ts`); add `data-backdrop-close` for sheets/modals; `data-lenis-prevent` on scrollable dialogs.

## Content rules
- Original, plain-English copy. Never copy competitor wording (bpinsure.org was a topic reference only).
- **No invented reviews, quotes, statistics, client counts or credentials.** Only facts the client provided. Years in business: `yearsInBusiness()`.
- Compliance-friendly: no guarantees or superlatives ("best", "cheapest", "guaranteed income" without context). Medicare TPMO disclaimer + licenses come from `COMPLIANCE` in `site.ts`. Medicare figures live in `src/data/medicare.ts`, labelled by year with sources.
- **CMS (Medicare marketing) rules — keep these:**
  - TPMO disclaimer = exact CY 2027 wording from 42 CFR 422.2267(e)(41) (no SHIP reference); counts come from `MEDICARE_COUNTS`. Never reword it. It shows in the footer (every page), under the Medicare 101 hero, on the booking page and on Medicare service pages.
  - Every Medicare amount carries its own `year`; only official CMS numbers, never projections. `AWAITING` shows the "not yet announced" note.
  - No insurance-company (carrier) names, logos or branded photos anywhere unless the carrier has approved them.
  - Events: no meals for prospective enrollees at marketing events (422.2263(b)(3)); don't invite "guests" to events where plans are presented; educational events must not present specific plans.
  - Medicare appointments: Scope of Appointment before discussing plans; no cross-selling non-health products (annuities, life) in the same appointment; phone/video MA/PDP conversations are recorded.
- Phone numbers (confirmed): Gautam Shah (973) 722-9191 · Shweta Shah Amin (732) 543-9835.

## Banned patterns
Centred-everything heroes · purple/blue gradients · glassmorphism/frosted cards · emoji icons · Inter/Roboto · rounded pill cards · stock-photo clichés · neon glows · `opacity:0` on above-the-fold text.

## Forms (Google Sheets via Apps Script)
Follow the client's CJCP FBLA pattern exactly: `fetch(URL, { method: 'POST', body: new URLSearchParams(new FormData(form)) })`, read JSON `{ ok, error }`. Scripts live in `apps-script/` (bookings, rsvps). URLs in `src/config/forms.ts`.

## QA checklist (run after every major section)
Screenshots at 1440 (pane default), 768×1024 and 390×844 · console clean · keyboard pass · reduced motion via footer switch · CLS < 0.02 · frames < 17ms · Lighthouse ≥ 90 on all four categories (production build).
