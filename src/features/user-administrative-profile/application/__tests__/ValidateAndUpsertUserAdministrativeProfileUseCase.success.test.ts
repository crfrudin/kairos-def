import { describe, it, expect } from "vitest";

import { ValidateAndUpsertUserAdministrativeProfileUseCase } from "../use-cases/ValidateAndUpsertUserAdministrativeProfileUseCase";

import { FakeUserAdministrativeProfileRepository } from "./fakes/FakeUserAdministrativeProfileRepository";
import { FakeUserAdministrativeProfileTransaction } from "./fakes/FakeUserAdministrativeProfileTransaction";
import { FakeCpfValidationService } from "./fakes/FakeCpfValidationService";
import { FakeAddressValidationService } from "./fakes/FakeAddressValidationService";

describe("ValidateAndUpsertUserAdministrativeProfileUseCase — fluxo válido", () => {
  it("valida externamente e persiste quando CPF e endereço são válidos", async () => {
    const repo = new FakeUserAdministrativeProfileRepository();

    let persisted = false;
    repo.onReplaceFullContract(async () => {
      persisted = true;
    });

    const tx = new FakeUserAdministrativeProfileTransaction(repo);

    const cpfValidator = new FakeCpfValidationService();
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

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected success");

    expect(res.data.saved).toBe(true);
    expect(persisted).toBe(true);
  });
});
