// src/features/subjects/infra/__tests__/SubjectsRls.integration.test.ts

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { Pool, type PoolClient } from 'pg';

function envOrThrow(name: string): string {
  const v = String(process.env[name] ?? '').trim();
  if (!v) throw new Error(`[TEST SETUP] Missing env var: ${name}`);
  return v;
}

async function setRlsClaims(client: PoolClient, userId: string): Promise<void> {
  // Mantém compatibilidade com setups Supabase que usam request.jwt.claim.* e/ou request.jwt.claims
  await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
  await client.query(`select set_config('request.jwt.claim.role', 'authenticated', true)`);
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: userId, role: 'authenticated' }),
  ]);
}

async function clearRlsClaims(client: PoolClient): Promise<void> {
  await client.query(`select set_config('request.jwt.claim.sub', '', true)`);
  await client.query(`select set_config('request.jwt.claim.role', '', true)`);
  await client.query(`select set_config('request.jwt.claims', '', true)`);
}

describe('FASE 2 · ETAPA 5 · RLS (subjects + auxiliares)', () => {
  const databaseUrl = envOrThrow('DATABASE_URL');

  // IMPORTANTÍSSIMO:
  // subjects.user_id tem FK para auth.users(id).
  // Então precisamos de usuários REAIS existentes no Supabase (IDs em env).
  const userA = envOrThrow('TEST_USER_A_ID');
  const userB = envOrThrow('TEST_USER_B_ID');

  let pool: Pool;

  beforeAll(() => {
    if (userA === userB) {
      throw new Error('[TEST SETUP] TEST_USER_A_ID e TEST_USER_B_ID devem ser diferentes.');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      max: 1, // evita paralelismo desnecessário e reduz chance de lock em testes de RLS
      ssl: { rejectUnauthorized: false },
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  test('RLS bloqueia leitura cruzada: userB não enxerga subjects/meta do userA', async () => {
    const c = await pool.connect();

    try {
      await c.query('begin');

      // 1) Insere como userA (dentro da transação; não persiste porque faremos rollback)
      await setRlsClaims(c, userA);

      const ins = await c.query(
        `
        insert into public.subjects
          (user_id, name, categories, status, questions_daily_target, is_deleted)
        values
          ($1, $2, $3::text[], $4, $5, false)
        returning id
        `,
        [userA, 'Direito Constitucional', ['QUESTIONS'], 'ATIVA', 10]
      );

      const subjectId = String(ins.rows[0].id);

      // Insere auxiliar (tabela nova do aditivo) — também deve respeitar RLS
      await c.query(
        `
        insert into public.subject_questions_meta
          (user_id, subject_id, daily_target)
        values
          ($1, $2, $3)
        `,
        [userA, subjectId, 10]
      );

      // 2) Troca claims para userB e tenta ler dados do userA: deve retornar 0 linhas
      await setRlsClaims(c, userB);

      const resSubjects = await c.query(
        `select id from public.subjects where user_id = $1 and id = $2`,
        [userA, subjectId]
      );
      expect(resSubjects.rowCount).toBe(0);

      const resMeta = await c.query(
        `select * from public.subject_questions_meta where user_id = $1 and subject_id = $2`,
        [userA, subjectId]
      );
      expect(resMeta.rowCount).toBe(0);

      await c.query('rollback');
    } catch (err) {
      try {
        await c.query('rollback');
      } catch {
        // noop
      }
      throw err;
    } finally {
      // limpa claims para não vazar estado no client
      try {
        await clearRlsClaims(c);
      } catch {
        // noop
      }
      c.release();
    }
  });

  test('RLS bloqueia insert com user_id diferente do auth.uid()', async () => {
    const c = await pool.connect();

    try {
      await c.query('begin');

      await setRlsClaims(c, userA);

      // tenta inserir com user_id = userB enquanto auth.uid() = userA => deve falhar por RLS
      await expect(
        c.query(
          `
          insert into public.subjects
            (user_id, name, categories, status, questions_daily_target, is_deleted)
          values
            ($1, $2, $3::text[], $4, $5, false)
          `,
          [userB, 'Bloqueado por RLS', ['QUESTIONS'], 'ATIVA', 10]
        )
      ).rejects.toBeTruthy();

      await c.query('rollback');
    } catch (err) {
      try {
        await c.query('rollback');
      } catch {
        // noop
      }
      throw err;
    } finally {
      try {
        await clearRlsClaims(c);
      } catch {
        // noop
      }
      c.release();
    }
  });
});
