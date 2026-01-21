export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INVARIANT_VIOLATION"
  | "INFRA_ERROR";

export interface AppErrorDTO {
  code: AppErrorCode;
  message: string;
  details?: Record<string, unknown> | null;
}

export type ResultOk<T> = { ok: true; value: T };
export type ResultFail = { ok: false; error: AppErrorDTO };

export type Result<T> = ResultOk<T> | ResultFail;

export function ok<T>(value: T): ResultOk<T> {
  return { ok: true, value };
}

export function fail(code: AppErrorCode, message: string, details?: Record<string, unknown> | null): ResultFail {
  return { ok: false, error: { code, message, details: details ?? null } };
}

export function nowIso(): string {
  return new Date().toISOString();
}
