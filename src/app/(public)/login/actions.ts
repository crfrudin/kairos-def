"use server";

import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAuthSsrComposition } from "@/core/composition/auth.ssr.composition";

const GENERIC_LOGIN_MESSAGE = "Não foi possível autenticar. Verifique suas credenciais.";

function safeErrorMessage(message: string): string {
  const m = String(message ?? "").trim();
  return m.length > 0 ? m : GENERIC_LOGIN_MESSAGE;
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

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  const { orchestrator } = createAuthSsrComposition();
  const context = await getAuthAuditContext();

  const result = await orchestrator.login({ email, password, context });

  if (!result.ok) {
    // Mensagem genérica (anti-enumeração)
    redirect(`/login?e=${encodeURIComponent(safeErrorMessage(result.error.message || GENERIC_LOGIN_MESSAGE))}`);
  }

  /**
   * IMPORTANTE:
   * - A UI NÃO decide o destino autenticado.
   * - Apenas forçamos uma nova request em rota pública.
   * - O middleware global, ao ver cookies SSR válidos, fará o redirect correto.
   */
  redirect("/login");
}
