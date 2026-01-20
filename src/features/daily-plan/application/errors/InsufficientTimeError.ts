import { PlanningError } from './PlanningError';

export class InsufficientTimeError extends PlanningError {
  public readonly code = 'INSUFFICIENT_TIME' as const;

  constructor(details: {
    date: string;
    requiredMinutes: number;
    availableMinutes: number;
    missingMinutes: number;
    stage: 'REVIEWS' | 'EXTRAS' | 'THEORY';
  }) {
    super('Tempo insuficiente para compor a meta diária de forma determinística.', details);
  }
}
