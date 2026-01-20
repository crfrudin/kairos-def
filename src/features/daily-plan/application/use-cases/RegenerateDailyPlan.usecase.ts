// src/features/daily-plan/application/use-cases/RegenerateDailyPlan.usecase.ts

import type { CalendarDate } from "../../domain/value-objects";
import type { GenerateDailyPlanOutput } from "../dto/daily-plan.dto";

export interface RegenerateDailyPlanInput {
  date: CalendarDate;

  /**
   * Confirmação explícita (anti-acidente):
   * regeração tem impacto no planejamento futuro; deve ser ato consciente.
   */
  confirmApply: true;
}

export interface RegenerateDailyPlanUseCase {
  /**
   * Intenção:
   * Regerar (substituir) o plano diário quando normativamente permitido:
   * - somente D+1 em diante
   * - proibido se houver execução registrada para a data
   * - proibido para datas passadas
   * - proibido para o “dia corrente” após início de execução :contentReference[oaicite:15]{index=15}
   *
   * Erros normativos possíveis:
   * - ForbiddenRegenerationError
   * - ExecutionAlreadyExistsError
   * - MissingProfileError, MissingSubjectsError
   * - DomainViolationError, InfeasiblePlanError
   *
   * Pré-condições:
   * - confirmApply = true
   * - Perfil vigente existe
   * - Não existe ExecutedDay para a data
   * - date é >= amanhã (D+1) segundo ICalendarService
   *
   * Pós-condições:
   * - Plano persistido para a data passa a ser o novo plano derivado
   *
   * Efeitos permitidos:
   * - Leitura: perfil, matérias, execução do dia, ledger
   * - Escrita: upsert do plano do dia (IDailyPlanRepository)
   *
   * Efeitos proibidos:
   * - Alterar execuções
   * - Recalcular ou “corrigir” histórico
   */
  execute(input: RegenerateDailyPlanInput): Promise<GenerateDailyPlanOutput>;
}
