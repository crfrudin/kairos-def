import { describe, it, expect } from "vitest";
import { uuidV5 } from "../webhooks/uuidV5";

describe("uuidV5", () => {
  it("is deterministic for same input", () => {
    const a = uuidV5("evt_123");
    const b = uuidV5("evt_123");
    expect(a).toBe(b);
  });

  it("differs for different input", () => {
    const a = uuidV5("evt_123");
    const b = uuidV5("evt_456");
    expect(a).not.toBe(b);
  });

  it("looks like a UUID", () => {
    const u = uuidV5("evt_123");
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
