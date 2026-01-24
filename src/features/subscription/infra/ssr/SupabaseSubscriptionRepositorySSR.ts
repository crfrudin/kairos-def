import "server-only";

import type { ISubscriptionRepository } from "../../application/ports/ISubscriptionRepository";

import { createSupabaseServerClient } from "@/core/clients/createSupabaseServerClient";

import { Subscription } from "../../domain/entities/Subscription";
import { SubscriptionId } from "../../domain/value-objects/SubscriptionId";
import { assertPlanTier, type PlanTier } from "../../domain/value-objects/PlanTier";
import { assertSubscriptionState, type SubscriptionState } from "../../domain/value-objects/SubscriptionState";
import { SubscriptionDate } from "../../domain/value-objects/SubscriptionDate";

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
 * ISubscriptionRepository (SSR + RLS)
 *
 * Regras:
 * - server-only
 * - usa anon key + cookies (session) via @supabase/ssr
 * - leitura é sempre filtrada por user_id e protegida por RLS
 * - NUNCA usa service role
 */
export class SupabaseSubscriptionRepositorySSR implements ISubscriptionRepository {
  async getOrCreateForUser(userId: string): Promise<Subscription> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("subscriptions")
      .select("user_id, plan_tier, state, cancel_effective_on")
      .eq("user_id", userId)
      .maybeSingle<SubscriptionRow>();

    if (error) {
      throw new Error(`SUBSCRIPTION_SELECT_FAILED: ${getErrorMessage(error)}`);
    }

    // Sem registro: comportamento normativo -> FREE efetivo (sem IO de criação aqui).
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

    // Reidratação sem alterar domínio: aplica transições mínimas.
    const requiresPremium =
      plan === "PREMIUM" || state === "PREMIUM_ACTIVE" || state === "PREMIUM_CANCELING";

    if (requiresPremium) {
      subscription.upgradeToPremium();
    }

    if (state === "PREMIUM_CANCELING") {
      const date = cancelRaw ? SubscriptionDate.create(String(cancelRaw).slice(0, 10)) : undefined;
      subscription.scheduleCancellation(date);
    }

    return subscription;
  }

  /**
   * Observação: salvar assinatura não é exigência do gating (read-only),
   * mas o port exige. Mantemos implementação SSR com RLS por completude,
   * sem service role.
   */
  async save(userId: string, subscription: Subscription): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const nowIso = new Date().toISOString();

    const { error } = await supabase
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
