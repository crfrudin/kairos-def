/**
 * Result obrigatório (Norma 0.2).
 * Use-cases e ports retornam Result ao invés de lançar exceptions em falhas esperadas.
 */
export type Result<TData, TErrorCode extends string> =
  | { ok: true; data: TData }
  | { ok: false; error: { code: TErrorCode; message: string; details?: Record<string, unknown> } };

export const Result = {
  ok<TData>(data: TData): Result<TData, never> {
    return { ok: true, data };
  },

  err<TErrorCode extends string>(
    code: TErrorCode,
    message: string,
    details?: Record<string, unknown>
  ): Result<never, TErrorCode> {
    return { ok: false, error: { code, message, details } };
  },
} as const;
