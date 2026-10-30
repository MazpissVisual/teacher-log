import { useEffect, useState } from 'preact/hooks';
import type { DB } from './types';
import { supabase } from './supabase';
import { HARD_LIMIT_BYTES, MAX_SIDE, TARGET_BYTES, fitWithin, imageIds, imagePath } from './imgutil';
import { uid } from './util';

/**
 * Note images live in a private Supabase Storage bucket, one folder per user (see 0007_note_images.sql).
 * Notes only store a reference, ![alt](img:<id>); the picture is fetched through a short-lived signed URL.
 */
export const BUCKET = 'note-images';
const ORPHAN_AFTER_MS = 7 * 24 * 3600 * 1000; // long enough for an unsynced note on another device to catch up
const SWEEP_KEY = 'teachernotes-image-sweep';

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  const webp = await toBlob('image/webp', quality);
  if (webp && webp.type === 'image/webp') return webp;
  return toBlob('image/jpeg', quality); // browsers without WebP encoding silently return PNG, which is far bigger
}

/** Resizes and re-encodes in the browser. Drawing to a canvas also drops EXIF data (camera model, GPS location). */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('File ini bukan gambar.');
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { throw new Error('Gambar tidak bisa dibaca. Coba format JPG, PNG, atau WebP.'); }
  try {
    let side = MAX_SIDE, quality = 0.82, last: Blob | null = null;
    for (let i = 0; i < 4; i++) {
      const { w, h } = fitWithin(bmp.width, bmp.height, side);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Browser ini tidak bisa memproses gambar.');
      ctx.fillStyle = '#fff'; // transparent PNGs would turn black as JPEG
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bmp, 0, 0, w, h);
      last = await encode(canvas, quality);
      if (last && last.size <= TARGET_BYTES) return last;
      side = Math.round(side * 0.8); quality = Math.max(0.6, quality - 0.08);
    }
    if (!last || last.size > HARD_LIMIT_BYTES) throw new Error('Gambar terlalu besar untuk disimpan.');
    return last;
  } finally { bmp.close(); }
}

/** Compresses and uploads; returns the new image id. Throws a short Indonesian message. */
export async function uploadImage(file: File): Promise<string> {
  if (!supabase) throw new Error('Gambar hanya tersedia setelah masuk ke akun.');
  if (!navigator.onLine) throw new Error('Kamu sedang offline. Sambungkan internet untuk menyisipkan gambar.');
  const user = await currentUserId();
  if (!user) throw new Error('Kamu belum masuk.');
  const blob = await compressImage(file);
  const id = uid();
  const { error } = await supabase.storage.from(BUCKET).upload(imagePath(user, id), blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
  if (error) {
    const m = error.message.toLowerCase();
    throw new Error(m.includes('bucket not found') ? 'Penyimpanan gambar belum disiapkan di server (jalankan migrasi 0007).'
      : m.includes('row-level security') || m.includes('policy') ? 'Kuota gambar penuh (100 MB). Hapus gambar yang tidak dipakai.'
      : 'Gagal mengunggah gambar. Coba lagi.');
  }
  return id;
}

// ---------- viewing ----------
const urls = new Map<string, { url: string; exp: number }>();
const pending = new Map<string, Promise<string | null>>();

export function clearImageCache() { urls.clear(); pending.clear(); }

async function signedUrl(id: string): Promise<string | null> {
  const hit = urls.get(id);
  if (hit && hit.exp > Date.now() + 60_000) return hit.url;
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const p = (async () => {
    const user = await currentUserId();
    if (!user || !supabase) return null;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(imagePath(user, id), 3600);
    if (error || !data) return null;
    urls.set(id, { url: data.signedUrl, exp: Date.now() + 3600_000 });
    return data.signedUrl;
  })().finally(() => pending.delete(id));
  pending.set(id, p);
  return p;
}

export function useImageUrl(id: string): { url: string | null; failed: boolean } {
  const [state, setState] = useState<{ url: string | null; failed: boolean }>({ url: urls.get(id)?.url ?? null, failed: false });
  useEffect(() => {
    let alive = true;
    void signedUrl(id).then((url) => { if (alive) setState({ url, failed: !url }); });
    return () => { alive = false; };
  }, [id]);
  return state;
}

// ---------- cleanup ----------
interface Listed { name: string; created_at?: string | null }

async function listAll(user: string): Promise<Listed[]> {
  const out: Listed[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase!.storage.from(BUCKET).list(user, { limit: 1000, offset });
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/** Deletes files no note refers to any more (once a week at most, only files older than a week). */
export async function maybeSweep(db: DB): Promise<void> {
  if (!supabase) return;
  try {
    const last = Number(localStorage.getItem(SWEEP_KEY) ?? 0);
    if (Date.now() - last < 24 * 3600 * 1000) return;
    const user = await currentUserId();
    if (!user) return;
    const used = new Set(db.journals.flatMap((j) => imageIds(j.content)));
    const stale = (await listAll(user)).filter((f) => !used.has(f.name.toLowerCase()) && f.created_at && Date.now() - Date.parse(f.created_at) > ORPHAN_AFTER_MS);
    if (stale.length) await supabase.storage.from(BUCKET).remove(stale.map((f) => imagePath(user, f.name)));
    localStorage.setItem(SWEEP_KEY, String(Date.now()));
  } catch { /* try again on the next sync */ }
}

/** Deletes every image of the signed-in user (wipe-all and account deletion). Best effort. */
export async function purgeImages(): Promise<void> {
  try {
    const user = await currentUserId();
    if (!user || !supabase) return;
    const files = await listAll(user);
    for (let i = 0; i < files.length; i += 100) await supabase.storage.from(BUCKET).remove(files.slice(i, i + 100).map((f) => imagePath(user, f.name)));
    clearImageCache();
  } catch { /* nothing more to do */ }
}
