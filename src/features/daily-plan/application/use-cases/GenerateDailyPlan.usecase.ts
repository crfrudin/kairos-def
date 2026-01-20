// src/features/daily-plan/application/use-cases/GenerateDailyPlan.usecase.ts

import type { GenerateDailyPlanInput, GenerateDailyPlanOutput } from "../dto/daily-plan.dto";

export interface GenerateDailyPlanUseCase {
  /**
   * Intenção:
   * Gerar o plano diário para uma data específica, respeitando:
   * - ordem normativa de composição (descanso -> revisões -> extras -> teoria)
   * - distinção “plano derivado” (regenerável) vs “execução factual” (imutável). :contentReference[oaicite:13]{index=13}
   *
   * Output:
   * - PLANNED (DailyPlan) ou REST_DAY (status de descanso).
   *
   * Erros normativos possíveis:
   * - MissingProfileError, MissingSubjectsError
   * - DomainViolationError, InfeasiblePlanError
   * - InvalidDateRangeError (se date inválida pelo VO do domínio)
   *
   * Pré-condições:
   * - Perfil vigente existe.
   * - Matérias ativas (quando teoria ativa) estão disponíveis.
   *
   * Pós-condições:
   * - Se REST_DAY: nenhum plano é persistido (opcional), e status reflete bloqueio.
   * - Se PLANNED: plano retornado é determinístico para (perfil+matérias+ledger) no instante lógico.
   *
   * Efeitos permitidos:
   * - Leitura: perfil, matérias, planos existentes, ledger de revisões.
   * - Escrita: NENHUMA (por padrão). Persistência de plano é responsabilidade do UC-03 (regeneração) ou de um UC futuro “PersistDailyPlan” se governança permitir.
   *
   * Efeitos proibidos:
   * - Registrar execução
   * - Alterar histórico
   */
  execute(input: GenerateDailyPlanInput): Promise<GenerateDailyPlanOutput>;
}
