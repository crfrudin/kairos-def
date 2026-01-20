// src/features/daily-plan/application/dto/calendar-projection.dto.ts

import type { CalendarDate } from "../../domain/value-objects";
import type { CalendarProjection } from "../../domain/entities";

export interface GenerateCalendarProjectionInput {
  startDate: CalendarDate;
  endDateInclusive: CalendarDate;

  /**
   * Regra: projeção é simulada e regenerável.
   * Se true, permite incluir dias já com plano persistido, mas sem execução.
   * (Não altera histórico; apenas leitura e simulação.)
   */
  includePersistedPlans?: boolean;
}

export interface GenerateCalendarProjectionOutput {
  startDate: CalendarDate;
  endDateInclusive: CalendarDate;

  /** Projeção regenerável (sem valor histórico). */
  projection: CalendarProjection;
}
