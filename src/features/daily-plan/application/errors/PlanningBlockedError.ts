import { PlanningError } from './PlanningError';

export class PlanningBlockedError extends PlanningError {
  public readonly code = 'PLANNING_BLOCKED' as const;

  constructor(details: { date: string; reason: string }) {
    super('Planejamento bloqueado por regra normativa.', details);
  }
}
