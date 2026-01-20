import type { DailyPlanDTO } from '../dtos/DailyPlanDTO';

export type CalendarProjectionPayload = Readonly<{
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string;   // YYYY-MM-DD (inclusive)
  days: DailyPlanDTO[];
}>;

export interface AppendProjectionGenerationLogEntry {
  userId: string;
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string;   // YYYY-MM-DD (inclusive)
  generatedAtIso: string; // ISO
  inputHash: string;
  outputHash: string;
}

/**
 * Persistência da projeção regenerável (calendar_projections) + trilho auditável (plan_generation_log).
 * Observa DDL oficial da Fase 3 / Etapa 3.
 */
export interface ICalendarProjectionPersistencePort {
  appendProjectionGenerationLog(entry: AppendProjectionGenerationLogEntry): Promise<{ generationLogId: string }>;

  upsertCalendarProjection(params: {
    userId: string;
    rangeStart: string;
    rangeEnd: string;
    generationLogId: string;

    /**
     * Contexto normativo/snapshot (estrutura auditável).
     * Sem heurística; apenas rastreabilidade.
     */
    normativeContext: Record<string, unknown>;

    /**
     * Payload regenerável (estrutura).
     */
    projectionPayload: CalendarProjectionPayload;
  }): Promise<void>;
}
