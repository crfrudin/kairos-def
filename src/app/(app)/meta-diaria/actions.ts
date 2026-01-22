"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createDailyPlanSsrComposition } from "@/core/composition/daily-plan.ssr.composition";
import type { ExecutedDayResultStatus } from "@/features/daily-plan/application/ports/IExecutionPersistencePort";

export async function executeDayAction(input: {
  date: string; // YYYY-MM-DD
  resultStatus: ExecutedDayResultStatus;
  totalExecutedMinutes: number; // 0..1440 (use-case valida)
}) {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";

  if (!userId) {
    // Middleware garante autenticação; defensivo (fail-safe).
    throw new Error("Missing authenticated user claim (x-kairos-user-id).");
  }

  const { executeDayUseCase } = createDailyPlanSsrComposition();

  await executeDayUseCase.execute({
    userId,
    date: input.date,
    resultStatus: input.resultStatus,
    totalExecutedMinutes: input.totalExecutedMinutes,
    factualSummary: null,
  });

  revalidatePath("/meta-diaria");
}
