// src/features/daily-plan/application/errors/application.errors.ts

export type ApplicationErrorCode =
  | "MISSING_PROFILE"
  | "MISSING_SUBJECTS"
  | "INVALID_DATE_RANGE"
  | "FORBIDDEN_REGENERATION"
  | "EXECUTION_ALREADY_EXISTS"
  | "CANNOT_EXECUTE_REST_DAY"
  | "DOMAIN_VIOLATION"
  | "INFEASIBLE_PLAN"
  | "CONCURRENCY_CONFLICT";

export class ApplicationError extends Error {
  public readonly code: ApplicationErrorCode;
  public readonly cause?: unknown;

  constructor(code: ApplicationErrorCode, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

export class MissingProfileError extends ApplicationError {
  constructor() {
    super("MISSING_PROFILE", "Perfil (ProfileRules) inexistente ou indisponível.");
  }
}

export class MissingSubjectsError extends ApplicationError {
  constructor() {
    super("MISSING_SUBJECTS", "Matérias (Subjects) inexistentes ou indisponíveis.");
  }
}

export class InvalidDateRangeError extends ApplicationError {
  constructor(message = "Intervalo de datas inválido.") {
    super("INVALID_DATE_RANGE", message);
  }
}

export class ForbiddenRegenerationError extends ApplicationError {
  constructor(message = "Regeração proibida para a data informada.") {
    super("FORBIDDEN_REGENERATION", message);
  }
}

export class ExecutionAlreadyExistsError extends ApplicationError {
  constructor() {
    super("EXECUTION_ALREADY_EXISTS", "Execução já registrada para esta data. Operação proibida.");
  }
}

export class CannotExecuteRestDayError extends ApplicationError {
  constructor() {
    super("CANNOT_EXECUTE_REST_DAY", "Dia de descanso não pode ser executado (não há meta gerada).");
  }
}

export class DomainViolationError extends ApplicationError {
  constructor(message = "Violação de invariante do domínio.", cause?: unknown) {
    super("DOMAIN_VIOLATION", message, cause);
  }
}

export class InfeasiblePlanError extends ApplicationError {
  constructor(message = "Plano inviável segundo regras normativas.") {
    super("INFEASIBLE_PLAN", message);
  }
}

export class ConcurrencyConflictError extends ApplicationError {
  constructor(message = "Conflito de concorrência ao persistir.") {
    super("CONCURRENCY_CONFLICT", message);
  }
}
