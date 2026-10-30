import { useEffect, useState } from 'preact/hooks';
import { registerSW } from 'virtual:pwa-register';
import { toast } from './ui';

// ---------- install prompt ----------
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferred: BeforeInstallPromptEvent | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // keep it so we can offer our own button
  deferred = e as BeforeInstallPromptEvent;
  emit();
});
window.addEventListener('appinstalled', () => { deferred = null; emit(); toast('TeacherNotes terpasang'); });

export type InstallState = 'installed' | 'available' | 'ios' | 'unavailable';

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    s();
    return () => { subs.delete(s); };
  }, []);
  const state: InstallState = isStandalone() ? 'installed' : deferred ? 'available' : isIOS() ? 'ios' : 'unavailable';
  const install = async () => {
    if (!deferred) return;
    const d = deferred;
    deferred = null; // a prompt event can only be used once
    emit();
    await d.prompt();
    await d.userChoice;
  };
  return { state, install };
}

// ---------- service worker updates ----------
export function initPWA() {
  const update = registerSW({
    onNeedRefresh() {
      toast('Versi baru TeacherNotes tersedia', { label: 'Muat ulang', run: () => { void update(true); } }, 60000);
    },
    onOfflineReady() {
      toast('Siap dipakai offline');
    },
  });
}
