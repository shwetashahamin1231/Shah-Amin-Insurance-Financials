# Shah & Amin Financial Services — website

A fast, static website built with [Astro](https://astro.build). Every page is plain HTML when it reaches the visitor, so it loads quickly and can be hosted for free (GitHub Pages, Netlify or Vercel).

> Design system, rules and file map for developers (and for Claude): see **CLAUDE.md**.

---

## Run it on your computer

```bash
npm install        # first time only
npm run dev        # opens at http://localhost:4321
```

Other commands: `npm run build` (makes the final site in `dist/`), `npm run preview` (view that final site), `npm test` (checks the holiday and booking calendar logic), `npm run check` (checks the code for mistakes).

---

## Where to change things

| To change… | Edit this file |
|---|---|
| Phone numbers, emails, titles, office address, hours, Google review link, license numbers, disclaimers | `src/config/site.ts` |
| Google Sheets (Apps Script) links for bookings and RSVPs | `src/config/forms.ts` (setup guide: `apps-script/SETUP.md`) |
| Events (and posters) | `src/data/events.ts` |
| Gallery photos | put files in `src/assets/gallery/`, list them in `src/data/gallery.ts` |
| Client reviews | `src/data/reviews.ts` (real reviews only) |
| FAQ questions | `src/data/faqs.ts` |
| Medicare yearly figures (premiums, deductibles…) — each with its year; Part A/B 2027 amounts arrive mid-November | `src/data/medicare.ts` |
| Service names, order and one-line summaries | `src/data/services.ts` |
| Full write-up for each service | `src/content/services/<service>.md` |
| Advisor bios and headshots | `src/content/team/*.md` (photos go in `src/assets/team/`) |
| Menu links | `src/data/nav.ts` |

Every one of these files starts with a short "how to edit" note. Change only the text between quotes, save, and the site updates everywhere.

### Add an event
1. Open `src/data/events.ts`, copy an existing event block, and give it a new `slug` (used in the web address, e.g. `holiday-seminar-2026`).
2. Fill in the title, start time (Eastern Time — see the note at the top of the file), venue, summary and description.
3. Poster (optional): put the image in `src/assets/posters/`, import it at the top of the file (copy the `posterOct19` line), and put a high-quality copy for download in `public/posters/`.
4. Set `rsvp: true` to accept RSVPs. When the date passes, the event automatically shows as **Past Event** with RSVPs closed.

### Add Shweta's biography
Open `src/content/team/shweta-shah-amin.md`, paste the biography below the second `---` line, and change `bioComingSoon: true` to `false`.

### Add headshots
Put the photo in `src/assets/team/` (e.g. `gautam-shah.jpg`), then in that advisor's `.md` file remove the `#` at the start of the `headshot:` line.

---

## Publish the site (GitHub Pages)

The site lives at **https://www.shahandamin.com**, published from the GitHub repository `shwetashahamin1231/Shah-Amin-Insurance-Financials`.

- **To publish a change:** in GitHub Desktop, commit it and click **Push origin**. The workflow (`.github/workflows/deploy.yml`) rebuilds the site and it is live about 2 minutes later (progress: the repository's **Actions** tab).
- **GitHub settings:** **Settings → Pages**: Source **GitHub Actions**, Custom domain **www.shahandamin.com**, **Enforce HTTPS** ticked.
- **GoDaddy DNS** for `shahandamin.com`: four **A** records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and a **CNAME** for `www` → `shwetashahamin1231.github.io`. No forwarding.
- **If the domain ever changes:** update `url` in `src/config/site.ts`, the sitemap line in `public/robots.txt`, the Custom domain on GitHub, and the DNS records.

---

## Brand assets

The logo crop, the gold line art used in the opening animation, the guilloché patterns, textures, icons and the social-sharing image are generated from the originals in `docs/reference/` by:

```bash
npm run assets
```

Only needed if an original image changes.

---

## Still to fill in (placeholders on the site today)

- Shweta Shah Amin's biography, and both advisors' official titles
- Business email address (the site shows `info@shahandamin.com` — set that mailbox up, or change it in `src/config/site.ts`) and office address
- NPN and New Jersey resident license number for each advisor (`licenses` in `src/config/site.ts`)
- **Urgent:** the Medicare disclaimer counts — `MEDICARE_COUNTS` in `src/config/site.ts` (the site shows [#] until filled)
- Google review link and real client reviews
- Apps Script web-app URLs for bookings and RSVPs
- Details for the October 2 and October 17 events
- Gallery photos
- Compliance review of the disclaimers and privacy policy
