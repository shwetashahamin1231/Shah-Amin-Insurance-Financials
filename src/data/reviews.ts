/**
 * ════════════════════════════════════════════════════════════════════
 *  REVIEWS — real client reviews only.
 * ════════════════════════════════════════════════════════════════════
 *  Copy a review exactly as the client wrote it (with their permission),
 *  then add a block below. The Reviews page and the home page update
 *  automatically. While this list is empty the site shows an elegant
 *  "share your experience" invitation instead of testimonials.
 *
 *  Example:
 *  {
 *    name: 'Priya S.',            // first name + initial is common
 *    rating: 5,                   // 1–5 stars
 *    text: 'Gautam explained every option patiently…',
 *    date: '2026-09-14',          // YYYY-MM-DD (optional)
 *    source: 'Google',            // where it was posted (optional)
 *    topic: 'Medicare',           // optional label
 *  },
 * ════════════════════════════════════════════════════════════════════
 */

export interface Review {
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  date?: string;
  source?: string;
  topic?: string;
}

export const REVIEWS: Review[] = [
  // Add real reviews here.
];
