import { useEffect, useState } from 'preact/hooks';
import { cloudEnabled, supabase } from './supabase';
import { getPrefs, isPushActive, notificationsSupported, onPrefsChange, permissionState, requestPermission, savePrefs, setPushActive } from './notify';

/**
 * Web Push: lets the server (supabase/functions/send-reminders) deliver reminders while the app is closed.
 * Needs a signed-in account, the VAPID public key at build time, and a browser with PushManager
 * (on iPhone only once the app is installed to the Home Screen).
 */

export const VAPID_PUBLIC = import.meta.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string | undefined;

export const pushSupported = () =>
  cloudEnabled && !!VAPID_PUBLIC && notificationsSupported() && 'serviceWorker' in navigator && 'PushManager' in window;

const keyBytes = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const b64url = (buf: ArrayBuffer | null) => {
  if (!buf) return '';
  let s = '';
  new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function currentSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch { return null; }
}

function rowOf(sub: PushSubscription) {
  const p = getPrefs();
  return {
    endpoint: sub.endpoint, p256dh: b64url(sub.getKey('p256dh')), auth: b64url(sub.getKey('auth')),
    prefs: { deadlines: p.deadlines, classes: p.classes, thesis: p.thesis, leadMin: p.leadMin },
  };
}

/** Asks for permission, subscribes this device, and registers it with the server. Throws a short Indonesian message on failure. */
export async function enablePush(): Promise<void> {
  if (!pushSupported() || !supabase) throw new Error('Notifikasi saat aplikasi tertutup belum tersedia di sini.');
  const perm = await requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Izin ditolak. Ubah di pengaturan situs browser.' : 'Izin notifikasi tidak diberikan.');
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC!) });
    const { error } = await supabase.from('push_subscriptions').upsert(rowOf(sub), { onConflict: 'user_id,endpoint' });
    if (error) throw error;
    savePrefs({ enabled: true });
    setPushActive(true);
  } catch (e) {
    setPushActive(false);
    throw new Error(e instanceof Error && /push service|network|AbortError/i.test(e.message) ? 'Layanan push browser tidak bisa dihubungi.' : 'Gagal mengaktifkan notifikasi saat aplikasi tertutup.');
  }
}

/** Removes this device from the server and the browser. Never throws: it runs on sign-out too. */
export async function disablePush(): Promise<void> {
  setPushActive(false);
  try {
    const sub = await currentSubscription();
    if (!sub) return;
    await supabase?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  } catch { /* the server drops dead endpoints on its own */ }
}

let syncTimer: number | undefined;
/** Keeps the server's copy of the preferences current while push is on. */
onPrefsChange(() => {
  if (!isPushActive() || !supabase) return;
  clearTimeout(syncTimer);
  syncTimer = window.setTimeout(async () => {
    const sub = await currentSubscription();
    if (sub) await supabase!.from('push_subscriptions').update({ prefs: rowOf(sub).prefs }).eq('endpoint', sub.endpoint);
  }, 600);
});

export type PushState = 'unsupported' | 'off' | 'on';
/** Whether this device is really subscribed (the flag can go stale if the user cleared site data or revoked permission). */
export function usePushState(): PushState {
  const [state, setState] = useState<PushState>(() => (pushSupported() ? (isPushActive() ? 'on' : 'off') : 'unsupported'));
  useEffect(() => {
    if (!pushSupported()) return setState('unsupported');
    let alive = true;
    const check = async () => {
      const sub = permissionState() === 'granted' ? await currentSubscription() : null;
      if (!alive) return;
      if (!sub && isPushActive()) setPushActive(false);
      setState(sub && isPushActive() ? 'on' : 'off');
    };
    void check();
    const off = onPrefsChange(() => { setState(isPushActive() ? 'on' : 'off'); });
    return () => { alive = false; off(); };
  }, []);
  return state;
}
