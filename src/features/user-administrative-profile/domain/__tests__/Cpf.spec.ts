import { describe, it, expect } from "vitest";
import { Cpf } from "../value-objects/Cpf";
import { DomainValidationError } from "../_shared/DomainValidationError";

describe("Cpf (domain)", () => {
  it("returns null when input is null", () => {
    expect(Cpf.create(null)).toBeNull();
  });

  it("returns null when input has no digits", () => {
    expect(Cpf.create("   ")).toBeNull();
    expect(Cpf.create("..---")).toBeNull();
  });

  it("fails when length != 11 after normalization", () => {
    expect(() => Cpf.create("123")).toThrowError(DomainValidationError);
  });

  it("fails when all digits are equal", () => {
    expect(() => Cpf.create("000.000.000-00")).toThrowError(DomainValidationError);
    expect(() => Cpf.create("11111111111")).toThrowError(DomainValidationError);
  });

  it("fails when check digits are invalid", () => {
    expect(() => Cpf.create("123.456.789-00")).toThrowError(DomainValidationError);
  });

  it("accepts a known valid CPF and keeps digits-only", () => {
    // CPF de exemplo conhecido como válido (apenas para teste estrutural local)
    const cpf = Cpf.create("529.982.247-25");
    expect(cpf?.digits).toBe("52998224725");
    expect(cpf?.formatted).toBe("529.982.247-25");
  });
});
