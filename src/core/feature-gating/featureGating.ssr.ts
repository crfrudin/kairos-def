import "server-only";

import { createSubscriptionSsrComposition } from "@/core/composition/subscription.ssr.composition";

import type { FeatureKey } from "@/features/subscription/domain/value-objects/FeatureKey";
import { assertFeatureKey } from "@/features/subscription/domain/value-objects/FeatureKey";

import type { FeatureGatingSnapshot } from "./featureGating.shared";

export type FeatureGatingResult =
  | { ok: true; snapshot: FeatureGatingSnapshot }
  | { ok: false; reason: "SUBSCRIPTION_UNAVAILABLE" };

function toSnapshot(dto: {
  state: FeatureGatingSnapshot["state"];
  plan: FeatureGatingSnapshot["plan"];
  cancelEffectiveOn: string | null;
  entitlements: {
    features: readonly string[];
    maxActiveSubjects: FeatureGatingSnapshot["maxActiveSubjects"];
  };
}): FeatureGatingSnapshot {
  // Fail-fast: garante FeatureKey fechado.
  const normalized = dto.entitlements.features.map((f) => String(f));
  normalized.forEach(assertFeatureKey);

  return {
    plan: dto.plan,
    state: dto.state,
    cancelEffectiveOn: dto.cancelEffectiveOn,
    features: new Set(normalized as FeatureKey[]),
    maxActiveSubjects: dto.entitlements.maxActiveSubjects,
  };
}

/**
 * Fonte única de verdade para gating (server-side):
 * - consulta Application (GetSubscriptionStatus)
 * - nunca lê DB diretamente da UI
 * - nunca usa service role
 */
export async function getFeatureGatingSnapshot(userId: string): Promise<FeatureGatingResult> {
  const { getSubscriptionStatusUseCase } = createSubscriptionSsrComposition();
  const res = await getSubscriptionStatusUseCase.execute({ userId });

  if (!res.ok) {
    return { ok: false, reason: "SUBSCRIPTION_UNAVAILABLE" };
  }

  return { ok: true, snapshot: toSnapshot(res.value.subscription) };
}
