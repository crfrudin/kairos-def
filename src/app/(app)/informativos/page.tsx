import "server-only";

import { headers } from "next/headers";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getFeatureGatingSnapshot, requireFeature } from "@/core/feature-gating";
import { InformativosPage } from "@/features/informatives/ui/InformativosPage";

function AuthFail() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-lg font-semibold">Informativos</div>
          <div className="text-sm text-muted-foreground">Falha de autenticação. Volte ao login.</div>
        </CardContent>
      </Card>
    </div>
  );
}

function LockedByPlan() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold">Informativos</div>
            <Badge variant="secondary">Premium</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            O robô de informativos é um recurso do plano Premium. Para habilitar, acesse Assinatura.
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/assinatura">Ver planos</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Voltar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SubscriptionUnavailable() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="text-lg font-semibold">Informativos</div>
          <div className="text-sm text-muted-foreground">
            Não foi possível carregar o status da assinatura no momento. Tente novamente.
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">Voltar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function InformativosRoutePage() {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) return <AuthFail />;

  const gating = await getFeatureGatingSnapshot(userId);
  if (!gating.ok) return <SubscriptionUnavailable />;

  // Gate: INFORMATIVES_BOT
  if (!requireFeature(gating.snapshot, "INFORMATIVES_BOT").ok) {
    return <LockedByPlan />;
  }

  // Mantemos compatibilidade com o componente existente (sem mudar contrato aqui).
  const planAuthorization = h.get("x-kairos-plan-authorization") ?? undefined;

  return <InformativosPage userId={userId} planAuthorization={planAuthorization} />;
}
