import "server-only";

import { requireAuthenticatedUserId } from "@/core/auth/requireUserId";
import { createGamificationSsrComposition } from "@/core/composition/gamification.ssr.composition";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatIsoToPtBr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "—";
  }
}

export default async function StreaksPage() {
  const tenantId = await requireAuthenticatedUserId();

  const comp = await createGamificationSsrComposition({ tenantId });

  // Permitido: somente UC-04 (leitura simbólica atual).
  const res = await comp.uc04GetCurrentSymbolicState.execute({ tenantId });

  if (!res.ok) {
    // UI passiva: não diagnostica, não sugere ação, não cria CTA.
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Streaks</h1>
          <Badge variant="secondary">Somente leitura</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Indisponível</CardTitle>
            <CardDescription>Não foi possível obter o estado simbólico no momento.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const streaks = res.value.state.streaks;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Streaks</h1>
        <Badge variant="secondary">Somente leitura</Badge>
      </div>

      {streaks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sem registros</CardTitle>
            <CardDescription>Nenhum snapshot de streak foi encontrado.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {streaks.map((s) => (
            <Card key={s.streakKey}>
              <CardHeader>
                <CardTitle className="text-base">{s.streakKey}</CardTitle>
                <CardDescription>Atualizado em {formatIsoToPtBr(s.updatedAt)}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground">Descrição</div>
                    <div>—</div>
                  </div>

                  <div>
                    <div className="text-muted-foreground">Classificação</div>
                    <div>—</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-muted-foreground">Estado (payload estrutural)</div>
                  <pre className="max-h-[360px] overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
{safeJson(s.state)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
