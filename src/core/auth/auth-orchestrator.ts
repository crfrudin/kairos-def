import 'server-only';

import type { AuthAuditLogger, AuthAuditLogContext, AuthAuditLogParams } from './audit/AuthAuditLogger';
import type { IAuthRepository, Result } from '@/features/auth';

import type { LoginUseCase } from '@/features/auth';
import type { SignUpUseCase } from '@/features/auth';
import type { ConfirmEmailUseCase } from '@/features/auth';
import type { RequestPasswordResetUseCase } from '@/features/auth';
import type { ResetPasswordUseCase } from '@/features/auth';

export class AuthOrchestrator {
  constructor(
    private readonly deps: {
      authRepo: IAuthRepository;

      loginUC: LoginUseCase;
      signUpUC: SignUpUseCase;
      confirmEmailUC: ConfirmEmailUseCase;
      requestPasswordResetUC: RequestPasswordResetUseCase;
      resetPasswordUC: ResetPasswordUseCase;

      audit: AuthAuditLogger;
    }
  ) {}

  private async safeAuditLog(params: AuthAuditLogParams): Promise<void> {
    try {
      await this.deps.audit.log(params);
    } catch {
      // swallow controlado: não quebra o fluxo principal
    }
  }

  async login(params: { email: string; password: string; context?: AuthAuditLogContext }) {
    const res = await this.deps.loginUC.execute({ email: params.email, password: params.password });

    if (res.ok) {
      await this.safeAuditLog({
        userId: res.data.user.getId(),
        eventType: 'login_success',
        context: params.context,
        metadata: { result: 'ok' },
      });
      return res;
    }

    await this.safeAuditLog({
      userId: null,
      eventType: 'login_failure',
      context: params.context,
      metadata: { result: 'error', code: res.error.code },
    });

    return res;
  }

  async signup(params: { email: string; password: string; context?: AuthAuditLogContext }) {
    const res = await this.deps.signUpUC.execute({ email: params.email, password: params.password });

    await this.safeAuditLog({
      userId: res.ok ? res.data.user.getId() : null,
      eventType: 'signup',
      context: params.context,
      metadata: { result: res.ok ? 'ok' : 'error', ...(res.ok ? {} : { code: res.error.code }) },
    });

    return res;
  }

  async confirmEmail(params: { token: string; context?: AuthAuditLogContext }) {
    const res = await this.deps.confirmEmailUC.execute({ token: params.token });

    if (res.ok) {
      const current = await this.deps.authRepo.getCurrentUser().catch(() => ({ ok: true, data: null } as const));
      const userId = current.ok && current.data ? current.data.getId() : null;

      await this.safeAuditLog({
        userId,
        eventType: 'email_confirmed',
        context: params.context,
        metadata: { result: 'ok' },
      });

      return res;
    }

    await this.safeAuditLog({
      userId: null,
      eventType: 'email_confirmed',
      context: params.context,
      metadata: { result: 'error', code: res.error.code },
    });

    return res;
  }

  async requestPasswordReset(params: { email: string; context?: AuthAuditLogContext }) {
    const res = await this.deps.requestPasswordResetUC.execute({ email: params.email });

    await this.safeAuditLog({
      userId: null,
      eventType: 'password_reset_requested',
      context: params.context,
      metadata: { result: res.ok ? 'ok' : 'error', ...(res.ok ? {} : { code: res.error.code }) },
    });

    return res;
  }

  async resetPassword(params: { token: string; newPassword: string; context?: AuthAuditLogContext }) {
    const res = await this.deps.resetPasswordUC.execute({ token: params.token, newPassword: params.newPassword });

    if (res.ok) {
      const current = await this.deps.authRepo.getCurrentUser().catch(() => ({ ok: true, data: null } as const));
      const userId = current.ok && current.data ? current.data.getId() : null;

      await this.safeAuditLog({
        userId,
        eventType: 'password_reset_completed',
        context: params.context,
        metadata: { result: 'ok' },
      });

      return res;
    }

    await this.safeAuditLog({
      userId: null,
      eventType: 'password_reset_completed',
      context: params.context,
      metadata: { result: 'error', code: res.error.code },
    });

    return res;
  }

  async logout(params: { context?: AuthAuditLogContext }): Promise<Result<null, 'UNEXPECTED'>> {
    const current = await this.deps.authRepo.getCurrentUser().catch(() => ({ ok: true, data: null } as const));
    const userId = current.ok && current.data ? current.data.getId() : null;

    const res = await this.deps.authRepo.logout();

    await this.safeAuditLog({
      userId,
      eventType: 'logout',
      context: params.context,
      metadata: { result: res.ok ? 'ok' : 'error' },
    });

    return res;
  }
}
