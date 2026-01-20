"use server";

import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAuthSsrComposition } from "@/core/composition/auth.ssr.composition";

const GENERIC_REQUEST_MESSAGE =
  "Se o email estiver correto, você receberá instruções para redefinir sua senha.";
const GENERIC_RESET_MESSAGE = "Não foi possível redefinir sua senha.";

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

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  const { orchestrator } = createAuthSsrComposition();
  const context = await getAuthAuditContext();

  const result = await orchestrator.requestPasswordReset({ email, context });

  // Anti-enumeração: sempre responder de forma neutra
  if (!result.ok) {
    // mantém resposta neutra
    redirect(`/recuperar-senha?sent=1`);
  }

  // Mesmo no ok: mensagem neutra
  redirect(`/recuperar-senha?sent=1`);
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "").trim();
  const newPasswordConfirm = String(formData.get("newPasswordConfirm") ?? "").trim();

  if (!token || !newPassword || newPassword !== newPasswordConfirm) {
    redirect(`/recuperar-senha?e=${encodeURIComponent(GENERIC_RESET_MESSAGE)}`);
  }

  const { orchestrator } = createAuthSsrComposition();
  const context = await getAuthAuditContext();

  const result = await orchestrator.resetPassword({ token, newPassword, context });

  if (!result.ok) {
    // Mensagem genérica (anti-enumeração / sem detalhe técnico)
    redirect(`/recuperar-senha?e=${encodeURIComponent(GENERIC_RESET_MESSAGE)}`);
  }

  // Após reset, voltar para login (middleware decide se redireciona)
  redirect(`/login?reset=1`);
}
