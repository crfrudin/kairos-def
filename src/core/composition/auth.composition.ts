import type { IAuthRepository } from '@/features/auth';

/**
 * Composition Root (Auth)
 * Nesta etapa: apenas contrato de composição (sem infra concreta).
 */
export interface AuthComposition {
  authRepository: IAuthRepository;
}

/**
 * Cria a composição da feature Auth.
 * Nenhuma lógica aqui — apenas wiring determinístico.
 */
export function createAuthComposition(params: AuthComposition): AuthComposition {
  return {
    authRepository: params.authRepository,
  };
}
