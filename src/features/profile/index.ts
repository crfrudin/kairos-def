// src/features/profile/index.ts

import { getPgPool } from '@/features/profile/infra/db/pgPool';
import { PgProfileTransaction } from '@/features/profile/infra/transactions/PgProfileTransaction';
import { GetProfileUseCase } from '@/features/profile/application/use-cases/GetProfileUseCase';
import { UpdateProfileUseCase } from '@/features/profile/application/use-cases/UpdateProfileUseCase';
import { PgProfileRepository } from '@/features/profile/infra/repositories/PgProfileRepository';

import type { Pool } from 'pg';
import type { IProfileRepository } from '@/features/profile/application/ports/IProfileRepository';
import type { UUID } from '@/features/profile/application/ports/ProfileContract';

/**
 * Cria um repositório com RLS ativo (claims configuradas) usando uma transação.
 * Mantém a application isolada da infra e não cria endpoints.
 */
function createRlsRepository(params: { pool: Pool; userId: UUID }): IProfileRepository {
  const tx = new PgProfileTransaction(params.pool, { userId: params.userId });

  return {
    getFullContract: async (userId: UUID) => {
      return tx.runInTransaction(async (repo) => repo.getFullContract(userId));
    },

    replaceFullContract: async (p: {
      userId: UUID;
      contract: Parameters<IProfileRepository['replaceFullContract']>[0]['contract'];
      now: Parameters<IProfileRepository['replaceFullContract']>[0]['now'];
    }) => {
      return tx.runInTransaction(async (repo) =>
        repo.replaceFullContract({
          userId: p.userId,
          contract: p.contract,
          now: p.now,
        })
      );
    },
  };
}

/**
 * Composição server-side.
 * Você deve fornecer o userId autenticado (sub).
 */
export function createProfileUseCases(params: { userId: UUID }) {
  const pool: Pool = getPgPool();

  // Repositório com RLS ativo via transação (BEGIN + set_config + COMMIT)
  const rlsRepo = createRlsRepository({ pool, userId: params.userId });

  // UC-01 depende de IProfileRepository (porta)
  const getProfile = new GetProfileUseCase(rlsRepo);

  // UC-02 exige transação explícita (porta)
  const tx = new PgProfileTransaction(pool, { userId: params.userId });
  const updateProfile = new UpdateProfileUseCase(tx);

  return { getProfile, updateProfile };
}
