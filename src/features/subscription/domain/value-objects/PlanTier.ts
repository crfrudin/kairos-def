import { DomainError } from "../_shared/DomainError";

export type PlanTier = "FREE" | "PREMIUM";

export function assertPlanTier(value: string): asserts value is PlanTier {
  if (value !== "FREE" && value !== "PREMIUM") {
    throw new DomainError("InvalidPlanTier", "PlanTier inválido.");
  }
}
