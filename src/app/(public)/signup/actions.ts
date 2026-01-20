"use server";

import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAuthSsrComposition } from "@/core/composition/auth.ssr.composition";

const GENERIC_SIGNUP_MESSAGE = "Não foi possível concluir o cadastro.";

function safeErrorMessage(message: string): string {
  const m = String(message ?? "").trim();
  return m.length > 0 ? m : GENERIC_SIGNUP_MESSAGE;
}

async function getAuthAuditContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();

  const xff = String(h.get("x-forwarded-for") ?? "").trim();
  const xRealIp = String(h.get("x-real-ip") ?? "").trim();

  const ip = (xff ? xff.split(",")[0]?.trim() : xRealIp) || "";
  const ua = String(h.get("user-agent") ?? "").trim();

  return {
    ip: ip ? ip : null,
    userAgent: ua ? ua : null,
  };
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "").trim();

  // Validação UI mínima (não normativa): confirmação precisa bater
  if (!email || !password || password !== passwordConfirm) {
    redirect(`/signup?e=${encodeURIComponent(GENERIC_SIGNUP_MESSAGE)}`);
  }

  const { orchestrator } = createAuthSsrComposition();
  const context = await getAuthAuditContext();

  const result = await orchestrator.signup({ email, password, context });

  if (!result.ok) {
    // Mensagem genérica (anti-enumeração)
    redirect(`/signup?e=${encodeURIComponent(safeErrorMessage(result.error.message || GENERIC_SIGNUP_MESSAGE))}`);
  }

  // Usuário criado como não confirmado → tela informativa
  redirect(`/signup?ok=1`);
}
