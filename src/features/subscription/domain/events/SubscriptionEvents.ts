import { DomainEvent } from "./DomainEvent";

export type SubscriptionCreated = DomainEvent<
  "SubscriptionCreated",
  { subscriptionId: string; initialState: "FREE" }
>;

export type SubscriptionUpgradedToPremium = DomainEvent<
  "SubscriptionUpgradedToPremium",
  { subscriptionId: string }
>;

export type SubscriptionCancellationScheduled = DomainEvent<
  "SubscriptionCancellationScheduled",
  { subscriptionId: string; effectiveOn?: string }
>;

export type SubscriptionReactivated = DomainEvent<
  "SubscriptionReactivated",
  { subscriptionId: string }
>;

export type SubscriptionDowngradedToFree = DomainEvent<
  "SubscriptionDowngradedToFree",
  { subscriptionId: string; reason: "EXPIRED" | "CANCELED" | "ADMIN_ACTION" }
>;

export type SubscriptionDomainEvent =
  | SubscriptionCreated
  | SubscriptionUpgradedToPremium
  | SubscriptionCancellationScheduled
  | SubscriptionReactivated
  | SubscriptionDowngradedToFree;
