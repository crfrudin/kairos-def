import { describe, it, expect } from 'vitest';
import { GetUserAdministrativeProfileUseCase } from '../use-cases/GetUserAdministrativeProfileUseCase';
import { FakeUserAdministrativeProfileRepository } from './fakes/FakeUserAdministrativeProfileRepository';

describe('GetUserAdministrativeProfileUseCase', () => {
  it('deve retornar VALIDATION_ERROR quando userId estiver ausente', async () => {
    const repo = new FakeUserAdministrativeProfileRepository();
    const uc = new GetUserAdministrativeProfileUseCase(repo);

    const res = await uc.execute({ userId: '' });

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected error');
    expect(res.error.code).toBe('VALIDATION_ERROR');
  });

  it('deve retornar profile=null quando não existir contrato', async () => {
    const repo = new FakeUserAdministrativeProfileRepository();
    const uc = new GetUserAdministrativeProfileUseCase(repo);

    const res = await uc.execute({ userId: 'u1' });

    expect(res.ok).toBe(true);
    expect(res.data.profile).toBe(null);
  });
});
