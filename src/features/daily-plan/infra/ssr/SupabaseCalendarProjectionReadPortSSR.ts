import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/features/auth/infra/ssr/createSupabaseServerClient';

import type { CalendarProjectionPayload } from '@/features/daily-plan/application/ports/ICalendarProjectionPersistencePort';
import type { ICalendarProjectionReadPort } from '@/features/daily-plan/application/ports/ICalendarProjectionReadPort';

type DbCalendarProjectionsRow = {
  user_id: string;
  range_start: string; // date
  range_end: string;   // date
  generated_at: string; // timestamptz
  projection_payload: unknown; // jsonb
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export class SupabaseCalendarProjectionReadPortSSR implements ICalendarProjectionReadPort {
  private async getClient(): Promise<SupabaseClient> {
    return createSupabaseServerClient() as unknown as SupabaseClient;
  }

  public async getCalendarProjection(params: {
    userId: string;
    rangeStart: string;
    rangeEnd: string;
  }): Promise<CalendarProjectionPayload | null> {
    const client = await this.getClient();

    // DDL não tem UNIQUE => determinismo: pega a mais recente
    const res = await client
      .from('calendar_projections')
      .select('user_id, range_start, range_end, generated_at, projection_payload')
      .eq('user_id', params.userId)
      .eq('range_start', params.rangeStart)
      .eq('range_end', params.rangeEnd)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle<DbCalendarProjectionsRow>();

    if (res.error) {
      throw new Error(`DB_SELECT_CALENDAR_PROJECTIONS_FAILED: ${res.error.message}`);
    }
    if (!res.data) return null;

    const payload = res.data.projection_payload;

    // Esperamos que o payload seja o CalendarProjectionPayload (objeto)
    if (!isObject(payload)) {
      // defensivo: se corrompido/inesperado, retornamos estrutura mínima coerente
      return {
        rangeStart: params.rangeStart,
        rangeEnd: params.rangeEnd,
        days: [],
      };
    }

    const rangeStart = typeof payload.rangeStart === 'string' ? payload.rangeStart : params.rangeStart;
    const rangeEnd = typeof payload.rangeEnd === 'string' ? payload.rangeEnd : params.rangeEnd;
    const days = Array.isArray(payload.days) ? (payload.days as unknown[]) : [];

    // Não validamos profundamente o DTO aqui (camada infra);
    // apenas devolvemos o que foi materializado pelo motor.
    return {
      rangeStart,
      rangeEnd,
      days: days as CalendarProjectionPayload['days'],
    };
  }
}
