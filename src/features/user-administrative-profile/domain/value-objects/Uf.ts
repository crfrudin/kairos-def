import { DomainValidationError } from "../_shared/DomainValidationError";
import { trimToNull, upper } from "../_shared/normalize";

/**
 * UF (condicional: obrigatório se CEP informado).
 */
export class Uf {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(input: string | null | undefined): Uf | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    const v = upper(raw);
    if (!/^[A-Z]{2}$/.test(v)) {
      throw new DomainValidationError("UF_INVALID", "UF must be exactly 2 letters.");
    }

    return new Uf(v);
  }

  public get value(): string {
    return this._value;
  }
}
