import 'server-only';

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

import { SupabaseAuthRepositorySSR } from '@/features/auth/infra/ssr/SupabaseAuthRepositorySSR';

import type { AuthAuditLogger } from '@/core/auth/audit/AuthAuditLogger';
import { SupabaseAuthAuditLogger } from '@/core/auth/audit/AuthAuditLogger';
import { AuthOrchestrator } from '@/core/auth/auth-orchestrator';

export interface AuthSsrComposition {
  authRepository: IAuthRepository;

  signUpUseCase: SignUpUseCase;
  loginUseCase: LoginUseCase;
  confirmEmailUseCase: ConfirmEmailUseCase;
  requestPasswordResetUseCase: RequestPasswordResetUseCase;
  resetPasswordUseCase: ResetPasswordUseCase;

  auditLogger: AuthAuditLogger;
  orchestrator: AuthOrchestrator;
}

export function createAuthSsrComposition(): AuthSsrComposition {
  const authRepository = new SupabaseAuthRepositorySSR();

  const signUpUseCase = new SignUpUC(authRepository);
  const loginUseCase = new LoginUC(authRepository);
  const confirmEmailUseCase = new ConfirmEmailUC(authRepository);
  const requestPasswordResetUseCase = new RequestPasswordResetUC(authRepository);
  const resetPasswordUseCase = new ResetPasswordUC(authRepository);

  const auditLogger: AuthAuditLogger = new SupabaseAuthAuditLogger();

  const orchestrator = new AuthOrchestrator({
    authRepo: authRepository,
    loginUC: loginUseCase,
    signUpUC: signUpUseCase,
    confirmEmailUC: confirmEmailUseCase,
    requestPasswordResetUC: requestPasswordResetUseCase,
    resetPasswordUC: resetPasswordUseCase,
    audit: auditLogger,
  });

  return {
    authRepository,

    signUpUseCase,
    loginUseCase,
    confirmEmailUseCase,
    requestPasswordResetUseCase,
    resetPasswordUseCase,

    auditLogger,
    orchestrator,
  };
}
