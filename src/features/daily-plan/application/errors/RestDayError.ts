import { PlanningError } from './PlanningError';

export class RestDayError extends PlanningError {
  public readonly code = 'REST_DAY' as const;

  constructor(details: { date: string; reason: 'WEEKLY_SCHEDULE' | 'REST_PERIOD' }) {
    super('Dia bloqueado por descanso (precedência absoluta).', details);
  }
}
