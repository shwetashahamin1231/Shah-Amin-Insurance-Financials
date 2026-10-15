/**
 * ════════════════════════════════════════════════════════════════════
 *  SITE CONFIG — the one place for your business details
 * ════════════════════════════════════════════════════════════════════
 *  Every phone number, email, address, hour and disclaimer on the site
 *  is read from this file. Change a value here and it updates everywhere
 *  (header, footer, contact page, booking page, structured data…).
 *
 *  • Only edit the text between the quotes.
 *  • Anything marked  TODO  is a placeholder waiting for real details.
 *  • This file must stay plain data (no imports) — the build config
 *    reads it too.
 * ════════════════════════════════════════════════════════════════════
 */

export type AdvisorId = 'gautam' | 'shweta';

export interface Advisor {
  id: AdvisorId;
  name: string;
  /** Short first name used on buttons, e.g. "Call Gautam". */
  firstName: string;
  title: string;
  /** Phone number exactly as visitors should see it. */
  phone: string;
  /** Same number in international format for tap-to-call links (no spaces). */
  phoneHref: string;
  email: string;
  /** Initials shown on the portrait placeholder until a headshot is added. */
  initials: string;
}

export const SITE = {
  name: 'Shah & Amin Financial Services',
  shortName: 'Shah & Amin',
  legalName: 'Shah & Amin Financial Services',

  /** Your live web address, no trailing slash. Must match Settings → Pages → Custom domain on GitHub. */
  url: 'https://www.shahandamin.com',

  foundedYear: 2000,
  founder: 'Gautam Shah',
  locale: 'en-US',

  /** Used for search results and link previews when a page has no description of its own. */
  description:
    'Family-owned insurance and retirement planning since 2000. Life insurance, annuities, IRAs, 401(k) rollovers, health insurance, Medicare plans, long-term care, disability income and travel insurance.',

  /** Main business email (also used on the contact page and in the footer). TODO */
  email: 'info@shahandamin.com',
  emailIsPlaceholder: true,

  /** Office address. TODO: fill in. Leave `street` empty to hide the address everywhere. */
  address: {
    street: '',
    city: '',
    state: 'NJ',
    zip: '',
    country: 'US',
  },

  /** States where we are licensed (shown in the footer, contact and disclaimers, and to search engines). */
  licensedStates: [
    { name: 'New Jersey', code: 'NJ' },
    { name: 'New York', code: 'NY' },
    { name: 'Pennsylvania', code: 'PA' },
    { name: 'Maryland', code: 'MD' },
    { name: 'Maine', code: 'ME' },
    { name: 'North Carolina', code: 'NC' },
    { name: 'Georgia', code: 'GA' },
    { name: 'Tennessee', code: 'TN' },
    { name: 'Florida', code: 'FL' },
    { name: 'Texas', code: 'TX' },
  ],
  /** Home base (the office is in this state). */
  homeState: 'New Jersey',

  /** Google review link for the "Leave us a review" buttons. TODO: paste the link from your Google Business Profile. */
  googleReviewUrl: '',

  /** Social profiles (optional). Add full URLs, e.g. { label: 'Facebook', url: 'https://facebook.com/…' } */
  social: [] as { label: string; url: string }[],
} as const;

/** Both advisors. Phone numbers confirmed from the October 19, 2026 event poster. */
export const ADVISORS: Record<AdvisorId, Advisor> = {
  gautam: {
    id: 'gautam',
    name: 'Gautam Shah',
    firstName: 'Gautam',
    title: 'Founder & Principal Advisor', // TODO: confirm title
    phone: '(973) 722-9191',
    phoneHref: '+19737229191',
    email: 'info@shahandamin.com', // TODO: Gautam's own email, if different
    initials: 'GS',
  },
  shweta: {
    id: 'shweta',
    name: 'Shweta Shah Amin',
    firstName: 'Shweta',
    title: 'Partner & Advisor', // TODO: confirm title
    phone: '(732) 543-9835',
    phoneHref: '+17325439835',
    email: 'info@shahandamin.com', // TODO: Shweta's own email, if different
    initials: 'SA',
  },
};

export const ADVISOR_LIST: Advisor[] = [ADVISORS.gautam, ADVISORS.shweta];

/**
 * Opening hours. All times are Eastern Time (New York).
 * The booking calendar and the "Open now" indicator both read these.
 */
export const HOURS = {
  timeZone: 'America/New_York',
  timeZoneLabel: 'ET',
  /** 24-hour clock. */
  open: '11:00',
  close: '19:00',
  /** 0 = Sunday … 6 = Saturday. We're open every day. */
  openDays: [0, 1, 2, 3, 4, 5, 6],
  /** Wording used across the site. */
  summary: 'Open 7 days a week, 11:00 AM – 7:00 PM Eastern',
  short: 'Daily 11 AM – 7 PM ET',
  holidayNote: 'Closed on U.S. federal holidays',
  /**
   * Federal holidays: close on the holiday itself, and also on the weekday the
   * government observes it when the holiday falls on a weekend (e.g. Friday
   * July 3, 2026 for Saturday July 4). Set closeOnObservedDay to false to stay
   * open on those observed weekdays.
   */
  closeOnHoliday: true,
  closeOnObservedDay: true,
} as const;

/**
 * Medicare plan counts for the required disclaimer below. TODO — needed before
 * the site is promoted: how many insurance companies ("organizations") you
 * represent for Medicare Advantage / Part D, and how many plans ("products")
 * they offer in your area. Replace each null with a number, e.g. organizations: 6.
 */
export const MEDICARE_COUNTS: { organizations: number | null; products: number | null } = {
  organizations: null,
  products: null,
};
const count = (n: number | null) => (n === null ? '[#]' : String(n));

/** "Licensed insurance producer · NPN 1234567 · NJ resident license #890" — parts appear once filled in. */
function producerLine(npn: string, njLicense: string): string {
  return ['Licensed insurance producer', npn && `NPN ${npn}`, njLicense && `New Jersey resident license #${njLicense}`].filter(Boolean).join(' · ');
}

/**
 * Licenses & disclaimers shown in the footer and on the Disclaimers page.
 * TODO: fill in license numbers and MEDICARE_COUNTS above, then have your
 * compliance contact / FMO approve the final wording.
 */
export const COMPLIANCE = {
  /** TODO: put each advisor's NPN and New Jersey resident license number between the quotes. */
  licenses: [
    { name: 'Gautam Shah', detail: producerLine(/* NPN */ '', /* NJ license */ '') },
    { name: 'Shweta Shah Amin', detail: producerLine(/* NPN */ '', /* NJ license */ '') },
  ],
  /**
   * CMS-required Third-Party Marketing Organization (TPMO) disclaimer — standardized
   * wording from 42 CFR 422.2267(e)(41) as revised for contract year 2027 (applies to
   * marketing from October 1, 2026). Do not reword it; the counts come from MEDICARE_COUNTS.
   */
  medicareDisclaimer: `We do not offer every plan available in your area. Currently we represent ${count(MEDICARE_COUNTS.organizations)} organizations which offer ${count(MEDICARE_COUNTS.products)} products in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.`,
  governmentDisclaimer:
    'Not connected with or endorsed by the United States government or the federal Medicare program.',
  generalDisclaimer:
    'Insurance products are offered through licensed agents. Product availability, benefits and pricing vary by state and carrier. Nothing on this website is tax, legal or investment advice; please consult a qualified professional about your situation.',
  /** Leave empty unless you offer securities through a broker-dealer. TODO: confirm. */
  securitiesDisclaimer: '',
} as const;

/** "New Jersey, New York, … and Texas" */
export function licensedStatesText(): string {
  const names = SITE.licensedStates.map((s) => s.name);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] ?? '';
}

/** Years in business, calculated from the founding year so it never goes stale. */
export function yearsInBusiness(now: Date = new Date()): number {
  return now.getFullYear() - SITE.foundedYear;
}

/** "123 Main St, North Brunswick, NJ 08902" — or '' while the address is a placeholder. */
export function formattedAddress(): string {
  const a = SITE.address;
  if (!a.street) return '';
  return `${a.street}, ${a.city}, ${a.state} ${a.zip}`.trim();
}

/** Google Maps links built from the address (no API key needed). */
export function mapLinks() {
  const q = encodeURIComponent(formattedAddress() || `${SITE.name}, ${SITE.homeState}`);
  return {
    view: `https://www.google.com/maps/search/?api=1&query=${q}`,
    embed: `https://www.google.com/maps?q=${q}&output=embed`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
  };
}
