// src/features/subjects/infra/db/pgPool.ts
// Copia o padrão do Profile: pool singleton + DATABASE_URL obrigatório.

import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL não configurada (necessária para transações atômicas na Fase 2).');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}
