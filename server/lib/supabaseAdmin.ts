import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireServerEnv } from './env';

let _sbAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  requireServerEnv();

  if (!_sbAdmin) {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE!;

    _sbAdmin = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  return _sbAdmin;
}

// Proxy the old exports so imports don't break, but they will throw on access if env is missing instead of on import
export const sbAdmin = new Proxy({} as SupabaseClient, {
  get: (target, prop) => getSupabaseAdmin()[prop as keyof SupabaseClient]
});

export const supabaseAdmin = sbAdmin;