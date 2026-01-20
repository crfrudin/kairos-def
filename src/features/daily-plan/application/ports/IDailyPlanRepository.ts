// src/features/daily-plan/application/ports/IDailyPlanRepository.ts

import type { CalendarDate } from "../../domain/value-objects";
import type { DailyPlan } from "../../domain/entities";

/**
 * Persistência de planos diários (DERIVADOS, regeneráveis enquanto não executados).
 * Regras de segurança e multi-tenancy são garantidas na infra (RLS etc.).
 */
export interface IDailyPlanRepository {
  /** Retorna o plano persistido para a data, se existir. */
  getByDate(date: CalendarDate): Promise<DailyPlan | null>;

  /**
   * Upsert idempotente para o plano do dia.
   * Deve ser atômico por data (a infra define como).
   */
  upsert(plan: DailyPlan): Promise<void>;

  /**
   * Remove plano persistido para data (apenas se permitido normativamente; decisão é do UC).
   * Pode ser implementado como delete hard/soft na infra (não definido aqui).
   */
  deleteByDate(date: CalendarDate): Promise<void>;
}
