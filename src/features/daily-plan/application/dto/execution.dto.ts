// src/features/daily-plan/application/dto/execution.dto.ts

import type { CalendarDate, PlannedDuration } from "../../domain/value-objects";
import type { ExecutedDay } from "../../domain/entities";
import type { DailyPlan } from "../../domain/entities";

export interface RecordExecutionInput {
  date: CalendarDate;

  /**
   * Snapshot do plano que foi executado.
   * Regra: execução factual é imutável e deve guardar referência/snapshot do planejado.
   */
  plannedSnapshot: DailyPlan;

  /**
   * Registro factual do que ocorreu (tempo total, itens concluídos, etc.)
   * Sem prescrever algoritmo/estrutura interna aqui.
   */
  totalExecutedDuration: PlannedDuration;

  /**
   * Lista de IDs/keys dos itens do plano marcados como concluídos.
   * O formato de ID é o que o domínio definiu em DailyPlanItem.
   */
  completedItemIds: string[];

  /**
   * Opcional: notas do usuário. Deve ser tratada como dado potencialmente sensível:
   * (não logar conteúdo; persistência só via infra com RLS).
   */
  note?: string;
}

export interface RecordExecutionOutput {
  executed: ExecutedDay;
}
