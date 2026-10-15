/**
 * Gallery photos from src/data/gallery.ts, matched to their image files in
 * src/assets/gallery/. Used by the Gallery page and by event pages.
 */
import type { ImageMetadata } from 'astro';
import { GALLERY, type GalleryItem } from '../data/gallery';

export interface GalleryPhoto extends GalleryItem {
  src: ImageMetadata;
}

// Every image in the gallery folder, keyed by file name.
const files = import.meta.glob<{ default: ImageMetadata }>('../assets/gallery/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}', { eager: true });
const byName = new Map(Object.entries(files).map(([path, mod]) => [path.split('/').pop() as string, mod.default]));

/** All listed photos that have a file, in list order. Only photos given a `caption` show one. */
export function galleryPhotos(): GalleryPhoto[] {
  return GALLERY.flatMap((item) => {
    const src = byName.get(item.file);
    if (!src) {
      console.warn(`[gallery] "${item.file}" is listed in src/data/gallery.ts but was not found in src/assets/gallery/`);
      return [];
    }
    return [{ ...item, src }];
  });
}

/** Photos linked to one event (by its slug). */
export function eventPhotos(slug: string): GalleryPhoto[] {
  return galleryPhotos().filter((p) => p.event === slug);
}
