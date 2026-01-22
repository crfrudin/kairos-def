import type { Pool, PoolClient } from "pg";

export class PgRobotTransaction {
  constructor(private readonly pool: Pool) {}

  async runInTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");

      // Ativa RLS como service_role (para políticas das tabelas globais)
      await client.query(`select set_config('request.jwt.claim.role', 'service_role', true)`);
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ role: "service_role" }),
      ]);

      const result = await work(client);

      await client.query("commit");
      return result;
    } catch (err) {
      try {
        await client.query("rollback");
      } catch {}
      throw err;
    } finally {
      client.release();
    }
  }
}
