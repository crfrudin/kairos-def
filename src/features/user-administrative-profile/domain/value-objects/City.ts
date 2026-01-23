import { DomainValidationError } from "../_shared/DomainValidationError";
import { collapseSpaces, trimToNull } from "../_shared/normalize";

/**
 * Cidade (condicional: obrigatória se CEP informado).
 */
export class City {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(input: string | null | undefined): City | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    const v = collapseSpaces(raw);
    if (v.length < 2) {
      throw new DomainValidationError("CITY_TOO_SHORT", "City must have at least 2 characters.");
    }
    if (v.length > 80) {
      throw new DomainValidationError("CITY_TOO_LONG", "City must have at most 80 characters.");
    }

    return new City(v);
  }

  public get value(): string {
    return this._value;
  }
}
