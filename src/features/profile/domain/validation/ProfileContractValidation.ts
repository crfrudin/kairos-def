// src/features/profile/domain/validation/ProfileContractValidation.ts

import type {
  ISODate,
  ProfileContract,
  ProfileWeekdayRuleRow,
  UUID,
} from '@/features/profile/application/ports/ProfileContract';

export type ValidationCode =
  | 'USER_ID_MISMATCH'
  | 'WEEKDAY_RULES_NOT_COMPLETE'
  | 'WEEKDAY_RULES_DUPLICATED'
  | 'WEEKDAY_OUT_OF_RANGE'
  | 'DAILY_MINUTES_OUT_OF_RANGE'
  | 'STUDY_MODE_INVALID'
  | 'SUBJECTS_PER_DAY_LIMIT_OUT_OF_RANGE'
  | 'DAY_WITH_MINUTES_ZERO_HAS_TYPES'
  | 'DAY_WITH_MINUTES_POSITIVE_HAS_NO_TYPES'
  | 'AUTO_REVIEW_ENABLED_MISSING_FIELDS'
  | 'AUTO_REVIEW_DISABLED_HAS_FIELDS'
  | 'AUTO_REVIEW_REVIEW_MINUTES_INVALID'
  | 'FIXED_TIME_EXCEEDS_TOTAL_TIME'
  | 'REST_PERIOD_RANGE_INVALID'
  | 'REST_PERIOD_IN_PAST';

export interface ValidationIssue {
  code: ValidationCode;
  message: string;
  path: string; // ex: "weekdayRules[1].dailyMinutes"
}

export interface ProfileValidationResult {
  blocking: ValidationIssue[];
  informative: ValidationIssue[];
}

function isoDateCompare(a: ISODate, b: ISODate): number {
  // assume formato YYYY-MM-DD (lexicographic ok)
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function assertUserId(blocking: ValidationIssue[], expected: UUID, actual: UUID, path: string) {
  if (expected !== actual) {
    blocking.push({
      code: 'USER_ID_MISMATCH',
      message: `userId inconsistente: esperado ${expected}, recebido ${actual}.`,
      path,
    });
  }
}

function sumFixedMinutesForDay(params: {
  day: ProfileWeekdayRuleRow;
  questionsMinutes: number;
  informativesMinutes: number;
  leiSecaMinutes: number;
  autoReviewEnabled: boolean;
  reserveTimeBlock: boolean;
  reviewMinutes: number | null;
}): number {
  const { day } = params;

  let sum = 0;

  if (day.hasQuestions) sum += params.questionsMinutes;
  if (day.hasInformatives) sum += params.informativesMinutes;
  if (day.hasLeiSeca) sum += params.leiSecaMinutes;

  // Conservador e determinístico:
  // Se reserveTimeBlock = true, o bloco de revisão só faz sentido em dias com TEORIA ativa
  // (revisão é consequência de sessão de teoria).
  if (params.autoReviewEnabled && params.reserveTimeBlock && day.hasTheory) {
    sum += params.reviewMinutes ?? 0;
  }

  return sum;
}

export function validateProfileContract(contract: ProfileContract, today: ISODate): ProfileValidationResult {
  const blocking: ValidationIssue[] = [];
  const informative: ValidationIssue[] = [];

  const userId = contract.rules.userId;

  // ---------- Consistência de userId em todas as partes ----------
  assertUserId(blocking, userId, contract.extrasDurations.userId, 'extrasDurations.userId');
  assertUserId(blocking, userId, contract.autoReviewPolicy.userId, 'autoReviewPolicy.userId');

  for (let i = 0; i < contract.weekdayRules.length; i++) {
    assertUserId(blocking, userId, contract.weekdayRules[i]!.userId, `weekdayRules[${i}].userId`);
  }
  for (let i = 0; i < contract.restPeriods.length; i++) {
    assertUserId(blocking, userId, contract.restPeriods[i]!.userId, `restPeriods[${i}].userId`);
  }

  // ---------- Validações diretas do contrato raiz ----------
  if (contract.rules.subjectsPerDayLimit < 1 || contract.rules.subjectsPerDayLimit > 9) {
    blocking.push({
      code: 'SUBJECTS_PER_DAY_LIMIT_OUT_OF_RANGE',
      message: 'subjectsPerDayLimit deve estar entre 1 e 9.',
      path: 'rules.subjectsPerDayLimit',
    });
  }

  if (contract.rules.studyMode !== 'FIXO' && contract.rules.studyMode !== 'CICLO') {
    blocking.push({
      code: 'STUDY_MODE_INVALID',
      message: "studyMode inválido. Valores permitidos: 'FIXO' | 'CICLO'.",
      path: 'rules.studyMode',
    });
  }

  // ---------- Weekday rules: deve ter exatamente 7 (1..7, únicos) ----------
  if (contract.weekdayRules.length !== 7) {
    blocking.push({
      code: 'WEEKDAY_RULES_NOT_COMPLETE',
      message: 'weekdayRules deve conter exatamente 7 itens (dias 1..7).',
      path: 'weekdayRules',
    });
  }

  const weekdays = contract.weekdayRules.map((r) => r.weekday);
  const unique = new Set(weekdays);

  if (unique.size !== weekdays.length) {
    blocking.push({
      code: 'WEEKDAY_RULES_DUPLICATED',
      message: 'weekdayRules contém weekdays duplicados.',
      path: 'weekdayRules',
    });
  }

  // Validações por dia
  for (let i = 0; i < contract.weekdayRules.length; i++) {
    const day = contract.weekdayRules[i]!;
    const pathBase = `weekdayRules[${i}]`;

    if (day.weekday < 1 || day.weekday > 7) {
      blocking.push({
        code: 'WEEKDAY_OUT_OF_RANGE',
        message: 'weekday deve estar entre 1 e 7.',
        path: `${pathBase}.weekday`,
      });
    }

    if (day.dailyMinutes < 0 || day.dailyMinutes > 1440) {
      blocking.push({
        code: 'DAILY_MINUTES_OUT_OF_RANGE',
        message: 'dailyMinutes deve estar entre 0 e 1440.',
        path: `${pathBase}.dailyMinutes`,
      });
    }

    const hasAnyType = day.hasTheory || day.hasQuestions || day.hasInformatives || day.hasLeiSeca;

    if (day.dailyMinutes === 0 && hasAnyType) {
      blocking.push({
        code: 'DAY_WITH_MINUTES_ZERO_HAS_TYPES',
        message: 'Se dailyMinutes=0, nenhum tipo de estudo pode estar ativo.',
        path: pathBase,
      });
    }

    if (day.dailyMinutes > 0 && !hasAnyType) {
      blocking.push({
        code: 'DAY_WITH_MINUTES_POSITIVE_HAS_NO_TYPES',
        message: 'Se dailyMinutes>0, ao menos um tipo de estudo deve estar ativo.',
        path: pathBase,
      });
    }
  }

  // ---------- Auto review policy ----------
  const arp = contract.autoReviewPolicy;

  if (arp.enabled) {
    if (arp.frequencyDays == null || arp.reviewMinutes == null || arp.reviewMinutes <= 0) {
      blocking.push({
        code: 'AUTO_REVIEW_ENABLED_MISSING_FIELDS',
        message: 'Se autoReviewPolicy.enabled=true, frequencyDays e reviewMinutes (>0) são obrigatórios.',
        path: 'autoReviewPolicy',
      });
    }
  } else {
    if (arp.frequencyDays != null || arp.reviewMinutes != null) {
      blocking.push({
        code: 'AUTO_REVIEW_DISABLED_HAS_FIELDS',
        message: 'Se autoReviewPolicy.enabled=false, frequencyDays e reviewMinutes devem ser null.',
        path: 'autoReviewPolicy',
      });
    }
  }

  // Informativa: auto-review ligado mas nenhum dia com teoria
  if (arp.enabled) {
    const hasAnyTheoryDay = contract.weekdayRules.some((d) => d.dailyMinutes > 0 && d.hasTheory);
    if (!hasAnyTheoryDay) {
      informative.push({
        code: 'AUTO_REVIEW_REVIEW_MINUTES_INVALID',
        message: 'Auto-review está habilitado, mas nenhum dia possui TEORIA ativa; revisões nunca serão geradas.',
        path: 'weekdayRules',
      });
    }
  }

  // ---------- Invariante global de viabilidade: fixedTime <= total dailyMinutes ----------
  const extras = contract.extrasDurations;

  for (let i = 0; i < contract.weekdayRules.length; i++) {
    const day = contract.weekdayRules[i]!;
    if (day.dailyMinutes <= 0) continue;

    const fixed = sumFixedMinutesForDay({
      day,
      questionsMinutes: extras.questionsMinutes,
      informativesMinutes: extras.informativesMinutes,
      leiSecaMinutes: extras.leiSecaMinutes,
      autoReviewEnabled: arp.enabled,
      reserveTimeBlock: arp.reserveTimeBlock,
      reviewMinutes: arp.reviewMinutes ?? null,
    });

    if (fixed > day.dailyMinutes) {
      blocking.push({
        code: 'FIXED_TIME_EXCEEDS_TOTAL_TIME',
        message: `Tempo fixo (extras + revisão reservada, se aplicável) excede dailyMinutes: fixed=${fixed}, total=${day.dailyMinutes}.`,
        path: `weekdayRules[${i}]`,
      });
    }
  }

  // ---------- Rest periods ----------
  for (let i = 0; i < contract.restPeriods.length; i++) {
    const rp = contract.restPeriods[i]!;
    const base = `restPeriods[${i}]`;

    if (isoDateCompare(rp.startDate, rp.endDate) > 0) {
      blocking.push({
        code: 'REST_PERIOD_RANGE_INVALID',
        message: 'startDate deve ser <= endDate.',
        path: base,
      });
    }

    if (isoDateCompare(rp.startDate, today) < 0) {
      blocking.push({
        code: 'REST_PERIOD_IN_PAST',
        message: `Não é permitido cadastrar descanso para datas passadas (startDate < hoje). Hoje=${today}.`,
        path: `${base}.startDate`,
      });
    }
  }

  return { blocking, informative };
}
