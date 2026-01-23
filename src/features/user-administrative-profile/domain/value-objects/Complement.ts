import { DomainValidationError } from "../_shared/DomainValidationError";
import { collapseSpaces, trimToNull } from "../_shared/normalize";

export class Complement {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(input: string | null | undefined): Complement | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    const v = collapseSpaces(raw);
    if (v.length > 80) {
      throw new DomainValidationError("COMPLEMENT_TOO_LONG", "Complement must have at most 80 characters.");
    }

    return new Complement(v);
  }

  public get value(): string {
    return this._value;
  }
}
