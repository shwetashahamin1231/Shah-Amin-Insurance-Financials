/**
 * ════════════════════════════════════════════════════════════════════
 *  EVENTS — every event on the site comes from this one list.
 * ════════════════════════════════════════════════════════════════════
 *  To add an event: copy one block below, give it a new `slug`, and
 *  fill in the details. Events automatically show as "Past Event" with
 *  RSVPs closed once their date has passed — no need to remove them.
 *
 *  Dates & times: write them in Eastern Time with the offset —
 *    -04:00 for dates between mid-March and early November (daylight time)
 *    -05:00 for winter dates (standard time)
 *  e.g. '2026-10-19T10:00:00-04:00' = Oct 19, 2026 at 10:00 AM Eastern.
 *
 *  Posters: put the image in src/assets/posters/, import it at the top
 *  (like `posterOct19` below), and put a high-quality copy for download in
 *  public/posters/.
 * ════════════════════════════════════════════════════════════════════
 */
import type { ImageMetadata } from 'astro';
import posterOct19 from '../assets/posters/2026-10-19-member-appreciation-breakfast.webp';

export interface EventVenue {
  name: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface EventPoster {
  image: ImageMetadata;
  /** Describe everything the poster says, for visitors using screen readers. */
  alt: string;
  /** Path of the downloadable file inside /public. */
  download: string;
}

export interface EventItem {
  slug: string;
  title: string;
  /** Start date & time in Eastern Time with offset (see note above). */
  start: string;
  /** End time (optional). Without it, the event counts as "past" after 11:59 PM that day. */
  end?: string;
  /** True while the time is not confirmed — the card shows "Time to be announced". */
  timeTBA?: boolean;
  venue?: EventVenue;
  /** One or two sentences for event cards. */
  summary: string;
  /** Paragraphs for the event's own page. */
  description: string[];
  /** Optional highlight line, e.g. a special presentation. */
  highlight?: string;
  poster?: EventPoster;
  /** Accept RSVPs for this event. */
  rsvp: boolean;
  /** RSVPs close at this moment (defaults to the start time). */
  rsvpCloses?: string;
  /** Maximum party size per RSVP. */
  maxGuests?: number;
  /** Marks events whose details are still placeholders (shows a gentle note). */
  detailsComingSoon?: boolean;
}

export const EVENTS: EventItem[] = [
  {
    slug: 'october-2-2026',
    title: 'Client Event — October 2', // TODO: real title
    start: '2026-10-02T10:00:00-04:00', // TODO: real time
    timeTBA: true,
    venue: { name: 'Location to be announced' }, // TODO
    summary: 'Thank you to everyone who joined us. Photos from this event will appear in our gallery.', // TODO
    description: [
      // TODO: replace with the real event description.
      'Thank you to everyone who spent the morning with us. Details and photos from this event will be added soon.',
    ],
    rsvp: false,
    detailsComingSoon: true,
  },
  {
    slug: 'october-17-2026',
    title: 'Upcoming Event — October 17', // TODO: real title
    start: '2026-10-17T11:00:00-04:00', // TODO: real time
    timeTBA: true,
    venue: { name: 'Location to be announced' }, // TODO
    summary: 'We are finalizing the details for this Saturday gathering. Reserve your spot now and we will send you the specifics.', // TODO
    description: [
      // TODO: replace with the real event description.
      'We are putting the finishing touches on this event. Reserve your place now and we will be in touch with the time, location and agenda.',
      'Questions in the meantime? Call Gautam or Shweta — we are always happy to help.',
    ],
    rsvp: true,
    maxGuests: 6,
    detailsComingSoon: true,
  },
  {
    slug: 'member-appreciation-breakfast-2026',
    title: 'Member Appreciation Breakfast',
    start: '2026-10-19T10:00:00-04:00',
    venue: {
      name: 'Guru Palace',
      street: '2215 US-1',
      city: 'North Brunswick Township',
      state: 'NJ',
      zip: '08902',
    },
    highlight: 'Special presentation: Clover Plans for 2027',
    summary: 'A warm breakfast to thank our members, with a special presentation on Clover plans for 2027. You and a guest are warmly invited.',
    description: [
      'You are invited to our Member Appreciation Breakfast — a relaxed morning of good food, good company and a heartfelt thank-you to the members who have trusted us over the years.',
      'Over breakfast and chai, we will share a special presentation on Clover plans for 2027, so you know what is changing for the new plan year before you make any decisions. Bring your questions — we will be glad to answer them.',
      'Please RSVP below, or call us, to let us know you are coming.',
    ],
    poster: {
      image: posterOct19,
      alt: 'Event poster: “You’re invited! Member Appreciation Breakfast.” A smiling older couple enjoys breakfast and chai at a festive table decorated with bunting and flowers, with a heart badge that reads “We care about you!” Date: Monday, October 19th, 2026. Time: 10:00 AM. Location: Guru Palace, 2215 US-1, North Brunswick Township, NJ 08902. Special presentation: Clover Plans for 2027. Contact Shweta Shah Amin at 732-543-9835 or Gautam Shah at 973-722-9191.',
      download: '/posters/shah-amin-member-appreciation-breakfast-2026-10-19.jpg',
    },
    rsvp: true,
    maxGuests: 6,
  },
];

export function getEvent(slug: string): EventItem | undefined {
  return EVENTS.find((e) => e.slug === slug);
}
