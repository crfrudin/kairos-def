import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getRequiredEnv(name: string): string {
  const v = String(process.env[name] ?? '').trim();
  if (!v) throw new Error(`SUPABASE_ADMIN_ENV_MISSING: ${name} não definido.`);
  return v;
}

let _client: SupabaseClient | null = null;

/**
 * Supabase Admin Client (service role)
 *
 * REGRAS:
 * - server-only
 * - nunca expor ao frontend
 * - uso previsto: INSERT em tabelas de auditoria (append-only)
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  _client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return _client;
}
