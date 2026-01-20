import { PlanningError } from './PlanningError';

export class InvalidInputError extends PlanningError {
  public readonly code = 'INVALID_INPUT' as const;

  constructor(details: { message: string; field?: string }) {
    super('Entrada inválida para o motor de planejamento.', details);
  }
}
