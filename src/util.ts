// Indonesian time zones. The default follows the device, so a teacher in Makassar doesn't start on "Jakarta".
const ZONES: Record<string, string> = {
  'Asia/Jakarta': 'Asia/Jakarta', 'Asia/Pontianak': 'Asia/Jakarta',
  'Asia/Makassar': 'Asia/Makassar', 'Asia/Ujung_Pandang': 'Asia/Makassar',
  'Asia/Jayapura': 'Asia/Jayapura',
};
export const mapTz = (name?: string): string => (name && ZONES[name]) || 'Asia/Jakarta';
export const detectTz = (): string => {
  try { return mapTz(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { return 'Asia/Jakarta'; }
};
export const DEFAULT_TZ = detectTz();
export const tzLabel = (tz: string) => ({ 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' } as Record<string, string>)[tz] ?? tz;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** RFC 4122 v4. randomUUID is missing on non-secure origins (e.g. dev over LAN), so fall back to getRandomValues. */
export const uid = (): string => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

/** YYYY-MM-DD in the given IANA timezone. */
export function todayIn(tz: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function hourIn(tz: string, now = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(now));
}

/** Pure date-string arithmetic (no timezone drift). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function dateText(d: string): string {
  if (!d) return 'Tanpa tanggal';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const moodLabel = (m: string) => ({ great: 'Paham banget', good: 'Paham', neutral: 'Biasa', challenging: 'Bingung' } as Record<string, string>)[m] ?? 'Catatan';

export const excerpt = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + '…' : s);

export const firstChar = (s: string) => Array.from(s.trim())[0]?.toUpperCase() ?? 'G';

export const isHttpUrl = (u: string) => /^https?:\/\//i.test(u);

/** Whole days from `b` to `a` (a - b), for YYYY-MM-DD strings. */
export function dayDiff(a: string, b: string): number {
  const t = (d: string) => { const [y, m, day] = d.split('-').map(Number); return Date.UTC(y, m - 1, day); };
  return Math.round((t(a) - t(b)) / 86400000);
}

/** "Hari ini", "Besok", "3 hari lagi", "2 hari lalu" — only within two weeks, otherwise null (show the date instead). */
export function relativeDay(date: string, today: string): string | null {
  if (!date) return null;
  const d = dayDiff(date, today);
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Besok';
  if (d === -1) return 'Kemarin';
  if (d > 1 && d <= 14) return d + ' hari lagi';
  if (d < -1 && d >= -14) return -d + ' hari lalu';
  return null;
}

/** Tiny haptic tick on devices that support it (Android PWA); silently ignored elsewhere. */
export const tap = (ms = 10) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };
