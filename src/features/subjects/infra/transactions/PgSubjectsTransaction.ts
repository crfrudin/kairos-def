// src/features/subjects/infra/transactions/PgSubjectsTransaction.ts

import type { Pool } from 'pg';
import type { ISubjectsTransaction, SubjectsTxContext } from '@/features/subjects/application/ports/ISubjectsTransaction';
import type { UUID } from '@/features/subjects/application/ports/ISubjectRepository';

import { PgSubjectRepository } from '../repositories/PgSubjectRepository';
import { PgSubjectPriorityOrderRepository } from '../repositories/PgSubjectPriorityOrderRepository';
import { PgInformativeFollowRepository } from '../repositories/PgInformativeFollowRepository';
import { PgStandaloneLawRepository } from '../repositories/PgStandaloneLawRepository';

export interface PgRlsContext {
  userId: UUID;
}

export class PgSubjectsTransaction implements ISubjectsTransaction {
  constructor(
    private readonly pool: Pool,
    private readonly rls: PgRlsContext
  ) {}

  async runInTransaction<T>(work: (tx: SubjectsTxContext) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('begin');

      // Mantém RLS funcional fora do PostgREST (mesmo padrão do Profile).
      await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [this.rls.userId]);
      await client.query(`select set_config('request.jwt.claim.role', 'authenticated', true)`);
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: this.rls.userId, role: 'authenticated' }),
      ]);

      const ctx: SubjectsTxContext = {
        subjectRepo: new PgSubjectRepository(client),
        subjectPriorityOrderRepo: new PgSubjectPriorityOrderRepository(client),
        informativeFollowRepo: new PgInformativeFollowRepository(client),
        standaloneLawRepo: new PgStandaloneLawRepository(client),
      };

      const result = await work(ctx);

      await client.query('commit');
      return result;
    } catch (err) {
      try {
        await client.query('rollback');
      } catch {
        // não suprimir erro original
      }
      throw err;
    } finally {
      client.release();
    }
  }
}
