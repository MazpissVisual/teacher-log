/** Pure helpers for note images (no browser or network), so they can be tested. */

export const MAX_IMAGES = 10;
export const MAX_SIDE = 1600;
export const TARGET_BYTES = 600 * 1024;
export const HARD_LIMIT_BYTES = 1_500_000; // the bucket itself refuses anything over 2 MB

const REF = /!\[[^\]]*\]\(img:([0-9a-fA-F-]{36})\)/g;

/** Ids of the images a note refers to, in order, without duplicates. */
export function imageIds(text: string): string[] {
  return [...new Set([...text.matchAll(REF)].map((m) => m[1].toLowerCase()))];
}

/** Distinct images used across several text fields (a journal has three). */
export function countImages(texts: string[]): number {
  return new Set(texts.flatMap(imageIds)).size;
}

/** Scales (w, h) down so the longer side is at most `max`; never scales up. */
export function fitWithin(w: number, h: number, max = MAX_SIDE): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

export const imageMarkdown = (id: string, alt = '') => `![${alt.replace(/[\][]/g, '')}](img:${id})`;

/** Object name inside the bucket: one folder per user, so the storage policies can match on it. */
export const imagePath = (userId: string, id: string) => `${userId}/${id}`;
