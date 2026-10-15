import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
export const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** When the env vars are missing the app runs local-only (no login, no sync). */
export const cloudEnabled = Boolean(supabaseUrl && supabaseKey);

export const supabase = cloudEnabled
  ? createClient(supabaseUrl!, supabaseKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
