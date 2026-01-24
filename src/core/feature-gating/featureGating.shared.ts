import type { FeatureKey } from "@/features/subscription/domain/value-objects/FeatureKey";

export type FeatureGatingSnapshot = Readonly<{
  plan: "FREE" | "PREMIUM";
  state: "FREE" | "PREMIUM_ACTIVE" | "PREMIUM_CANCELING";
  cancelEffectiveOn: string | null;
  features: ReadonlySet<FeatureKey>;
  maxActiveSubjects: { kind: "LIMITED"; value: number } | { kind: "UNLIMITED" };
}>;

export function isFeatureEnabled(snapshot: FeatureGatingSnapshot, feature: FeatureKey): boolean {
  return snapshot.features.has(feature);
}

/**
 * Helper puro: não redireciona, não decide UX.
 * UI decide mensagem/CTA (ETAPA 5.4).
 */
export function requireFeature(
  snapshot: FeatureGatingSnapshot,
  feature: FeatureKey
): { ok: true } | { ok: false } {
  return isFeatureEnabled(snapshot, feature) ? { ok: true } : { ok: false };
}
