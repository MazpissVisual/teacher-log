import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Collection, DB, Page } from './types';
import { actions } from './store';
import { tap } from './util';
import { Wordmark } from './Logo';

/** Minimal observable value, used for page / modal / toast state. */
function atom<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set(v: T) { value = v; subs.forEach((s) => s()); },
    use(): T {
      const [, force] = useState(0);
      useEffect(() => {
        const s = () => force((n) => n + 1);
        subs.add(s);
        s(); // catch updates that happened between first render and this effect
        return () => { subs.delete(s); };
      }, []);
      return value;
    },
  };
}

// ---------- navigation (clean URLs via the History API: /journal, /tasks, …) ----------
const PAGES: Page[] = ['dashboard', 'journal', 'planner', 'library', 'tasks', 'journey', 'search', 'settings'];
const pathOf = (p: Page) => (p === 'dashboard' ? '/' : '/' + p);
const segment = () => location.pathname.replace(/^\/+|\/+$/g, '');
const fromPath = (): Page => {
  const seg = segment();
  return PAGES.includes(seg as Page) ? (seg as Page) : 'dashboard';
};

// Old "#/journal" links (bookmarks, installed-app shortcuts) become "/journal". Auth tokens ("#access_token=…") are left alone.
if (/^#\/[a-z]+$/.test(location.hash)) {
  const old = location.hash.slice(2) as Page;
  history.replaceState(null, '', PAGES.includes(old) ? pathOf(old) : '/');
} else if (segment() && !PAGES.includes(segment() as Page)) {
  history.replaceState(null, '', '/'); // unknown path → home
}

export const pageAtom = atom<Page>(fromPath());
export const searchAtom = atom(fromPath() === 'search' ? new URLSearchParams(location.search).get('q') ?? '' : '');

window.addEventListener('popstate', () => {
  searchAtom.set(fromPath() === 'search' ? new URLSearchParams(location.search).get('q') ?? '' : '');
  pageAtom.set(fromPath());
  window.scrollTo({ top: 0 });
});

export function go(p: Page) {
  const url = p === 'search' ? '/search?q=' + encodeURIComponent(searchAtom.get().trim()) : pathOf(p);
  if (location.pathname + location.search !== url) history.pushState(null, '', url);
  pageAtom.set(p);
  window.scrollTo({ top: 0 });
}

// ---------- toast ----------
interface ToastState { id: number; msg: string; ms: number; action?: { label: string; run: () => void } }
const toastAtom = atom<ToastState | null>(null);
let toastTimer: number | undefined;
let toastSeq = 0;
export function toast(msg: string, action?: ToastState['action'], ms?: number) {
  const dur = ms ?? (action ? 6000 : 2600);
  toastAtom.set({ id: ++toastSeq, msg, ms: dur, action });
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastAtom.set(null), dur);
}
export function Toast() {
  const t = toastAtom.use();
  // Keep the last message mounted while the toast fades out so it doesn't blank mid-transition.
  const last = useRef<ToastState | null>(null);
  if (t) last.current = t;
  const shown = t ?? last.current;
  return (
    <div class={`toast ${t ? 'show' : ''}`} role="status" aria-live="polite">
      {shown?.msg}
      {shown?.action && (
        <button class="toast-action" tabIndex={t ? 0 : -1} onClick={() => { shown.action!.run(); toastAtom.set(null); }}>{shown.action.label}</button>
      )}
      {t && t.action && <span class="toast-bar" key={t.id} style={{ animationDuration: t.ms + 'ms' }} />}
    </div>
  );
}

/** Delete with an undo window instead of a blocking confirm(). */
const LEAVE_MS = 160;
const leavingAtom = atom<ReadonlySet<string>>(new Set());
/** True while an item is playing its exit animation (before it is actually removed from the store). */
export const useLeaving = (id: string) => leavingAtom.use().has(id);

export function removeWithUndo<K extends Collection>(kind: K, item: DB[K][number], label = 'Item dihapus') {
  if (leavingAtom.get().has(item.id)) return; // ignore double clicks mid-animation
  leavingAtom.set(new Set(leavingAtom.get()).add(item.id));
  window.setTimeout(() => {
    actions.remove(kind, item.id);
    const next = new Set(leavingAtom.get());
    next.delete(item.id);
    leavingAtom.set(next);
    toast(label, { label: 'Urungkan', run: () => { tap(); actions.upsert(kind, item); } });
  }, LEAVE_MS);
}

// ---------- modal ----------
interface ModalState { title: string; body: ComponentChildren; closing?: boolean }
const modalAtom = atom<ModalState | null>(null);
export const openModal = (title: string, body: ComponentChildren) => modalAtom.set({ title, body });
/** Plays the exit animation, then unmounts. */
export function closeModal() {
  const cur = modalAtom.get();
  if (!cur || cur.closing) return;
  modalAtom.set({ ...cur, closing: true });
  window.setTimeout(() => { if (modalAtom.get()?.closing) modalAtom.set(null); }, 140);
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function ModalRoot() {
  const m = modalAtom.use();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!m) return;
    const opener = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input,textarea,select');
    (first ?? ref.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closeModal();
      if (e.key !== 'Tab' || !ref.current) return;
      const els = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!els.length) return;
      const a = els[0], z = els[els.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.(); };
  }, [m === null]);

  if (!m) return null;
  return (
    <div class={'modal-overlay' + (m.closing ? ' closing' : '')} onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={ref}>
        <div class="modal-header">
          <h2 id="modal-title" style="margin:0">{m.title}</h2>
          <button class="icon-btn" onClick={closeModal} aria-label="Tutup">×</button>
        </div>
        {m.body}
      </div>
    </div>
  );
}

// ---------- small shared pieces ----------
export function Empty({ title, action }: { title: string; action?: { label: string; run: () => void } }) {
  return (
    <div class="empty">
      <div class="ornament" style="padding:0;font-size:20px" aria-hidden="true">✧ ✧ ✧</div>
      <b>{title}</b>
      <span>Ruang ini siap untuk ide berikutnya.</span>
      {action && <button class="btn sm" style="margin-top:16px" onClick={action.run}>{action.label}</button>}
    </div>
  );
}

export function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Number that counts up to its value (like a press run totalling). Instant under reduced motion. */
export function CountUp({ value }: { value: number }) {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [n, setN] = useState(reduce ? value : 0);
  const cur = useRef(n);
  useEffect(() => {
    if (reduce || cur.current === value) { cur.current = value; setN(value); return; }
    const from = cur.current, t0 = performance.now(), dur = 420;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const v = Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      cur.current = v;
      setN(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <><span aria-hidden="true">{n}</span><span class="sr-only">{value}</span></>;
}

/** Placeholder shaped like a not-yet-printed front page. */
export function Skeleton() {
  return (
    <main class="auth-wrap">
      <div class="skeleton" role="status" aria-busy="true">
        <span class="sr-only">Memuat…</span>
        <Wordmark class="sk-logo" label="" />
        <div class="sk" style="height:12px;width:90px" />
        <div class="sk" style="height:44px;width:80%;margin:14px 0 18px" />
        <div class="sk" style="height:12px" /><div class="sk" style="height:12px;width:94%" /><div class="sk" style="height:12px;width:70%" />
        <div class="sk" style="height:84px;margin-top:22px" />
      </div>
    </main>
  );
}
