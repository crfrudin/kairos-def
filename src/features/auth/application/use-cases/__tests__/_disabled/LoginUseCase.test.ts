import { describe, it, expect } from 'vitest';
import { LoginUseCase } from '../LoginUseCase';
import { FakeAuthRepository } from './fakes/FakeAuthRepository';

describe('LoginUseCase', () => {
  it('Login inválido deve retornar mensagem genérica (anti-enumeração)', async () => {
    const repo = new FakeAuthRepository();

    // Simula cenário que poderia vazar enumeração (USER_NOT_FOUND)
    repo.onLogin(async () => ({
      ok: false,
      error: { code: 'USER_NOT_FOUND', message: 'user not found' },
    }));

    const uc = new LoginUseCase(repo);

    const res = await uc.execute({ email: 'noone@example.com', password: 'Abcdefg1' });

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected error');

    expect(res.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.error.message).toBe('Não foi possível autenticar. Verifique suas credenciais.');
  });
});
