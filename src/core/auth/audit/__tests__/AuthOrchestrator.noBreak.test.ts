import { describe, it, expect } from 'vitest';

import { LoginUseCase } from '@/features/auth/application/use-cases/LoginUseCase';
import { AuthOrchestrator } from '@/core/auth/auth-orchestrator';
import type { IAuthRepository, Result, AuthErrorCode } from '@/features/auth/application/ports/IAuthRepository';
import { AuthUser } from '@/features/auth/domain/entities/AuthUser';
import { Email } from '@/features/auth/domain/value-objects/Email';

function ok<T>(data: T) {
  return { ok: true as const, data };
}
function err<TCode extends string>(code: TCode, message: string) {
  return { ok: false as const, error: { code, message } };
}

describe('AuthOrchestrator (no-break on logging failure)', () => {
  it('does not break login flow if audit logger throws', async () => {
    const authRepo: IAuthRepository = {
      async getCurrentUser(): Promise<Result<AuthUser | null, 'UNEXPECTED'>> {
        return ok(null);
      },

      async loginWithEmailAndPassword(): Promise<Result<{ user: AuthUser }, AuthErrorCode>> {
        const email = Email.create('user@example.com');
        if (!email.ok) return err('UNEXPECTED', 'invalid test email');

        return ok({
          user: AuthUser.create({
            id: '00000000-0000-0000-0000-000000000001',
            email: email.value,
            emailConfirmed: true,
            createdAt: new Date(),
          }),
        });
      },

      async signUpWithEmailAndPassword(): Promise<Result<{ user: AuthUser }, AuthErrorCode>> {
        return err('UNEXPECTED', 'not used in this test');
      },

      async logout(): Promise<Result<null, 'UNEXPECTED'>> {
        return ok(null);
      },

      async confirmEmail(): Promise<Result<null, AuthErrorCode>> {
        return err('UNEXPECTED', 'not used in this test');
      },

      async resendEmailConfirmation(): Promise<Result<null, AuthErrorCode>> {
        return err('UNEXPECTED', 'not used in this test');
      },

      async requestPasswordReset(): Promise<Result<null, AuthErrorCode>> {
        return ok(null);
      },

      async resetPassword(): Promise<Result<null, AuthErrorCode>> {
        return ok(null);
      },
    };

    const loginUC = new LoginUseCase(authRepo);

    const orchestrator = new AuthOrchestrator({
      authRepo,
      loginUC,
      signUpUC: {} as any,
      confirmEmailUC: {} as any,
      requestPasswordResetUC: {} as any,
      resetPasswordUC: {} as any,
      audit: {
        async log() {
          throw new Error('boom');
        },
      },
    });

    const res = await orchestrator.login({
      email: 'user@example.com',
      password: 'ValidPassword123!',
      context: { ip: '198.51.100.1', userAgent: 'UA' },
    });

    expect(res.ok).toBe(true);
  });
});
