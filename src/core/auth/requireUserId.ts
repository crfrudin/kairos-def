import 'server-only';

/**
 * Boundary de autenticação (server-only).
 *
 * STATUS ATUAL:
 * - Autenticação ainda não está implementada no projeto.
 * - Por segurança, NÃO existe fallback (query, header, env etc).
 *
 * Quando a feature auth existir (Fase 9), este módulo deve ser
 * substituído por leitura do usuário autenticado (cookies/session).
 */
export async function requireAuthenticatedUserId(): Promise<string> {
  throw new Error(
    'AUTH_NOT_CONFIGURED: Autenticação ainda não implementada. ' +
      'Impossível obter userId com segurança para operar o Perfil.'
  );
}
