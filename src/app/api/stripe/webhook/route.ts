import "server-only";

import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getSupabaseAdmin } from "@/core/clients/supabaseAdmin";

import { UpgradeToPremium, ScheduleCancellation, ReactivateSubscription } from "@/features/subscription";

import { StripeWebhookSubscriptionWriter } from "@/integrations/stripe/webhooks/StripeWebhookSubscriptionWriter";
import { SupabaseSubscriptionRepositoryServiceRole } from "@/integrations/stripe/mapping/SupabaseSubscriptionRepositoryServiceRole";
import { unixSecondsToYYYYMMDD } from "@/integrations/stripe/webhooks/date";

// Webhook Stripe precisa de Node runtime para validação com corpo bruto.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function missingEnv(name: string) {
  return new NextResponse(`${name} not configured`, { status: 500 });
}

function badRequest(message: string) {
  return new NextResponse(message, { status: 400 });
}

function ok(body: unknown) {
  return NextResponse.json(body, { status: 200 });
}

// ✅ Whitelist fechada (governança)
const ALLOWED_EVENTS = new Set<string>(["checkout.session.completed", "customer.subscription.updated"]);

function extractUserIdFromCheckoutSession(session: Stripe.Checkout.Session): string {
  const fromClientRef = (session.client_reference_id ?? "").trim();
  if (fromClientRef) return fromClientRef;

  const metaUser = (session.metadata?.userId ?? "").trim();
  if (metaUser) return metaUser;

  return "";
}

function extractUserIdFromSubscription(sub: Stripe.Subscription): string {
  const metaUser = (sub.metadata?.userId ?? "").trim();
  if (metaUser) return metaUser;
  return "";
}

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  if (!secretKey) return missingEnv("STRIPE_SECRET_KEY");
  if (!webhookSecret) return missingEnv("STRIPE_WEBHOOK_SECRET");

  const signature = req.headers.get("stripe-signature");
  if (!signature) return badRequest("Missing stripe-signature header");

  // Corpo bruto (exigência Stripe)
  const rawBody = await req.text();

  const stripe = new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return badRequest(`Webhook signature verification failed: ${msg}`);
  }

  // ✅ Whitelist fechada (sem interpretação extensiva)
  if (!ALLOWED_EVENTS.has(event.type)) {
    return ok({ received: true, ignored: true, reason: "EVENT_NOT_ALLOWED", type: event.type, eventId: event.id });
  }

  // Service role (G1) — estritamente server-only
  const supabaseAdmin = getSupabaseAdmin();

  const writer = new StripeWebhookSubscriptionWriter({ supabaseAdmin });
  const repo = new SupabaseSubscriptionRepositoryServiceRole({ supabaseAdmin });

  const upgradeUC = new UpgradeToPremium(repo);
  const cancelUC = new ScheduleCancellation(repo);
  const reactivateUC = new ReactivateSubscription(repo);

  // Dispatcher
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = extractUserIdFromCheckoutSession(session);
      if (!userId) {
        return badRequest("USER_ID_MISSING: checkout.session.completed missing client_reference_id/metadata.userId");
      }

      // ✅ Idempotência determinística (sem leitura prévia)
      const { alreadyProcessed } = await writer.appendEventIdempotent({
        stripeEventId: event.id,
        userId,
        eventType: "SubscriptionUpgradedToPremium",
      });

      if (alreadyProcessed) {
        return ok({ received: true, alreadyProcessed: true, type: event.type, eventId: event.id });
      }

      const res = await upgradeUC.execute({ userId });

      // Se já está premium, UC é idempotente (success)
      // Se erro normativo, ainda assim não deve explodir retry infinito.
      if (!res.ok) {
        return ok({ received: true, processed: false, type: event.type, eventId: event.id, result: "error", code: res.error.code });
      }

      return ok({ received: true, processed: true, type: event.type, eventId: event.id, result: "ok" });
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;

      const userId = extractUserIdFromSubscription(sub);
      if (!userId) {
        return badRequest("USER_ID_MISSING: customer.subscription.updated missing subscription.metadata.userId");
      }

      const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);

      if (cancelAtPeriodEnd) {
        const currentPeriodEnd = Number(sub.current_period_end ?? 0);
        if (!currentPeriodEnd) {
          return badRequest("PERIOD_END_MISSING: subscription.current_period_end missing");
        }

        const cancelEffectiveOn = unixSecondsToYYYYMMDD(currentPeriodEnd);

        const { alreadyProcessed } = await writer.appendEventIdempotent({
          stripeEventId: event.id,
          userId,
          eventType: "SubscriptionCancellationScheduled",
        });

        if (alreadyProcessed) {
          return ok({ received: true, alreadyProcessed: true, type: event.type, eventId: event.id });
        }

        const res = await cancelUC.execute({ userId, cancelEffectiveOn });

        if (!res.ok) {
          return ok({ received: true, processed: false, type: event.type, eventId: event.id, result: "error", code: res.error.code });
        }

        return ok({ received: true, processed: true, type: event.type, eventId: event.id, result: "ok" });
      }

      // cancel_at_period_end = false => reativação (se estava canceling)
      const { alreadyProcessed } = await writer.appendEventIdempotent({
        stripeEventId: event.id,
        userId,
        eventType: "SubscriptionReactivated",
      });

      if (alreadyProcessed) {
        return ok({ received: true, alreadyProcessed: true, type: event.type, eventId: event.id });
      }

      const res = await reactivateUC.execute({ userId });

      // UC pode retornar NotInCancelingState (normativo). Tratamos como “já ok” e damos ACK 200.
      if (!res.ok) {
        return ok({ received: true, processed: false, type: event.type, eventId: event.id, result: "error", code: res.error.code });
      }

      return ok({ received: true, processed: true, type: event.type, eventId: event.id, result: "ok" });
    }

    // (defensivo) nunca deve cair aqui por whitelist
    return ok({ received: true, ignored: true, reason: "UNREACHABLE", type: event.type, eventId: event.id });
  } catch (e) {
    // Falha inesperada: devolver 500 para permitir retry do Stripe
    const msg = e instanceof Error ? e.message : "UNEXPECTED";
    return new NextResponse(`Webhook processing failed: ${msg}`, { status: 500 });
  }
}
