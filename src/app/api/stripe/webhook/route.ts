import "server-only";

import { NextResponse } from "next/server";
import Stripe from "stripe";

// Webhook Stripe precisa de Node runtime para validação com corpo bruto.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function missingEnv(name: string) {
  return new NextResponse(`${name} not configured`, { status: 500 });
}

function badRequest(message: string) {
  return new NextResponse(message, { status: 400 });
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

  // API version: fixa para consistência tipada do SDK (evita mismatch).
  // Stripe recomenda setar apiVersion no SDK para previsibilidade.
  const stripe = new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return badRequest(`Webhook signature verification failed: ${msg}`);
  }

  // ✅ Nesta etapa (ainda): apenas validação + ack.
  // Próximas etapas: idempotência (event.id), mapeamento evento -> use-case,
  // e tratamento resiliente (processamento seguro).
  return NextResponse.json({ received: true, eventId: event.id, type: event.type }, { status: 200 });
}
