import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) throw new Error(`[ENV] Missing ${name}`);
  return v;
}

async function setClaims(client: Client, userId: string | null) {
  if (!userId) {
    await client.query(`select set_config('request.jwt.claims', '', true)`);
    return;
  }

  const claims = JSON.stringify({ sub: userId, role: 'authenticated' });
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
}

describe('FASE 9 — public.profiles — RLS + CPF declaratório (integration)', () => {
  let client: Client;
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    const databaseUrl = envOrThrow('DATABASE_URL');
    userA = envOrThrow('TEST_USER_A_ID');
    userB = envOrThrow('TEST_USER_B_ID');

    if (userA === userB) {
      throw new Error('[TEST SETUP] TEST_USER_A_ID e TEST_USER_B_ID devem ser diferentes.');
    }

    client = new Client({ connectionString: databaseUrl });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it('Sem auth.uid(): SELECT retorna 0 e INSERT falha por RLS', async () => {
    await client.query('begin');
    try {
      await setClaims(client, null);

      const sel = await client.query(`select * from public.profiles limit 5`);
      expect(sel.rowCount).toBe(0);

      await expect(
        client.query(`insert into public.profiles (user_id) values ($1)`, [userA])
      ).rejects.toBeTruthy();
    } finally {
      await client.query('rollback');
    }
  });

  it('Com auth.uid()=userA: INSERT own passa; INSERT com user_id diferente falha por RLS', async () => {
    await client.query('begin');
    try {
      await setClaims(client, userA);

      // own: deve passar (idempotente)
      await client.query(
        `insert into public.profiles (user_id) values ($1) on conflict (user_id) do nothing`,
        [userA]
      );

      // other: deve falhar
      await expect(
        client.query(`insert into public.profiles (user_id) values ($1)`, [userB])
      ).rejects.toBeTruthy();
    } finally {
      await client.query('rollback');
    }
  });

    it('Com auth.uid()=userA: UPDATE/DELETE só afeta própria row; cpf deve obedecer constraint estrutural', async () => {
    await client.query('begin');
    try {
      await setClaims(client, userA);

      // garante row A
      await client.query(
        `insert into public.profiles (user_id) values ($1) on conflict (user_id) do nothing`,
        [userA]
      );

      // cpf inválido deve falhar, mas sem "matar" a transação do teste
      await client.query('savepoint sp_invalid_cpf');
      await expect(
        client.query(`update public.profiles set cpf = $1 where user_id = $2`, ['123', userA])
      ).rejects.toBeTruthy();
      await client.query('rollback to savepoint sp_invalid_cpf');
      await client.query('release savepoint sp_invalid_cpf');

      // cpf válido (11 dígitos) => deve passar
      const ok = await client.query(
        `update public.profiles set cpf = $1 where user_id = $2`,
        ['12345678901', userA]
      );
      expect(ok.rowCount).toBe(1);

      // tentar update em userB => deve afetar 0 (RLS via USING)
      const upOther = await client.query(
        `update public.profiles set cpf = $1 where user_id = $2`,
        ['12345678901', userB]
      );
      expect(upOther.rowCount).toBe(0);

      // delete own => deve passar
      const delOwn = await client.query(`delete from public.profiles where user_id = $1`, [userA]);
      expect(delOwn.rowCount).toBe(1);

      // delete other => deve afetar 0
      const delOther = await client.query(`delete from public.profiles where user_id = $1`, [userB]);
      expect(delOther.rowCount).toBe(0);
    } finally {
      await client.query('rollback');
    }
  });
});
