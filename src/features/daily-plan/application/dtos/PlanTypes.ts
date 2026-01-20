export type StudyType = 'THEORY' | 'QUESTIONS' | 'INFORMATIVES' | 'LEI_SECA' | 'REVIEW';

export type StudyMode = 'FIXO' | 'CICLO';

export type DayPlanStatus = 'REST_DAY' | 'PLANNED' | 'EXECUTED';

export type ReviewFrequencyDays = 1 | 7 | 30;

export interface AutoReviewPolicyDTO {
  enabled: boolean;
  frequencyDays: ReviewFrequencyDays | null;
  reviewMinutes: number | null;
  reserveTimeBlock: boolean;
}

export interface ExtrasDurationsDTO {
  questionsMinutes: number;
  informativesMinutes: number;
  leiSecaMinutes: number;
}

export interface WeekdayRuleDTO {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Seg..Dom (conforme persistência fase 1)
  dailyMinutes: number; // 0..1440
  hasTheory: boolean;
  hasQuestions: boolean;
  hasInformatives: boolean;
  hasLeiSeca: boolean;
}

export interface ProfileRulesDTO {
  subjectsPerDayLimit: number; // 1..9
  studyMode: StudyMode;
  weekdayRules: WeekdayRuleDTO[];
  extrasDurations: ExtrasDurationsDTO;
  autoReviewPolicy: AutoReviewPolicyDTO;
  restPeriods: Array<{ startDate: string; endDate: string }>; // YYYY-MM-DD
}

export interface SubjectTheoryDTO {
  id: string;
  name: string;
  isActive: boolean;
  // prioridade já ordenada do lado do provider (sem heurística aqui)
}

export interface ReviewTaskDTO {
  id: string;
  sourceDate: string; // data em que originou
  subjectId: string;
  subjectName: string;
  scheduledDate: string; // YYYY-MM-DD (igual ao dia consultado)
  reviewMinutes: number;
}
