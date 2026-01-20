import "server-only";

import { headers } from "next/headers";

import { createDailyPlanSsrComposition } from "@/core/composition/daily-plan.ssr.composition";

import { DailyStatusCard } from "./components/DailyStatusCard";
import { DailyItemsList, type DailyPlanItemUi } from "./components/DailyItemsList";
import { ExecuteDayForm } from "./components/ExecuteDayForm";
import { formatIsoDatePtBr, formatMinutesToLabel, getTodayIsoDateInSaoPaulo } from "./components/format";

import type { DailyPlanDTO } from "@/features/daily-plan/application/dtos/DailyPlanDTO";
import type { StudyType } from "@/features/daily-plan/application/dtos/PlanTypes";

function mapStudyTypeToUiType(t: StudyType): "REVIEW" | "EXTRA" | "THEORY" {
  if (t === "REVIEW") return "REVIEW";
  if (t === "THEORY") return "THEORY";
  return "EXTRA";
}

function buildUiLists(plan: DailyPlanDTO): {
  reviews: DailyPlanItemUi[];
  extras: DailyPlanItemUi[];
  theory: DailyPlanItemUi[];
} {
  const reviews: DailyPlanItemUi[] = [];
  const extras: DailyPlanItemUi[] = [];
  const theory: DailyPlanItemUi[] = [];

  plan.items.forEach((it, idx) => {
    const ui = {
      id: `${plan.date}-${idx}-${it.type}`,
      type: mapStudyTypeToUiType(it.type),
      title: it.title,
      subtitle: formatMinutesToLabel(it.minutes),
    } satisfies DailyPlanItemUi;

    if (ui.type === "REVIEW") reviews.push(ui);
    else if (ui.type === "THEORY") theory.push(ui);
    else extras.push(ui);
  });

  return { reviews, extras, theory };
}

export default async function MetaDiariaPage() {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";

  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="rounded-lg border p-6">
          <div className="text-lg font-semibold">Meta Diária</div>
          <div className="text-sm text-muted-foreground">
            Falha de autenticação. Volte ao login.
          </div>
        </div>
      </div>
    );
  }

  const isoDate = getTodayIsoDateInSaoPaulo();
  const { getDailyPlanUseCase } = createDailyPlanSsrComposition();

  const { plan } = await getDailyPlanUseCase.execute({
    userId,
    date: isoDate,
  });

  if (!plan) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <DailyStatusCard
          dateLabel={`Hoje (${formatIsoDatePtBr(isoDate)})`}
          status="PLANNED"
          plannedDurationLabel="—"
          availableDurationLabel="—"
        />

        <div className="rounded-lg border p-6">
          <div className="text-sm font-semibold">Nenhum plano materializado</div>
          <div className="mt-1 text-sm text-muted-foreground">
            O backend ainda não materializou o plano diário para esta data.
          </div>
        </div>
      </div>
    );
  }

  const plannedTotal = plan.reviewMinutes + plan.extrasMinutes + plan.theoryMinutes;
  const lists = buildUiLists(plan);
  const canExecute = plan.status !== "EXECUTED";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <DailyStatusCard
        dateLabel={`Hoje (${formatIsoDatePtBr(plan.date)})`}
        status={plan.status}
        plannedDurationLabel={formatMinutesToLabel(plannedTotal)}
        availableDurationLabel={formatMinutesToLabel(plan.dailyMinutes)}
      />

      <DailyItemsList reviews={lists.reviews} extras={lists.extras} theory={lists.theory} />

      <ExecuteDayForm isoDate={plan.date} disabled={!canExecute} />
    </div>
  );
}
