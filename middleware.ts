import { NextResponse, type NextRequest } from 'next/server';
import { getAuthClaimsFromNextRequest } from '@/features/auth';

const PUBLIC_ROUTES_EXACT = new Set<string>([
  '/',
  '/login',
  '/signup',
  '/recuperar-senha',
  '/confirmar-email',
  '/assinatura',
  '/404',
  '/500',
]);

const AUTH_PUBLIC_ROUTES = new Set<string>(['/login', '/signup', '/recuperar-senha']);

const EMAIL_UNCONFIRMED_ALLOWED_EXACT = new Set<string>([
  '/onboarding', // fluxo permitido (placeholder)
]);

// 🔒 Rotas internas que não podem ser acessadas por ninguém (mesmo autenticado)
const PRIVATE_ROUTES_PREFIX = ['/robo'];

const AUTHENTICATED_REDIRECT_DEFAULT = '/perfil';
const EMAIL_UNCONFIRMED_REDIRECT_DEFAULT = '/onboarding';

// ✅ BYPASS CIRÚRGICO (OPÇÃO 2 — GOVERNANÇA)
// Rotas de integração externa que NÃO devem passar por auth/cookies/claims.
// Essas rotas devem ser seguras por validação própria (ex.: Stripe-Signature no handler).
const STRIPE_BYPASS_ROUTES_EXACT = new Set<string>([
  '/api/stripe/webhook',
  '/api/stripe/checkout',
]);

function isStaticOrInternalPath(pathname: string): boolean {
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/favicon.ico')) return true;
  if (pathname.startsWith('/robots.txt')) return true;
  if (pathname.startsWith('/sitemap.xml')) return true;
  if (pathname.startsWith('/manifest.json')) return true;

  // Assets comuns (defensivo)
  if (pathname.startsWith('/images/')) return true;
  if (pathname.startsWith('/icons/')) return true;
  if (pathname.startsWith('/fonts/')) return true;

  return false;
}

function isStripeBypassRoute(pathname: string): boolean {
  // Aceita também trailing slash/subpath sob o mesmo prefixo, sem abrir superfície fora do escopo.
  // Ex.: '/api/stripe/webhook/' ou '/api/stripe/webhook/...' (se algum dia existir)
  for (const base of STRIPE_BYPASS_ROUTES_EXACT) {
    if (pathname === base) return true;
    if (pathname.startsWith(`${base}/`)) return true;
  }
  return false;
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES_EXACT.has(pathname);
}

function isAuthPublicRoute(pathname: string): boolean {
  return AUTH_PUBLIC_ROUTES.has(pathname);
}

function isPrivateRoute(pathname: string): boolean {
  return PRIVATE_ROUTES_PREFIX.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function safeRedirect(req: NextRequest, toPath: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = toPath;
  url.search = '';
  return NextResponse.redirect(url);
}

function withClaimsHeaders(
  res: NextResponse,
  claims: { is_authenticated: boolean; user_id: string | null; email_confirmed: boolean }
) {
  res.headers.set('x-kairos-is-authenticated', String(claims.is_authenticated));
  res.headers.set('x-kairos-user-id', claims.user_id ? String(claims.user_id) : '');
  res.headers.set('x-kairos-email-confirmed', String(claims.email_confirmed));

  // Gancho/placeholder para “autorização por plano” (NÃO implementar aqui).
  // A fase 7 decide; aqui só deixamos o espaço auditável.
  res.headers.set('x-kairos-plan-authorization', 'UNIMPLEMENTED_PHASE_7');

  return res;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Bypass apenas para recursos internos/estáticos (não são “rotas protegidas”)
  if (isStaticOrInternalPath(pathname)) {
    return NextResponse.next();
  }

  // ✅ BYPASS Stripe (OPÇÃO 2 — GOVERNANÇA)
  // Não calcula claims, não injeta headers, não redireciona.
  // Segurança ocorre no handler (ex.: verificação Stripe-Signature).
  if (isStripeBypassRoute(pathname)) {
    return NextResponse.next();
  }

  // 🔒 Bloqueio hard de rotas privadas (ninguém acessa, nem autenticado)
  if (isPrivateRoute(pathname)) {
    return safeRedirect(req, '/404');
  }

  // Criamos o response “next” para permitir que o SSR helper atualize cookies se necessário.
  const res = NextResponse.next();

  // Claims confiáveis via Feature Auth (public API)
  const claims = await getAuthClaimsFromNextRequest({ req, res });

  // Injeção de claims (auditável)
  withClaimsHeaders(res, claims);

  const routeIsPublic = isPublicRoute(pathname);

  // 1) Usuário NÃO autenticado tentando rota protegida -> /login
  if (!claims.is_authenticated && !routeIsPublic) {
    return safeRedirect(req, '/login');
  }

  // 2) Usuário autenticado SEM email confirmado -> fluxo permitido (onboarding), exceto se já estiver em rota permitida
  if (claims.is_authenticated && !claims.email_confirmed) {
    const allowed = EMAIL_UNCONFIRMED_ALLOWED_EXACT.has(pathname) || routeIsPublic;
    if (!allowed) {
      if (pathname === EMAIL_UNCONFIRMED_REDIRECT_DEFAULT) return res;
      return safeRedirect(req, EMAIL_UNCONFIRMED_REDIRECT_DEFAULT);
    }
  }

  // 3) Usuário autenticado tentando rota pública de auth -> redirect para área autenticada (equivalente atual: /perfil)
  if (claims.is_authenticated && isAuthPublicRoute(pathname)) {
    if (pathname === AUTHENTICATED_REDIRECT_DEFAULT) return res;
    return safeRedirect(req, AUTHENTICATED_REDIRECT_DEFAULT);
  }

  // 4) Rotas públicas e autenticadas passam
  return res;
}

// Matcher global (aplica de forma centralizada)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
