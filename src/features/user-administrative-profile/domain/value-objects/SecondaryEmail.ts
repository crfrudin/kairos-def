import { DomainValidationError } from "../_shared/DomainValidationError";
import { lower, trimToNull } from "../_shared/normalize";

/**
 * Email secundário (opcional). Email principal pertence à Fase 8 (Auth).
 */
export class SecondaryEmail {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(input: string | null | undefined): SecondaryEmail | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    const normalized = lower(raw);

    // regex simples e determinística (não é RFC completa)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new DomainValidationError("SECONDARY_EMAIL_INVALID", "Secondary email is invalid.");
    }

    if (normalized.length > 254) {
      throw new DomainValidationError("SECONDARY_EMAIL_TOO_LONG", "Secondary email is too long.");
    }

    return new SecondaryEmail(normalized);
  }

  public get value(): string {
    return this._value;
  }
}
