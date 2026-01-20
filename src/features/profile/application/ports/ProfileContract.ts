// src/features/profile/application/ports/ProfileContract.ts

export type UUID = string; // uuid em string (sem validação aqui)
export type ISODate = string; // 'YYYY-MM-DD'
export type ISOTimestamp = string; // ISO 8601

export type StudyMode = 'FIXO' | 'CICLO';

export interface ProfileRulesRow {
  userId: UUID;
  subjectsPerDayLimit: number; // [1..9] (DB CHECK)
  studyMode: StudyMode; // (DB CHECK)
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface ProfileWeekdayRuleRow {
  userId: UUID;
  weekday: number; // 1..7 (DB CHECK)
  dailyMinutes: number; // 0..1440 (DB CHECK)
  hasTheory: boolean;
  hasQuestions: boolean;
  hasInformatives: boolean;
  hasLeiSeca: boolean;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface ProfileExtrasDurationsRow {
  userId: UUID;
  questionsMinutes: number; // 0..1440 (DB CHECK)
  informativesMinutes: number; // 0..1440 (DB CHECK)
  leiSecaMinutes: number; // 0..1440 (DB CHECK)
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface ProfileAutoReviewPolicyRow {
  userId: UUID;
  enabled: boolean;
  frequencyDays: 1 | 7 | 30 | null; // DB CHECK + condicional quando enabled=true
  reviewMinutes: number | null; // DB CHECK + condicional quando enabled=true
  reserveTimeBlock: boolean;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface ProfileRestPeriodRow {
  id: UUID;
  userId: UUID;
  startDate: ISODate; // date (DB CHECK start_date >= current_date)
  endDate: ISODate; // date (DB CHECK start_date <= end_date)
  createdAt: ISOTimestamp;
}

/**
 * Contrato completo e literal do Perfil (fonte de verdade: DB sob RLS).
 * - Nunca parcial.
 * - Se existir perfil, todas as partes obrigatórias devem existir.
 */
export interface ProfileContract {
  rules: ProfileRulesRow;
  weekdayRules: ReadonlyArray<ProfileWeekdayRuleRow>; // deve conter exatamente 7 (1..7)
  extrasDurations: ProfileExtrasDurationsRow;
  autoReviewPolicy: ProfileAutoReviewPolicyRow;
  restPeriods: ReadonlyArray<ProfileRestPeriodRow>;
}
