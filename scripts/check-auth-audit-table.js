const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query("select to_regclass('public.auth_audit_events') as audit_table");
  console.log(r.rows[0]);
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
