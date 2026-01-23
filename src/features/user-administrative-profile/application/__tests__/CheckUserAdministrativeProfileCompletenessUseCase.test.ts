import { describe, it, expect } from 'vitest';
import { CheckUserAdministrativeProfileCompletenessUseCase } from '../use-cases/CheckUserAdministrativeProfileCompletenessUseCase';
import { FakeUserAdministrativeProfileRepository } from './fakes/FakeUserAdministrativeProfileRepository';

describe('CheckUserAdministrativeProfileCompletenessUseCase', () => {
  it('deve retornar VALIDATION_ERROR quando userId estiver ausente', async () => {
    const repo = new FakeUserAdministrativeProfileRepository();
    const uc = new CheckUserAdministrativeProfileCompletenessUseCase(repo);

    const res = await uc.execute({ userId: '' });

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected error');
    expect(res.error.code).toBe('VALIDATION_ERROR');
  });

  it('deve retornar exists=false quando não existir contrato', async () => {
    const repo = new FakeUserAdministrativeProfileRepository();
    const uc = new CheckUserAdministrativeProfileCompletenessUseCase(repo);

    const res = await uc.execute({ userId: 'u1' });

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    expect(res.data.exists).toBe(false);
    expect(res.data.isComplete).toBe(false);
    expect(res.data.validation ?? null).toBe(null);
  });

  it('deve retornar isComplete=false quando domínio reprovar o contrato persistido', async () => {
    const repo = new FakeUserAdministrativeProfileRepository();
    repo.onGetFullContract(async () => ({
      userId: 'u1',
      profile: {
        fullName: '  ', // inválido
        socialName: null,
        birthDate: null,
        gender: null,
        phone: null,
        secondaryEmail: null,
        address: null,
        preferences: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const uc = new CheckUserAdministrativeProfileCompletenessUseCase(repo);

    const res = await uc.execute({ userId: 'u1' });

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    expect(res.data.exists).toBe(true);
    expect(res.data.isComplete).toBe(false);
    expect(res.data.validation?.domainCode).toBe('FULL_NAME_REQUIRED');
  });

  it('deve retornar isComplete=true quando domínio aceitar', async () => {
    const repo = new FakeUserAdministrativeProfileRepository();
    repo.onGetFullContract(async () => ({
      userId: 'u1',
      profile: {
        fullName: 'Ruggeri Ramos',
        socialName: null,
        birthDate: null,
        gender: null,
        phone: null,
        secondaryEmail: null,
        address: null,
        preferences: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const uc = new CheckUserAdministrativeProfileCompletenessUseCase(repo);

    const res = await uc.execute({ userId: 'u1' });

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    expect(res.data.exists).toBe(true);
    expect(res.data.isComplete).toBe(true);
    expect(res.data.validation ?? null).toBe(null);
  });
});
