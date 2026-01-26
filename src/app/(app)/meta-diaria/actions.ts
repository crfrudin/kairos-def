"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createDailyPlanSsrComposition } from "@/core/composition/daily-plan.ssr.composition";

import { createGamificationSsrComposition } from "@/core/composition/gamification.ssr.composition";
import { GamificationErrorCode } from "@/features/gamification/application/errors";
import type { IsoDateTimeString, TenantId } from "@/features/gamification/application/contracts";

import type { ExecutedDayResultStatus } from "@/features/daily-plan/application/ports/IExecutionPersistencePort";

function nowIso(): IsoDateTimeString {
  // factual/auditável; não afeta determinismo do planejamento.
  return new Date().toISOString() as IsoDateTimeString;
}

function mapExecuteDayToFactualEventType(
  resultStatus: ExecutedDayResultStatus
): "DailyPlanCompleted" | "DailyPlanFailed" | null {
  if (resultStatus === "COMPLETED") return "DailyPlanCompleted";
  if (resultStatus === "NOT_COMPLETED") return "DailyPlanFailed";
  // PARTIAL e REST_DAY: não observar (sem evento canônico E1..E10 aplicável aqui).
  return null;
}

function buildExecutedDayFactualRef(date: string): string {
  // referência determinística, auditável e estável
  return `executed_day:${date}`;
}

export async function executeDayAction(input: {
  date: string; // YYYY-MM-DD
  resultStatus: ExecutedDayResultStatus;
  totalExecutedMinutes: number; // 0..1440 (use-case valida)
}) {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";

  if (!userId) {
    throw new Error("Missing authenticated user claim (x-kairos-user-id).");
  }

  const { executeDayUseCase } = createDailyPlanSsrComposition();

  // 1) FATO REAL: consolida execução (executed_days) — imutável.
  await executeDayUseCase.execute({
    userId,
    date: input.date,
    resultStatus: input.resultStatus,
    totalExecutedMinutes: input.totalExecutedMinutes,
    factualSummary: null,
  });

  // 2) ORQUESTRAÇÃO EXPLÍCITA (Etapa Técnica 6): fato → UC-01 (somente se canônico)
  const eventType = mapExecuteDayToFactualEventType(input.resultStatus);
  if (eventType) {
    const { uc01ObserveFactualEvent } = await createGamificationSsrComposition({
      tenantId: userId as TenantId,
    });

    const res = await uc01ObserveFactualEvent.execute({
      tenantId: userId as TenantId,
      eventType,
      factualRef: buildExecutedDayFactualRef(input.date),
      occurredAt: nowIso(),
    });

    // Idempotência conceitual: se já observado, não falha o fluxo factual.
    if (!res.ok) {
      if (res.error.code !== GamificationErrorCode.EventoJaObservado) {
        // Erro duro: wiring inválido, violação anti-abuso ou acesso fora do tenant
        throw new Error(`GAMIFICATION_OBSERVE_FAILED: ${res.error.code}`);
      }
    }
  }

  revalidatePath("/meta-diaria");
}

export async function regenerateDailyPlanAction(input: { date: string }) {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";

  if (!userId) {
    throw new Error("Missing authenticated user claim (x-kairos-user-id).");
  }

  const { regenerateDailyPlanUseCase } = createDailyPlanSsrComposition();

  await regenerateDailyPlanUseCase.execute({
    userId,
    date: input.date,
  });

  revalidatePath("/meta-diaria");
}
