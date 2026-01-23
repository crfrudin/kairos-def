// src/features/profile/infra/repositories/PgProfileRepository.ts

import type { PoolClient } from 'pg';
import type { IProfileRepository } from '@/features/profile/application/ports/IProfileRepository';
import type {
  ProfileContract,
  UUID,
  ISOTimestamp,
  ProfileRestPeriodRow,
} from '@/features/profile/application/ports/ProfileContract';
import { ProfileIntegrityError } from '../errors/ProfileIntegrityError';

function toIso(ts: unknown): ISOTimestamp {
  // pg retorna Date ou string/number; padroniza para ISO string
  if (ts instanceof Date) return ts.toISOString() as ISOTimestamp;
  if (typeof ts === "string" || typeof ts === "number") return new Date(ts).toISOString() as ISOTimestamp;

  throw new ProfileIntegrityError(`Perfil inconsistente: timestamp inválido no DB: ${String(ts)}`);
}

function toFrequencyDays(value: unknown): 1 | 7 | 30 | null {
  if (value === null || value === undefined) return null;

  const n = typeof value === 'number' ? value : Number(value);

  if (n === 1 || n === 7 || n === 30) return n;

  throw new ProfileIntegrityError(
    `Perfil inconsistente: frequency_days inválido no DB: ${String(value)}`
  );
}

export class PgProfileRepository implements IProfileRepository {
  constructor(private readonly client: PoolClient) {}

  async getFullContract(userId: UUID): Promise<ProfileContract | null> {
    // 1) root
    const rulesRes = await this.client.query(
      `
      select user_id, subjects_per_day_limit, study_mode, created_at, updated_at
      from public.profile_rules
      where user_id = $1
      `,
      [userId]
    );

    if (rulesRes.rowCount === 0) {
      return null;
    }

    // 2) weekday rules
    const weekdayRes = await this.client.query(
      `
      select user_id, weekday, daily_minutes, has_theory, has_questions, has_informatives, has_lei_seca, created_at, updated_at
      from public.profile_weekday_rules
      where user_id = $1
      order by weekday asc
      `,
      [userId]
    );

    // 3) extras
    const extrasRes = await this.client.query(
      `
      select user_id, questions_minutes, informatives_minutes, lei_seca_minutes, created_at, updated_at
      from public.profile_extras_durations
      where user_id = $1
      `,
      [userId]
    );

    // 4) auto review policy
    const arpRes = await this.client.query(
      `
      select user_id, enabled, frequency_days, review_minutes, reserve_time_block, created_at, updated_at
      from public.profile_auto_review_policy
      where user_id = $1
      `,
      [userId]
    );

    // 5) rest periods
    const restRes = await this.client.query(
      `
      select id, user_id, start_date, end_date, created_at
      from public.profile_rest_periods
      where user_id = $1
      order by start_date asc, end_date asc
      `,
      [userId]
    );

    // Garantia explícita: inexistência de “perfil incompleto”
    if (weekdayRes.rowCount !== 7) {
      throw new ProfileIntegrityError(
        `Perfil inconsistente: esperado 7 weekday_rules, obtido ${weekdayRes.rowCount}.`
      );
    }
    if (extrasRes.rowCount !== 1) {
      throw new ProfileIntegrityError(
        `Perfil inconsistente: profile_extras_durations deveria ter 1 linha. Obtido ${extrasRes.rowCount}.`
      );
    }
    if (arpRes.rowCount !== 1) {
      throw new ProfileIntegrityError(
        `Perfil inconsistente: profile_auto_review_policy deveria ter 1 linha. Obtido ${arpRes.rowCount}.`
      );
    }

    const rules = rulesRes.rows[0];

    const contract: ProfileContract = {
      rules: {
        userId: rules.user_id,
        subjectsPerDayLimit: Number(rules.subjects_per_day_limit),
        studyMode: rules.study_mode,
        createdAt: toIso(rules.created_at),
        updatedAt: toIso(rules.updated_at),
      },

      weekdayRules: weekdayRes.rows.map((r) => ({
        userId: r.user_id,
        weekday: Number(r.weekday),
        dailyMinutes: Number(r.daily_minutes),
        hasTheory: Boolean(r.has_theory),
        hasQuestions: Boolean(r.has_questions),
        hasInformatives: Boolean(r.has_informatives),
        hasLeiSeca: Boolean(r.has_lei_seca),
        createdAt: toIso(r.created_at),
        updatedAt: toIso(r.updated_at),
      })),

      extrasDurations: {
        userId: extrasRes.rows[0].user_id,
        questionsMinutes: Number(extrasRes.rows[0].questions_minutes),
        informativesMinutes: Number(extrasRes.rows[0].informatives_minutes),
        leiSecaMinutes: Number(extrasRes.rows[0].lei_seca_minutes),
        createdAt: toIso(extrasRes.rows[0].created_at),
        updatedAt: toIso(extrasRes.rows[0].updated_at),
      },

      autoReviewPolicy: {
        userId: arpRes.rows[0].user_id,
        enabled: Boolean(arpRes.rows[0].enabled),
        frequencyDays: toFrequencyDays(arpRes.rows[0].frequency_days),
        reviewMinutes: arpRes.rows[0].review_minutes === null ? null : Number(arpRes.rows[0].review_minutes),
        reserveTimeBlock: Boolean(arpRes.rows[0].reserve_time_block),
        createdAt: toIso(arpRes.rows[0].created_at),
        updatedAt: toIso(arpRes.rows[0].updated_at),
      },

      restPeriods: restRes.rows.map(
        (r): ProfileRestPeriodRow => ({
          id: r.id,
          userId: r.user_id,
          startDate: String(r.start_date),
          endDate: String(r.end_date),
          createdAt: toIso(r.created_at),
        })
      ),
    };

    return contract;
  }

  async replaceFullContract(params: {
    userId: UUID;
    contract: ProfileContract;
    now: ISOTimestamp;
  }): Promise<void> {
    const { userId, contract, now } = params;

    // 0) Garantia de userId coerente (defesa extra na infra — sem substituir validação de domínio)
    if (contract.rules.userId !== userId) {
      throw new ProfileIntegrityError('replaceFullContract: contract.rules.userId difere do userId.');
    }

    // 1) Upsert da raiz (profile_rules)
    await this.client.query(
      `
      insert into public.profile_rules (user_id, subjects_per_day_limit, study_mode, updated_at)
      values ($1, $2, $3, $4)
      on conflict (user_id)
      do update set
        subjects_per_day_limit = excluded.subjects_per_day_limit,
        study_mode = excluded.study_mode,
        updated_at = excluded.updated_at
      `,
      [
        userId,
        contract.rules.subjectsPerDayLimit,
        contract.rules.studyMode,
        now,
      ]
    );

    // 2) Weekday rules: substituição integral (delete + insert 7)
    await this.client.query(
      `delete from public.profile_weekday_rules where user_id = $1`,
      [userId]
    );

    if (contract.weekdayRules.length !== 7) {
      throw new ProfileIntegrityError('replaceFullContract: weekdayRules deve conter exatamente 7 itens.');
    }

    for (const r of contract.weekdayRules) {
      await this.client.query(
        `
        insert into public.profile_weekday_rules
          (user_id, weekday, daily_minutes, has_theory, has_questions, has_informatives, has_lei_seca, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          userId,
          r.weekday,
          r.dailyMinutes,
          r.hasTheory,
          r.hasQuestions,
          r.hasInformatives,
          r.hasLeiSeca,
          now,
        ]
      );
    }

    // 3) Extras durations (1 linha): upsert + updated_at manual
    await this.client.query(
      `
      insert into public.profile_extras_durations
        (user_id, questions_minutes, informatives_minutes, lei_seca_minutes, updated_at)
      values ($1,$2,$3,$4,$5)
      on conflict (user_id)
      do update set
        questions_minutes = excluded.questions_minutes,
        informatives_minutes = excluded.informatives_minutes,
        lei_seca_minutes = excluded.lei_seca_minutes,
        updated_at = excluded.updated_at
      `,
      [
        userId,
        contract.extrasDurations.questionsMinutes,
        contract.extrasDurations.informativesMinutes,
        contract.extrasDurations.leiSecaMinutes,
        now,
      ]
    );

    // 4) Auto review policy (1 linha): upsert + updated_at manual
    await this.client.query(
      `
      insert into public.profile_auto_review_policy
        (user_id, enabled, frequency_days, review_minutes, reserve_time_block, updated_at)
      values ($1,$2,$3,$4,$5,$6)
      on conflict (user_id)
      do update set
        enabled = excluded.enabled,
        frequency_days = excluded.frequency_days,
        review_minutes = excluded.review_minutes,
        reserve_time_block = excluded.reserve_time_block,
        updated_at = excluded.updated_at
      `,
      [
        userId,
        contract.autoReviewPolicy.enabled,
        contract.autoReviewPolicy.frequencyDays,
        contract.autoReviewPolicy.reviewMinutes,
        contract.autoReviewPolicy.reserveTimeBlock,
        now,
      ]
    );

    // 5) Rest periods: substituição integral (delete + insert N)
    await this.client.query(
      `delete from public.profile_rest_periods where user_id = $1`,
      [userId]
    );

    for (const rp of contract.restPeriods) {
      await this.client.query(
        `
        insert into public.profile_rest_periods (id, user_id, start_date, end_date)
        values ($1,$2,$3,$4)
        `,
        [rp.id, userId, rp.startDate, rp.endDate]
      );
    }

    // Observação: qualquer erro de CHECK/PK/FK/RLS aqui dispara exceção e o caller (transação) fará rollback.
  }
}
