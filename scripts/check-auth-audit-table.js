/**
 * Script de diagnóstico local (CI/ops):
 * - Verifica se a tabela public.auth_audit_events existe.
 *
 * Regras:
 * - Sem require() (ESLint).
 * - Falha explícita quando DATABASE_URL não está configurada.
 * - Encerramento garantido da conexão em finally.
 */

(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || typeof databaseUrl !== "string" || databaseUrl.trim() === "") {
    console.error("Missing DATABASE_URL env var.");
    process.exit(1);
  }

  // Evita require(): funciona em CommonJS via dynamic import.
  const pg = await import("pg");
  const { Client } = pg;

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    const r = await client.query("select to_regclass('public.auth_audit_events') as audit_table");
    console.log(r.rows?.[0] ?? null);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(msg);
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch {
      // best-effort close
    }
  }
})();
