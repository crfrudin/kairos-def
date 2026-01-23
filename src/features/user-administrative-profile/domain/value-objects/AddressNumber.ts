import { DomainValidationError } from "../_shared/DomainValidationError";
import { collapseSpaces, trimToNull } from "../_shared/normalize";

export class AddressNumber {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(input: string | null | undefined): AddressNumber | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    const v = collapseSpaces(raw);
    if (v.length > 20) {
      throw new DomainValidationError("ADDRESS_NUMBER_TOO_LONG", "Address number must have at most 20 characters.");
    }

    return new AddressNumber(v);
  }

  public get value(): string {
    return this._value;
  }
}
