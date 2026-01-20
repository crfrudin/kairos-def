import { describe, expect, it } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { middleware } from './middleware';

function envOrThrow(name: string): string {
  const v = String(process.env[name] ?? '').trim();
  if (!v) throw new Error(`TEST_ENV_MISSING: defina ${name} em .env.local para rodar os testes.`);
  return v;
}

function makeReq(url: string, cookieHeader?: string): NextRequest {
  const headers = new Headers();
  if (cookieHeader) headers.set('cookie', cookieHeader);
  return new NextRequest(new URL(url), { headers });
}

async function getAuthCookieHeaderViaRealLogin(): Promise<string> {
  const supabaseUrl = envOrThrow('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = envOrThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  // Você precisa ter um usuário de teste com email/senha no .env.local
  // (isso NÃO é mock: é login real no provedor).
  const email = envOrThrow('TEST_USER_A_EMAIL');
  const password = envOrThrow('TEST_USER_A_PASSWORD');

  const jar = new Map<string, { value: string; options?: Record<string, unknown> }>();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () =>
        Array.from(jar.entries()).map(([name, v]) => ({
          name,
          value: v.value,
          options: v.options as never,
        })),
      setAll: (cookies) => {
        cookies.forEach((c) => {
          jar.set(c.name, { value: c.value, options: c.options as never });
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`TEST_LOGIN_FAILED: ${error.message}`);

  // Converte jar -> Cookie header
  const parts: string[] = [];
  for (const [name, v] of jar.entries()) {
    parts.push(`${name}=${v.value}`);
  }
  if (parts.length === 0) throw new Error('TEST_LOGIN_NO_COOKIES: login não produziu cookies SSR.');
  return parts.join('; ');
}

describe('middleware (ETAPA B — Auth Global)', () => {
  it('rota pública "/" deve ser acessível sem autenticação', async () => {
    const req = makeReq('http://localhost:3000/');
    const res = await middleware(req);

    expect(res).toBeInstanceOf(NextResponse);
    // NextResponse.next() em testes costuma retornar 200 sem Location
    expect(res.headers.get('location')).toBeNull();
  });

  it('rota protegida "/perfil" deve redirecionar para "/login" sem autenticação', async () => {
    const req = makeReq('http://localhost:3000/perfil');
    const res = await middleware(req);

    expect(res).toBeInstanceOf(NextResponse);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('rota protegida "/perfil" deve ser acessível com autenticação válida (cookie SSR real)', async () => {
    const cookie = await getAuthCookieHeaderViaRealLogin();

    const req = makeReq('http://localhost:3000/perfil', cookie);
    const res = await middleware(req);

    // Não deve redirecionar
    expect(res.headers.get('location')).toBeNull();

    // Claims injetadas
    expect(res.headers.get('x-kairos-is-authenticated')).toBe('true');
    expect(res.headers.get('x-kairos-user-id')).toBeTruthy();
  });

  it('sem loop: "/login" é pública e não deve redirecionar para ela mesma quando não autenticado', async () => {
    const req = makeReq('http://localhost:3000/login');
    const res = await middleware(req);

    // Se redirecionasse para /login de novo, seria loop. Aqui, não deve haver Location.
    expect(res.headers.get('location')).toBeNull();
  });
});
