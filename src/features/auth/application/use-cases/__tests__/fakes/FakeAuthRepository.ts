import type { IAuthRepository, Result, AuthErrorCode } from '../../../ports/IAuthRepository';
import type { AuthUser } from '../../../../domain/entities/AuthUser';
import type { Email } from '../../../../domain/value-objects/Email';
import type { Password } from '../../../../domain/value-objects/Password';

type Handler<T> = () => Promise<T>;

export class FakeAuthRepository implements IAuthRepository {
  private handlers: Partial<{
    getCurrentUser: Handler<Result<AuthUser | null, 'UNEXPECTED'>>;
    loginWithEmailAndPassword: Handler<Result<{ user: AuthUser }, AuthErrorCode>>;
    signUpWithEmailAndPassword: Handler<Result<{ user: AuthUser }, AuthErrorCode>>;
    logout: Handler<Result<null, 'UNEXPECTED'>>;
    confirmEmail: Handler<Result<null, AuthErrorCode>>;
    resendEmailConfirmation: Handler<Result<null, AuthErrorCode>>;
    requestPasswordReset: Handler<Result<null, AuthErrorCode>>;
    resetPassword: Handler<Result<null, AuthErrorCode>>;
  }> = {};

  public onGetCurrentUser(handler: Handler<Result<AuthUser | null, 'UNEXPECTED'>>): void {
    this.handlers.getCurrentUser = handler;
  }

  public onLogin(handler: Handler<Result<{ user: AuthUser }, AuthErrorCode>>): void {
    this.handlers.loginWithEmailAndPassword = handler;
  }

  public onSignUp(handler: Handler<Result<{ user: AuthUser }, AuthErrorCode>>): void {
    this.handlers.signUpWithEmailAndPassword = handler;
  }

  public onLogout(handler: Handler<Result<null, 'UNEXPECTED'>>): void {
    this.handlers.logout = handler;
  }

  public onConfirmEmail(handler: Handler<Result<null, AuthErrorCode>>): void {
    this.handlers.confirmEmail = handler;
  }

  public onResendEmailConfirmation(handler: Handler<Result<null, AuthErrorCode>>): void {
    this.handlers.resendEmailConfirmation = handler;
  }

  public onRequestPasswordReset(handler: Handler<Result<null, AuthErrorCode>>): void {
    this.handlers.requestPasswordReset = handler;
  }

  public onResetPassword(handler: Handler<Result<null, AuthErrorCode>>): void {
    this.handlers.resetPassword = handler;
  }

  async getCurrentUser(): Promise<Result<AuthUser | null, 'UNEXPECTED'>> {
    if (!this.handlers.getCurrentUser) return { ok: true, data: null };
    return this.handlers.getCurrentUser();
  }

  async loginWithEmailAndPassword(_params: { email: Email; password: Password }): Promise<Result<{ user: AuthUser }, AuthErrorCode>> {
    if (!this.handlers.loginWithEmailAndPassword) {
      return { ok: false, error: { code: 'UNEXPECTED', message: 'Handler not set' } };
    }
    return this.handlers.loginWithEmailAndPassword();
  }

  async signUpWithEmailAndPassword(_params: { email: Email; password: Password }): Promise<Result<{ user: AuthUser }, AuthErrorCode>> {
    if (!this.handlers.signUpWithEmailAndPassword) {
      return { ok: false, error: { code: 'UNEXPECTED', message: 'Handler not set' } };
    }
    return this.handlers.signUpWithEmailAndPassword();
  }

  async logout(): Promise<Result<null, 'UNEXPECTED'>> {
    if (!this.handlers.logout) return { ok: true, data: null };
    return this.handlers.logout();
  }

  async confirmEmail(_params: { token: string }): Promise<Result<null, AuthErrorCode>> {
    if (!this.handlers.confirmEmail) {
      return { ok: false, error: { code: 'UNEXPECTED', message: 'Handler not set' } };
    }
    return this.handlers.confirmEmail();
  }

  async resendEmailConfirmation(_params: { email: Email }): Promise<Result<null, AuthErrorCode>> {
    if (!this.handlers.resendEmailConfirmation) return { ok: true, data: null };
    return this.handlers.resendEmailConfirmation();
  }

  async requestPasswordReset(_params: { email: Email }): Promise<Result<null, AuthErrorCode>> {
    if (!this.handlers.requestPasswordReset) return { ok: true, data: null };
    return this.handlers.requestPasswordReset();
  }

  async resetPassword(_params: { token: string; newPassword: Password }): Promise<Result<null, AuthErrorCode>> {
    if (!this.handlers.resetPassword) return { ok: true, data: null };
    return this.handlers.resetPassword();
  }
}
