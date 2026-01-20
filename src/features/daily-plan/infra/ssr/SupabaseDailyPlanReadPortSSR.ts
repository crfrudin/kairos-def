import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/features/auth/infra/ssr/createSupabaseServerClient';

import type { DailyPlanDTO, DailyPlanItemDTO } from '@/features/daily-plan/application/dtos/DailyPlanDTO';
import type { StudyType, DayPlanStatus } from '@/features/daily-plan/application/dtos/PlanTypes';
import type { IDailyPlanReadPort } from '@/features/daily-plan/application/ports/IDailyPlanReadPort';

type DbDailyPlansRow = {
  user_id: string;
  plan_date: string; // date
  status: 'PLANNED' | 'REST_DAY' | 'EXECUTED';
  normative_context: Record<string, unknown> | null;
};

type DbDailyPlanItemRow = {
  ordinal: number;
  item_type: 'THEORY' | 'REVIEW' | 'QUESTIONS' | 'INFORMATIVOS' | 'LEI_SECA';
  planned_minutes: number;
  meta: Record<string, unknown> | null;
};

function mapDbItemTypeToStudyType(t: DbDailyPlanItemRow['item_type']): StudyType {
  switch (t) {
    case 'THEORY':
      return 'THEORY';
    case 'REVIEW':
      return 'REVIEW';
    case 'QUESTIONS':
      return 'QUESTIONS';
    case 'INFORMATIVOS':
      return 'INFORMATIVES';
    case 'LEI_SECA':
      return 'LEI_SECA';
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustive: never = t;
      return 'THEORY';
    }
  }
}

function mapDbStatusToDtoStatus(s: DbDailyPlansRow['status']): DayPlanStatus {
  // DTO agora aceita EXECUTED também (espelha DDL)
  return s === 'PLANNED' ? 'PLANNED' : s === 'REST_DAY' ? 'REST_DAY' : 'EXECUTED';
}

function readNumber(obj: Record<string, unknown> | null | undefined, key: string, fallback: number): number {
  const v = obj?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function readTrace(obj: Record<string, unknown> | null | undefined): DailyPlanDTO['trace'] {
  const t = obj?.trace;
  if (t && typeof t === 'object' && !Array.isArray(t)) {
    const tr = t as Record<string, unknown>;
    return {
      remainingAfterReviews: readNumber(tr, 'remainingAfterReviews', 0),
      remainingAfterExtras: readNumber(tr, 'remainingAfterExtras', 0),
      remainingAfterTheory: readNumber(tr, 'remainingAfterTheory', 0),
    };
  }
  return { remainingAfterReviews: 0, remainingAfterExtras: 0, remainingAfterTheory: 0 };
}

function normalizeMeta(meta: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!meta) return {};
  return meta;
}

function extractTitle(meta: Record<string, unknown>, fallback: string): string {
  const v = meta.title;
  if (typeof v === 'string' && v.trim()) return v.trim();
  return fallback;
}

function omitTitle(meta: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta || Object.keys(meta).length === 0) return undefined;
  const { title: _title, ...rest } = meta;
  return Object.keys(rest).length ? rest : undefined;
}

export class SupabaseDailyPlanReadPortSSR implements IDailyPlanReadPort {
  private async getClient(): Promise<SupabaseClient> {
    return createSupabaseServerClient() as unknown as SupabaseClient;
  }

  public async getDailyPlan(params: { userId: string; date: string }): Promise<DailyPlanDTO | null> {
    const client = await this.getClient();

    const planRes = await client
      .from('daily_plans')
      .select('user_id, plan_date, status, normative_context')
      .eq('user_id', params.userId)
      .eq('plan_date', params.date)
      .maybeSingle<DbDailyPlansRow>();

    if (planRes.error) {
      throw new Error(`DB_SELECT_DAILY_PLANS_FAILED: ${planRes.error.message}`);
    }
    if (!planRes.data) return null;

    const itemsRes = await client
      .from('daily_plan_items')
      .select('ordinal, item_type, planned_minutes, meta')
      .eq('user_id', params.userId)
      .eq('plan_date', params.date)
      .order('ordinal', { ascending: true })
      .returns<DbDailyPlanItemRow[]>();

    if (itemsRes.error) {
      throw new Error(`DB_SELECT_DAILY_PLAN_ITEMS_FAILED: ${itemsRes.error.message}`);
    }

    const nc = planRes.data.normative_context ?? {};
    const items: DailyPlanItemDTO[] = (itemsRes.data ?? []).map((r) => {
      const type = mapDbItemTypeToStudyType(r.item_type);
      const baseMeta = normalizeMeta(r.meta);

      // fallback determinístico para linhas antigas (antes de gravarmos meta.title)
      const fallbackTitle =
        type === 'THEORY'
          ? 'Teoria'
          : type === 'REVIEW'
            ? 'Revisão'
            : type === 'QUESTIONS'
              ? 'Questões'
              : type === 'INFORMATIVES'
                ? 'Informativos'
                : 'Lei seca';

      return {
        type,
        title: extractTitle(baseMeta, fallbackTitle),
        minutes: r.planned_minutes,
        metadata: omitTitle(baseMeta),
      };
    });

    return {
      date: String(planRes.data.plan_date),
      status: mapDbStatusToDtoStatus(planRes.data.status),

      dailyMinutes: readNumber(nc, 'dailyMinutes', 0),
      reviewMinutes: readNumber(nc, 'reviewMinutes', 0),
      extrasMinutes: readNumber(nc, 'extrasMinutes', 0),
      theoryMinutes: readNumber(nc, 'theoryMinutes', 0),

      items,
      trace: readTrace(nc),
    };
  }
}
