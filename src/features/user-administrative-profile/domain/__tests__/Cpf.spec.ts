import { describe, it, expect } from "vitest";
import { DomainValidationError } from "@/features/user-administrative-profile/domain/_shared/DomainValidationError";
import { Cpf } from "@/features/user-administrative-profile/domain/value-objects/Cpf";

describe("Cpf (domain) — declaratório", () => {
  it("returns null when input is null", () => {
    expect(Cpf.create(null)).toBeNull();
  });

  it("returns null when input has no digits", () => {
    expect(Cpf.create("abc")).toBeNull();
    expect(Cpf.create("   ")).toBeNull();
    expect(Cpf.create("---")).toBeNull();
  });

  it("fails when length != 11 after normalization", () => {
    expect(() => Cpf.create("123")).toThrowError(DomainValidationError);
    expect(() => Cpf.create("123.456.789-0")).toThrowError(DomainValidationError);
    expect(() => Cpf.create("123.456.789-000")).toThrowError(DomainValidationError);
  });

  it("does NOT validate DV or sequences (CPF declaratório)", () => {
    // Antes (norma antiga): isso falhava por sequência/DV.
    // Agora (V1): é permitido, desde que tenha 11 dígitos.
    expect(() => Cpf.create("000.000.000-00")).not.toThrow();
    expect(() => Cpf.create("11111111111")).not.toThrow();
    expect(() => Cpf.create("123.456.789-00")).not.toThrow();
  });

  it("accepts a known CPF and keeps digits-only", () => {
    const cpf = Cpf.create("935.411.347-80");
    expect(cpf).not.toBeNull();
    expect(cpf!.digits).toBe("93541134780");
  });

  it("formats for display (masked formatting is UI concern; VO just formats)", () => {
    const cpf = Cpf.create("93541134780")!;
    expect(cpf.formatted).toBe("935.411.347-80");
  });
});
