import type { IAddressValidationService } from "../../ports/IAddressValidationService";
import type { ValidatedAddressInput } from "@/features/user-administrative-profile/domain/value-objects/ValidatedAddress";
import { Result } from "../../ports/Result";

type Handler = (
  address: ValidatedAddressInput
) => Promise<ReturnType<typeof Result.ok> | ReturnType<typeof Result.err>>;

export class FakeAddressValidationService implements IAddressValidationService {
  private handler: Handler;

  constructor() {
    this.handler = async () => Result.ok({ valid: true } as const);
  }

  public onValidate(
    handler: (address: ValidatedAddressInput) => Promise<{ ok: boolean; data?: any; error?: any }> | { ok: boolean; data?: any; error?: any }
  ): void {
    this.handler = async (address: ValidatedAddressInput) => {
      const res = await handler(address);

      if (res && typeof res === "object" && "ok" in res) {
        if (res.ok) return Result.ok({ valid: true } as const);

        const err = (res as any).error;
        return Result.err(
          err?.code ?? "ADDRESS_EXTERNAL_UNAVAILABLE",
          err?.message ?? "address validation failed",
          err?.details
        );
      }

      return Result.err("ADDRESS_EXTERNAL_UNAVAILABLE", "address validation failed");
    };
  }

  public async validateAddress(address: ValidatedAddressInput) {
    return this.handler(address) as any;
  }
}
