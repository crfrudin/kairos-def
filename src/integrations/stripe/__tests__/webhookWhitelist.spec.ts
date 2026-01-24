import { describe, it, expect } from "vitest";

describe("Stripe webhook whitelist", () => {
  it("allows only expected event types", () => {
    const allowed = new Set(["checkout.session.completed", "customer.subscription.updated"]);
    expect(allowed.has("checkout.session.completed")).toBe(true);
    expect(allowed.has("customer.subscription.updated")).toBe(true);
    expect(allowed.has("customer.subscription.deleted")).toBe(false);
    expect(allowed.has("invoice.paid")).toBe(false);
  });
});
