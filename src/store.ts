import { useEffect, useState } from 'preact/hooks';
import type { Collection, DB, Journal, Mood, Plan, Priority, Resource, ResourceType, Task } from './types';
import { sampleData } from './sample';
import { DEFAULT_TZ, UUID_RE, uid } from './util';

const LOCAL_KEY = 'gurulog-v2';
const LEGACY_KEY = 'gurulog-demo-v1';
const userKey = (uid: string) => `${LOCAL_KEY}:${uid}`;

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const arr = (v: unknown): any[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []);

/** Coerces any parsed JSON (old version, partial, hand-edited) into a valid DB. Ids are always UUIDs (needed by the cloud schema). */
export function normalize(raw: unknown): DB {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const id = (x: any) => (typeof x.id === 'string' && UUID_RE.test(x.id) ? x.id : uid());
  return {
    version: 2,
    profile: { name: str(r.profile?.name, 'Guru').trim() || 'Guru', tz: str(r.profile?.tz, DEFAULT_TZ) },
    classes: strList(r.classes),
    subjects: strList(r.subjects),
    journals: arr(r.journals).map((x): Journal => ({
      id: id(x), date: str(x.date), type: oneOf(x.type, ['quick', 'detailed'] as const, 'quick'), title: str(x.title, 'Catatan Mengajarku'),
      content: str(x.content), className: str(x.className), subject: str(x.subject),
      mood: oneOf<Mood>(x.mood, ['great', 'good', 'neutral', 'challenging'], 'good'),
      topic: str(x.topic), worked: str(x.worked), improve: str(x.improve), pinned: x.pinned === true,
    })),
    plans: arr(r.plans).map((x): Plan => ({
      id: id(x), title: str(x.title), date: str(x.date), time: str(x.time), className: str(x.className), subject: str(x.subject),
      objective: str(x.objective), activities: str(x.activities),
    })),
    resources: arr(r.resources).map((x): Resource => ({
      id: id(x), title: str(x.title), type: oneOf<ResourceType>(x.type, ['Materi', 'Ide', 'Link', 'Aktivitas'], 'Materi'),
      description: str(x.description), url: str(x.url),
    })),
    tasks: arr(r.tasks).map((x): Task => ({
      id: id(x), title: str(x.title), description: str(x.description), date: str(x.date), priority: oneOf<Priority>(x.priority, ['low', 'medium', 'high'], 'medium'), done: x.done === true,
    })),
  };
}

function readKey(key: string): DB | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return normalize(JSON.parse(raw));
  } catch { /* corrupt or blocked storage */ }
  return null;
}

/** Data created before cloud sync existed (anonymous / local-only), if any. */
export function readLocalOnly(): DB | null {
  return readKey(LOCAL_KEY) ?? readKey(LEGACY_KEY);
}
export const hasUserCache = (userId: string) => {
  try { return localStorage.getItem(userKey(userId)) !== null; } catch { return false; }
};
export const clearUserCache = (userId: string) => {
  try { localStorage.removeItem(userKey(userId)); } catch { /* ignore */ }
};

// ---------------- state ----------------
let storageKey: string = LOCAL_KEY;
let db: DB = readLocalOnly() ?? sampleData();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

let onError: (msg: string) => void = () => {};
export const setStorageErrorHandler = (fn: (msg: string) => void) => { onError = fn; };

/** Change feed consumed by the sync engine. */
export type Op = { t: 'upsert'; kind: Collection; id: string } | { t: 'delete'; kind: Collection; id: string } | { t: 'profile' };
let syncHook: ((ops: Op[]) => void) | null = null;
export const setSyncHook = (fn: ((ops: Op[]) => void) | null) => { syncHook = fn; };

const COLLECTIONS: Collection[] = ['journals', 'plans', 'resources', 'tasks'];

export function diff(a: DB, b: DB): Op[] {
  const ops: Op[] = [];
  for (const kind of COLLECTIONS) {
    const before = new Map((a[kind] as { id: string }[]).map((x) => [x.id, JSON.stringify(x)]));
    const after = new Map((b[kind] as { id: string }[]).map((x) => [x.id, JSON.stringify(x)]));
    for (const [id, json] of after) if (before.get(id) !== json) ops.push({ t: 'upsert', kind, id });
    for (const id of before.keys()) if (!after.has(id)) ops.push({ t: 'delete', kind, id });
  }
  const p = (d: DB) => JSON.stringify([d.profile, d.classes, d.subjects]);
  if (p(a) !== p(b)) ops.push({ t: 'profile' });
  return ops;
}

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(db));
  } catch {
    onError('Gagal menyimpan ke penyimpanan browser. Ekspor data agar tidak hilang.');
  }
}

function commit(next: DB) {
  const ops = syncHook ? diff(db, next) : [];
  db = next;
  persist();
  notify();
  if (ops.length) syncHook?.(ops);
}

/** Switch to a user's cached data (or the local-only data when `userId` is null). Does not emit sync ops. */
export function switchUser(userId: string | null) {
  storageKey = userId ? userKey(userId) : LOCAL_KEY;
  db = userId ? readKey(storageKey) ?? normalize({}) : readLocalOnly() ?? sampleData();
  notify();
}

/** Replace local state with what the server returned. Does not emit sync ops. */
export function replaceFromRemote(next: DB) {
  db = next;
  persist();
  notify();
}

export const getDB = () => db;

export function useDB(): DB {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    l(); // catch updates that happened between first render and this effect
    return () => { listeners.delete(l); };
  }, []);
  return db;
}

// Keep several tabs in sync instead of letting a stale tab overwrite newer data.
window.addEventListener('storage', (e) => {
  if (e.key !== storageKey || !e.newValue) return;
  try { db = normalize(JSON.parse(e.newValue)); notify(); } catch { /* ignore */ }
});

export const actions = {
  upsert<K extends Collection>(kind: K, item: DB[K][number]) {
    const list = db[kind] as DB[K][number][];
    const exists = list.some((x) => x.id === item.id);
    commit({ ...db, [kind]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item] });
  },
  remove(kind: Collection, id: string) {
    commit({ ...db, [kind]: (db[kind] as { id: string }[]).filter((x) => x.id !== id) });
  },
  patch<K extends Collection>(kind: K, id: string, change: Partial<DB[K][number]>) {
    commit({ ...db, [kind]: (db[kind] as any[]).map((x) => (x.id === id ? { ...x, ...change } : x)) });
  },
  setProfile(profile: DB['profile']) { commit({ ...db, profile }); },
  setList(kind: 'classes' | 'subjects', list: string[]) {
    commit({ ...db, [kind]: [...new Set(list.map((s) => s.trim()).filter(Boolean))] });
  },
  importJSON(text: string): void {
    const parsed = JSON.parse(text); // throws on invalid JSON → caller shows error
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Format tidak dikenali');
    commit(normalize(parsed));
  },
  /** Adopt a whole DB (used when migrating local data into a new account). */
  adopt(next: DB) { commit(next); },
  reset() { commit(sampleData()); },
  clearAll() { commit({ ...normalize({}), profile: db.profile }); },
};

export const exportJSON = () => JSON.stringify(db, null, 2);
