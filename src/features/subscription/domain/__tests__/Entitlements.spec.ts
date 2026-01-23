import { describe, it, expect } from "vitest";
import { entitlementsFor, isFeatureEnabled } from "../value-objects/Entitlements";

describe("Entitlements", () => {
  it("FREE habilita apenas features sempre livres e limita matérias ativas a 2", () => {
    const e = entitlementsFor("FREE");

    expect(e.maxActiveSubjects.kind).toBe("LIMITED");
    if (e.maxActiveSubjects.kind === "LIMITED") {
      expect(e.maxActiveSubjects.value).toBe(2);
    }

    expect(isFeatureEnabled(e, "AUTH")).toBe(true);
    expect(isFeatureEnabled(e, "DAILY_PLAN")).toBe(true);

    expect(isFeatureEnabled(e, "ADVANCED_STATS")).toBe(false);
    expect(isFeatureEnabled(e, "INFORMATIVES_BOT")).toBe(false);
  });

  it("PREMIUM habilita features premium e remove limite de matérias ativas", () => {
    const e = entitlementsFor("PREMIUM");

    expect(e.maxActiveSubjects.kind).toBe("UNLIMITED");

    expect(isFeatureEnabled(e, "ADVANCED_STATS")).toBe(true);
    expect(isFeatureEnabled(e, "INFORMATIVES_BOT")).toBe(true);
  });
});
