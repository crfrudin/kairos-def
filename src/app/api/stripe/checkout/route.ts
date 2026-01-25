import "server-only";

import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createSupabaseServerClient } from "@/core/clients/createSupabaseServerClient";

import { SupabaseUserAdministrativeProfileRepository } from "@/features/user-administrative-profile/infra/SupabaseUserAdministrativeProfileRepository";
import { SupabaseLegalConsentRepository } from "@/features/legal-consent/infra/SupabaseLegalConsentRepository";
import { CheckLegalConsentsUseCase } from "@/features/legal-consent/application/use-cases/CheckLegalConsentsUseCase";

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

function digitsOnly(v: unknown): string {
  const s = String(v ?? "");
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c >= "0" && c <= "9") out += c;
  }
  return out;
}

function getTermsVersion(): string {
  return String(process.env.KAIROS_TERMS_VERSION ?? "").trim() || "2026-01-24";
}

function getPrivacyVersion(): string {
  return String(process.env.KAIROS_PRIVACY_VERSION ?? "").trim() || "2026-01-24";
}

/**
 * ETAPA 4 — Gate de assinatura (Premium)
 *
 * Regra: ao clicar em ASSINAR, exige:
 * - CPF informado (digits-only, 11)
 * - Endereço completo (CEP/UF/Cidade/Bairro/Logradouro/Número)
 *
 * Observação: isso NÃO muda o "completo" exibido em /ajustes.
 * É um gate específico para cobrança/nota fiscal.
 */
async function ensureBillingProfileComplete(
  userId: string
): Promise<{ ok: true } | { ok: false; missing: string[] }> {
  const repo = new SupabaseUserAdministrativeProfileRepository();
  const contract = await repo.getFullContract(userId);

  if (!contract?.profile) {
    return { ok: false, missing: ["profile"] };
  }

  const p = contract.profile as any;

  const cpf = digitsOnly(p.cpf);
  const missing: string[] = [];

  if (cpf.length !== 11) missing.push("cpf");

  // Endereço: aceitamos tanto `validatedAddress` quanto `address`.
  const addr = (p.validatedAddress ?? p.address) as any;

  const cep = digitsOnly(addr?.cep);
  const uf = String(addr?.uf ?? "").trim();
  const city = String(addr?.city ?? "").trim();
  const neighborhood = String(addr?.neighborhood ?? "").trim();
  const street = String(addr?.street ?? "").trim();
  const number = String(addr?.number ?? "").trim();

  if (cep.length !== 8) missing.push("address.cep");
  if (!uf) missing.push("address.uf");
  if (!city) missing.push("address.city");
  if (!neighborhood) missing.push("address.neighborhood");
  if (!street) missing.push("address.street");
  if (!number) missing.push("address.number");

  if (missing.length) return { ok: false, missing };
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

    // ✅ Gate premium: CPF + endereço completo
const billingGate = await ensureBillingProfileComplete(userId);
if (!billingGate.ok) {
  const isDev = process.env.NODE_ENV !== "production";
  return json(422, {
    ok: false,
    error: "BILLING_PROFILE_INCOMPLETE",
    ...(isDev ? { validation: { missing: billingGate.missing } } : {}),
  });
}
// ✅ ETAPA 5 — Gate legal: termos + privacidade aceitos (versão atual)
const legalRepo = new SupabaseLegalConsentRepository();
const ucLegal = new CheckLegalConsentsUseCase(legalRepo);

const legalCheck = await ucLegal.execute({
  userId,
  required: [
    { docType: "TERMS", docVersion: getTermsVersion() },
    { docType: "PRIVACY", docVersion: getPrivacyVersion() },
  ],
});

if (!legalCheck.ok) {
  throw new Error(`LEGAL_CHECK_FAILED:${legalCheck.message}`);
}

if (legalCheck.missing.length) {
  const isDev = process.env.NODE_ENV !== "production";
  return json(422, {
    ok: false,
    error: "LEGAL_NOT_ACCEPTED",
    ...(isDev ? { validation: { missing: legalCheck.missing } } : {}),
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

    return json(500, { ok: false, error: "UNEXPECTED", ...(isDev ? { debug: msg } : {}) });
  }
}
