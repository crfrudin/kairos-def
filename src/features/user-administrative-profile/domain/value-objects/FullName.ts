import { DomainValidationError } from "../_shared/DomainValidationError";
import { collapseSpaces, trimToNull } from "../_shared/normalize";

export class FullName {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(input: string): FullName {
    const raw = trimToNull(input);
    if (!raw) {
      throw new DomainValidationError("FULL_NAME_REQUIRED", "Full name is required.");
    }

    const normalized = collapseSpaces(raw);

    if (normalized.length < 3) {
      throw new DomainValidationError("FULL_NAME_TOO_SHORT", "Full name must have at least 3 characters.");
    }
    if (normalized.length > 120) {
      throw new DomainValidationError("FULL_NAME_TOO_LONG", "Full name must have at most 120 characters.");
    }

    return new FullName(normalized);
  }

  public get value(): string {
    return this._value;
  }
}
