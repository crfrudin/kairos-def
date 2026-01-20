import { PlanningError } from './PlanningError';

export class ExecutionAlreadyExistsError extends PlanningError {
  public readonly code = 'EXECUTION_ALREADY_EXISTS' as const;

  constructor(details: { date: string }) {
    super('Execução já registrada para a data; plano é imutável e não pode ser gerado/regerado.', details);
  }
}
