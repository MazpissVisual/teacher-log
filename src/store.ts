import { useEffect, useState } from 'preact/hooks';
import type { Collection, DB, Journal, Mood, Plan, Priority, Resource, ResourceType, Task } from './types';
import { sampleData } from './sample';
import { DEFAULT_TZ, uid } from './util';

const KEY = 'gurulog-v2';
const LEGACY_KEY = 'gurulog-demo-v1';

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const arr = (v: unknown): any[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []);

/** Coerces any parsed JSON (old version, partial, hand-edited) into a valid DB. */
export function normalize(raw: unknown): DB {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const id = (x: any) => str(x.id) || uid();
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
      id: id(x), title: str(x.title), date: str(x.date), priority: oneOf<Priority>(x.priority, ['low', 'medium', 'high'], 'medium'), done: x.done === true,
    })),
  };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch { /* corrupt or blocked storage → fall through to sample */ }
  return sampleData();
}

let db: DB = load();
const listeners = new Set<() => void>();
let onError: (msg: string) => void = () => {};
export const setStorageErrorHandler = (fn: (msg: string) => void) => { onError = fn; };

function commit(next: DB) {
  db = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    onError('Gagal menyimpan ke penyimpanan browser. Ekspor data agar tidak hilang.');
  }
  listeners.forEach((l) => l());
}

export function useDB(): DB {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return db;
}

// Keep several tabs in sync instead of letting a stale tab overwrite newer data.
window.addEventListener('storage', (e) => {
  if (e.key !== KEY || !e.newValue) return;
  try { db = normalize(JSON.parse(e.newValue)); listeners.forEach((l) => l()); } catch { /* ignore */ }
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
  reset() { commit(sampleData()); },
  clearAll() { commit(normalize({})); },
};

export const exportJSON = () => JSON.stringify(db, null, 2);
