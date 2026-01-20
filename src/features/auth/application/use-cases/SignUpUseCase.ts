import type { IAuthRepository, Result, AuthErrorCode } from '../ports/IAuthRepository';
import { Email } from '../../domain/value-objects/Email';
import { Password } from '../../domain/value-objects/Password';
import type { AuthUser } from '../../domain/entities/AuthUser';

type SignUpInput = {
  email: string;
  password: string;
};

type SignUpOutput = {
  user: AuthUser;
};

const GENERIC_SIGNUP_MESSAGE = 'Não foi possível concluir o cadastro.';

export class SignUpUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  public async execute(input: SignUpInput): Promise<Result<SignUpOutput, AuthErrorCode>> {
    const emailOrError = Email.create(input.email);
    const passOrError = Password.create(input.password);

    if (!emailOrError.ok || !passOrError.ok) {
      // Não detalhar validação de password aqui (anti-enum / UX neutro).
      // Mantém tipagem: usa WEAK_PASSWORD.
      return { ok: false, error: { code: 'WEAK_PASSWORD', message: GENERIC_SIGNUP_MESSAGE } };
    }

    const res = await this.authRepo.signUpWithEmailAndPassword({
      email: emailOrError.value,
      password: passOrError.value,
    });

    if (res.ok) return { ok: true, data: { user: res.data.user } };

    // Conflito (email já cadastrado etc.) — mensagem neutra
    if (res.error.code === 'CONFLICT') {
      return { ok: false, error: { code: 'CONFLICT', message: GENERIC_SIGNUP_MESSAGE } };
    }

    if (res.error.code === 'RATE_LIMITED') {
      return { ok: false, error: { code: 'RATE_LIMITED', message: GENERIC_SIGNUP_MESSAGE } };
    }

    if (res.error.code === 'WEAK_PASSWORD') {
      return { ok: false, error: { code: 'WEAK_PASSWORD', message: GENERIC_SIGNUP_MESSAGE } };
    }

    return { ok: false, error: { code: 'UNEXPECTED', message: GENERIC_SIGNUP_MESSAGE } };
  }
}
