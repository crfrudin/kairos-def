import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { uuidV5 } from "./uuidV5";

type SubscriptionEventType =
  | "SubscriptionCreated"
  | "SubscriptionUpgradedToPremium"
  | "SubscriptionCancellationScheduled"
  | "SubscriptionReactivated"
  | "SubscriptionDowngradedToFree";

function getErrorCode(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

function getErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "unknown";
  const msg = (err as { message?: unknown }).message;
  return typeof msg === "string" ? msg : "unknown";
}

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
    eventType: SubscriptionEventType;
  }): Promise<{ alreadyProcessed: boolean; canonicalEventId: string }> {
    const canonicalEventId = uuidV5(params.stripeEventId);

    const { error } = await this.deps.supabaseAdmin.from("subscription_events").insert({
      id: canonicalEventId,
      user_id: params.userId,
      event_type: params.eventType,
    });

    if (!error) {
      return { alreadyProcessed: false, canonicalEventId };
    }

    // PostgREST/Supabase costuma expor code "23505" (unique_violation) quando há conflito de PK.
    const code = getErrorCode(error);
    if (code === "23505") {
      return { alreadyProcessed: true, canonicalEventId };
    }

    // Hardening: fallback sem leitura (alguns caminhos não expõem code de forma consistente).
    const msg = getErrorMessage(error).toLowerCase();
    if (msg.includes("duplicate key") || msg.includes("unique constraint") || msg.includes("unique_violation")) {
      return { alreadyProcessed: true, canonicalEventId };
    }

    // Sem inventar: propagar erro como UNEXPECTED para o handler decidir
    throw new Error(`SUBSCRIPTION_EVENT_INSERT_FAILED: ${getErrorMessage(error)}`);
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
    const nowIso = new Date().toISOString();

    const { error } = await this.deps.supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: params.userId,
          plan_tier: params.planTier,
          state: params.state,
          cancel_effective_on: params.cancelEffectiveOn,
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      throw new Error(`SUBSCRIPTION_UPSERT_FAILED: ${getErrorMessage(error)}`);
    }
  }
}
