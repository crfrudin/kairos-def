// src/features/daily-plan/application/ports/IExecutedDayRepository.ts

import type { CalendarDate } from "../../domain/value-objects";
import type { ExecutedDay } from "../../domain/entities";

/**
 * Persistência de execução factual (IMUTÁVEL).
 */
export interface IExecutedDayRepository {
  getByDate(date: CalendarDate): Promise<ExecutedDay | null>;

  /**
   * Insere execução factual. Regra: uma vez inserida, não há update.
   * Conflito deve ser sinalizado (ex.: unique violation) -> ApplicationError CONCURRENCY_CONFLICT.
   */
  insert(executedDay: ExecutedDay): Promise<void>;
}
