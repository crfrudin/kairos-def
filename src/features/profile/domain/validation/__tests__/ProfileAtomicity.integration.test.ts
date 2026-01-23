import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import { PgProfileRepository } from '@/features/profile/infra/repositories/PgProfileRepository';
import type { ProfileContract, UUID } from '@/features/profile/application/ports/ProfileContract';

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[TEST SETUP] Missing env var: ${name}`);
  return v;
}

async function withRlsClient<T>(pool: Pool, userId: UUID, work: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');

        await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);

    const result = await work(client);

    await client.query('commit');
    return result;
  } catch (err) {
    try { await client.query('rollback'); } catch { /* noop */ }
    throw err;
  } finally {
    client.release();
  }
}

function makeContract(userId: UUID, subjectsPerDayLimit: number): ProfileContract {
  const now = '2026-01-20T00:00:00.000Z';
  return {
    rules: { userId, subjectsPerDayLimit, studyMode: 'FIXO', createdAt: now, updatedAt: now },
    weekdayRules: [1,2,3,4,5,6,7].map((weekday) => ({
      userId, weekday, dailyMinutes: 120,
      hasTheory: true, hasQuestions: false, hasInformatives: false, hasLeiSeca: false,
      createdAt: now, updatedAt: now,
    })),
    extrasDurations: { userId, questionsMinutes: 30, informativesMinutes: 30, leiSecaMinutes: 30, createdAt: now, updatedAt: now },
    autoReviewPolicy: { userId, enabled: false, frequencyDays: null, reviewMinutes: null, reserveTimeBlock: false, createdAt: now, updatedAt: now },
    restPeriods: [],
  };
}

describe('FASE 1 · BLOCO 5 · PASSO 3 — Atomicidade com rollback real', () => {
  const databaseUrl = envOrThrow('DATABASE_URL');
  const userA = envOrThrow('TEST_USER_A_ID');

  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 2,
      ssl: { rejectUnauthorized: false },
    });
  });

  beforeEach(async () => {
    const now = '2026-01-20T00:00:00.000Z';

    await withRlsClient(pool, userA, async (c) => {
      const repo = new PgProfileRepository(c);
      await repo.replaceFullContract({ userId: userA, contract: makeContract(userA, 3), now });
    });
  });

  it('Rollback total quando há violação de CHECK constraint no meio da substituição integral', async () => {
    const now = '2026-01-20T00:00:00.000Z';

    // contrato inválido no DB: subjectsPerDayLimit fora do CHECK [1..9]
    const bad = makeContract(userA, 999);

    await expect(
      withRlsClient(pool, userA, async (c) => {
        const repo = new PgProfileRepository(c);
        await repo.replaceFullContract({ userId: userA, contract: bad, now });
      })
    ).rejects.toBeTruthy();

    // Prova material: estado anterior permanece intacto (subjectsPerDayLimit=3)
    const after = await withRlsClient(pool, userA, async (c) => {
      const repo = new PgProfileRepository(c);
      return repo.getFullContract(userA);
    });

    expect(after).not.toBeNull();
    expect(after!.rules.subjectsPerDayLimit).toBe(3);
    expect(after!.weekdayRules).toHaveLength(7);
  });

  it('Rollback total quando falha ocorre após DELETE de weekday_rules (evita estado parcial observável)', async () => {
    const now = '2026-01-20T00:00:00.000Z';

    // Vamos forçar falha na inserção de weekday_rules com weekday inválido (CHECK 1..7)
      const bad = makeContract(userA, 3);
      const badWeekdayRules = [...bad.weekdayRules];
      badWeekdayRules[0] = { ...badWeekdayRules[0], weekday: 99 };
      const bad2 = { ...bad, weekdayRules: badWeekdayRules };


    await expect(
      withRlsClient(pool, userA, async (c) => {
        const repo = new PgProfileRepository(c);
        await repo.replaceFullContract({ userId: userA, contract: bad2, now });
      })
    ).rejects.toBeTruthy();

    // Prova material: weekday_rules ainda existe com 7 itens válidos após rollback
    const after = await withRlsClient(pool, userA, async (c) => {
      const repo = new PgProfileRepository(c);
      return repo.getFullContract(userA);
    });

    expect(after).not.toBeNull();
    expect(after!.weekdayRules).toHaveLength(7);
    expect(after!.weekdayRules.map((d) => d.weekday)).toEqual([1,2,3,4,5,6,7]);
  });
});
