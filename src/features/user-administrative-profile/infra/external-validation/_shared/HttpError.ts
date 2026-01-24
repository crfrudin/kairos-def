export type HttpErrorCode =
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "INVALID_RESPONSE";

export class HttpError extends Error {
  public readonly code: HttpErrorCode;
  public readonly status?: number;

  private constructor(code: HttpErrorCode, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }

  static timeout() {
    return new HttpError("TIMEOUT", "External service timeout");
  }

  static unavailable(status?: number) {
    return new HttpError("UNAVAILABLE", "External service unavailable", status);
  }

  static invalidResponse() {
    return new HttpError("INVALID_RESPONSE", "Invalid external response");
  }
}
