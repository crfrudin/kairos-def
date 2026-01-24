import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ISubscriptionRepository } from "@/features/subscription/application/ports/ISubscriptionRepository";

import { Subscription } from "@/features/subscription/domain/entities/Subscription";
import { SubscriptionId } from "@/features/subscription/domain/value-objects/SubscriptionId";
import { assertPlanTier, type PlanTier } from "@/features/subscription/domain/value-objects/PlanTier";
import {
  assertSubscriptionState,
  type SubscriptionState,
} from "@/features/subscription/domain/value-objects/SubscriptionState";
import { SubscriptionDate } from "@/features/subscription/domain/value-objects/SubscriptionDate";

/**
 * Implementação de ISubscriptionRepository usando service role (G1),
 * com leitura pontual por user_id (não é leitura ampla).
 *
 * Reidratação sem alterar domínio:
 * - reconstrução por replay determinístico via factories/métodos públicos.
 */
export class SupabaseSubscriptionRepositoryServiceRole implements ISubscriptionRepository {
  constructor(private readonly deps: { supabaseAdmin: SupabaseClient }) {}

  async getOrCreateForUser(userId: string): Promise<Subscription> {
    const { data, error } = await this.deps.supabaseAdmin
      .from("subscriptions")
      .select("user_id, plan_tier, state, cancel_effective_on")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`SUBSCRIPTION_SELECT_FAILED: ${String((error as any)?.message ?? "unknown")}`);
    }

    if (!data) {
      const id = SubscriptionId.create(userId);
      const { subscription } = Subscription.createFree(id);
      return subscription;
    }

    const planRaw = String((data as any).plan_tier ?? "");
    const stateRaw = String((data as any).state ?? "");
    const cancelRaw = (data as any).cancel_effective_on as string | null;

    assertPlanTier(planRaw);
    assertSubscriptionState(stateRaw);

    const plan: PlanTier = planRaw;
    const state: SubscriptionState = stateRaw;

    const id = SubscriptionId.create(userId);
    const { subscription } = Subscription.createFree(id);

    // Replay determinístico
    if (plan === "PREMIUM" || state === "PREMIUM_ACTIVE" || state === "PREMIUM_CANCELING") {
      try {
        subscription.upgradeToPremium();
      } catch {
        // domínio protege; se já não der, propagação ocorre por invariantes/fluxo
      }
    }

    if (state === "PREMIUM_CANCELING") {
      const date = cancelRaw ? SubscriptionDate.create(String(cancelRaw).slice(0, 10)) : undefined;

      try {
        subscription.scheduleCancellation(date);
      } catch {
        throw new Error("SUBSCRIPTION_REPLAY_FAILED: cannot apply canceling state");
      }
    }

    return subscription;
  }

  async save(userId: string, subscription: Subscription): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await this.deps.supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan_tier: subscription.plan,
          state: subscription.state,
          cancel_effective_on: subscription.cancelEffectiveOn ? subscription.cancelEffectiveOn.value : null,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      throw new Error(`SUBSCRIPTION_SAVE_FAILED: ${String((error as any)?.message ?? "unknown")}`);
    }
  }
}
