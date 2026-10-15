/**
 * ════════════════════════════════════════════════════════════════════
 *  GALLERY — photos from our events.
 * ════════════════════════════════════════════════════════════════════
 *  1. Drop the photo files into  src/assets/gallery/
 *     (JPG, PNG or WebP — any size; the site makes optimised copies).
 *  2. Add one line per photo below: the file name, a short description
 *     for visitors who use screen readers (alt), and optionally a caption
 *     and the event it belongs to.
 *  While this list is empty, the Gallery page shows elegant placeholders.
 *  Photos display at 3:2 (landscape); portrait photos are cropped toward the top.
 *
 *  Example:
 *    { file: 'breakfast-2026-01.jpg', alt: 'Guests enjoying breakfast at Guru Palace', caption: 'Member Appreciation Breakfast', event: 'member-appreciation-breakfast-2026' },
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

export const GALLERY: GalleryItem[] = [
  // Add photos here.
];
