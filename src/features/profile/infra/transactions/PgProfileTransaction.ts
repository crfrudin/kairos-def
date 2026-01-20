// src/features/profile/infra/transactions/PgProfileTransaction.ts

import type { Pool } from 'pg';
import type { IProfileTransaction } from '@/features/profile/application/ports/IProfileTransaction';
import type { IProfileRepository } from '@/features/profile/application/ports/IProfileRepository';
import { PgProfileRepository } from '../repositories/PgProfileRepository';

export interface PgRlsContext {
  /**
   * Deve ser o id do usuário autenticado (auth.users.id).
   * Isso é o "sub" do JWT.
   */
  userId: string;
}

export class PgProfileTransaction implements IProfileTransaction {
  constructor(
    private readonly pool: Pool,
    private readonly rls: PgRlsContext
  ) {}

  async runInTransaction<T>(work: (txRepo: IProfileRepository) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('begin');

      // Mantém RLS funcional fora do PostgREST:
// auth.uid()/auth.role() dependem de request.jwt.claim.* (não precisamos trocar "role" do Postgres)
await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [this.rls.userId]);
await client.query(`select set_config('request.jwt.claim.role', 'authenticated', true)`);

// Também define o JSON completo (algumas instalações usam request.jwt.claims)
await client.query(
  `select set_config('request.jwt.claims', $1, true)`,
  [JSON.stringify({ sub: this.rls.userId, role: 'authenticated' })]
);

      const repo = new PgProfileRepository(client);
      const result = await work(repo);

      await client.query('commit');
      return result;
    } catch (err) {
      try {
        await client.query('rollback');
      } catch {
        // não suprimir erro original; rollback falho não substitui a causa raiz
      }
      throw err;
    } finally {
      client.release();
    }
  }
}
