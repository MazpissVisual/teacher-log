import { useEffect, useState } from 'preact/hooks';
import type { DB } from './types';
import { getDB } from './store';
import { computeReminders, DEFAULT_PREFS, type Prefs, type Reminder } from './reminders-core';
import { todayIn } from './util';

export { computeReminders, DEFAULT_PREFS };
export type { Prefs, Reminder };

/**
 * Notification preferences and the in-page runner. Which reminders exist is decided by `reminders-core`.
 * Preferences are per device, so they live in localStorage rather than the synced database.
 * While Web Push is active on this device the server sends the reminders, and the in-page runner stays quiet
 * so the same reminder is not shown twice.
 */

const PREFS_KEY = 'ngampusnotes-notif';
const SEEN_KEY = 'ngampusnotes-notified';
const PUSH_KEY = 'ngampusnotes-push-active';

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
export const getPrefs = () => prefs;
/** Listen for preference changes (used by push.ts to keep the server copy in step). */
export function onPrefsChange(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; }
export function usePrefs(): Prefs {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    return () => { subs.delete(s); };
  }, []);
  return prefs;
}

export const isPushActive = () => { try { return localStorage.getItem(PUSH_KEY) === '1'; } catch { return false; } };
export function setPushActive(v: boolean) {
  try { localStorage.setItem(PUSH_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  subs.forEach((s) => s());
}

// ---------- system notifications ----------
export const notificationsSupported = () => typeof Notification !== 'undefined';
export const permissionState = (): NotificationPermission | 'unsupported' => (notificationsSupported() ? Notification.permission : 'unsupported');

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

export async function showNotification(title: string, body: string, tag: string, url = '/') {
  const opts: NotificationOptions = { body, tag, icon: '/pwa-192.png', badge: '/pwa-192.png', lang: 'id', data: { url } };
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
  if (!prefs.enabled || permissionState() !== 'granted' || isPushActive()) return;
  const db = getDB();
  const today = todayIn(db.profile.tz);
  const seen = loadSeen(today);
  let changed = false;
  for (const r of computeReminders(db, new Date(), prefs)) {
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    changed = true;
    void showNotification(r.title, r.body, r.key, r.url);
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
