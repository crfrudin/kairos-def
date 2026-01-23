import { DomainValidationError } from "../_shared/DomainValidationError";
import { collapseSpaces, trimToNull } from "../_shared/normalize";

export class SocialName {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(input: string | null | undefined): SocialName | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    const normalized = collapseSpaces(raw);

    if (normalized.length < 2) {
      throw new DomainValidationError("SOCIAL_NAME_TOO_SHORT", "Social name must have at least 2 characters.");
    }
    if (normalized.length > 120) {
      throw new DomainValidationError("SOCIAL_NAME_TOO_LONG", "Social name must have at most 120 characters.");
    }

    return new SocialName(normalized);
  }

  public get value(): string {
    return this._value;
  }
}
