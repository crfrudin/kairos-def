export type PlanningErrorCode =
  | 'REST_DAY'
  | 'PLANNING_BLOCKED'
  | 'EXECUTION_ALREADY_EXISTS'
  | 'INSUFFICIENT_TIME'
  | 'INVALID_INPUT';

export abstract class PlanningError extends Error {
  public abstract readonly code: PlanningErrorCode;
  public readonly details?: Record<string, unknown>;

  protected constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}
