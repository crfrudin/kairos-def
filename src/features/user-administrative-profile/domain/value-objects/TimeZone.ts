import { DomainValidationError } from "../_shared/DomainValidationError";
import { trimToNull } from "../_shared/normalize";

/**
 * Fuso horário (opcional) - validação simples de IANA: Area/City[/Sub].
 * Ex.: America/Sao_Paulo
 */
export class TimeZone {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(input: string | null | undefined): TimeZone | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    if (!/^[A-Za-z_]+\/[A-Za-z_]+(\/[A-Za-z_]+)?$/.test(raw)) {
      throw new DomainValidationError("TIMEZONE_INVALID", "Time zone must be a valid IANA-like string (Area/City).");
    }

    return new TimeZone(raw);
  }

  public get value(): string {
    return this._value;
  }
}
