import { DomainError } from "../_shared/DomainError";
import { normalizeTrim } from "../_shared/normalize";

export class SubscriptionId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(raw: string): SubscriptionId {
    const v = normalizeTrim(raw);
    if (v.length < 8 || v.length > 100) {
      throw new DomainError(
        "InvalidSubscriptionId",
        "SubscriptionId deve ter tamanho entre 8 e 100."
      );
    }
    return new SubscriptionId(v);
  }

  public get value(): string {
    return this._value;
  }
}
