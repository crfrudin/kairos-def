import { DomainError } from "../_shared/DomainError";

export type FeatureKey =
  // Sempre livres (não monetizáveis / não bloqueáveis)
  | "AUTH"
  | "PROFILE_RULES"
  | "SUBJECTS_BASIC"
  | "DAILY_PLAN"
  | "DAILY_EXECUTION"
  | "EXECUTION_HISTORY"
  | "BASIC_PROGRESS"

  // Premium (condicionáveis)
  | "SUBJECTS_UNLIMITED_ACTIVE"
  | "INFORMATIVES_BOT"
  | "CALENDAR_FULL"
  | "ADVANCED_STATS"
  | "REPORTS_EXPORT"
  | "ADVANCED_PROJECTIONS";

export function assertFeatureKey(value: string): asserts value is FeatureKey {
  const allowed: FeatureKey[] = [
    "AUTH",
    "PROFILE_RULES",
    "SUBJECTS_BASIC",
    "DAILY_PLAN",
    "DAILY_EXECUTION",
    "EXECUTION_HISTORY",
    "BASIC_PROGRESS",
    "SUBJECTS_UNLIMITED_ACTIVE",
    "INFORMATIVES_BOT",
    "CALENDAR_FULL",
    "ADVANCED_STATS",
    "REPORTS_EXPORT",
    "ADVANCED_PROJECTIONS",
  ];

  if (!allowed.includes(value as FeatureKey)) {
    throw new DomainError("InvalidFeatureKey", "FeatureKey inválida.");
  }
}
