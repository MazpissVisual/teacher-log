import { useEffect, useState } from 'preact/hooks';
import type { Collection, DB } from './types';
import { getDB, normalize, replaceFromRemote, setSyncHook, type Op } from './store';
import { supabase } from './supabase';

/**
 * Local-first sync. The UI always reads/writes the local store; changes are queued in an outbox
 * (persisted, so they survive reloads/offline) and pushed to Supabase. The server wins on pull,
 * but only after the outbox is empty, so unsent local edits are never overwritten.
 */

type Entry = { kind: Collection | 'profile'; id: string; del: boolean };
const TABLE: Record<Collection, string> = { journals: 'journals', plans: 'plans', resources: 'resources', tasks: 'tasks' };

let userId: string | null = null;
let outbox = new Map<string, Entry>();
let flushTimer: number | undefined;
let busy: Promise<void> | null = null;

// ---------- status (for the UI) ----------
export type SyncStatus = { state: 'idle' | 'syncing' | 'offline' | 'error'; pending: number; lastSync: number | null; error?: string };
let status: SyncStatus = { state: 'idle', pending: 0, lastSync: null };
const subs = new Set<() => void>();
function setStatus(p: Partial<SyncStatus>) {
  status = { ...status, pending: outbox.size, ...p };
  subs.forEach((s) => s());
}
export function useSyncStatus(): SyncStatus {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    s(); // catch updates that happened between first render and this effect
    return () => { subs.delete(s); };
  }, []);
  return status;
}

// ---------- outbox persistence ----------
const obKey = () => `ngampusnotes-outbox:${userId}`;
function saveOutbox() {
  try { localStorage.setItem(obKey(), JSON.stringify([...outbox.entries()])); } catch { /* quota/private mode: stays in memory */ }
}
function loadOutbox() {
  try { outbox = new Map(JSON.parse(localStorage.getItem(obKey()) ?? '[]')); } catch { outbox = new Map(); }
}
export function clearOutbox(uid: string) {
  try { localStorage.removeItem(`ngampusnotes-outbox:${uid}`); } catch { /* ignore */ }
}

function enqueue(ops: Op[]) {
  if (!userId) return;
  for (const op of ops) {
    if (op.t === 'profile') outbox.set('profile', { kind: 'profile', id: 'profile', del: false });
    else outbox.set(`${op.kind}:${op.id}`, { kind: op.kind, id: op.id, del: op.t === 'delete' });
  }
  saveOutbox();
  setStatus({});
  schedule(400);
}
function schedule(ms: number) {
  clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => { void flush(); }, ms);
}

// ---------- row mapping ----------
const dateOrNull = (d: string) => (d ? d : null);
const toRow: Record<Collection, (x: any) => Record<string, unknown>> = {
  journals: (j) => ({ id: j.id, date: dateOrNull(j.date), type: j.type, title: j.title, content: j.content, class_name: j.className, subject: j.subject, mood: j.mood, topic: j.topic, worked: j.worked, improve: j.improve, pinned: j.pinned }),
  plans: (p) => ({ id: p.id, title: p.title, date: dateOrNull(p.date), time: p.time, class_name: p.className, subject: p.subject, objective: p.objective, activities: p.activities }),
  resources: (r) => ({ id: r.id, title: r.title, type: r.type, description: r.description, url: r.url }),
  tasks: (t) => ({ id: t.id, title: t.title, description: t.description ?? '', date: dateOrNull(t.date), priority: t.priority, done: t.done }),
};
const fromRow = {
  journals: (r: any) => ({ id: r.id, date: r.date ?? '', type: r.type, title: r.title, content: r.content, className: r.class_name, subject: r.subject, mood: r.mood, topic: r.topic, worked: r.worked, improve: r.improve, pinned: r.pinned }),
  plans: (r: any) => ({ id: r.id, title: r.title, date: r.date ?? '', time: r.time, className: r.class_name, subject: r.subject, objective: r.objective, activities: r.activities }),
  resources: (r: any) => ({ id: r.id, title: r.title, type: r.type, description: r.description, url: r.url }),
  tasks: (r: any) => ({ id: r.id, title: r.title, description: r.description ?? '', date: r.date ?? '', priority: r.priority, done: r.done }),
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String((e as any)?.message ?? e));

// ---------- push ----------
export function flush(): Promise<void> {
  if (!supabase || !userId) return Promise.resolve();
  if (busy) return busy;
  busy = (async () => {
    if (!outbox.size) return;
    if (!navigator.onLine) return setStatus({ state: 'offline' });
    setStatus({ state: 'syncing' });
    const sent = [...outbox.entries()]; // snapshot; entries re-queued meanwhile are replaced by new objects
    const db = getDB();
    try {
      const done: string[] = [];

      for (const kind of Object.keys(TABLE) as Collection[]) {
        const mine = sent.filter(([, e]) => e.kind === kind);
        const rows = mine
          .filter(([, e]) => !e.del)
          .map(([k, e]) => ({ k, item: (db[kind] as { id: string }[]).find((x) => x.id === e.id) }))
          .filter((x): x is { k: string; item: { id: string } } => !!x.item);
        // upserts whose item no longer exists locally were superseded by a delete op; drop them
        const orphans = mine.filter(([, e]) => !e.del && !(db[kind] as { id: string }[]).some((x) => x.id === e.id)).map(([k]) => k);
        if (rows.length) {
          const { error } = await supabase!.from(TABLE[kind]).upsert(rows.map((r) => toRow[kind](r.item)), { onConflict: 'id' });
          if (error) throw error;
          done.push(...rows.map((r) => r.k));
        }
        done.push(...orphans);
        const dels = mine.filter(([, e]) => e.del);
        if (dels.length) {
          const { error } = await supabase!.from(TABLE[kind]).delete().in('id', dels.map(([, e]) => e.id));
          if (error) throw error;
          done.push(...dels.map(([k]) => k));
        }
      }

      if (sent.some(([k]) => k === 'profile')) {
        const p = getDB();
        const { error } = await supabase!.from('profiles').upsert({ user_id: userId, name: p.profile.name, tz: p.profile.tz, classes: p.classes, subjects: p.subjects }, { onConflict: 'user_id' });
        if (error) throw error;
        done.push('profile');
      }

      for (const k of done) if (outbox.get(k) === sent.find(([sk]) => sk === k)?.[1]) outbox.delete(k);
      saveOutbox();
      setStatus({ state: 'idle', lastSync: Date.now(), error: undefined });
    } catch (e) {
      setStatus({ state: navigator.onLine ? 'error' : 'offline', error: errMsg(e) });
      schedule(15000); // retry
    }
  })().finally(() => {
    busy = null;
    if (outbox.size && status.state === 'idle') schedule(400); // edits that arrived mid-flush
  });
  return busy;
}

// ---------- pull ----------
/** Returns false when the account has no profile row yet (i.e. brand-new account). */
export async function pull(): Promise<boolean> {
  if (!supabase || !userId) return true;
  if (outbox.size) return true; // never overwrite unsent edits
  setStatus({ state: 'syncing' });
  try {
    const [p, j, pl, r, t] = await Promise.all([
      supabase.from('profiles').select('*').maybeSingle(),
      supabase.from('journals').select('*'),
      supabase.from('plans').select('*'),
      supabase.from('resources').select('*'),
      supabase.from('tasks').select('*'),
    ]);
    for (const res of [p, j, pl, r, t]) if (res.error) throw res.error;
    if (outbox.size) return true; // user edited while we were fetching; try again later
    const hasProfile = !!p.data;
    const next: DB = normalize({
      profile: p.data ? { name: p.data.name, tz: p.data.tz } : getDB().profile,
      classes: p.data?.classes ?? [],
      subjects: p.data?.subjects ?? [],
      journals: (j.data ?? []).map(fromRow.journals),
      plans: (pl.data ?? []).map(fromRow.plans),
      resources: (r.data ?? []).map(fromRow.resources),
      tasks: (t.data ?? []).map(fromRow.tasks),
    });
    replaceFromRemote(next);
    setStatus({ state: 'idle', lastSync: Date.now(), error: undefined });
    return hasProfile;
  } catch (e) {
    setStatus({ state: navigator.onLine ? 'error' : 'offline', error: errMsg(e) });
    return true;
  }
}

export async function syncNow() {
  await flush();
  await pull();
}

// ---------- lifecycle ----------
export function startSync(uid: string) {
  userId = uid;
  loadOutbox();
  setSyncHook(enqueue);
  setStatus({ state: 'idle' });
}
export function stopSync() {
  clearTimeout(flushTimer);
  setSyncHook(null);
  userId = null;
  outbox = new Map();
  setStatus({ state: 'idle', pending: 0, lastSync: null, error: undefined });
}
export const pendingCount = () => outbox.size;

window.addEventListener('online', () => { if (userId) void syncNow(); });
document.addEventListener('visibilitychange', () => { if (userId && document.visibilityState === 'visible') void syncNow(); });
