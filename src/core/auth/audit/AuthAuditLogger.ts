import 'server-only';

import type { AuthAuditEventType } from './AuthAuditEventType';
import { sha256Hex } from './sha256';
import { getSupabaseAdmin } from '@/core/clients/supabaseAdmin';

export type AuthAuditLogContext = {
  ip?: string | null;
  userAgent?: string | null;
};

export type AuthAuditLogParams = {
  userId?: string | null;
  eventType: AuthAuditEventType;
  occurredAt?: Date; // opcional, default now()
  context?: AuthAuditLogContext;
  metadata?: Record<string, unknown>;
};

export interface AuthAuditLogger {
  log(params: AuthAuditLogParams): Promise<void>;
}

function sanitizeMetadata(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(input)) {
    const key = String(k).toLowerCase();

    // hard block (best-effort)
    if (
      key.includes('password') ||
      key.includes('senha') ||
      key.includes('token') ||
      key.includes('email') ||
      key === 'ip' ||
      key.includes('user-agent') ||
      key.includes('useragent')
    ) {
      continue;
    }

    out[k] = v;
  }

  return out;
}

/**
 * Implementação concreta: INSERT (service role) em public.auth_audit_events
 *
 * - append-only
 * - nenhuma leitura
 * - falhas não quebram fluxo principal
 */
export class SupabaseAuthAuditLogger implements AuthAuditLogger {
  public async log(params: AuthAuditLogParams): Promise<void> {
    const safeUserId = params.userId ? String(params.userId).trim() : null;

    const ipRaw = String(params.context?.ip ?? '').trim();
    const uaRaw = String(params.context?.userAgent ?? '').trim();

    const ipHash = sha256Hex(ipRaw);
    const userAgentHash = sha256Hex(uaRaw);

    const occurredAt = (params.occurredAt ?? new Date()).toISOString();
    const sanitized = sanitizeMetadata(params.metadata ?? {});

    try {
      const supabaseAdmin = getSupabaseAdmin();

      // IMPORTANT: somente INSERT
      await supabaseAdmin.from('auth_audit_events').insert({
        user_id: safeUserId,
        event_type: params.eventType,
        occurred_at: occurredAt,
        ip_hash: ipHash,
        user_agent_hash: userAgentHash,
        metadata: sanitized,
      });
    } catch {
      // swallow controlado: logging nunca quebra o fluxo principal
    }
  }
}
