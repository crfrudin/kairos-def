import { Pool } from "pg";

let pool: Pool | null = null;

export function getRobotPgPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL não configurada (necessária para o robô de Informativos).");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}
