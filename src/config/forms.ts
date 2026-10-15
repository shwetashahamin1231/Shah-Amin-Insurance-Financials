/**
 * ════════════════════════════════════════════════════════════════════
 *  FORMS CONFIG — online booking & event RSVPs
 * ════════════════════════════════════════════════════════════════════
 *  Both forms save straight into Google Sheets through two small
 *  Google Apps Script "web apps" (the code is in the apps-script/ folder).
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  TO CONNECT THE FORMS                                            │
 *  │                                                                  │
 *  │  1. Follow apps-script/SETUP.md (about 10 minutes per sheet).    │
 *  │  2. At the end you get a Web app URL that ends in  /exec         │
 *  │       e.g. https://script.google.com/macros/s/AKfy…xyz/exec      │
 *  │  3. Paste it between the quotes below:                           │
 *  │       bookings → the "Bookings" sheet's URL                      │
 *  │       rsvps    → the "RSVPs" sheet's URL                         │
 *  │  4. Rebuild and publish the site.                                │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  While a URL is empty:
 *   • on your computer (npm run dev) the form pretends to send, so you
 *     can try it out — the data is printed in the browser console;
 *   • on the live site the form politely asks visitors to call instead.
 *
 *  If you ever redeploy a script as a NEW deployment, its URL changes —
 *  paste the new one here. ("Manage deployments → New version" keeps
 *  the same URL; see SETUP.md.)
 * ════════════════════════════════════════════════════════════════════
 */
import { ADVISORS } from './site';

export const APPS_SCRIPT: { bookings: string; rsvps: string } = {
  /** Appointment requests (Book an Appointment page). */
  bookings: 'https://script.google.com/macros/s/AKfycbzt31QUxDVhWFJDl9D1uahenKnunQhOveQfJKw9zhn9s-SaPbJJpd3dPP6qM4fmf_aIOA/exec',
  /** Event RSVPs (event pages). */
  rsvps: 'https://script.google.com/macros/s/AKfycbzAJNKJq0OjPvQoauPgJQKOE9bPDbyE91WB9LK9iC2orWAQTNTPbQOJTfxsIktUXygs/exec',
};

/**
 * Booking calendar rules. Opening hours and holidays come from HOURS in
 * src/config/site.ts; these settings control the appointment slots.
 */
export const BOOKING: { slotMinutes: number; lastStart: string; minNoticeMinutes: number; horizonDays: number } = {
  /** Length of each appointment slot, in minutes. */
  slotMinutes: 30,
  /** Latest start time offered (24-hour clock, Eastern). '18:30' = 6:30 PM. */
  lastStart: '18:30',
  /** How much notice we need: slots sooner than this many minutes from now are hidden. 120 = 2 hours. */
  minNoticeMinutes: 120,
  /** How far ahead visitors can book, in days. */
  horizonDays: 90,
};

/** Minimum seconds between page load and pressing Send (stops instant spam bots). */
export const MIN_FILL_SECONDS = 3;

const g = ADVISORS.gautam;
const s = ADVISORS.shweta;
/** "call Gautam (973) 722-9191 or Shweta (732) 543-9835" — built from site.ts so numbers stay in one place. */
export const CALL_US = `call ${g.firstName} ${g.phone} or ${s.firstName} ${s.phone}`;

/** The notice period in words, e.g. "2 hours" or "90 minutes". */
export const NOTICE_TEXT =
  BOOKING.minNoticeMinutes % 60 === 0
    ? `${BOOKING.minNoticeMinutes / 60} hour${BOOKING.minNoticeMinutes === 60 ? '' : 's'}`
    : `${BOOKING.minNoticeMinutes} minutes`;

/** Wording used by the forms. Plain English, friendly, no jargon. */
export const FORM_MESSAGES = {
  /** Shown on the live site while the matching URL above is still empty. */
  notConnected: {
    booking: `Online booking isn’t connected yet — please ${CALL_US}.`,
    rsvp: `Online RSVP isn’t connected yet — please ${CALL_US}.`,
  },
  /** Shown when sending fails for a technical reason (no internet, server hiccup…). */
  genericError: `Sorry — we couldn’t send that just now. Please try again in a moment, or ${CALL_US}.`,
  /** Heading of the error summary box when fields need fixing. */
  summaryTitle: 'Please check the following',
  /** Booking: the chosen time slipped inside the notice period while the page was open. */
  slotGone: `Sorry — that time is now less than ${NOTICE_TEXT} away, so it can’t be booked online. Please choose another time.`,
  /** Shown on the Send button while the request is on its way. */
  sending: 'Sending…',
} as const;
