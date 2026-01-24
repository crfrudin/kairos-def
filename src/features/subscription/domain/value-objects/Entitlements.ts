import { DomainError } from "../_shared/DomainError";
import { FeatureKey } from "./FeatureKey";
import { PlanTier } from "./PlanTier";

export type LimitNumber = { kind: "LIMITED"; value: number } | { kind: "UNLIMITED" };

export type Entitlements = Readonly<{
  plan: PlanTier;
  // Limite quantitativo externo ao domínio (ex.: matérias ativas)
  maxActiveSubjects: LimitNumber;
  // Features habilitadas/bloqueadas
  features: ReadonlySet<FeatureKey>;
}>;

const ALWAYS_FREE: ReadonlySet<FeatureKey> = new Set([
  "AUTH",
  "PROFILE_RULES",
  "SUBJECTS_BASIC",
  "DAILY_PLAN",
  "DAILY_EXECUTION",
  "EXECUTION_HISTORY",
  "BASIC_PROGRESS",
]);

const PREMIUM_ONLY: ReadonlySet<FeatureKey> = new Set([
  "SUBJECTS_UNLIMITED_ACTIVE",
  "INFORMATIVES_BOT",
  "CALENDAR_FULL",
  "ADVANCED_STATS",
  "REPORTS_EXPORT",
  "ADVANCED_PROJECTIONS",
]);

export function entitlementsFor(plan: PlanTier): Entitlements {
  if (plan === "FREE") {
    return {
      plan,
      maxActiveSubjects: { kind: "LIMITED", value: 2 },
      features: new Set<FeatureKey>([...ALWAYS_FREE]),
    };
  }

  if (plan === "PREMIUM") {
    return {
      plan,
      maxActiveSubjects: { kind: "UNLIMITED" },
      features: new Set<FeatureKey>([...ALWAYS_FREE, ...PREMIUM_ONLY]),
    };
  }

  // segurança por definição (não deveria acontecer)
  throw new DomainError("InvalidPlanTier", "PlanTier inválido.");
}

export function isFeatureEnabled(ent: Entitlements, feature: FeatureKey): boolean {
  return ent.features.has(feature);
}
