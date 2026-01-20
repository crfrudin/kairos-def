import type { IAuthRepository, Result, AuthErrorCode } from '../ports/IAuthRepository';
import { Password } from '../../domain/value-objects/Password';

type ResetPasswordInput = {
  token: string;
  newPassword: string;
};

type ResetPasswordOutput = null;

const GENERIC_MESSAGE = 'Não foi possível redefinir sua senha.';

export class ResetPasswordUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  public async execute(input: ResetPasswordInput): Promise<Result<ResetPasswordOutput, AuthErrorCode>> {
    const token = String(input.token ?? '').trim();
    if (!token) {
      return { ok: false, error: { code: 'TOKEN_INVALID', message: 'Token inválido.' } };
    }

    const passOrError = Password.create(input.newPassword);
    if (!passOrError.ok) {
      // Não detalhar validação (regra anti-abuso / UX neutro)
      return { ok: false, error: { code: 'WEAK_PASSWORD', message: GENERIC_MESSAGE } };
    }

    const res = await this.authRepo.resetPassword({ token, newPassword: passOrError.value });

    if (res.ok) return { ok: true, data: null };

    // Mensagens úteis permitidas para fluxo de token (sem enumeração de usuário)
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

    if (res.error.code === 'WEAK_PASSWORD') {
      return { ok: false, error: { code: 'WEAK_PASSWORD', message: GENERIC_MESSAGE } };
    }

    return { ok: false, error: { code: 'UNEXPECTED', message: GENERIC_MESSAGE } };
  }
}
