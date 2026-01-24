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

describe("ValidateAndUpsertUserAdministrativeProfileUseCase — bloqueios externos (V1)", () => {
  it("bloqueia quando endereço validado é inválido na validação externa", async () => {
    const { tx, replaceFullContract } = makeTxSpy();

    const addressValidator: IAddressValidationService = {
      validateAddress: vi.fn(async () =>
        Result.err(
          "ADDRESS_EXTERNAL_INVALID",
          "Endereço inválido na validação externa.",
          { provider: "FAKE", reason: "INVALID" }
        )
      ),
    };

    const uc = new ValidateAndUpsertUserAdministrativeProfileUseCase(tx, addressValidator);

    const res = await uc.execute({
      userId: "userA",
      now: new Date().toISOString(),
      profile: {
        fullName: "Usuário A",
        cpf: "00000000000", // CPF declaratório: permitido
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

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected error");

    expect(res.error.code).toBe("ADDRESS_EXTERNAL_INVALID");
    expect(replaceFullContract).not.toHaveBeenCalled();
  });

  it("bloqueia quando serviço externo de endereço está indisponível", async () => {
    const { tx, replaceFullContract } = makeTxSpy();

    const addressValidator: IAddressValidationService = {
      validateAddress: vi.fn(async () =>
        Result.err(
          "ADDRESS_EXTERNAL_UNAVAILABLE",
          "Serviço externo de validação de endereço indisponível.",
          { provider: "FAKE", reason: "TIMEOUT" }
        )
      ),
    };

    const uc = new ValidateAndUpsertUserAdministrativeProfileUseCase(tx, addressValidator);

    const res = await uc.execute({
      userId: "userA",
      now: new Date().toISOString(),
      profile: {
        fullName: "Usuário A",
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

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected error");

    expect(res.error.code).toBe("ADDRESS_EXTERNAL_UNAVAILABLE");
    expect(replaceFullContract).not.toHaveBeenCalled();
  });
});
