import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createAuthSsrComposition } from "@/core/composition/auth.ssr.composition";

import { PublicShell } from "../_components/PublicShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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

export default async function ConfirmarEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = typeof sp?.token === "string" ? sp.token.trim() : "";

  if (!token) {
    return (
      <PublicShell title="Confirmação de email" description="Link inválido.">
        <Alert variant="destructive">
          <AlertTitle>Não foi possível confirmar</AlertTitle>
          <AlertDescription>Token inválido.</AlertDescription>
        </Alert>

        <Button asChild className="w-full">
          <Link href="/login">Voltar</Link>
        </Button>
      </PublicShell>
    );
  }

  const { orchestrator } = createAuthSsrComposition();
  const context = await getAuthAuditContext();

  const result = await orchestrator.confirmEmail({ token, context });

  if (!result.ok) {
    return (
      <PublicShell title="Confirmação de email" description="Não foi possível concluir sua solicitação.">
        <Alert variant="destructive">
          <AlertTitle>Não foi possível confirmar</AlertTitle>
          <AlertDescription>Não foi possível concluir sua solicitação.</AlertDescription>
        </Alert>

        <Button asChild className="w-full">
          <Link href="/login">Voltar</Link>
        </Button>
      </PublicShell>
    );
  }

  /**
   * A troca do code por sessão (cookies SSR) acontece no repositório SSR.
   * Agora só fazemos uma nova request em rota pública.
   * O middleware global fará o redirect correto.
   */
  redirect("/login");
}
