import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/features/auth/infra/ssr/createSupabaseServerClient';

import type { DailyPlanDTO, DailyPlanItemDTO } from '@/features/daily-plan/application/dtos/DailyPlanDTO';
import type { IDailyPlanPersistencePort, PlanGenerationLogEntry } from '@/features/daily-plan/application/ports/IDailyPlanPersistencePort';

type DbDailyPlansRow = {
  user_id: string;
  plan_date: string; // date
  status: 'PLANNED' | 'REST_DAY' | 'EXECUTED';
  normative_context: Record<string, unknown>;
};

type DbDailyPlanItemsInsert = {
  user_id: string;
  plan_date: string; // date
  ordinal: number;
  layer: 'REVIEW' | 'EXTRAS' | 'THEORY';
  item_type: 'THEORY' | 'REVIEW' | 'QUESTIONS' | 'INFORMATIVOS' | 'LEI_SECA';
  planned_minutes: number;
  subject_id: string | null;
  meta: Record<string, unknown>;
};

const mapItemTypeToDb = (t: DailyPlanItemDTO['type']): DbDailyPlanItemsInsert['item_type'] => {
  switch (t) {
    case 'THEORY':
      return 'THEORY';
    case 'REVIEW':
      return 'REVIEW';
    case 'QUESTIONS':
      return 'QUESTIONS';
    case 'INFORMATIVES':
      return 'INFORMATIVOS';
    case 'LEI_SECA':
      return 'LEI_SECA';
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustive: never = t;
      return 'THEORY';
    }
  }
};

const mapLayer = (t: DailyPlanItemDTO['type']): DbDailyPlanItemsInsert['layer'] => {
  if (t === 'REVIEW') return 'REVIEW';
  if (t === 'THEORY') return 'THEORY';
  return 'EXTRAS'; // QUESTIONS | INFORMATIVES | LEI_SECA
};

function assertMinutesPositive(n: number, label: string): void {
  if (!Number.isInteger(n) || n < 1 || n > 1440) {
    throw new Error(`DAILY_PLAN_INVALID_MINUTES: ${label}=${n}`);
  }
}

export class SupabaseDailyPlanPersistencePortSSR implements IDailyPlanPersistencePort {
  private async getClient(): Promise<SupabaseClient> {
    return createSupabaseServerClient() as unknown as SupabaseClient;
  }

  public async upsertDailyPlan(params: { userId: string; plan: DailyPlanDTO }): Promise<void> {
    const { userId, plan } = params;

    const client = await this.getClient();

    // 1) upsert daily_plans
    const dailyPlanRow: DbDailyPlansRow = {
      user_id: userId,
      plan_date: plan.date,
      status: plan.status === 'PLANNED' ? 'PLANNED' : plan.status === 'REST_DAY' ? 'REST_DAY' : 'EXECUTED',
      // normative_context é estrutura auditável: sem regra nova; apenas snapshot/trace
      normative_context: {
        dailyMinutes: plan.dailyMinutes,
        reviewMinutes: plan.reviewMinutes,
        extrasMinutes: plan.extrasMinutes,
        theoryMinutes: plan.theoryMinutes,
        trace: plan.trace,
      },
    };

    const upsertPlan = await client
      .from('daily_plans')
      .upsert(dailyPlanRow, { onConflict: 'user_id,plan_date' });

    if (upsertPlan.error) {
      throw new Error(`DB_UPSERT_DAILY_PLANS_FAILED: ${upsertPlan.error.message}`);
    }

    // 2) Substituição integral de itens do dia (determinística):
    // deleta todos e reinsere ordenado.
    const del = await client
      .from('daily_plan_items')
      .delete()
      .eq('user_id', userId)
      .eq('plan_date', plan.date);

    if (del.error) {
      throw new Error(`DB_DELETE_DAILY_PLAN_ITEMS_FAILED: ${del.error.message}`);
    }

    const inserts: DbDailyPlanItemsInsert[] = plan.items.map((it, idx) => {
      assertMinutesPositive(it.minutes, `item.minutes[${idx}]`);

      const meta = (it.metadata ?? {}) as Record<string, unknown>;
      const subjectId = (meta.subjectId ?? null) as string | null;

      return {
        user_id: userId,
        plan_date: plan.date,
        ordinal: idx + 1, // ordinal >= 1 (DDL)
        layer: mapLayer(it.type),
        item_type: mapItemTypeToDb(it.type),
        planned_minutes: it.minutes,
        subject_id: subjectId,
        meta,
      };
    });

    if (inserts.length > 0) {
      const ins = await client.from('daily_plan_items').insert(inserts);
      if (ins.error) {
        throw new Error(`DB_INSERT_DAILY_PLAN_ITEMS_FAILED: ${ins.error.message}`);
      }
    }
  }

  public async appendGenerationLog(entry: PlanGenerationLogEntry): Promise<void> {
    const client = await this.getClient();

    // Mapeamento para o DDL oficial:
    // plan_generation_log: range_start/range_end/reason/normative_context/occurred_at/notes
    const ins = await client.from('plan_generation_log').insert({
      user_id: entry.userId,
      range_start: entry.date, // UC-01: geração de 1 dia => range_start=range_end
      range_end: entry.date,
      reason: entry.reason,
      normative_context: {
        inputHash: entry.inputHash,
        outputHash: entry.outputHash,
      },
      occurred_at: entry.generatedAtIso,
      notes: entry.notes ?? null,
    });

    if (ins.error) {
      throw new Error(`DB_INSERT_PLAN_GENERATION_LOG_FAILED: ${ins.error.message}`);
    }
  }

  /**
   * ATENÇÃO (Governança):
   * - O DDL da Fase 3 (ETAPA 3) não trouxe storage para cursor do CICLO.
   * - Logo, NÃO é permitido inventar onde gravar.
   * - Este método só será implementado após identificarmos a persistência oficial do cursor.
   */
  public async updateCycleCursor(_params: { userId: string; nextCursor: number }): Promise<void> {
    throw new Error('CYCLE_CURSOR_STORAGE_NOT_DEFINED: não existe persistência oficial identificada para cursor do CICLO (FASE 3).');
  }
}
