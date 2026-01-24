import type { ICpfValidationService } from "../../ports/ICpfValidationService";
import { Result } from "../../ports/Result";

type Handler = (cpfDigits: string) => Promise<ReturnType<typeof Result.ok> | ReturnType<typeof Result.err>>;

export class FakeCpfValidationService implements ICpfValidationService {
  private handler: Handler;

  constructor() {
    this.handler = async () => Result.ok({ valid: true } as const);
  }

  public onValidate(handler: (cpfDigits: string) => Promise<{ ok: boolean; data?: any; error?: any }> | { ok: boolean; data?: any; error?: any }): void {
    this.handler = async (cpfDigits: string) => {
      const res = await handler(cpfDigits);

      // Normaliza para o Result oficial da feature
      if (res && typeof res === "object" && "ok" in res) {
        if (res.ok) return Result.ok({ valid: true } as const);

        const err = (res as any).error;
        return Result.err(err?.code ?? "CPF_EXTERNAL_UNAVAILABLE", err?.message ?? "cpf validation failed", err?.details);
      }

      return Result.err("CPF_EXTERNAL_UNAVAILABLE", "cpf validation failed");
    };
  }

  public async validateCpf(cpfDigits: string) {
    return this.handler(cpfDigits) as any;
  }
}
