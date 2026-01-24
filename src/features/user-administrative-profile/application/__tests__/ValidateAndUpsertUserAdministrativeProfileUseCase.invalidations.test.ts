import { describe, it, expect } from "vitest";

import { ValidateAndUpsertUserAdministrativeProfileUseCase } from "../use-cases/ValidateAndUpsertUserAdministrativeProfileUseCase";

import { FakeUserAdministrativeProfileRepository } from "./fakes/FakeUserAdministrativeProfileRepository";
import { FakeUserAdministrativeProfileTransaction } from "./fakes/FakeUserAdministrativeProfileTransaction";
import { FakeCpfValidationService } from "./fakes/FakeCpfValidationService";
import { FakeAddressValidationService } from "./fakes/FakeAddressValidationService";

describe("ValidateAndUpsertUserAdministrativeProfileUseCase — bloqueios externos", () => {
  it("bloqueia quando CPF informado é inválido na validação externa", async () => {
    const repo = new FakeUserAdministrativeProfileRepository();
    const tx = new FakeUserAdministrativeProfileTransaction(repo);

    const cpfValidator = new FakeCpfValidationService();
    cpfValidator.onValidate(async () => ({
      ok: false,
      error: { code: "CPF_EXTERNAL_INVALID" },
    }));

    const addressValidator = new FakeAddressValidationService();

    const uc = new ValidateAndUpsertUserAdministrativeProfileUseCase(
      tx,
      cpfValidator,
      addressValidator
    );

    const res = await uc.execute({
      userId: "u1",
      now: new Date().toISOString(),
      profile: {
        fullName: "Ruggeri Ramos",
        cpf: "52998224725",
      },
    } as any);

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected error");

    expect(res.error.code).toBe("CPF_EXTERNAL_INVALID");
  });

  it("bloqueia quando endereço validado é inválido na validação externa", async () => {
    const repo = new FakeUserAdministrativeProfileRepository();
    const tx = new FakeUserAdministrativeProfileTransaction(repo);

    const cpfValidator = new FakeCpfValidationService();

    const addressValidator = new FakeAddressValidationService();
    addressValidator.onValidate(async () => ({
      ok: false,
      error: { code: "ADDRESS_EXTERNAL_INVALID" },
    }));

    const uc = new ValidateAndUpsertUserAdministrativeProfileUseCase(
      tx,
      cpfValidator,
      addressValidator
    );

    const res = await uc.execute({
      userId: "u1",
      now: new Date().toISOString(),
      profile: {
        fullName: "Ruggeri Ramos",
        validatedAddress: {
          cep: "01311-000",
          uf: "SP",
          city: "São Paulo",
          street: "Av. Paulista",
          number: "1000",
          neighborhood: "Bela Vista",
        },
      },
    } as any);

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected error");

    expect(res.error.code).toBe("ADDRESS_EXTERNAL_INVALID");
  });
});
