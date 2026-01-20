import type { DailyPlanDTO } from '../dtos/DailyPlanDTO';

export type PlanGenerationReason = 'profile_changed' | 'subjects_changed' | 'manual_regenerate' | 'system';

export interface PlanGenerationLogEntry {
  userId: string;
  date: string; // YYYY-MM-DD
  generatedAtIso: string; // ISO

  reason: PlanGenerationReason;

  inputHash: string; // deterministic hash of context
  outputHash: string; // deterministic hash of plan

  notes?: string | null; // optional human-audit notes
}

export interface IDailyPlanPersistencePort {
  upsertDailyPlan(params: { userId: string; plan: DailyPlanDTO }): Promise<void>;
  appendGenerationLog(entry: PlanGenerationLogEntry): Promise<void>;

  // only for CICLO mode (if applicable)
  updateCycleCursor(params: { userId: string; nextCursor: number }): Promise<void>;
}
