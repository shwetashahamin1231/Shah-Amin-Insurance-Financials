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
| Medicare yearly figures (premiums, deductibles…) | `src/data/medicare.ts` |
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

1. Create a GitHub repository and push this folder to it.
2. In the repository: **Settings → Pages → Source: GitHub Actions**. The included workflow (`.github/workflows/deploy.yml`) builds and publishes the site on every push to `main`.
3. Custom domain: create `public/CNAME` containing your domain (e.g. `www.shahaminfinancial.com`), set the same address as `url` in `src/config/site.ts`, update the sitemap line in `public/robots.txt`, and point the domain's DNS to GitHub Pages.

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
- Business email address and office address
- NPN and resident license numbers for each advisor (licensed states are already listed in `src/config/site.ts`)
- The Medicare disclaimer counts (organizations / plans)
- Google review link and real client reviews
- Apps Script web-app URLs for bookings and RSVPs
- Details for the October 2 and October 17 events
- Gallery photos and headshots
- Final domain name
- Compliance review of the disclaimers and privacy policy
