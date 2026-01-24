"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { PremiumLockedCard } from "@/components/premium/PremiumLockedCard";
import { PremiumBadge } from "@/components/premium/PremiumBadge";

export default function EstatisticasPlaceholderPage() {
  const router = useRouter();
  const [hidePremiumCard, setHidePremiumCard] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Estatísticas</h1>
        <Badge variant="secondary">Em breve</Badge>
      </div>

      {/* Placeholder informativo (Fase 4) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Funcionalidade futura</CardTitle>
            <PremiumBadge />
          </div>
          <CardDescription>Esta área será ativada em uma fase futura (Fase 4 — Estatísticas).</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Placeholder estritamente informativo. Nenhum dado é consumido e nenhuma regra de negócio é aplicada aqui.
        </CardContent>
      </Card>

      {/* Comunicação Premium (UX/CTA) — sem lógica, sem dados */}
      {!hidePremiumCard && (
        <PremiumLockedCard
          title="Análises Premium"
          description={
            <>
              Visualizações avançadas para acompanhamento detalhado.{" "}
              <span className="font-medium text-foreground">Elas não interferem no planejamento ou metas de estudo.</span>
            </>
          }
          primaryCtaLabel="Ver planos"
          secondaryCtaLabel="Agora não"
          onPrimaryCta={() => router.push("/assinatura")}
          onSecondaryCta={() => setHidePremiumCard(true)}
        />
      )}
    </div>
  );
}
