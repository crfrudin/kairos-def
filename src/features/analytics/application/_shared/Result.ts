export type Result<TData, TError> =
  | { ok: true; data: TData }
  | { ok: false; error: TError };

export const ok = <TData, TError = never>(data: TData): Result<TData, TError> => ({
  ok: true,
  data,
});

export const fail = <TData = never, TError = unknown>(error: TError): Result<TData, TError> => ({
  ok: false,
  error,
});
