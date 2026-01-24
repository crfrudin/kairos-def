import "server-only";

import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createSupabaseServerClient } from "@/core/clients/createSupabaseServerClient";

import { SupabaseUserAdministrativeProfileRepository } from "@/features/user-administrative-profile/infra/SupabaseUserAdministrativeProfileRepository";
import { CheckUserAdministrativeProfileCompletenessUseCase } from "@/features/user-administrative-profile/application/use-cases/CheckUserAdministrativeProfileCompletenessUseCase";

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
  const explicit = String(process.env.KAIROS_PUBLIC_URL ?? "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const proto = getHeader(req, "x-forwarded-proto") || "https";
  const host = getHeader(req, "x-forwarded-host") || getHeader(req, "host");
  if (!host) throw new Error("BASE_URL_MISSING: host header not present and KAIROS_PUBLIC_URL not configured");

  return `${proto}://${host}`.replace(/\/+$/, "");
}

function enforceSameOrigin(req: Request) {
  const origin = getHeader(req, "origin");
  const host = getHeader(req, "x-forwarded-host") || getHeader(req, "host");

  // Se não houver Origin, não bloqueamos aqui.
  // O endpoint depende de cookie de sessão; na prática, chamadas externas não autenticadas falham.
  if (!origin || !host) return;

  const o = new URL(origin);
  if (o.host !== host) {
    throw new Error("CSRF_BLOCKED: origin host mismatch");
  }
}

async function requireUserIdFromCookies(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) throw new Error("AUTH_UNEXPECTED");
  const userId = data.user?.id ?? "";
  if (!userId) throw new Error("AUTH_REQUIRED");
  return userId;
}

function parseBillingPeriod(body: unknown): BillingPeriod {
  if (!body || typeof body !== "object") throw new Error("INVALID_BODY");
  const raw = (body as { billingPeriod?: unknown }).billingPeriod;
  if (raw !== "MONTHLY" && raw !== "ANNUAL") throw new Error("INVALID_BODY");
  return raw;
}

async function ensureAdministrativeProfileComplete(userId: string): Promise<{ ok: true } | { ok: false; validation?: unknown }> {
  const repo = new SupabaseUserAdministrativeProfileRepository();
  const uc = new CheckUserAdministrativeProfileCompletenessUseCase(repo);

  const res = await uc.execute({ userId });

  if (!res.ok) {
    // Infra/Unexpected do UC (não é "incompleto"; é falha técnica)
    throw new Error(`UAP_COMPLETENESS_FAILED: ${res.error.code}`);
  }

  if (!res.data.exists || !res.data.isComplete) {
    return { ok: false, validation: res.data.validation ?? null };
  }

  return { ok: true };
}

export async function POST(req: Request) {
  try {
    enforceSameOrigin(req);

    const secretKey = getRequiredEnv("STRIPE_SECRET_KEY");
    const monthlyPriceId = getRequiredEnv("STRIPE_PRICE_ID_MONTHLY");
    const annualPriceId = getRequiredEnv("STRIPE_PRICE_ID_ANNUAL");

    const baseUrl = getBaseUrl(req);

    const body = await req.json().catch(() => {
      throw new Error("INVALID_BODY");
    });

    const billingPeriod = parseBillingPeriod(body);

    // ✅ Auth por cookie
    const userId = await requireUserIdFromCookies();

    // ✅ Gate fiscal/administrativo (Fase 6): sem inferência normativa nova
    const completeness = await ensureAdministrativeProfileComplete(userId);
    if (!completeness.ok) {
      const isDev = process.env.NODE_ENV !== "production";
      return json(422, {
        ok: false,
        error: "BILLING_PROFILE_INCOMPLETE",
        ...(isDev ? { validation: completeness.validation ?? null } : {}),
      });
    }

    const priceId = billingPeriod === "MONTHLY" ? monthlyPriceId : annualPriceId;

    const stripe = new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],

      // ✅ Regra 2.7 (governança): userId deve estar no evento sem lookup.
      client_reference_id: userId,
      metadata: { userId, source: "kairos", billingPeriod },

      // ✅ userId também no Subscription (customer.subscription.*)
      subscription_data: {
        metadata: { userId, source: "kairos" },
      },

      success_url: `${baseUrl}/assinatura?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/assinatura?checkout=cancelled`,
    });

    if (!session.url) return json(500, { ok: false, error: "STRIPE_NO_URL" });

    return json(200, { ok: true, url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNEXPECTED";
    const isDev = process.env.NODE_ENV !== "production";

    if (msg.startsWith("AUTH_REQUIRED")) return json(401, { ok: false, error: "AUTH_REQUIRED" });
    if (msg.startsWith("CSRF_BLOCKED")) return json(403, { ok: false, error: "FORBIDDEN" });
    if (msg.startsWith("INVALID_BODY")) return json(400, { ok: false, error: "BAD_REQUEST" });

    if (msg.startsWith("ENV_MISSING") || msg.startsWith("BASE_URL_MISSING")) {
      return json(500, { ok: false, error: "SERVER_MISCONFIGURED", ...(isDev ? { debug: msg } : {}) });
    }

    // Se o UC falhou tecnicamente, não é "cadastro incompleto": é erro interno
    if (msg.startsWith("UAP_COMPLETENESS_FAILED")) {
      return json(500, { ok: false, error: "UNEXPECTED", ...(isDev ? { debug: msg } : {}) });
    }

    return json(500, { ok: false, error: "UNEXPECTED", ...(isDev ? { debug: msg } : {}) });
  }
}
