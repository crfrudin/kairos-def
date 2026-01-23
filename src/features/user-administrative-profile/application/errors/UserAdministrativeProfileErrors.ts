export type UserAdministrativeProfileErrorCode =
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INFRA_ERROR'
  | 'UNEXPECTED';

export const UserAdministrativeProfileErrors = {
  unauthenticated(): { code: 'UNAUTHENTICATED'; message: string } {
    return { code: 'UNAUTHENTICATED', message: 'Usuário não autenticado.' };
  },

  notFound(): { code: 'NOT_FOUND'; message: string } {
    return { code: 'NOT_FOUND', message: 'Perfil administrativo não encontrado.' };
  },

  validation(message: string, details?: Record<string, unknown>): { code: 'VALIDATION_ERROR'; message: string; details?: Record<string, unknown> } {
    return { code: 'VALIDATION_ERROR', message, details };
  },

  infra(message = 'Falha de infraestrutura ao persistir o perfil administrativo.', details?: Record<string, unknown>): { code: 'INFRA_ERROR'; message: string; details?: Record<string, unknown> } {
    return { code: 'INFRA_ERROR', message, details };
  },

  unexpected(message = 'Não foi possível concluir sua solicitação.', details?: Record<string, unknown>): { code: 'UNEXPECTED'; message: string; details?: Record<string, unknown> } {
    return { code: 'UNEXPECTED', message, details };
  },
} as const;
