import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/features/auth/infra/ssr/createSupabaseServerClient';

import type {
  ICalendarProjectionPersistencePort,
  CreateProjectionGenerationLogInput,
  UpsertCalendarProjectionInput,
} from '@/features/daily-plan/application/ports/ICalendarProjectionPersistencePort';

export class SupabaseCalendarProjectionPersistencePortSSR implements ICalendarProjectionPersistencePort {
  private async getClient(): Promise<SupabaseClient> {
    return createSupabaseServerClient() as unknown as SupabaseClient;
  }

  public async createProjectionGenerationLog(input: CreateProjectionGenerationLogInput): Promise<string> {
    const client = await this.getClient();

    const ins = await client
      .from('plan_generation_log')
      .insert({
        user_id: input.userId,
        range_start: input.rangeStart,
        range_end: input.rangeEnd,
        reason: input.reason,
        normative_context: input.normativeContext,
        occurred_at: input.occurredAtIso,
        notes: input.notes ?? null,
      })
      .select('id')
      .single();

    if (ins.error) {
      throw new Error(`DB_INSERT_PLAN_GENERATION_LOG_FAILED: ${ins.error.message}`);
    }

    return String((ins.data as { id: string }).id);
  }

  public async upsertCalendarProjection(input: UpsertCalendarProjectionInput): Promise<void> {
    const client = await this.getClient();

    // Estratégia simples e determinística: grava uma linha por geração (id uuid PK do DDL).
    // Como é regenerável, múltiplas projeções podem coexistir; o consumidor escolhe a mais recente.
    const ins = await client.from('calendar_projections').insert({
      user_id: input.userId,
      range_start: input.rangeStart,
      range_end: input.rangeEnd,
      generation_log_id: input.generationLogId,
      normative_context: input.normativeContext,
      projection_payload: input.projectionPayload,
    });

    if (ins.error) {
      throw new Error(`DB_INSERT_CALENDAR_PROJECTIONS_FAILED: ${ins.error.message}`);
    }
  }
}
