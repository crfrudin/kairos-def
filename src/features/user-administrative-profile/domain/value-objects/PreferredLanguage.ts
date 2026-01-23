import { DomainValidationError } from "../_shared/DomainValidationError";
import { trimToNull } from "../_shared/normalize";

/**
 * Idioma preferido (opcional) - formato simples: ll ou ll-RR (ex: pt ou pt-BR).
 */
export class PreferredLanguage {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(input: string | null | undefined): PreferredLanguage | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(raw)) {
      throw new DomainValidationError("PREFERRED_LANGUAGE_INVALID", "Preferred language must match ll or ll-RR.");
    }

    return new PreferredLanguage(raw);
  }

  public get value(): string {
    return this._value;
  }
}
