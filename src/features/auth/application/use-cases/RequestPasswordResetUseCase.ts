import type { IAuthRepository, Result, AuthErrorCode } from '../ports/IAuthRepository';
import { Email } from '../../domain/value-objects/Email';

type RequestPasswordResetInput = {
  email: string;
};

type RequestPasswordResetOutput = null;

/**
 * Anti-enumeração:
 * - Mesmo se email não existir, o provedor deve responder de forma neutra.
 * - Este use-case mantém mensagem genérica.
 */
const GENERIC_MESSAGE = 'Se o email estiver correto, você receberá instruções para redefinir sua senha.';

export class RequestPasswordResetUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  public async execute(
    input: RequestPasswordResetInput
  ): Promise<Result<RequestPasswordResetOutput, AuthErrorCode>> {
    const emailOrError = Email.create(input.email);

    // Anti-enumeração: email inválido também retorna resposta genérica
    if (!emailOrError.ok) {
      return { ok: true, data: null };
    }

    const res = await this.authRepo.requestPasswordReset({ email: emailOrError.value });

    if (res.ok) return { ok: true, data: null };

    // Anti-enumeração: mesmo em erros esperados, manter genérico
    if (res.error.code === 'RATE_LIMITED') {
      return { ok: false, error: { code: 'RATE_LIMITED', message: GENERIC_MESSAGE } };
    }

    // Fallback seguro
    return { ok: false, error: { code: 'UNEXPECTED', message: GENERIC_MESSAGE } };
  }
}
