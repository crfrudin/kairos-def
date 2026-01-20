import type { DailyPlanDTO } from '../dtos/DailyPlanDTO';

export interface PlanGenerationLogEntry {
  userId: string;
  date: string; // YYYY-MM-DD
  generatedAtIso: string; // ISO
  inputHash: string; // hash determinístico do contexto (provider calcula ou motor calcula)
  outputHash: string; // hash determinístico do plano
}

export interface IDailyPlanPersistencePort {
  upsertDailyPlan(params: { userId: string; plan: DailyPlanDTO }): Promise<void>;
  appendGenerationLog(entry: PlanGenerationLogEntry): Promise<void>;

  // apenas para modo CICLO (se aplicável)
  updateCycleCursor(params: { userId: string; nextCursor: number }): Promise<void>;
}
