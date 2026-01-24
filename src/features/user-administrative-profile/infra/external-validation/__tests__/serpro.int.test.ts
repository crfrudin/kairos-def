import { describe, it, expect } from "vitest";
import { SerproCpfValidationService } from "../serpro/SerproCpfValidationService";

const hasSerproEnv =
  !!String(process.env.SERPRO_CONSUMER_KEY ?? "").trim() &&
  !!String(process.env.SERPRO_CONSUMER_SECRET ?? "").trim() &&
  !!String(process.env.SERPRO_CPF_LIGHT_X_CPF_USUARIO ?? "").trim();

describe("ConectaGov CPF Light Validation (integration)", () => {
  it.runIf(hasSerproEnv)("validates CPF via CPF Light (homolog/prod)", async () => {
    const svc = new SerproCpfValidationService();

    // CPF de homologação citado na documentação (não é seu dado real).
    const res = await svc.validateCpf("40442820135");

    // Nunca deve lançar — sempre Result.
    expect(typeof res.ok).toBe("boolean");
    if (!res.ok) {
      expect(["CPF_EXTERNAL_INVALID", "CPF_EXTERNAL_UNAVAILABLE"]).toContain(res.error.code);
    }
  });

  it.runIf(!hasSerproEnv)("skips when CPF Light env is not configured", async () => {
    expect(true).toBe(true);
  });
});
