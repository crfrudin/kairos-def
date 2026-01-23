import { DomainValidationError } from "../_shared/DomainValidationError";
import { collapseSpaces, trimToNull } from "../_shared/normalize";

export class Street {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(input: string | null | undefined): Street | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    const v = collapseSpaces(raw);
    if (v.length < 2) {
      throw new DomainValidationError("STREET_TOO_SHORT", "Street must have at least 2 characters.");
    }
    if (v.length > 120) {
      throw new DomainValidationError("STREET_TOO_LONG", "Street must have at most 120 characters.");
    }

    return new Street(v);
  }

  public get value(): string {
    return this._value;
  }
}
