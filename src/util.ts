export const DEFAULT_TZ = 'Asia/Jakarta';

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

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

export const moodIcon = (m: string) => ({ great: '🤩', good: '🙂', neutral: '😐', challenging: '😮‍💨' } as Record<string, string>)[m] ?? '📝';
export const moodLabel = (m: string) => ({ great: 'Seru', good: 'Baik', neutral: 'Biasa', challenging: 'Menantang' } as Record<string, string>)[m] ?? 'Catatan';

export const excerpt = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + '…' : s);

export const firstChar = (s: string) => Array.from(s.trim())[0]?.toUpperCase() ?? 'G';

export const isHttpUrl = (u: string) => /^https?:\/\//i.test(u);
