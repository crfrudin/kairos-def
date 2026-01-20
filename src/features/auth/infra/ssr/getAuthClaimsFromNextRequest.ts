import 'server-only';

import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import type { AuthClaims } from './AuthClaims';

function getRequiredEnv(name: string): string {
  const v = String(process.env[name] ?? '').trim();
  if (!v) throw new Error(`AUTH_ENV_MISSING: ${name} não definido.`);
  return v;
}

function safeBool(v: unknown): boolean {
  return v === true;
}

/**
 * Extrai claims confiáveis a partir da sessão (cookies) no contexto do middleware.
 *
 * Regras:
 * - Não lança em falhas esperadas: retorna { is_authenticated: false }.
 * - Não escreve em banco.
 * - Pode atualizar cookies no response (refresh de sessão) via @supabase/ssr.
 */
export async function getAuthClaimsFromNextRequest(params: {
  req: NextRequest;
  res: NextResponse;
}): Promise<AuthClaims> {
  const { req, res } = params;

  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookies) => {
        // SSR helpers exigem set no response para atualizar sessão quando necessário
        cookies.forEach((c) => {
          res.cookies.set(c.name, c.value, c.options);
        });
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return { is_authenticated: false, user_id: null, email_confirmed: false };
    }

    if (!data?.user) {
      return { is_authenticated: false, user_id: null, email_confirmed: false };
    }

    // Supabase user payload
    const userId = String((data.user as { id?: string }).id ?? '').trim();
    if (!userId) return { is_authenticated: false, user_id: null, email_confirmed: false };

    const emailConfirmedAt = (data.user as { email_confirmed_at?: string | null }).email_confirmed_at ?? null;
    const emailConfirmed = Boolean(emailConfirmedAt);

    return {
      is_authenticated: true,
      user_id: userId,
      email_confirmed: safeBool(emailConfirmed),
    };
  } catch {
    return { is_authenticated: false, user_id: null, email_confirmed: false };
  }
}
