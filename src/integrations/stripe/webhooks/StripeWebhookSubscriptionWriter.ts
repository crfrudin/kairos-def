import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { uuidV5 } from "./uuidV5";

/**
 * G1 — Writer dedicado e auditável (service role)
 *
 * Regras:
 * - server-only
 * - write-only (sem leitura ampla)
 * - escopo fechado: subscription_events (append-only) + subscriptions (upsert)
 * - idempotência determinística por stripe_event_id -> UUIDv5 -> PK(subscription_events.id)
 */
export class StripeWebhookSubscriptionWriter {
  constructor(private readonly deps: { supabaseAdmin: SupabaseClient }) {}

  /**
   * Tenta registrar o evento externo como evento canônico no banco (append-only).
   * - Sem leitura prévia
   * - Conflito (PK) => já processado
   */
  async appendEventIdempotent(params: {
    stripeEventId: string;
    userId: string;
    eventType:
      | "SubscriptionCreated"
      | "SubscriptionUpgradedToPremium"
      | "SubscriptionCancellationScheduled"
      | "SubscriptionReactivated"
      | "SubscriptionDowngradedToFree";
  }): Promise<{ alreadyProcessed: boolean; canonicalEventId: string }> {
    const canonicalEventId = uuidV5(params.stripeEventId);

    const { error } = await this.deps.supabaseAdmin
      .from("subscription_events")
      .insert(
        {
          id: canonicalEventId,
          user_id: params.userId,
          event_type: params.eventType,
        },
        {
          // sem leitura prévia; conflito => erro 23505
        }
      );

    if (!error) {
      return { alreadyProcessed: false, canonicalEventId };
    }

    // PostgREST/Supabase retorna code em error.code (quando disponível)
    const code = (error as unknown as { code?: string }).code ?? "";
    if (code === "23505") {
      return { alreadyProcessed: true, canonicalEventId };
    }

    // Sem inventar: propagar erro como UNEXPECTED para o handler decidir
    throw new Error(`SUBSCRIPTION_EVENT_INSERT_FAILED: ${String((error as any)?.message ?? "unknown")}`);
  }

  /**
   * UPSERT do estado atual (1 linha por user).
   * Somente colunas aprovadas em schema:
   * - user_id, plan_tier, state, cancel_effective_on, updated_at
   */
  async upsertSubscriptionState(params: {
    userId: string;
    planTier: "FREE" | "PREMIUM";
    state: "FREE" | "PREMIUM_ACTIVE" | "PREMIUM_CANCELING";
    cancelEffectiveOn: string | null; // YYYY-MM-DD ou null
  }): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await this.deps.supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: params.userId,
          plan_tier: params.planTier,
          state: params.state,
          cancel_effective_on: params.cancelEffectiveOn,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      throw new Error(`SUBSCRIPTION_UPSERT_FAILED: ${String((error as any)?.message ?? "unknown")}`);
    }
  }
}
