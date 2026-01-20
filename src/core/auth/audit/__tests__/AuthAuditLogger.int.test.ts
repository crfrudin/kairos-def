import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { SupabaseAuthAuditLogger } from '@/core/auth/audit/AuthAuditLogger';

function getRequiredEnv(name: string): string {
  const v = String(process.env[name] ?? '').trim();
  if (!v) throw new Error(`TEST_ENV_MISSING: ${name} não definido.`);
  return v;
}

function createSupabaseAdminForTests() {
  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

describe('AuthAuditLogger (integration)', () => {
  it('writes event successfully (append-only) and stores hashed fields', async () => {
    const logger = new SupabaseAuthAuditLogger();

    const ip = '203.0.113.10';
    const ua = 'Mozilla/5.0 UnitTest';

    const marker = `test_marker_${Date.now()}_${Math.random()}`;

    await logger.log({
      userId: null,
      eventType: 'login_failure',
      context: { ip, userAgent: ua },
      metadata: { marker },
    });

    // Leitura SOMENTE no teste, via service role (admin), pois a tabela é audit e não deve ser legível pela app.
    const supabaseAdmin = createSupabaseAdminForTests();

    const { data, error } = await supabaseAdmin
      .from('auth_audit_events')
      .select('event_type,user_id,ip_hash,user_agent_hash,metadata,occurred_at')
      .eq('metadata->>marker', marker)
      .order('occurred_at', { ascending: false })
      .limit(1);

    if (error) throw new Error(`TEST_ADMIN_SELECT_FAILED: ${error.message}`);

    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBe(1);

    const row = data![0] as any;

    expect(row.event_type).toBe('login_failure');
    expect(row.user_id).toBe(null);

    expect(typeof row.ip_hash).toBe('string');
    expect(typeof row.user_agent_hash).toBe('string');

    expect(row.ip_hash.length).toBe(64);
    expect(row.user_agent_hash.length).toBe(64);

    expect(row.ip_hash).not.toBe(ip);
    expect(row.user_agent_hash).not.toBe(ua);
  });

  it('writes event with user_id = null explicitly', async () => {
    const logger = new SupabaseAuthAuditLogger();
    const marker = `test_marker_null_${Date.now()}_${Math.random()}`;

    await logger.log({
      userId: null,
      eventType: 'password_reset_requested',
      context: { ip: null, userAgent: null },
      metadata: { marker },
    });

    const supabaseAdmin = createSupabaseAdminForTests();

    const { data, error } = await supabaseAdmin
      .from('auth_audit_events')
      .select('user_id,metadata,occurred_at')
      .eq('metadata->>marker', marker)
      .order('occurred_at', { ascending: false })
      .limit(1);

    if (error) throw new Error(`TEST_ADMIN_SELECT_FAILED: ${error.message}`);

    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBe(1);

    expect((data![0] as any).user_id).toBe(null);
  });
});
