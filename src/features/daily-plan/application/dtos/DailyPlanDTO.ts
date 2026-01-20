import type { DayPlanStatus, StudyType } from './PlanTypes';

export interface DailyPlanItemDTO {
  type: StudyType;
  title: string;
  minutes: number;
  metadata?: Record<string, unknown>;
}

export interface DailyPlanDTO {
  date: string; // YYYY-MM-DD
  status: DayPlanStatus;

  // minutos brutos do dia (perfil)
  dailyMinutes: number;

  // minutos consumidos por camada (ordem normativa fixa)
  reviewMinutes: number;
  extrasMinutes: number;
  theoryMinutes: number;

  items: DailyPlanItemDTO[];

  // auditoria determinística (não é heurística)
  trace: {
    remainingAfterReviews: number;
    remainingAfterExtras: number;
    remainingAfterTheory: number; // normalmente 0
  };
}
