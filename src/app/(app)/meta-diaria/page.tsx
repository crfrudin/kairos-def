import "server-only";

import { headers } from "next/headers";

import { Button } from "@/components/ui/button";
import { createDailyPlanSsrComposition } from "@/core/composition/daily-plan.ssr.composition";

import { regenerateDailyPlanAction } from "./actions";
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

function renderNotAuthenticated() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="rounded-lg border p-6">
        <div className="text-lg font-semibold">Meta Diária</div>
        <div className="text-sm text-muted-foreground">Falha de autenticação. Volte ao login.</div>
      </div>
    </div>
  );
}

function renderNoMaterializedPlan(isoDate: string) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <DailyStatusCard
        dateLabel={`Hoje (${formatIsoDatePtBr(isoDate)})`}
        status="PLANNED"
        plannedDurationLabel="—"
        availableDurationLabel="—"
      />

      <div className="rounded-lg border p-6 space-y-2">
        <div className="text-sm font-semibold">Nenhum plano materializado</div>
        <div className="text-sm text-muted-foreground">
          O sistema não conseguiu materializar o plano diário para esta data.
        </div>

        <div className="pt-2 text-sm">
          <div className="font-medium">Possíveis causas:</div>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Perfil ainda não configurado</li>
            <li>Nenhuma matéria cadastrada</li>
            <li>Regras atuais tornam o dia inviável</li>
          </ul>
        </div>

        <div className="pt-2 flex flex-wrap gap-2">
          <a className="underline text-sm" href="/perfil">
            Ir para Perfil
          </a>
          <a className="underline text-sm" href="/materias">
            Ir para Matérias
          </a>
        </div>
      </div>
    </div>
  );
}

export default async function MetaDiariaPage() {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";

  if (!userId) return renderNotAuthenticated();

  const isoDate = getTodayIsoDateInSaoPaulo();
  const { getDailyPlanUseCase, generateDailyPlanUseCase } = createDailyPlanSsrComposition();

  // 1) Tenta ler
  const { plan: existing } = await getDailyPlanUseCase.execute({ userId, date: isoDate });

  // 2) Se não existir, materializa (SSR, determinístico)
  let plan: DailyPlanDTO | null = existing ?? null;

  if (!plan) {
    try {
      const generated = await generateDailyPlanUseCase.execute({ userId, date: isoDate });
      plan = generated.plan;
    } catch {
      return renderNoMaterializedPlan(isoDate);
    }
  }

  if (!plan) {
    return renderNoMaterializedPlan(isoDate);
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

      {canExecute ? (
        <form
          action={async () => {
            "use server";
            await regenerateDailyPlanAction({ date: plan.date });
          }}
        >
          <Button type="submit" variant="outline" className="w-full">
            Regenerar plano de hoje
          </Button>
        </form>
      ) : (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Este dia já foi executado. Por regra normativa, o plano não pode ser regenerado.
        </div>
      )}

      <ExecuteDayForm isoDate={plan.date} disabled={!canExecute} />
    </div>
  );
}
