// src/features/profile/infra/db/pgPool.ts

import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL não configurada (necessária para transações atômicas no Profile).');
    }

    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return pool;
}
