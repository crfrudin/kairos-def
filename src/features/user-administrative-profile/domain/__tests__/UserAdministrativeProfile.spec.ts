import { describe, it, expect } from "vitest";
import { UserAdministrativeProfile } from "../entities/UserAdministrativeProfile";
import { DomainValidationError } from "../_shared/DomainValidationError";

describe("UserAdministrativeProfile (domain)", () => {
  it("creates with only required field (fullName)", () => {
    const p = UserAdministrativeProfile.create({ fullName: "  João   da  Silva  " });
    expect(p.toPrimitives().fullName).toBe("João da Silva");
    expect(p.toPrimitives().address).toBeNull();
    expect(p.toPrimitives().preferences).toBeNull();
  });

  it("fails when fullName is missing/blank", () => {
    expect(() => UserAdministrativeProfile.create({ fullName: "   " })).toThrowError(DomainValidationError);
  });

  it("normalizes phone to digits-only", () => {
    const p = UserAdministrativeProfile.create({ fullName: "Maria", phone: "(61) 9 9999-9999" });
    expect(p.toPrimitives().phone).toBe("61999999999");
  });

  it("validates secondaryEmail", () => {
    expect(() =>
      UserAdministrativeProfile.create({ fullName: "Maria", secondaryEmail: "not-an-email" })
    ).toThrowError(DomainValidationError);

    const p = UserAdministrativeProfile.create({ fullName: "Maria", secondaryEmail: "TEST@EXAMPLE.COM" });
    expect(p.toPrimitives().secondaryEmail).toBe("test@example.com");
  });

  it("address: if CEP is provided, UF and City become required", () => {
    expect(() =>
      UserAdministrativeProfile.create({
        fullName: "Ana",
        address: { cep: "01311-000" }, // UF e City ausentes
      })
    ).toThrowError(DomainValidationError);

    const ok = UserAdministrativeProfile.create({
      fullName: "Ana",
      address: { cep: "01311-000", uf: "sp", city: "São Paulo" },
    });
    expect(ok.toPrimitives().address?.cep).toBe("01311000");
    expect(ok.toPrimitives().address?.uf).toBe("SP");
    expect(ok.toPrimitives().address?.city).toBe("São Paulo");
  });

  it("birthDate validates YYYY-MM-DD and calendar correctness (no Date)", () => {
    expect(() =>
      UserAdministrativeProfile.create({ fullName: "Carlos", birthDate: "2024-02-30" })
    ).toThrowError(DomainValidationError);

    const ok = UserAdministrativeProfile.create({ fullName: "Carlos", birthDate: "2024-02-29" });
    expect(ok.toPrimitives().birthDate).toBe("2024-02-29");
  });

  it("gender: accepts the fixed codes", () => {
    const p1 = UserAdministrativeProfile.create({
      fullName: "Beatriz",
      gender: { code: "masculino" },
    });
    expect(p1.toPrimitives().gender?.code).toBe("MASCULINO");
    expect(p1.toPrimitives().gender?.otherDescription).toBeNull();

    const p2 = UserAdministrativeProfile.create({
      fullName: "Beatriz",
      gender: { code: "Prefiro não informar" },
    });
    expect(p2.toPrimitives().gender?.code).toBe("PREFIRO_NAO_INFORMAR");
  });

  it("gender: OUTRO requires otherDescription", () => {
    expect(() =>
      UserAdministrativeProfile.create({
        fullName: "Beatriz",
        gender: { code: "OUTRO" },
      })
    ).toThrowError(DomainValidationError);

    const ok = UserAdministrativeProfile.create({
      fullName: "Beatriz",
      gender: { code: "OUTRO", otherDescription: "  agênero  " },
    });

    expect(ok.toPrimitives().gender?.code).toBe("OUTRO");
    expect(ok.toPrimitives().gender?.otherDescription).toBe("agênero");
  });

  it("preferences: accepts language, timezone, consent", () => {
    const p = UserAdministrativeProfile.create({
      fullName: "Beatriz",
      preferences: { preferredLanguage: "pt-BR", timeZone: "America/Sao_Paulo", communicationsConsent: true },
    });

    expect(p.toPrimitives().preferences?.preferredLanguage).toBe("pt-BR");
    expect(p.toPrimitives().preferences?.timeZone).toBe("America/Sao_Paulo");
    expect(p.toPrimitives().preferences?.communicationsConsent).toBe(true);
  });
});
