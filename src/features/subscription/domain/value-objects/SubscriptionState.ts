import { DomainError } from "../_shared/DomainError";

export type SubscriptionState = "FREE" | "PREMIUM_ACTIVE" | "PREMIUM_CANCELING";

export function assertSubscriptionState(
  value: string
): asserts value is SubscriptionState {
  if (
    value !== "FREE" &&
    value !== "PREMIUM_ACTIVE" &&
    value !== "PREMIUM_CANCELING"
  ) {
    throw new DomainError("InvalidSubscriptionState", "SubscriptionState inválido.");
  }
}
