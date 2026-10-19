import { useEffect, useState } from 'preact/hooks';
import type { DB } from './types';

/** Whether the Tesis menu is shown. Per device; always on once the user has any thesis data, so nothing is ever hidden from them. */
const KEY = 'ngampusnotes-thesis-menu';
const subs = new Set<() => void>();
const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
let on = read();

export function setThesisMenu(v: boolean) {
  on = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private mode: lives until reload */ }
  subs.forEach((s) => s());
}
export function useThesisMenu(db: DB): { shown: boolean; chosen: boolean; hasData: boolean } {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    return () => { subs.delete(s); };
  }, []);
  const hasData = db.stages.length > 0 || db.guidance.length > 0;
  return { shown: on || hasData, chosen: on, hasData };
}
