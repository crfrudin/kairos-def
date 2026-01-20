import { describe, it, expect } from 'vitest';
import { ConfirmEmailUseCase } from '../ConfirmEmailUseCase';
import { FakeAuthRepository } from './fakes/FakeAuthRepository';

describe('ConfirmEmailUseCase', () => {
  it('Token expirado deve retornar TOKEN_EXPIRED', async () => {
    const repo = new FakeAuthRepository();
    repo.onConfirmEmail(async () => ({
      ok: false,
      error: { code: 'TOKEN_EXPIRED', message: 'expired' },
    }));

    const uc = new ConfirmEmailUseCase(repo);

    const res = await uc.execute({ token: 'token-abc' });

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected error');

    expect(res.error.code).toBe('TOKEN_EXPIRED');
    expect(res.error.message).toBe('Seu link expirou. Solicite um novo.');
  });

  it('Token reutilizado deve ser rejeitado com TOKEN_ALREADY_USED', async () => {
    const repo = new FakeAuthRepository();
    repo.onConfirmEmail(async () => ({
      ok: false,
      error: { code: 'TOKEN_ALREADY_USED', message: 'already used' },
    }));

    const uc = new ConfirmEmailUseCase(repo);

    const res = await uc.execute({ token: 'token-xyz' });

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected error');

    expect(res.error.code).toBe('TOKEN_ALREADY_USED');
    expect(res.error.message).toBe('Este link já foi utilizado. Solicite um novo.');
  });
});
