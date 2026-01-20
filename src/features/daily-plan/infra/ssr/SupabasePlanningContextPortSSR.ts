import 'server-only';

import type { SubjectTheoryDTO } from '@/features/daily-plan/application/dtos/PlanTypes';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/features/auth/infra/ssr/createSupabaseServerClient';

import type { IPlanningContextPort, PlanningContext } from '@/features/daily-plan/application/ports/IPlanningContextPort';
import type {
  AutoReviewPolicyDTO,
  ExtrasDurationsDTO,
  ProfileRulesDTO,
  WeekdayRuleDTO,
  ReviewTaskDTO,
} from '@/features/daily-plan/application/dtos/PlanTypes';

type DbProfileRulesRow = {
  user_id: string;
  subjects_per_day_limit: number;
  study_mode: 'FIXO' | 'CICLO';
};

type DbWeekdayRuleRow = {
  user_id: string;
  weekday: number; // 1..7
  daily_minutes: number;
  has_theory: boolean;
  has_questions: boolean;
  has_informatives: boolean;
  has_lei_seca: boolean;
};

type DbExtrasDurationsRow = {
  user_id: string;
  questions_minutes: number;
  informatives_minutes: number;
  lei_seca_minutes: number;
};

type DbAutoReviewPolicyRow = {
  user_id: string;
  enabled: boolean;
  frequency_days: 1 | 7 | 30 | null;
  review_minutes: number | null;
  reserve_time_block: boolean;
};

type DbRestPeriodRow = {
  user_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
};

type DbReviewLedgerRow = {
  id: string;
  due_date: string; // YYYY-MM-DD
  subject_id: string | null;
  status: 'PENDING' | 'DONE' | 'LOST';
  meta: Record<string, unknown> | null;
};

function readString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const v = meta?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function readNumber(meta: Record<string, unknown> | null | undefined, key: string): number | null {
  const v = meta?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export class SupabasePlanningContextPortSSR implements IPlanningContextPort {
  private async getClient(): Promise<SupabaseClient> {
    return createSupabaseServerClient() as unknown as SupabaseClient;
  }

  public async getPlanningContext(params: { userId: string; date: string }): Promise<PlanningContext> {
    const { userId, date } = params;
    const client = await this.getClient();

    // =========================
    // 1) PROFILE (FASE 1)
    // =========================
    const rulesRes = await client
      .from('profile_rules')
      .select('user_id, subjects_per_day_limit, study_mode')
      .eq('user_id', userId)
      .maybeSingle<DbProfileRulesRow>();

    if (rulesRes.error) {
      throw new Error(`DB_SELECT_PROFILE_RULES_FAILED: ${rulesRes.error.message}`);
    }
    if (!rulesRes.data) {
      throw new Error('MISSING_PROFILE: perfil inexistente para planejamento.');
    }

    const weekdayRes = await client
      .from('profile_weekday_rules')
      .select('user_id, weekday, daily_minutes, has_theory, has_questions, has_informatives, has_lei_seca')
      .eq('user_id', userId)
      .order('weekday', { ascending: true })
      .returns<DbWeekdayRuleRow[]>();

    if (weekdayRes.error) {
      throw new Error(`DB_SELECT_PROFILE_WEEKDAY_RULES_FAILED: ${weekdayRes.error.message}`);
    }

    const extrasRes = await client
      .from('profile_extras_durations')
      .select('user_id, questions_minutes, informatives_minutes, lei_seca_minutes')
      .eq('user_id', userId)
      .maybeSingle<DbExtrasDurationsRow>();

    if (extrasRes.error) {
      throw new Error(`DB_SELECT_PROFILE_EXTRAS_DURATIONS_FAILED: ${extrasRes.error.message}`);
    }

    const autoReviewRes = await client
      .from('profile_auto_review_policy')
      .select('user_id, enabled, frequency_days, review_minutes, reserve_time_block')
      .eq('user_id', userId)
      .maybeSingle<DbAutoReviewPolicyRow>();

    if (autoReviewRes.error) {
      throw new Error(`DB_SELECT_PROFILE_AUTO_REVIEW_POLICY_FAILED: ${autoReviewRes.error.message}`);
    }

    const restRes = await client
      .from('profile_rest_periods')
      .select('user_id, start_date, end_date')
      .eq('user_id', userId)
      .order('start_date', { ascending: true })
      .returns<DbRestPeriodRow[]>();

    if (restRes.error) {
      throw new Error(`DB_SELECT_PROFILE_REST_PERIODS_FAILED: ${restRes.error.message}`);
    }

    const weekdayRules: WeekdayRuleDTO[] = (weekdayRes.data ?? []).map((r) => ({
      weekday: r.weekday as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      dailyMinutes: r.daily_minutes,
      hasTheory: r.has_theory,
      hasQuestions: r.has_questions,
      hasInformatives: r.has_informatives,
      hasLeiSeca: r.has_lei_seca,
    }));

    const extrasDurations: ExtrasDurationsDTO = extrasRes.data
      ? {
          questionsMinutes: extrasRes.data.questions_minutes,
          informativesMinutes: extrasRes.data.informatives_minutes,
          leiSecaMinutes: extrasRes.data.lei_seca_minutes,
        }
      : { questionsMinutes: 0, informativesMinutes: 0, leiSecaMinutes: 0 };

    const autoReviewPolicy: AutoReviewPolicyDTO = autoReviewRes.data
      ? {
          enabled: autoReviewRes.data.enabled,
          frequencyDays: autoReviewRes.data.frequency_days,
          reviewMinutes: autoReviewRes.data.review_minutes,
          reserveTimeBlock: autoReviewRes.data.reserve_time_block,
        }
      : { enabled: false, frequencyDays: null, reviewMinutes: null, reserveTimeBlock: false };

    const profile: ProfileRulesDTO = {
      subjectsPerDayLimit: rulesRes.data.subjects_per_day_limit,
      studyMode: rulesRes.data.study_mode,
      weekdayRules,
      extrasDurations,
      autoReviewPolicy,
      restPeriods: (restRes.data ?? []).map((r) => ({ startDate: r.start_date, endDate: r.end_date })),
    };

    // =========================
    // 2) SUBJECTS (FASE 2) — ainda não existe
    // =========================
    const subjects: SubjectTheoryDTO[] = [];

    // =========================
    // 3) REVIEW TASKS (review_ledger)
    // =========================
    const reviewRes = await client
      .from('review_ledger')
      .select('id, due_date, subject_id, meta, status')
      .eq('user_id', userId)
      .eq('due_date', date)
      .eq('status', 'PENDING')
      .returns<DbReviewLedgerRow[]>();

    if (reviewRes.error) {
      throw new Error(`DB_SELECT_REVIEW_LEDGER_FAILED: ${reviewRes.error.message}`);
    }

    const reviewTasks: ReviewTaskDTO[] = (reviewRes.data ?? []).map((r) => {
      const meta = r.meta ?? {};
      const subjectId = (r.subject_id ?? 'UNKNOWN_SUBJECT') as string;

      const subjectName = readString(meta, 'subjectName') ?? subjectId;
      const sourceDate = readString(meta, 'sourceDate') ?? date;

      const reviewMinutes =
        readNumber(meta, 'reviewMinutes') ??
        readNumber(meta, 'plannedMinutes') ??
        1;

      return {
        id: String(r.id),
        sourceDate,
        subjectId,
        subjectName,
        scheduledDate: String(r.due_date),
        reviewMinutes: reviewMinutes > 0 ? Math.floor(reviewMinutes) : 1,
      };
    });

    // =========================
    // 4) EXECUTION CHECK (executed_days)
    // =========================
    const execRes = await client
      .from('executed_days')
      .select('id')
      .eq('user_id', userId)
      .eq('plan_date', date)
      .maybeSingle();

    if (execRes.error) {
      throw new Error(`DB_SELECT_EXECUTED_DAYS_FAILED: ${execRes.error.message}`);
    }

    const hasExecution = Boolean((execRes.data as { id?: string } | null)?.id);

    // =========================
    // 5) CYCLE CURSOR (sem persistência oficial ainda)
    // =========================

    return {
      userId,
      date,
      profile,
      subjects,
      reviewTasks,
      hasExecution,
    };
  }
}
