import { describe, it, expect } from "vitest";
import { Subscription } from "../entities/Subscription";
import { SubscriptionId } from "../value-objects/SubscriptionId";
import { SubscriptionDate } from "../value-objects/SubscriptionDate";

describe("Subscription (domínio puro)", () => {
  it("cria FREE e expõe entitlements FREE", () => {
    const id = SubscriptionId.create("sub_12345678");
    const { subscription, events } = Subscription.createFree(id);

    expect(subscription.state).toBe("FREE");
    expect(subscription.plan).toBe("FREE");
    expect(events[0].type).toBe("SubscriptionCreated");

    const ent = subscription.entitlements;
    expect(ent.plan).toBe("FREE");
  });

  it("upgrade FREE -> PREMIUM_ACTIVE", () => {
    const id = SubscriptionId.create("sub_abcdefghi");
    const { subscription } = Subscription.createFree(id);

    const ev = subscription.upgradeToPremium();
    expect(ev[0].type).toBe("SubscriptionUpgradedToPremium");
    expect(subscription.state).toBe("PREMIUM_ACTIVE");
    expect(subscription.plan).toBe("PREMIUM");
  });

  it("agenda cancelamento PREMIUM_ACTIVE -> PREMIUM_CANCELING (com data conceitual opcional)", () => {
    const id = SubscriptionId.create("sub_cancel_0001");
    const { subscription } = Subscription.createFree(id);
    subscription.upgradeToPremium();

    const d = SubscriptionDate.create("2026-02-01");
    const ev = subscription.scheduleCancellation(d);

    expect(ev[0].type).toBe("SubscriptionCancellationScheduled");
    expect(subscription.state).toBe("PREMIUM_CANCELING");
    expect(subscription.cancelEffectiveOn?.value).toBe("2026-02-01");
  });

  it("reativa PREMIUM_CANCELING -> PREMIUM_ACTIVE", () => {
    const id = SubscriptionId.create("sub_reactivate_01");
    const { subscription } = Subscription.createFree(id);
    subscription.upgradeToPremium();
    subscription.scheduleCancellation();

    const ev = subscription.reactivate();
    expect(ev[0].type).toBe("SubscriptionReactivated");
    expect(subscription.state).toBe("PREMIUM_ACTIVE");
    expect(subscription.cancelEffectiveOn).toBeUndefined();
  });

  it("downgrade para FREE a partir de estado premium é permitido e idempotente se já estiver FREE", () => {
    const id = SubscriptionId.create("sub_down_01");
    const { subscription } = Subscription.createFree(id);
    subscription.upgradeToPremium();

    const ev = subscription.downgradeToFree("EXPIRED");
    expect(ev[0].type).toBe("SubscriptionDowngradedToFree");
    expect(subscription.state).toBe("FREE");
    expect(subscription.plan).toBe("FREE");

    const ev2 = subscription.downgradeToFree("CANCELED");
    expect(ev2.length).toBe(0);
  });

  it("bloqueia upgrade quando não está FREE", () => {
    const id = SubscriptionId.create("sub_bad_upgrade");
    const { subscription } = Subscription.createFree(id);
    subscription.upgradeToPremium();

    expect(() => subscription.upgradeToPremium()).toThrow();
  });
});
