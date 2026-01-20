import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/features/auth/infra/ssr/createSupabaseServerClient';

import type {
  AppendProjectionGenerationLogEntry,
  CalendarProjectionPayload,
  ICalendarProjectionPersistencePort,
} from '@/features/daily-plan/application/ports/ICalendarProjectionPersistencePort';

type DbPlanGenerationLogInsert = {
  user_id: string;
  range_start: string; // date
  range_end: string;   // date
  reason: 'profile_changed' | 'subjects_changed' | 'manual_regenerate' | 'system';
  normative_context: Record<string, unknown>;
  occurred_at: string; // timestamptz ISO
  notes: string | null;
};

type DbCalendarProjectionsInsert = {
  user_id: string;
  range_start: string; // date
  range_end: string;   // date
  generation_log_id: string;
  normative_context: Record<string, unknown>;
  projection_payload: Record<string, unknown>;
};

export class SupabaseCalendarProjectionPersistencePortSSR implements ICalendarProjectionPersistencePort {
  private async getClient(): Promise<SupabaseClient> {
    return createSupabaseServerClient() as unknown as SupabaseClient;
  }

  public async appendProjectionGenerationLog(
    entry: AppendProjectionGenerationLogEntry
  ): Promise<{ generationLogId: string }> {
    const client = await this.getClient();

    const row: DbPlanGenerationLogInsert = {
      user_id: entry.userId,
      range_start: entry.rangeStart,
      range_end: entry.rangeEnd,
      reason: 'system',
      normative_context: {
        inputHash: entry.inputHash,
        outputHash: entry.outputHash,
      },
      occurred_at: entry.generatedAtIso,
      notes: null,
    };

    const ins = await client
      .from('plan_generation_log')
      .insert(row)
      .select('id')
      .single();

    if (ins.error) {
      throw new Error(`DB_INSERT_PLAN_GENERATION_LOG_FAILED: ${ins.error.message}`);
    }

    const id = String((ins.data as { id?: string } | null)?.id ?? '');
    if (!id) {
      throw new Error('DB_INSERT_PLAN_GENERATION_LOG_FAILED: missing id.');
    }

    return { generationLogId: id };
  }

  public async upsertCalendarProjection(params: {
    userId: string;
    rangeStart: string;
    rangeEnd: string;
    generationLogId: string;
    normativeContext: Record<string, unknown>;
    projectionPayload: CalendarProjectionPayload;
  }): Promise<void> {
    const client = await this.getClient();

    const row: DbCalendarProjectionsInsert = {
      user_id: params.userId,
      range_start: params.rangeStart,
      range_end: params.rangeEnd,
      generation_log_id: params.generationLogId,
      normative_context: params.normativeContext,
      projection_payload: params.projectionPayload as unknown as Record<string, unknown>,
    };

    // Não há UNIQUE no DDL para (user_id, range_start, range_end).
    // Logo, a regra aqui é "append" (histórico de projeções regeneráveis).
    // Isso é compatível com "regenerável" sem destruir rastreabilidade.
    const ins = await client.from('calendar_projections').insert(row);

    if (ins.error) {
      throw new Error(`DB_INSERT_CALENDAR_PROJECTIONS_FAILED: ${ins.error.message}`);
    }
  }
}
