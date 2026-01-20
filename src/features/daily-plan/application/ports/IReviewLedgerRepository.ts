// src/features/daily-plan/application/ports/IReviewLedgerRepository.ts

import type { CalendarDate } from "../../domain/value-objects";

/**
 * “Ledger” mínimo para aplicar NÃO-ACÚMULO:
 * - registra revisões geradas/agendadas
 * - registra revisões executadas (ou perdidas, se a infra optar por marcar)
 *
 * Observação: a regra é normativa (não acumula / não repõe). :contentReference[oaicite:11]{index=11}
 * Este port existe para ETAPA 4/3 implementarem persistência sem heurística.
 */
export interface IReviewLedgerRepository {
  /**
   * Lista revisões já conhecidas no intervalo (agendadas/executadas/perdidas),
   * para evitar “ressuscitar” revisões perdidas.
   */
  listLedgerEntries(start: CalendarDate, endInclusive: CalendarDate): Promise<
    Array<{
      reviewId: string;
      scheduledDate: CalendarDate;
      status: "SCHEDULED" | "EXECUTED" | "MISSED";
    }>
  >;

  /**
   * Registra (idempotente) que uma revisão existe e está agendada.
   */
  upsertScheduled(reviewId: string, scheduledDate: CalendarDate): Promise<void>;

  /**
   * Marca execução factual de uma revisão (imutável por evento; infra define append-only ou update).
   */
  markExecuted(reviewId: string, executedAtDate: CalendarDate): Promise<void>;
}
