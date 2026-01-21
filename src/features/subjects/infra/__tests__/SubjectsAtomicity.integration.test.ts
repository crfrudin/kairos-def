// src/features/subjects/infra/__tests__/SubjectsAtomicity.integration.test.ts

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';


import { PgSubjectsTransaction } from '@/features/subjects/infra/transactions/PgSubjectsTransaction';
function uuid(): string {
  return globalThis.crypto.randomUUID();
}
function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} não configurada.`);
  return v;
}

describe('FASE 2 · ETAPA 5 · Atomicidade (rollback real)', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: envOrThrow('DATABASE_URL') });
  });

  afterAll(async () => {
    await pool.end();
  });

  test('falha em subject_priority_order faz rollback de criação do subject', async () => {
    const userId = uuid();
    const now = new Date().toISOString();

    const tx = new PgSubjectsTransaction(pool, { userId });

    await expect(
      tx.runInTransaction(async ({ subjectRepo, subjectPriorityOrderRepo }) => {
        const created = await subjectRepo.createAggregate({
          userId,
          now,
          aggregate: {
            subject: {
              id: '', // usa default (será coalesce(null,...))
              userId,
              name: 'Direito Administrativo',
              categories: ['THEORY'],
              status: 'ATIVA',
              isDeleted: false,
            },
            readingTrack: null,
            videoTrack: null,
            questionsMeta: null,
            lawConfig: null,
          },
        });

        // força falha: position precisa ser >= 1 (CHECK do DB)
        // fazemos insert manual inválido no meio da transação
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client: any = (subjectPriorityOrderRepo as any).client;

        await client.query(
          `insert into public.subject_priority_order (user_id, subject_id, position, updated_at)
           values ($1,$2,$3,$4)`,
          [userId, created.subjectId, 0, now]
        );
      })
    ).rejects.toBeTruthy();

    // prova material: subject não foi persistido (rollback)
    const check = await pool.query(
      `select count(*)::int as n from public.subjects where user_id = $1`,
      [userId]
    );
    expect(Number(check.rows[0].n)).toBe(0);
  });
});
