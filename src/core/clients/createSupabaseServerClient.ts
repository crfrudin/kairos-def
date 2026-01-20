import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getRequiredEnv(name: string): string {
  const v = String(process.env[name] ?? '').trim();
  if (!v) throw new Error(`AUTH_ENV_MISSING: ${name} não definido.`);
  return v;
}

/**
 * Cria um Supabase client SSR (server-only) usando cookies do Next.
 *
 * - Não lê cookies no client
 * - Permite que o SSR helper atualize cookies quando necessário
 */
export async function createSupabaseServerClient() {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const store = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () =>
        store.getAll().map((c: { name: string; value: string }) => ({
          name: c.name,
          value: c.value,
        })),
      setAll: (all) => {
        all.forEach((c) => {
          store.set(c.name, c.value, c.options as never);
        });
      },
    },
  });
}
