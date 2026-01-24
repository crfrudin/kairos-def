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

type SubscriptionRow = {
  user_id: string;
  plan_tier: string;
  state: string;
  cancel_effective_on: string | null;
};

function getErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "unknown";
  const msg = (err as { message?: unknown }).message;
  return typeof msg === "string" ? msg : "unknown";
}

/**
 * Implementação de ISubscriptionRepository usando service role (G1),
 * com leitura pontual por user_id (não é leitura ampla).
 *
 * Reidratação sem alterar domínio:
 * - materializa FREE e aplica transições mínimas necessárias para atingir o estado do banco
 * - sem "try/catch" silencioso: inconsistências viram erro explícito
 */
export class SupabaseSubscriptionRepositoryServiceRole implements ISubscriptionRepository {
  constructor(private readonly deps: { supabaseAdmin: SupabaseClient }) {}

  async getOrCreateForUser(userId: string): Promise<Subscription> {
    const { data, error } = await this.deps.supabaseAdmin
      .from("subscriptions")
      .select("user_id, plan_tier, state, cancel_effective_on")
      .eq("user_id", userId)
      .maybeSingle<SubscriptionRow>();

    if (error) {
      throw new Error(`SUBSCRIPTION_SELECT_FAILED: ${getErrorMessage(error)}`);
    }

    // Se não existe registro: comportamento normativo do UC-SS01/Repo -> tratar como FREE efetivo.
    const id = SubscriptionId.create(userId);
    const { subscription } = Subscription.createFree(id);

    if (!data) {
      return subscription;
    }

    const planRaw = String(data.plan_tier ?? "");
    const stateRaw = String(data.state ?? "");
    const cancelRaw = data.cancel_effective_on;

    assertPlanTier(planRaw);
    assertSubscriptionState(stateRaw);

    const plan: PlanTier = planRaw;
    const state: SubscriptionState = stateRaw;

    // Banco já possui CHECKs garantindo coerência; ainda assim, reidratação é defensiva.
    const requiresPremium = plan === "PREMIUM" || state === "PREMIUM_ACTIVE" || state === "PREMIUM_CANCELING";
    if (requiresPremium) {
      // FREE -> PREMIUM_ACTIVE (único caminho disponível no domínio)
      subscription.upgradeToPremium();
    }

    if (state === "PREMIUM_CANCELING") {
      const date = cancelRaw ? SubscriptionDate.create(String(cancelRaw).slice(0, 10)) : undefined;
      subscription.scheduleCancellation(date);
    }

    // state === PREMIUM_ACTIVE já está refletido após upgrade; nada mais a fazer.
    // state === FREE já está refletido no createFree.
    return subscription;
  }

  async save(userId: string, subscription: Subscription): Promise<void> {
    const nowIso = new Date().toISOString();

    const { error } = await this.deps.supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan_tier: subscription.plan,
          state: subscription.state,
          cancel_effective_on: subscription.cancelEffectiveOn ? subscription.cancelEffectiveOn.value : null,
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      throw new Error(`SUBSCRIPTION_SAVE_FAILED: ${getErrorMessage(error)}`);
    }
  }
}
