import type {
  IAuthRepository,
  LoginUseCase,
  SignUpUseCase,
  ConfirmEmailUseCase,
  RequestPasswordResetUseCase,
  ResetPasswordUseCase,
} from '@/features/auth';

import {
  LoginUseCase as LoginUC,
  SignUpUseCase as SignUpUC,
  ConfirmEmailUseCase as ConfirmEmailUC,
  RequestPasswordResetUseCase as RequestPasswordResetUC,
  ResetPasswordUseCase as ResetPasswordUC,
} from '@/features/auth';

import { SupabaseAuthRepository } from '@/features/auth/infra/SupabaseAuthRepository';

/**
 * Composition Root (Auth) — ETAPA A (CORE)
 *
 * Regras:
 * - Wiring determinístico (sem lógica de regra de negócio aqui).
 * - Infra concreta (SupabaseAuthRepository) instanciada aqui.
 * - Use-cases recebem dependências via constructor.
 */
export interface AuthComposition {
  authRepository: IAuthRepository;

  signUpUseCase: SignUpUseCase;
  loginUseCase: LoginUseCase;
  confirmEmailUseCase: ConfirmEmailUseCase;
  requestPasswordResetUseCase: RequestPasswordResetUseCase;
  resetPasswordUseCase: ResetPasswordUseCase;
}

function getRequiredEnv(name: string): string {
  const v = String(process.env[name] ?? '').trim();
  if (!v) throw new Error(`AUTH_ENV_MISSING: ${name} não definido.`);
  return v;
}

export function createAuthComposition(): AuthComposition {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const authRepository = new SupabaseAuthRepository({ supabaseUrl, supabaseAnonKey });

  return {
    authRepository,

    signUpUseCase: new SignUpUC(authRepository),
    loginUseCase: new LoginUC(authRepository),
    confirmEmailUseCase: new ConfirmEmailUC(authRepository),
    requestPasswordResetUseCase: new RequestPasswordResetUC(authRepository),
    resetPasswordUseCase: new ResetPasswordUC(authRepository),
  };
}
