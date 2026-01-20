import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { IAuthRepository, Result, AuthErrorCode } from '../application/ports/IAuthRepository';
import { AuthUser } from '../domain/entities/AuthUser';
import type { Email } from '../domain/value-objects/Email';
import type { Password } from '../domain/value-objects/Password';
import { Email as EmailVO } from '../domain/value-objects/Email';

type SupabaseAuthRepositoryConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type SupabaseUserLike = {
  id: string;
  email: string | null;
  email_confirmed_at?: string | null;
  created_at?: string | null;
};

function toAuthUser(u: SupabaseUserLike): Result<AuthUser, 'UNEXPECTED'> {
  const rawEmail = u.email ?? '';
  const emailOrErr = EmailVO.create(rawEmail);

  if (!emailOrErr.ok) {
    return { ok: false, error: { code: 'UNEXPECTED', message: 'Falha ao interpretar usuário autenticado.' } };
  }

  const createdAt = u.created_at ? new Date(u.created_at) : new Date(0);
  const emailConfirmed = Boolean(u.email_confirmed_at);

  return {
    ok: true,
    data: AuthUser.create({
      id: u.id,
      email: emailOrErr.value,
      emailConfirmed,
      createdAt,
    }),
  };
}

function mapAuthError(err: unknown): { code: AuthErrorCode; message: string } {
  const anyErr = err as { message?: string; status?: number; name?: string };
  const msg = String(anyErr?.message ?? '').toLowerCase();
  const status = typeof anyErr?.status === 'number' ? anyErr.status : undefined;

  if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
    return { code: 'RATE_LIMITED', message: 'Limite atingido. Tente novamente.' };
  }

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas.' };
  }

  if (msg.includes('email not confirmed') || msg.includes('confirm your email')) {
    return { code: 'EMAIL_NOT_CONFIRMED', message: 'Email não confirmado.' };
  }

  if (msg.includes('user already registered') || msg.includes('already registered') || msg.includes('already exists')) {
    return { code: 'CONFLICT', message: 'Conflito de cadastro.' };
  }

  if (msg.includes('password') && (msg.includes('weak') || msg.includes('strength') || msg.includes('too short'))) {
    return { code: 'WEAK_PASSWORD', message: 'Senha fraca.' };
  }

  if (msg.includes('expired')) {
    return { code: 'TOKEN_EXPIRED', message: 'Token expirado.' };
  }

  if (msg.includes('invalid') && (msg.includes('token') || msg.includes('otp') || msg.includes('code'))) {
    return { code: 'TOKEN_INVALID', message: 'Token inválido.' };
  }

  return { code: 'UNEXPECTED', message: 'Erro inesperado.' };
}

/**
 * IMPORTANTES LIMITES DE ESCOPO (ETAPA A):
 * - Sem cookies/sessão persistida aqui.
 * - Sem middleware/global auth.
 * - Tokens de confirmação/reset são tratados como "code" de callback e
 *   trocados por sessão via exchangeCodeForSession.
 * - Fluxos de UI/redirect serão implementados em etapas futuras.
 */
export class SupabaseAuthRepository implements IAuthRepository {
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;

  constructor(config: SupabaseAuthRepositoryConfig) {
    this.supabaseUrl = String(config.supabaseUrl ?? '').trim();
    this.supabaseAnonKey = String(config.supabaseAnonKey ?? '').trim();

    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      throw new Error('AUTH_CONFIG_INVALID: Supabase URL/ANON KEY não configurados.');
    }
  }

  private createSupabaseClient() {
    return createClient(this.supabaseUrl, this.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  private async exchangeCodeForSession(code: string): Promise<Result<null, AuthErrorCode>> {
    try {
      const supabase = this.createSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const mapped = mapAuthError(error);
        return { ok: false, error: { code: mapped.code, message: mapped.message } };
      }
      return { ok: true, data: null };
    } catch (e) {
      const mapped = mapAuthError(e);
      return { ok: false, error: { code: mapped.code, message: mapped.message } };
    }
  }

  async getCurrentUser(): Promise<Result<AuthUser | null, 'UNEXPECTED'>> {
    try {
      const supabase = this.createSupabaseClient();
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        return { ok: false, error: { code: 'UNEXPECTED', message: 'Não foi possível obter usuário atual.' } };
      }

      if (!data?.user) return { ok: true, data: null };

      const mapped = toAuthUser(data.user as unknown as SupabaseUserLike);
      if (!mapped.ok) return { ok: false, error: { code: 'UNEXPECTED', message: mapped.error.message } };

      return { ok: true, data: mapped.data };
    } catch {
      return { ok: false, error: { code: 'UNEXPECTED', message: 'Não foi possível obter usuário atual.' } };
    }
  }

  async loginWithEmailAndPassword(params: {
    email: Email;
    password: Password;
  }): Promise<Result<{ user: AuthUser }, AuthErrorCode>> {
    try {
      const supabase = this.createSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email.getValue(),
        password: params.password.getValueUnsafe(),
      });

      if (error) {
        const mapped = mapAuthError(error);
        return { ok: false, error: { code: mapped.code, message: mapped.message } };
      }

      if (!data?.user) {
        return { ok: false, error: { code: 'UNEXPECTED', message: 'Falha ao autenticar.' } };
      }

      const mappedUser = toAuthUser(data.user as unknown as SupabaseUserLike);
      if (!mappedUser.ok) return { ok: false, error: { code: 'UNEXPECTED', message: mappedUser.error.message } };

      return { ok: true, data: { user: mappedUser.data } };
    } catch (e) {
      const mapped = mapAuthError(e);
      return { ok: false, error: { code: mapped.code, message: mapped.message } };
    }
  }

  async signUpWithEmailAndPassword(params: {
    email: Email;
    password: Password;
  }): Promise<Result<{ user: AuthUser }, AuthErrorCode>> {
    try {
      const supabase = this.createSupabaseClient();

      const { data, error } = await supabase.auth.signUp({
        email: params.email.getValue(),
        password: params.password.getValueUnsafe(),
      });

      if (error) {
        const mapped = mapAuthError(error);
        return { ok: false, error: { code: mapped.code, message: mapped.message } };
      }

      if (!data?.user) {
        return { ok: false, error: { code: 'UNEXPECTED', message: 'Falha ao cadastrar.' } };
      }

      const mappedUser = toAuthUser(data.user as unknown as SupabaseUserLike);
      if (!mappedUser.ok) return { ok: false, error: { code: 'UNEXPECTED', message: mappedUser.error.message } };

      return { ok: true, data: { user: mappedUser.data } };
    } catch (e) {
      const mapped = mapAuthError(e);
      return { ok: false, error: { code: mapped.code, message: mapped.message } };
    }
  }

  async logout(): Promise<Result<null, 'UNEXPECTED'>> {
    try {
      const supabase = this.createSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { ok: false, error: { code: 'UNEXPECTED', message: 'Não foi possível sair.' } };
      }
      return { ok: true, data: null };
    } catch {
      return { ok: false, error: { code: 'UNEXPECTED', message: 'Não foi possível sair.' } };
    }
  }

  async confirmEmail(params: { token: string }): Promise<Result<null, AuthErrorCode>> {
    const code = String(params.token ?? '').trim();
    if (!code) return { ok: false, error: { code: 'TOKEN_INVALID', message: 'Token inválido.' } };

    // Nesta etapa, tratamos token como "code" do callback.
    return this.exchangeCodeForSession(code);
  }

  async resendEmailConfirmation(params: { email: Email }): Promise<Result<null, AuthErrorCode>> {
    try {
      const supabase = this.createSupabaseClient();

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: params.email.getValue(),
      });

      if (error) {
        const mapped = mapAuthError(error);
        return { ok: false, error: { code: mapped.code, message: mapped.message } };
      }

      return { ok: true, data: null };
    } catch (e) {
      const mapped = mapAuthError(e);
      return { ok: false, error: { code: mapped.code, message: mapped.message } };
    }
  }

  async requestPasswordReset(params: { email: Email }): Promise<Result<null, AuthErrorCode>> {
    try {
      const supabase = this.createSupabaseClient();

      const { error } = await supabase.auth.resetPasswordForEmail(params.email.getValue());
      if (error) {
        const mapped = mapAuthError(error);
        return { ok: false, error: { code: mapped.code, message: mapped.message } };
      }

      return { ok: true, data: null };
    } catch (e) {
      const mapped = mapAuthError(e);
      return { ok: false, error: { code: mapped.code, message: mapped.message } };
    }
  }

  async resetPassword(params: { token: string; newPassword: Password }): Promise<Result<null, AuthErrorCode>> {
    const code = String(params.token ?? '').trim();
    if (!code) return { ok: false, error: { code: 'TOKEN_INVALID', message: 'Token inválido.' } };

    // 1) troca "code" por sessão
    const exchanged = await this.exchangeCodeForSession(code);
    if (!exchanged.ok) return exchanged;

    // 2) atualiza senha no contexto da sessão obtida
    try {
      const supabase = this.createSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: params.newPassword.getValueUnsafe(),
      });

      if (error) {
        const mapped = mapAuthError(error);
        return { ok: false, error: { code: mapped.code, message: mapped.message } };
      }

      return { ok: true, data: null };
    } catch (e) {
      const mapped = mapAuthError(e);
      return { ok: false, error: { code: mapped.code, message: mapped.message } };
    }
  }
}
