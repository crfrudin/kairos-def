import { describe, it, expect } from "vitest";
import { SubscriptionDate } from "../value-objects/SubscriptionDate";

describe("SubscriptionDate", () => {
  it("aceita YYYY-MM-DD válido", () => {
    const d = SubscriptionDate.create("2026-01-23");
    expect(d.value).toBe("2026-01-23");
  });

  it("rejeita formato inválido", () => {
    expect(() => SubscriptionDate.create("23/01/2026")).toThrow();
  });

  it("rejeita dia inválido (fevereiro)", () => {
    expect(() => SubscriptionDate.create("2026-02-30")).toThrow();
  });

  it("compara corretamente por lexicografia", () => {
    const a = SubscriptionDate.create("2026-01-01");
    const b = SubscriptionDate.create("2026-01-02");
    expect(a.isBefore(b)).toBe(true);
    expect(b.isAfter(a)).toBe(true);
  });
});
