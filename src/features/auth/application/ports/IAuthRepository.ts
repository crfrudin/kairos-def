import type { AuthUser } from '../../domain/entities/AuthUser';
import type { Email } from '../../domain/value-objects/Email';
import type { Password } from '../../domain/value-objects/Password';

/**
 * Result obrigatório (Norma 0.2).
 * Use-cases e ports retornam Result ao invés de lançar exceptions em falhas esperadas.
 */
export type Result<TData, TErrorCode extends string> =
  | { ok: true; data: TData }
  | { ok: false; error: { code: TErrorCode; message: string; details?: Record<string, string> } };

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'RATE_LIMITED'
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_ALREADY_USED'
  | 'USER_NOT_FOUND'
  | 'WEAK_PASSWORD'
  | 'CONFLICT'
  | 'UNEXPECTED';

/**
 * Porta única de acesso a qualquer provedor de autenticação.
 * Nesta etapa: APENAS contrato. Nenhuma integração concreta.
 */
export interface IAuthRepository {
  /**
   * Retorna o usuário autenticado no contexto atual (session/cookies), ou null.
   */
  getCurrentUser(): Promise<Result<AuthUser | null, 'UNEXPECTED'>>;

  /**
   * Login com email/senha.
   * Deve sempre respeitar mensagens genéricas na UI para evitar enumeração.
   */
  loginWithEmailAndPassword(params: {
    email: Email;
    password: Password;
  }): Promise<Result<{ user: AuthUser }, AuthErrorCode>>;

  /**
   * Cadastro (sign-up) com email/senha.
   * Deve disparar envio de email de confirmação via provedor (na infra, futuramente).
   */
  signUpWithEmailAndPassword(params: {
    email: Email;
    password: Password;
  }): Promise<Result<{ user: AuthUser }, AuthErrorCode>>;

  /**
   * Logout (encerra sessão).
   */
  logout(): Promise<Result<null, 'UNEXPECTED'>>;

  /**
   * Confirmação de email por token (ex.: link recebido no email).
   * Token é de uso único e pode expirar (regra aplicada pelo provedor/infra).
   */
  confirmEmail(params: { token: string }): Promise<Result<null, AuthErrorCode>>;

  /**
   * Reenvio de confirmação de email (limitado por política anti-abuso).
   */
  resendEmailConfirmation(params: { email: Email }): Promise<Result<null, AuthErrorCode>>;

  /**
   * Solicita reset de senha (envio de link/token).
   * Resposta deve ser genérica na UI.
   */
  requestPasswordReset(params: { email: Email }): Promise<Result<null, AuthErrorCode>>;

  /**
   * Efetiva reset de senha com token + nova senha.
   */
  resetPassword(params: {
    token: string;
    newPassword: Password;
  }): Promise<Result<null, AuthErrorCode>>;
}
