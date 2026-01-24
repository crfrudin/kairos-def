import { describe, it, expect } from "vitest";
import { ViaCepAddressValidationService } from "../viacep/ViaCepAddressValidationService";

describe("ViaCEP Address Validation (integration)", () => {
  it("returns ok for a valid CEP", async () => {
    const svc = new ViaCepAddressValidationService();

    const res = await svc.validateAddress({
      cep: "01001-000",
      uf: "SP",
      city: "São Paulo",
      neighborhood: null,
      street: null,
      number: null,
      complement: null,
    } as any);

    expect(res.ok).toBe(true);
  });

  it("returns invalid for unknown CEP", async () => {
    const svc = new ViaCepAddressValidationService();

    const res = await svc.validateAddress({
      cep: "00000-000",
      uf: "SP",
      city: "São Paulo",
      neighborhood: null,
      street: null,
      number: null,
      complement: null,
    } as any);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("ADDRESS_EXTERNAL_INVALID");
    }
  });
});
