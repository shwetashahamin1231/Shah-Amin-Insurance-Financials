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
 *  (e.g. `import posterNov5 from '../assets/posters/nov-5.webp';`), add
 *  `poster: { image: posterNov5, alt: '…', download: '/posters/nov-5.jpg' }`
 *  to the event, and put a high-quality copy for download in public/posters/.
 *  Medicare events: no insurance company names or logos on the site or
 *  posters unless that company has approved them.
 * ════════════════════════════════════════════════════════════════════
 */
import type { ImageMetadata } from 'astro';

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
    summary: 'Thank you to everyone who joined us. Photos from the morning are in our gallery.', // TODO
    description: [
      // TODO: replace with the real event description.
      'Thank you to everyone who spent the morning with us. A selection of photos from the day is below and in our gallery.',
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
    summary: 'A thank-you morning for our current members.',
    description: [
      'A relaxed morning and a heartfelt thank-you to the members who have trusted us over the years.',
      'This event is for current members. Please RSVP below, or call us, to let us know you are coming.',
    ],
    rsvp: true,
    maxGuests: 2,
  },
];

export function getEvent(slug: string): EventItem | undefined {
  return EVENTS.find((e) => e.slug === slug);
}
