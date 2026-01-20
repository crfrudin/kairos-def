// src/features/daily-plan/application/dto/daily-plan.dto.ts

import type { CalendarDate, PlanStatus } from "../../domain/value-objects"; // ajuste paths conforme seu domínio
import type { DailyPlan } from "../../domain/entities"; // idem

export type DailyPlanKind = "PLANNED" | "REST_DAY";

export interface GenerateDailyPlanInput {
  /** Data-alvo para gerar o plano */
  date: CalendarDate;

  /**
   * Se true, força recomputação SOMENTE quando normativamente permitido
   * (o UC-03 é o responsável por regeração; UC-01 pode usar isso apenas
   * em cenários internos controlados pelo app, se existir governança para tal).
   */
  allowRecompute?: boolean;
}

export interface GenerateDailyPlanOutputPlanned {
  kind: "PLANNED";
  date: CalendarDate;
  status: PlanStatus;

  /**
   * Snapshot serializável (DTO) do plano do dia.
   * Regra: nunca retornar instância mutável para UI; preferir snapshot.
   */
  plan: DailyPlan;
}

export interface GenerateDailyPlanOutputRestDay {
  kind: "REST_DAY";
  date: CalendarDate;
  status: PlanStatus; // ex.: REST_DAY
  reason: "WEEKLY_SCHEDULE_ZERO" | "REST_PERIOD";
}

export type GenerateDailyPlanOutput = GenerateDailyPlanOutputPlanned | GenerateDailyPlanOutputRestDay;
