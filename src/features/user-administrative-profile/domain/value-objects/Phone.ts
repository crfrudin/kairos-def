import { DomainValidationError } from "../_shared/DomainValidationError";
import { digitsOnly, trimToNull } from "../_shared/normalize";

/**
 * Telefone administrativo (opcional).
 * Normalização: digits-only.
 * Validação: 10..13 dígitos (BR: 10/11; com DDI pode ir além).
 */
export class Phone {
  private readonly _digits: string;

  private constructor(digits: string) {
    this._digits = digits;
  }

  public static create(input: string | null | undefined): Phone | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    const digits = digitsOnly(raw);
    if (digits.length < 10 || digits.length > 13) {
      throw new DomainValidationError("PHONE_INVALID", "Phone must contain 10 to 13 digits.");
    }

    return new Phone(digits);
  }

  public get digits(): string {
    return this._digits;
  }
}
