import "server-only";

import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { createDailyPlanSsrComposition } from "@/core/composition/daily-plan.ssr.composition";

function isoDateTodaySaoPaulo(): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return dtf.format(new Date()); // YYYY-MM-DD
}

export async function DailyGoalStatusCard() {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meta Diária</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">Não autenticado</CardContent>
      </Card>
    );
  }

  const today = isoDateTodaySaoPaulo();
  const { getDailyPlanUseCase } = createDailyPlanSsrComposition();

  const { plan } = await getDailyPlanUseCase.execute({ userId, date: today });

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meta Diária</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">Meta não gerada</CardContent>
      </Card>
    );
  }

  // Exibição factual do DTO, sem inferência:
  // se houver "status" (string), mostramos; caso contrário, apenas "Meta existente".
  const rawStatus = (plan as unknown as { status?: unknown }).status;
  const statusText = typeof rawStatus === "string" && rawStatus.trim().length > 0 ? rawStatus : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meta Diária</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <div>Meta existente</div>
        {statusText ? <div>Status: {statusText}</div> : null}
      </CardContent>
    </Card>
  );
}
