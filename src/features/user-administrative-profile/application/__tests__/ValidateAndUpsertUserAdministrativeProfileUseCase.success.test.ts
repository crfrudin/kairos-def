import { describe, it, expect, vi } from "vitest";

import { ValidateAndUpsertUserAdministrativeProfileUseCase } from "@/features/user-administrative-profile/application/use-cases/ValidateAndUpsertUserAdministrativeProfileUseCase";
import { Result } from "@/features/user-administrative-profile/application/ports/Result";

import type { IUserAdministrativeProfileTransaction } from "@/features/user-administrative-profile/application/ports/IUserAdministrativeProfileTransaction";
import type { IAddressValidationService } from "@/features/user-administrative-profile/application/ports/IAddressValidationService";

function makeTxSpy() {
  const replaceFullContract = vi.fn(async () => undefined);

  const tx: IUserAdministrativeProfileTransaction = {
    runInTransaction: async (fn) => {
      await fn({ replaceFullContract } as any);
    },
  };

  return { tx, replaceFullContract };
}

describe("ValidateAndUpsertUserAdministrativeProfileUseCase — fluxo válido (V1)", () => {
  it("valida externamente endereço (quando informado) e persiste; CPF é declaratório", async () => {
    const { tx, replaceFullContract } = makeTxSpy();

    const addressValidator: IAddressValidationService = {
      validateAddress: vi.fn(async () => Result.ok({ valid: true as const })),
    };

    const uc = new ValidateAndUpsertUserAdministrativeProfileUseCase(tx, addressValidator);

    const now = new Date().toISOString();

    const res = await uc.execute({
      userId: "userA",
      now,
      profile: {
        fullName: "Usuário A",
        cpf: "12345678900", // CPF declaratório: permitido (11 dígitos)
        validatedAddress: {
          cep: "01001000",
          uf: "SP",
          city: "São Paulo",
          neighborhood: "Sé",
          street: "Praça da Sé",
          number: "1",
          complement: null,
        },
      },
    } as any);

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");

    expect(addressValidator.validateAddress).toHaveBeenCalledTimes(1);
    expect(replaceFullContract).toHaveBeenCalledTimes(1);

    const call = replaceFullContract.mock.calls[0][0];
    expect(call.userId).toBe("userA");
    expect(call.now).toBe(now);
    expect(call.contract.userId).toBe("userA");
    expect(call.contract.profile.cpf).toBe("12345678900");
    expect(call.contract.profile.validatedAddress).toBeTruthy();
  });
});
