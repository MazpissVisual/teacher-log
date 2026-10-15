import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Collection, DB, Page } from './types';
import { actions } from './store';

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
        return () => { subs.delete(s); };
      }, []);
      return value;
    },
  };
}

// ---------- navigation ----------
const PAGES: Page[] = ['dashboard', 'journal', 'planner', 'library', 'tasks', 'journey', 'search', 'settings'];
const fromHash = (): Page => {
  const h = location.hash.replace(/^#\/?/, '') as Page;
  return PAGES.includes(h) ? h : 'dashboard';
};
export const pageAtom = atom<Page>(fromHash());
export const searchAtom = atom('');
window.addEventListener('hashchange', () => pageAtom.set(fromHash()));
export function go(p: Page) {
  location.hash = '/' + p;
  pageAtom.set(p);
  window.scrollTo({ top: 0 });
}

// ---------- toast ----------
interface ToastState { msg: string; action?: { label: string; run: () => void } }
const toastAtom = atom<ToastState | null>(null);
let toastTimer: number | undefined;
export function toast(msg: string, action?: ToastState['action']) {
  toastAtom.set({ msg, action });
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastAtom.set(null), action ? 6000 : 2600);
}
export function Toast() {
  const t = toastAtom.use();
  return (
    <div class={`toast ${t ? 'show' : ''}`} role="status" aria-live="polite">
      {t?.msg}
      {t?.action && (
        <button class="toast-action" onClick={() => { t.action!.run(); toastAtom.set(null); }}>{t.action.label}</button>
      )}
    </div>
  );
}

/** Delete with an undo window instead of a blocking confirm(). */
export function removeWithUndo<K extends Collection>(kind: K, item: DB[K][number], label = 'Item dihapus') {
  actions.remove(kind, item.id);
  toast(label, { label: 'Urungkan', run: () => actions.upsert(kind, item) });
}

// ---------- modal ----------
interface ModalState { title: string; body: ComponentChildren }
const modalAtom = atom<ModalState | null>(null);
export const openModal = (title: string, body: ComponentChildren) => modalAtom.set({ title, body });
export const closeModal = () => modalAtom.set(null);

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
    <div class="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
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
export function Empty({ title }: { title: string }) {
  return (
    <div class="empty">
      <div style="font-size:27px" aria-hidden="true">✦</div>
      <b>{title}</b>
      <span>Ruang ini siap untuk ide berikutnya.</span>
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
