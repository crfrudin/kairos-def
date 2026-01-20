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

    // espelha PgProfileTransaction (claims locais à transação)
        await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);

    const result = await work(client);

    await client.query('rollback');
    return result;
  } catch (err) {
    try { await client.query('rollback'); } catch { /* noop */ }
    throw err;
  } finally {
    client.release();
  }
}

async function withNoClaimsClient<T>(pool: Pool, work: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`select set_config('request.jwt.claim.sub', '', true)`);
    await client.query(`select set_config('request.jwt.claims', '', true)`);
    const result = await work(client);
    await client.query('rollback');
    return result;
  } catch (err) {
    try { await client.query('rollback'); } catch { /* noop */ }
    throw err;
  } finally {
    client.release();
  }
}

function makeValidContract(userId: UUID): ProfileContract {
  const now = '2026-01-20T00:00:00.000Z';

  return {
    rules: { userId, subjectsPerDayLimit: 3, studyMode: 'FIXO', createdAt: now, updatedAt: now },
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

function expectRlsError(err: unknown) {
  const msg = String((err as any)?.message ?? err);
  expect(
    msg.includes('row-level security') ||
    msg.includes('permission denied') ||
    msg.includes('violates row level security') ||
    msg.includes('RLS')
  ).toBe(true);
}

describe('FASE 1 · BLOCO 5 · PASSO 2 — Integração com DB real + RLS', () => {
  const databaseUrl = envOrThrow('DATABASE_URL');
  const userA = envOrThrow('TEST_USER_A_ID');
  const userB = envOrThrow('TEST_USER_B_ID');

  let pool: Pool;

  beforeAll(() => {
    if (userA === userB) throw new Error('[TEST SETUP] TEST_USER_A_ID e TEST_USER_B_ID devem ser diferentes.');
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
      await repo.replaceFullContract({ userId: userA, contract: makeValidContract(userA), now });
    });

    await withRlsClient(pool, userB, async (c) => {
      const repo = new PgProfileRepository(c);
      await repo.replaceFullContract({ userId: userB, contract: makeValidContract(userB), now });
    });
  });

  it('Usuário A consegue ler o próprio contrato', async () => {
    const contract = await withRlsClient(pool, userA, async (c) => {
      const repo = new PgProfileRepository(c);
      return repo.getFullContract(userA);
    });

    expect(contract).not.toBeNull();
    expect(contract!.rules.userId).toBe(userA);
    expect(contract!.weekdayRules).toHaveLength(7);
  });

  it('Usuário A NÃO acessa dados do usuário B (SELECT retorna null)', async () => {
    const contract = await withRlsClient(pool, userA, async (c) => {
      const repo = new PgProfileRepository(c);
      return repo.getFullContract(userB);
    });

    expect(contract).toBeNull();
  });

  it('RLS bloqueia INSERT/UPDATE indevidos: Usuário A não consegue gravar contrato do usuário B', async () => {
    const now = '2026-01-20T00:00:00.000Z';

    await expect(
      withRlsClient(pool, userA, async (c) => {
        const repo = new PgProfileRepository(c);
        await repo.replaceFullContract({ userId: userB, contract: makeValidContract(userB), now });
      })
    ).rejects.toSatisfy((err: unknown) => {
      expectRlsError(err);
      return true;
    });
  });

  it('Sem auth.uid(): SELECT não retorna linhas e INSERT falha por RLS', async () => {
    const rulesCount = await withNoClaimsClient(pool, async (c) => {
      const res = await c.query(`select count(*)::int as n from public.profile_rules where user_id = $1`, [userA]);
      return Number(res.rows[0].n);
    });

    expect(rulesCount).toBe(0);

    await expect(
      withNoClaimsClient(pool, async (c) => {
        await c.query(
          `insert into public.profile_rules (user_id, subjects_per_day_limit, study_mode, updated_at)
           values ($1, $2, $3, $4)`,
          [userA, 3, 'FIXO', '2026-01-20T00:00:00.000Z']
        );
      })
    ).rejects.toSatisfy((err: unknown) => {
      expectRlsError(err);
      return true;
    });
  });

  it('RLS por tabela: Usuário A não vê linhas do usuário B em weekday_rules/extras/auto_review/rest_periods', async () => {
    const tables = [
      'profile_weekday_rules',
      'profile_extras_durations',
      'profile_auto_review_policy',
      'profile_rest_periods',
    ] as const;

    for (const t of tables) {
      // eslint-disable-next-line no-await-in-loop
      const n = await withRlsClient(pool, userA, async (c) => {
        const res = await c.query(`select count(*)::int as n from public.${t} where user_id = $1`, [userB]);
        return Number(res.rows[0].n);
      });
      expect(n).toBe(0);
    }
  });
});
