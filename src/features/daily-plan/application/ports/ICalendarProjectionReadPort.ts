import type { CalendarProjectionPayload } from './ICalendarProjectionPersistencePort';

export interface ICalendarProjectionReadPort {
  /**
   * Retorna a projeção regenerável do intervalo (calendar_projections),
   * ou null se não existir projeção materializada para (userId, rangeStart, rangeEnd).
   *
   * Regra de determinismo (DDL não tem UNIQUE):
   * - retorna a mais recente (generated_at desc).
   */
  getCalendarProjection(params: { userId: string; rangeStart: string; rangeEnd: string }): Promise<CalendarProjectionPayload | null>;
}
