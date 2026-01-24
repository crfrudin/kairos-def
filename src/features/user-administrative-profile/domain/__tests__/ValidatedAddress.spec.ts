import { describe, it, expect } from "vitest";
import { ValidatedAddress } from "../value-objects/ValidatedAddress";
import { DomainValidationError } from "../_shared/DomainValidationError";

describe("ValidatedAddress (domain)", () => {
  it("returns null when input is null", () => {
    expect(ValidatedAddress.create(null)).toBeNull();
  });

  it("fails when missing required validated components", () => {
    expect(() =>
      ValidatedAddress.create({
        cep: "01311-000",
        uf: "SP",
        city: "São Paulo",
        // faltando street, number, neighborhood
      } as any)
    ).toThrowError(DomainValidationError);
  });

  it("accepts when all required fields are present", () => {
    const v = ValidatedAddress.create({
      cep: "01311-000",
      uf: "sp",
      city: "São Paulo",
      street: "Av. Paulista",
      number: "1000",
      neighborhood: "Bela Vista",
      complement: "cj 101",
    });

    const p = v?.toPrimitives();
    expect(p?.cep).toBe("01311000");
    expect(p?.uf).toBe("SP");
    expect(p?.city).toBe("São Paulo");
    expect(p?.street).toBe("Av. Paulista");
    expect(p?.number).toBe("1000");
    expect(p?.neighborhood).toBe("Bela Vista");
    expect(p?.complement).toBe("cj 101");
  });
});
