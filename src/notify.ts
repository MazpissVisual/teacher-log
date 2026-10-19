import { useEffect, useState } from 'preact/hooks';
import type { DB } from './types';
import { getDB } from './store';
import { agendaFor, KIND_LABEL } from './agenda';
import { dayDiff, minutesIn, toMinutes, todayIn } from './util';

/**
 * Reminders. `computeReminders` is pure (testable) and decides what is worth telling the student right now;
 * the runner shows each one once per day as a system notification while the app is open or being opened.
 * Preferences are per device, so they live in localStorage rather than the synced database.
 */

export interface Prefs { enabled: boolean; deadlines: boolean; classes: boolean; thesis: boolean; leadMin: number }
export interface Reminder { key: string; title: string; body: string; urgent: boolean; group: 'deadlines' | 'classes' | 'thesis' }

const PREFS_KEY = 'ngampusnotes-notif';
const SEEN_KEY = 'ngampusnotes-notified';
export const DEFAULT_PREFS: Prefs = { enabled: false, deadlines: true, classes: true, thesis: true, leadMin: 15 };

export function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    return {
      enabled: p.enabled === true, deadlines: p.deadlines !== false, classes: p.classes !== false, thesis: p.thesis !== false,
      leadMin: [5, 10, 15, 30, 60].includes(p.leadMin) ? p.leadMin : DEFAULT_PREFS.leadMin,
    };
  } catch { return DEFAULT_PREFS; }
}
const subs = new Set<() => void>();
let prefs = loadPrefs();
export function savePrefs(change: Partial<Prefs>) {
  prefs = { ...prefs, ...change };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* private mode: lives until reload */ }
  subs.forEach((s) => s());
}
export function usePrefs(): Prefs {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    return () => { subs.delete(s); };
  }, []);
  return prefs;
}

const when = (d: number) => (d < 0 ? `terlambat ${-d} hari` : d === 0 ? 'hari ini' : d === 1 ? 'besok' : `${d} hari lagi`);

export function computeReminders(db: DB, now: Date, p: Prefs): Reminder[] {
  const tz = db.profile.tz;
  const today = todayIn(tz, now);
  const nowMin = minutesIn(tz, now);
  const out: Reminder[] = [];

  if (p.deadlines) {
    for (const t of db.tasks) {
      if (t.done || !t.date) continue;
      const d = dayDiff(t.date, today);
      if (d > 1) continue;
      out.push({
        key: `task:${t.id}:${d < 0 ? 'late:' + today : d}`, group: 'deadlines', urgent: true,
        title: d < 0 ? `Tugas terlambat: ${t.title}` : `Tugas ${d === 0 ? 'hari ini' : 'besok'}: ${t.title}`,
        body: [t.subject, d < 0 ? when(d) : ''].filter(Boolean).join(' · ') || 'Jangan lupa dikerjakan.',
      });
    }
    for (const pl of db.plans) {
      if (pl.kind === 'kuliah' || !pl.date) continue;
      const d = dayDiff(pl.date, today);
      const big = pl.kind === 'uts' || pl.kind === 'uas';
      if (d < 0 || !(d <= 1 || (big && (d === 3 || d === 7)))) continue;
      out.push({
        key: `plan:${pl.id}:${d}`, group: 'deadlines', urgent: d <= 1,
        title: `${KIND_LABEL[pl.kind]} ${when(d)}: ${pl.title}`,
        body: [pl.subject, pl.time && `Pukul ${pl.time}`].filter(Boolean).join(' · ') || 'Siapkan dirimu.',
      });
    }
  }

  if (p.classes) {
    for (const a of agendaFor(db, today)) {
      const start = toMinutes(a.time);
      if (start === null || nowMin > start || nowMin < start - p.leadMin) continue;
      const left = start - nowMin;
      out.push({
        key: `class:${a.key}:${today}`, group: 'classes', urgent: true,
        title: `${a.kind === 'kuliah' ? '' : KIND_LABEL[a.kind] + ': '}${a.title} ${left === 0 ? 'dimulai sekarang' : `mulai ${left} menit lagi`}`,
        body: [`Pukul ${a.time}`, a.room].filter(Boolean).join(' · '),
      });
    }
  }

  if (p.thesis) {
    for (const s of db.stages) {
      if (s.status === 'done' || !s.date) continue;
      const d = dayDiff(s.date, today);
      if (d > 3) continue;
      out.push({
        key: `stage:${s.id}:${d < 0 ? 'late:' + today : d}`, group: 'thesis', urgent: d <= 1,
        title: `Tahap tesis ${when(d)}: ${s.title}`, body: s.note ? s.note.slice(0, 100) : 'Cek progresmu.',
      });
    }
    for (const g of db.guidance) {
      if (!g.date) continue;
      const d = dayDiff(g.date, today);
      if (d === 0 || d === 1) {
        out.push({
          key: `guid:${g.id}:${d}`, group: 'thesis', urgent: true,
          title: `Bimbingan ${when(d)}${g.lecturer ? ' dengan ' + g.lecturer : ''}`, body: g.notes ? g.notes.slice(0, 100) : 'Siapkan bahan yang mau ditanyakan.',
        });
      }
    }
    const pending = db.guidance.filter((g) => g.followup && !g.followupDone).length;
    if (pending) {
      out.push({
        key: `followup:${today}`, group: 'thesis', urgent: false,
        title: `${pending} tindak lanjut bimbingan belum selesai`, body: 'Buka halaman Tesis untuk melihat daftarnya.',
      });
    }
  }
  return out;
}

// ---------- system notifications ----------
export const notificationsSupported = () => typeof Notification !== 'undefined';
export const permissionState = (): NotificationPermission | 'unsupported' => (notificationsSupported() ? Notification.permission : 'unsupported');

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

export async function showNotification(title: string, body: string, tag: string) {
  const opts: NotificationOptions = { body, tag, icon: '/pwa-192.png', badge: '/pwa-192.png', lang: 'id' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return await reg.showNotification(title, opts);
  } catch { /* fall through to the page-level API */ }
  try { new Notification(title, opts); } catch { /* blocked */ }
}

function loadSeen(today: string): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) ?? 'null');
    if (v && v.day === today && Array.isArray(v.keys)) return new Set(v.keys);
  } catch { /* ignore */ }
  return new Set();
}
function saveSeen(today: string, keys: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify({ day: today, keys: [...keys] })); } catch { /* ignore */ }
}

/** Shows each due reminder once per day. Safe to call often. */
export function checkReminders() {
  if (!prefs.enabled || permissionState() !== 'granted') return;
  const db = getDB();
  const today = todayIn(db.profile.tz);
  const seen = loadSeen(today);
  let changed = false;
  for (const r of computeReminders(db, new Date(), prefs)) {
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    changed = true;
    void showNotification(r.title, r.body, r.key);
  }
  if (changed) saveSeen(today, seen);
}

export function startReminders() {
  checkReminders();
  window.setInterval(checkReminders, 60_000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkReminders(); });
  window.addEventListener('focus', checkReminders);
}

/** Reminders for the dashboard panel, refreshed every minute. Ignores the notification toggle: it is information, not an alert. */
export function useReminders(db: DB): Reminder[] {
  const p = usePrefs();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return computeReminders(db, now, { ...p, deadlines: true, classes: true, thesis: true });
}

