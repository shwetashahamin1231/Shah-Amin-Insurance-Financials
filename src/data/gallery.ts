/**
 * ════════════════════════════════════════════════════════════════════
 *  GALLERY — photos from our events.
 * ════════════════════════════════════════════════════════════════════
 *  1. Drop the photo files into  src/assets/gallery/
 *     (JPG, PNG or WebP — any size; the site makes optimised copies).
 *  2. Add one line per photo below: the file name, a short description
 *     for visitors who use screen readers (alt), and the event it belongs
 *     to. A caption under the photo is optional (none are shown by default).
 *  While this list is empty, the Gallery page shows elegant placeholders.
 *  Photos display at 3:2 (landscape); portrait photos are cropped toward the top.
 *
 *  Example:
 *    { file: 'breakfast-2026-01.jpg', alt: 'Guests enjoying breakfast at Guru Palace', event: 'member-appreciation-breakfast-2026' },
 * ════════════════════════════════════════════════════════════════════
 */

export interface GalleryItem {
  /** File name inside src/assets/gallery/ */
  file: string;
  /** Describe the photo for screen-reader users. */
  alt: string;
  caption?: string;
  /** Optional: slug of the event in src/data/events.ts */
  event?: string;
}

const OCT2 = 'october-2-2026';

// Insurance-company names and logos are blurred in every photo (CMS marketing rules).
export const GALLERY: GalleryItem[] = [
  // October 2, 2026 client event (newest event first; add new photos above this group).
  { file: '2026-10-02-01.jpg', alt: 'Gautam Shah and Shweta Shah Amin smiling beside a banner at the event', event: OCT2 },
  { file: '2026-10-02-02.jpg', alt: 'A presenter speaking to a full room of guests seated at round tables', event: OCT2 },
  { file: '2026-10-02-03.jpg', alt: 'Guests gathering in the banquet hall with a welcome message on the screen', event: OCT2 },
  { file: '2026-10-02-04.jpg', alt: 'Guests seated at a blue-draped table chatting with the hosts', event: OCT2 },
  { file: '2026-10-02-05.jpg', alt: 'Guests at tables with gold centrepieces beneath a crystal chandelier', event: OCT2 },
  { file: '2026-10-02-06.jpg', alt: 'Guests seated at their tables, listening to the presentation', event: OCT2 },
  { file: '2026-10-02-07.jpg', alt: 'A presenter with a microphone answering questions from the audience', event: OCT2 },
  { file: '2026-10-02-08.jpg', alt: 'Guests at round tables in soft pink light', event: OCT2 },
  { file: '2026-10-02-09.jpg', alt: 'Guests at their tables turned toward the front of the hall', event: OCT2 },
  { file: '2026-10-02-10.jpg', alt: 'A wide view of the banquet hall with guests at blue-draped tables', event: OCT2 },
  { file: '2026-10-02-11.jpg', alt: 'A presenter speaking with a microphone to the seated guests', event: OCT2 },
  { file: '2026-10-02-12.jpg', alt: 'Guests seated at round tables with gold tree centrepieces', event: OCT2 },
  { file: '2026-10-02-13.jpg', alt: 'Guests talking with one another as the event wraps up', event: OCT2 },
];
