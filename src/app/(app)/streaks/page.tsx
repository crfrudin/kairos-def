import "server-only";

import { requireAuthenticatedUserId } from "@/core/auth/requireUserId";
import { createGamificationSsrComposition } from "@/core/composition/gamification.ssr.composition";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatIsoToPtBr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  if (typeof v !== "object" || v === null) return null;
  return v as UnknownRecord;
}

function pickString(obj: UnknownRecord, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

function pickNumber(obj: UnknownRecord, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function pickIsoLike(obj: UnknownRecord, keys: string[]): string | null {
  // Aceita string ISO (ou qualquer string) e deixa o formatter tentar.
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

function extractSymbolicStateLabel(state: unknown): string {
  const r = asRecord(state);
  if (!r) return "—";

  // Tenta achar um "estado simbólico" em chaves comuns, sem inferir regra.
  const label =
    pickString(r, ["symbolicState", "symbolic_status", "status", "state", "phase", "kind"]) ??
    pickString(r, ["label", "name", "code"]);

  return label ?? "—";
}

function extractConsolidatedValue(state: unknown): string {
  const r = asRecord(state);
  if (!r) return "—";

  const n =
    pickNumber(r, ["value", "currentValue", "count", "currentCount", "streakValue", "streakCount"]) ?? null;

  if (n !== null) return String(n);

  const s =
    pickString(r, ["value", "currentValue", "count", "currentCount", "streakValue", "streakCount"]) ?? null;

  return s ?? "—";
}

function extractLastTransitionAt(state: unknown): string {
  const r = asRecord(state);
  if (!r) return "—";

  const iso =
    pickIsoLike(r, ["lastTransitionAt", "last_transition_at", "transitionedAt", "lastTransitionedAt"]) ?? null;

  if (!iso) return "—";
  return formatIsoToPtBr(iso);
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
          {streaks.map((s) => {
            const symbolicState = extractSymbolicStateLabel(s.state);
            const consolidatedValue = extractConsolidatedValue(s.state);
            const lastTransitionAt = extractLastTransitionAt(s.state);

            return (
              <Card key={s.streakKey}>
                <CardHeader>
                  <CardTitle className="text-base">{s.streakKey}</CardTitle>
                  <CardDescription>Atualizado em {formatIsoToPtBr(s.updatedAt)}</CardDescription>
                </CardHeader>

                <div className="px-6 pb-6 text-sm">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-muted-foreground">Estado simbólico atual</div>
                      <div>{symbolicState}</div>
                    </div>

                    <div>
                      <div className="text-muted-foreground">Valor consolidado</div>
                      <div>{consolidatedValue}</div>
                    </div>

                    <div>
                      <div className="text-muted-foreground">Última transição</div>
                      <div>{lastTransitionAt}</div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">Chave: {s.streakKey}</Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
