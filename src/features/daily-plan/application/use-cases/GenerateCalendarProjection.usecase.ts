// src/features/daily-plan/application/use-cases/GenerateCalendarProjection.usecase.ts

import type { GenerateCalendarProjectionInput, GenerateCalendarProjectionOutput } from "../dto/calendar-projection.dto";

export interface GenerateCalendarProjectionUseCase {
  /**
   * Intenção:
   * Gerar uma projeção de planejamento para um intervalo de datas:
   * - simulação futura
   * - totalmente regenerável
   * - sem valor histórico :contentReference[oaicite:14]{index=14}
   *
   * Erros normativos possíveis:
   * - MissingProfileError, MissingSubjectsError
   * - InvalidDateRangeError
   * - DomainViolationError, InfeasiblePlanError
   *
   * Pré-condições:
   * - startDate <= endDateInclusive
   * - Perfil vigente existe
   *
   * Pós-condições:
   * - projection reflete exatamente as regras vigentes (sem heurística).
   *
   * Efeitos permitidos:
   * - Leitura: perfil, matérias, planos já persistidos (opcional), ledger de revisões.
   *
   * Efeitos proibidos:
   * - Qualquer escrita (não persiste projeção)
   * - Alterar execução
   */
  execute(input: GenerateCalendarProjectionInput): Promise<GenerateCalendarProjectionOutput>;
}
