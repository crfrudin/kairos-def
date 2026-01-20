import type { IAuthRepository, Result, AuthErrorCode } from '../ports/IAuthRepository';

type ConfirmEmailInput = {
  token: string;
};

type ConfirmEmailOutput = null;

export class ConfirmEmailUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  public async execute(input: ConfirmEmailInput): Promise<Result<ConfirmEmailOutput, AuthErrorCode>> {
    const token = String(input.token ?? '').trim();

    // Token vazio -> TOKEN_INVALID (determinístico)
    if (!token) {
      return { ok: false, error: { code: 'TOKEN_INVALID', message: 'Token inválido.' } };
    }

    const res = await this.authRepo.confirmEmail({ token });

    if (res.ok) return { ok: true, data: null };

    // Mantém tipagem para UX do fluxo de confirmação
    if (res.error.code === 'TOKEN_EXPIRED') {
      return { ok: false, error: { code: 'TOKEN_EXPIRED', message: 'Seu link expirou. Solicite um novo.' } };
    }

    if (res.error.code === 'TOKEN_ALREADY_USED') {
      return {
        ok: false,
        error: { code: 'TOKEN_ALREADY_USED', message: 'Este link já foi utilizado. Solicite um novo.' },
      };
    }

    if (res.error.code === 'TOKEN_INVALID') {
      return { ok: false, error: { code: 'TOKEN_INVALID', message: 'Token inválido.' } };
    }

    return { ok: false, error: { code: 'UNEXPECTED', message: 'Não foi possível concluir sua solicitação.' } };
  }
}
