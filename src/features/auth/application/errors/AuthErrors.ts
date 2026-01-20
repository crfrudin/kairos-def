/**
 * Regras de segurança (anti-enumeração):
 * - Mensagens devem ser genéricas e reaproveitáveis.
 * - Não indicar se email existe, se senha está errada, se usuário está bloqueado etc.
 */
export type AuthError =
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'INVALID_CREDENTIALS'; message: string }
  | { type: 'EMAIL_NOT_CONFIRMED'; message: string }
  | { type: 'RATE_LIMITED'; message: string }
  | { type: 'TOKEN_EXPIRED'; message: string }
  | { type: 'TOKEN_ALREADY_USED'; message: string }
  | { type: 'UNEXPECTED'; message: string };

const GENERIC_AUTH_MESSAGE = 'Não foi possível autenticar. Verifique suas credenciais.';
const GENERIC_REQUEST_MESSAGE = 'Não foi possível concluir sua solicitação. Tente novamente.';

export const AuthErrors = {
  validation(message = GENERIC_REQUEST_MESSAGE): AuthError {
    return { type: 'VALIDATION_ERROR', message };
  },

  invalidCredentials(): AuthError {
    // Mensagem genérica obrigatória (normativo)
    return { type: 'INVALID_CREDENTIALS', message: GENERIC_AUTH_MESSAGE };
  },

  emailNotConfirmed(): AuthError {
    // Ainda genérica (não revela existência), mas orienta fluxo.
    return { type: 'EMAIL_NOT_CONFIRMED', message: 'Confirme seu email para continuar.' };
  },

  rateLimited(): AuthError {
    return { type: 'RATE_LIMITED', message: GENERIC_AUTH_MESSAGE };
  },

  tokenExpired(): AuthError {
    return { type: 'TOKEN_EXPIRED', message: 'Seu link expirou. Solicite um novo.' };
  },

  tokenAlreadyUsed(): AuthError {
    return { type: 'TOKEN_ALREADY_USED', message: 'Este link já foi utilizado. Solicite um novo.' };
  },

  unexpected(): AuthError {
    return { type: 'UNEXPECTED', message: GENERIC_REQUEST_MESSAGE };
  },
} as const;
