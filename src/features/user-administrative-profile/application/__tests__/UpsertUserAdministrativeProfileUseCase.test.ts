import { describe, it, expect } from 'vitest';
import { UpsertUserAdministrativeProfileUseCase } from '../use-cases/UpsertUserAdministrativeProfileUseCase';
import { FakeUserAdministrativeProfileRepository } from './fakes/FakeUserAdministrativeProfileRepository';
import { FakeUserAdministrativeProfileTransaction } from './fakes/FakeUserAdministrativeProfileTransaction';

function getDomainCodeFromErrorDetails(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;
  const rec = details as Record<string, unknown>;
  return typeof rec.domainCode === 'string' ? rec.domainCode : null;
}

describe('UpsertUserAdministrativeProfileUseCase', () => {
  it('deve retornar VALIDATION_ERROR quando fullName for inválido (domínio)', async () => {
    const repo = new FakeUserAdministrativeProfileRepository();
    const tx = new FakeUserAdministrativeProfileTransaction(repo);
    const uc = new UpsertUserAdministrativeProfileUseCase(tx);

    const res = await uc.execute({
      userId: 'u1',
      now: new Date().toISOString(),
      profile: {
        fullName: '  ', // inválido no domínio
        socialName: null,
        birthDate: null,
        gender: null,
        phone: null,
        secondaryEmail: null,
        address: null,
        preferences: null,
      },
    });

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected error');

    expect(res.error.code).toBe('VALIDATION_ERROR');

    const domainCode = getDomainCodeFromErrorDetails(res.error.details);
    expect(domainCode).toBe('FULL_NAME_REQUIRED');
  });

  it('deve salvar quando payload for válido', async () => {
    const repo = new FakeUserAdministrativeProfileRepository();
    let called = false;

    repo.onReplaceFullContract(async () => {
      called = true;
    });

    const tx = new FakeUserAdministrativeProfileTransaction(repo);
    const uc = new UpsertUserAdministrativeProfileUseCase(tx);

    const res = await uc.execute({
      userId: 'u1',
      now: new Date().toISOString(),
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
    });

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected success');

    expect(res.data.saved).toBe(true);
    expect(called).toBe(true);
  });
});
