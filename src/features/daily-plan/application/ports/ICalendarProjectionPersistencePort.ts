import type { DailyPlanDTO } from '../dtos/DailyPlanDTO';

export type ProjectionReason = 'profile_changed' | 'subjects_changed' | 'manual_regenerate' | 'system';

export interface CreateProjectionGenerationLogInput {
  userId: string;
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string;   // YYYY-MM-DD (inclusive)
  reason: ProjectionReason;

  normativeContext: Record<string, unknown>;
  occurredAtIso: string; // ISO timestamptz
  notes?: string | null;
}

export interface UpsertCalendarProjectionInput {
  userId: string;
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string;   // YYYY-MM-DD (inclusive)

  generationLogId: string;

  normativeContext: Record<string, unknown>;

  // Payload regenerável (sem valor histórico)
  projectionPayload: {
    rangeStart: string;
    rangeEnd: string;
    days: DailyPlanDTO[];
  };
}

export interface ICalendarProjectionPersistencePort {
  createProjectionGenerationLog(input: CreateProjectionGenerationLogInput): Promise<string>;
  upsertCalendarProjection(input: UpsertCalendarProjectionInput): Promise<void>;
}
