import { useEffect, useState } from 'preact/hooks';
import { disablePush } from './push';
import type { Session } from '@supabase/supabase-js';
import { actions, clearUserCache, getDB, hasUserCache, readLocalOnly, switchUser } from './store';
import { clearOutbox, flush, pendingCount, pull, startSync, stopSync } from './sync';
import { supabase } from './supabase';

export interface AuthState { ready: boolean; session: Session | null; recovery: boolean }
let state: AuthState = { ready: false, session: null, recovery: false };
const subs = new Set<() => void>();
const set = (p: Partial<AuthState>) => { state = { ...state, ...p }; subs.forEach((s) => s()); };

/** Leave the "set a new password" screen once the password was changed. */
export const endRecovery = () => set({ recovery: false });

export function useAuth(): AuthState {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    s(); // catch updates that happened between first render and this effect
    return () => { subs.delete(s); };
  }, []);
  return state;
}

let activeUser: string | null = null;

/** Load the user's cache, push anything pending, then pull. Handles first-login migration of local-only data. */
async function bootstrap(session: Session) {
  const uid = session.user.id;
  if (activeUser === uid) return;
  activeUser = uid;
  const hadCache = hasUserCache(uid);
  switchUser(uid);
  startSync(uid);
  await flush();
  const existed = await pull();

  if (!existed && !hadCache) {
    // Brand-new account: offer to carry over data created on this device before cloud sync existed.
    // Name chosen at sign-up (user_metadata) wins; otherwise fall back to the part of the email before "@".
    const um = session.user.user_metadata ?? {};
    const meta = [um.name, um.full_name].find((v): v is string => typeof v === 'string' && v.trim() !== '')?.trim().slice(0, 40) ?? '';
    const name = meta || session.user.email?.split('@')[0] || 'Mahasiswa';
    const local = readLocalOnly();
    const hasLocal = local && (local.journals.length || local.plans.length || local.resources.length || local.tasks.length);
    if (hasLocal && confirm('Unggah data yang ada di perangkat ini ke akun barumu?')) {
      actions.adopt({ ...local!, profile: { ...local!.profile, name } });
    } else {
      actions.setProfile({ ...getDB().profile, name });
    }
  }
}

function teardown() {
  activeUser = null;
  stopSync();
  switchUser(null);
}

export function initAuth() {
  if (!supabase) return set({ ready: true });

  // Don't depend solely on the auth event to leave the splash screen: read the stored session
  // directly, and never wait more than a few seconds (e.g. unreachable network or bad config).
  const giveUp = window.setTimeout(() => { if (!state.ready) set({ ready: true }); }, 4000);
  supabase.auth.getSession().then(({ data, error }) => {
    clearTimeout(giveUp);
    if (error) console.error('[auth] getSession failed:', error.message);
    if (!state.ready) set({ ready: true, session: data.session });
    if (data.session) void bootstrap(data.session);
  }).catch((e) => {
    clearTimeout(giveUp);
    console.error('[auth] getSession threw:', e);
    set({ ready: true });
  });

  supabase.auth.onAuthStateChange((event, session) => {
    // Never await supabase calls inside this callback (deadlocks the auth lock) — defer.
    setTimeout(() => {
      if (event === 'PASSWORD_RECOVERY') set({ recovery: true });
      set({ session, ready: true });
      if (session) void bootstrap(session);
      else if (activeUser) teardown();
    }, 0);
  });
}

export async function signOut(): Promise<boolean> {
  if (!supabase) return true;
  await flush();
  if (pendingCount() > 0 && !confirm('Ada perubahan yang belum tersinkron dan akan hilang jika keluar. Tetap keluar?')) return false;
  const uid = activeUser;
  await disablePush(); // stop reminders for this account on this device while we still have a session
  await supabase.auth.signOut();
  if (uid) { clearUserCache(uid); clearOutbox(uid); } // don't leave a teacher's data on a shared device
  return true;
}

/**
 * Permanently deletes the signed-in user's account (and, via ON DELETE CASCADE, all their rows).
 * Requires supabase/migrations/0002_delete_account.sql. Throws a short Indonesian message on failure.
 */
export async function deleteAccount(): Promise<void> {
  if (!supabase || !activeUser) throw new Error('Kamu belum masuk.');
  if (!navigator.onLine) throw new Error('Kamu sedang offline. Sambungkan internet untuk menghapus akun.');
  const uid = activeUser;
  await disablePush(); // still signed in here, so the server row can be removed too
  stopSync(); // nothing queued may be pushed (or re-created) after this point
  clearOutbox(uid);
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    startSync(uid); // account still exists → resume normal syncing
    const m = (error.message ?? '').toLowerCase();
    throw new Error(m.includes('could not find') || m.includes('does not exist') || m.includes('schema cache')
      ? 'Fitur hapus akun belum diaktifkan di server. Jalankan migrasi 0002 di Supabase.'
      : 'Gagal menghapus akun. Coba lagi sebentar lagi.');
  }
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {}); // the server-side session is already gone
  clearUserCache(uid);
  clearOutbox(uid);
}
