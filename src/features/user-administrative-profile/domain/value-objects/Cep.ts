import { DomainValidationError } from "../_shared/DomainValidationError";
import { digitsOnly, trimToNull } from "../_shared/normalize";

/**
 * CEP (opcional). Normalização: digits-only (8 dígitos).
 */
export class Cep {
  private readonly _digits: string;

  private constructor(digits: string) {
    this._digits = digits;
  }

  public static create(input: string | null | undefined): Cep | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    const digits = digitsOnly(raw);
    if (digits.length !== 8) {
      throw new DomainValidationError("CEP_INVALID", "CEP must contain exactly 8 digits.");
    }

    return new Cep(digits);
  }

  public get digits(): string {
    return this._digits;
  }
}
