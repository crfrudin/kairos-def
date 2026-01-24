import "server-only";

import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createSupabaseServerClient } from "@/core/clients/createSupabaseServerClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BillingPeriod = "MONTHLY" | "ANNUAL";

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

function getHeader(req: Request, name: string): string {
  return (req.headers.get(name) ?? "").trim();
}

function getRequiredEnv(name: string): string {
  const v = String(process.env[name] ?? "").trim();
  if (!v) throw new Error(`ENV_MISSING: ${name} not configured`);
  return v;
}

function getBaseUrl(req: Request): string {
  // Preferível: definir explicitamente (evita inconsistência em proxy/CDN)
  const explicit = String(process.env.KAIROS_PUBLIC_URL ?? "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  // Fallback seguro: montar a partir de headers do request
  const proto = getHeader(req, "x-forwarded-proto") || "https";
  const host = getHeader(req, "x-forwarded-host") || getHeader(req, "host");

  if (!host) throw new Error("BASE_URL_MISSING: host header not present and KAIROS_PUBLIC_URL not configured");
  return `${proto}://${host}`.replace(/\/+$/, "");
}

function enforceSameOrigin(req: Request) {
  const origin = getHeader(req, "origin");
  const host = getHeader(req, "x-forwarded-host") || getHeader(req, "host");

  // Se não houver origin (ex.: algumas chamadas server-to-server), não bloqueamos aqui.
  // Mas o endpoint depende de cookie de sessão: normalmente será chamado do browser.
  if (!origin || !host) return;

  try {
    const o = new URL(origin);
    if (o.host !== host) {
      throw new Error(`CSRF_BLOCKED: origin host mismatch (origin=${o.host} host=${host})`);
    }
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "CSRF_BLOCKED");
  }
}

async function requireUserIdFromCookies(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`AUTH_UNEXPECTED: ${error.message}`);
  const userId = data.user?.id ?? "";
  if (!userId) throw new Error("AUTH_REQUIRED: no active session");
  return userId;
}

function parseBillingPeriod(body: unknown): BillingPeriod {
  if (!body || typeof body !== "object") throw new Error("INVALID_BODY: expected JSON object");
  const raw = (body as { billingPeriod?: unknown }).billingPeriod;
  if (raw !== "MONTHLY" && raw !== "ANNUAL") throw new Error("INVALID_BODY: billingPeriod must be MONTHLY or ANNUAL");
  return raw;
}

export async function POST(req: Request) {
  try {
    enforceSameOrigin(req);

    const secretKey = getRequiredEnv("STRIPE_SECRET_KEY");
    const monthlyPriceId = getRequiredEnv("STRIPE_PRICE_ID_MONTHLY");
    const annualPriceId = getRequiredEnv("STRIPE_PRICE_ID_ANNUAL");

    const baseUrl = getBaseUrl(req);

    const body = await req.json().catch(() => {
      throw new Error("INVALID_BODY: request must be application/json");
    });

    const billingPeriod = parseBillingPeriod(body);

    // ✅ Autenticação pelo cookie (não depende do middleware / headers x-kairos-*)
    const userId = await requireUserIdFromCookies();

    const priceId = billingPeriod === "MONTHLY" ? monthlyPriceId : annualPriceId;

    const stripe = new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      metadata: { userId, source: "kairos", billingPeriod },

      // URLs do app (não são regra de negócio; apenas navegação pós-checkout)
      success_url: `${baseUrl}/assinatura?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/assinatura?checkout=cancelled`,
    });

    if (!session.url) {
      return json(500, { ok: false, error: "STRIPE_NO_URL" });
    }

    return json(200, { ok: true, url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNEXPECTED";
    // Não vazar detalhes sensíveis
    if (msg.startsWith("AUTH_REQUIRED")) return json(401, { ok: false, error: "AUTH_REQUIRED" });
    if (msg.startsWith("CSRF_BLOCKED")) return json(403, { ok: false, error: "FORBIDDEN" });
    if (msg.startsWith("INVALID_BODY")) return json(400, { ok: false, error: "BAD_REQUEST" });
    if (msg.startsWith("ENV_MISSING") || msg.startsWith("BASE_URL_MISSING")) return json(500, { ok: false, error: "SERVER_MISCONFIGURED" });

    return json(500, { ok: false, error: "UNEXPECTED" });
  }
}
