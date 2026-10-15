import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** When the env vars are missing the app runs local-only (no login, no sync). */
export const cloudEnabled = Boolean(url && key);

export const supabase = cloudEnabled
  ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
