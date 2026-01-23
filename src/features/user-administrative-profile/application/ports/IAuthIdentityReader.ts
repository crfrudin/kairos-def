import type { Result } from './Result';

export type IdentityErrorCode = 'UNAUTHENTICATED' | 'UNEXPECTED';

export interface IAuthIdentityReader {
  /**
   * Retorna o userId autenticado (fonte: middleware/SSR/orquestração), ou erro tipado.
   * Proibido: ler cookies/sessão/headers diretamente aqui.
   */
  getAuthenticatedUserId(): Promise<Result<{ userId: string }, IdentityErrorCode>>;
}
