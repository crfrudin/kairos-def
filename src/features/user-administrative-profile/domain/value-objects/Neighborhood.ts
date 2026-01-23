import { DomainValidationError } from "../_shared/DomainValidationError";
import { collapseSpaces, trimToNull } from "../_shared/normalize";

export class Neighborhood {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(input: string | null | undefined): Neighborhood | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    const v = collapseSpaces(raw);
    if (v.length < 2) {
      throw new DomainValidationError("NEIGHBORHOOD_TOO_SHORT", "Neighborhood must have at least 2 characters.");
    }
    if (v.length > 80) {
      throw new DomainValidationError("NEIGHBORHOOD_TOO_LONG", "Neighborhood must have at most 80 characters.");
    }

    return new Neighborhood(v);
  }

  public get value(): string {
    return this._value;
  }
}
