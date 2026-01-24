import "server-only";

import Link from "next/link";
import { headers } from "next/headers";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { createDailyPlanSsrComposition } from "@/core/composition/daily-plan.ssr.composition";
import { getFeatureGatingSnapshot, requireFeature } from "@/core/feature-gating";

import { CalendarLegend } from "./components/CalendarLegend";
import { CalendarMonthView } from "./components/CalendarMonthView";
import { CalendarWeekView } from "./components/CalendarWeekView";
import {
  endOfMonthIso,
  endOfWeekIsoSunday,
  formatIsoDatePtBr,
  getTodayIsoDateInSaoPaulo,
  startOfMonthIso,
  startOfWeekIsoMonday,
} from "./components/format";

function AuthFail() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-lg font-semibold">Calendário</div>
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
            <div className="text-lg font-semibold">Calendário</div>
            <Badge variant="secondary">Premium</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            O Calendário completo é um recurso do plano Premium. Para habilitar, acesse Assinatura.
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
          <div className="text-lg font-semibold">Calendário</div>
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

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const view = sp?.view === "week" ? "week" : "month";

  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) return <AuthFail />;

  const gating = await getFeatureGatingSnapshot(userId);
  if (!gating.ok) return <SubscriptionUnavailable />;

  // Gate: CALENDAR_FULL
  if (!requireFeature(gating.snapshot, "CALENDAR_FULL").ok) {
    return <LockedByPlan />;
  }

  const todayIso = getTodayIsoDateInSaoPaulo();

  const rangeStart = view === "week" ? startOfWeekIsoMonday(todayIso) : startOfMonthIso(todayIso);
  const rangeEnd = view === "week" ? endOfWeekIsoSunday(todayIso) : endOfMonthIso(todayIso);

  const { getCalendarProjectionUseCase } = createDailyPlanSsrComposition();

  const { projection } = await getCalendarProjectionUseCase.execute({
    userId,
    rangeStart,
    rangeEnd,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="flex items-start justify-between gap-4 p-6">
          <div>
            <div className="text-lg font-semibold">Calendário</div>
            <div className="text-sm text-muted-foreground">
              Intervalo: {formatIsoDatePtBr(rangeStart)} → {formatIsoDatePtBr(rangeEnd)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant={view === "month" ? "default" : "outline"}>
              <Link href="/calendario?view=month">Mês</Link>
            </Button>
            <Button asChild variant={view === "week" ? "default" : "outline"}>
              <Link href="/calendario?view=week">Semana</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <CalendarLegend />

      {view === "month" ? (
        <CalendarMonthView projection={projection} monthStartIso={rangeStart} />
      ) : (
        <CalendarWeekView projection={projection} rangeStartIso={rangeStart} rangeEndIso={rangeEnd} />
      )}
    </div>
  );
}
