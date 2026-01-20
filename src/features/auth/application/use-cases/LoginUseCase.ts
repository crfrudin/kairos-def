import type { IAuthRepository, Result, AuthErrorCode } from '../ports/IAuthRepository';
import { Email } from '../../domain/value-objects/Email';
import { Password } from '../../domain/value-objects/Password';
import type { AuthUser } from '../../domain/entities/AuthUser';

type LoginInput = {
  email: string;
  password: string;
};

type LoginOutput = {
  user: AuthUser;
};

const GENERIC_LOGIN_MESSAGE = 'Não foi possível autenticar. Verifique suas credenciais.';

export class LoginUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  public async execute(input: LoginInput): Promise<Result<LoginOutput, AuthErrorCode>> {
    const emailOrError = Email.create(input.email);
    const passOrError = Password.create(input.password);

    // Anti-enumeração: qualquer falha de validação -> INVALID_CREDENTIALS genérico
    if (!emailOrError.ok || !passOrError.ok) {
      return {
        ok: false,
        error: { code: 'INVALID_CREDENTIALS', message: GENERIC_LOGIN_MESSAGE },
      };
    }

    const res = await this.authRepo.loginWithEmailAndPassword({
      email: emailOrError.value,
      password: passOrError.value,
    });

    if (res.ok) return { ok: true, data: { user: res.data.user } };

    // Anti-enumeração: USER_NOT_FOUND não pode vazar (nem diferenciar de senha errada)
    if (res.error.code === 'USER_NOT_FOUND' || res.error.code === 'INVALID_CREDENTIALS') {
      return { ok: false, error: { code: 'INVALID_CREDENTIALS', message: GENERIC_LOGIN_MESSAGE } };
    }

    // Mantém erro tipado para fluxos “permitidos” (sem revelar existência)
    if (res.error.code === 'EMAIL_NOT_CONFIRMED') {
      return { ok: false, error: { code: 'EMAIL_NOT_CONFIRMED', message: 'Confirme seu email para continuar.' } };
    }

    if (res.error.code === 'RATE_LIMITED') {
      return { ok: false, error: { code: 'RATE_LIMITED', message: GENERIC_LOGIN_MESSAGE } };
    }

    // Fallback seguro
    return { ok: false, error: { code: 'UNEXPECTED', message: 'Não foi possível concluir sua solicitação.' } };
  }
}
