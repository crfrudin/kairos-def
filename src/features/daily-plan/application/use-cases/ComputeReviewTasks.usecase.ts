// src/features/daily-plan/application/use-cases/ComputeReviewTasks.usecase.ts

import type { ComputeReviewTasksInput, ComputeReviewTasksOutput } from "../dto/review.dto";

export interface ComputeReviewTasksUseCase {
  /**
   * Intenção:
   * Derivar tarefas de revisão a partir de teoria concluída,
   * respeitando estritamente a regra de NÃO-ACÚMULO:
   * - revisão nasce em (conclusão + frequência)
   * - se não realizada, é perdida e NÃO reaparece :contentReference[oaicite:17]{index=17}
   *
   * Erros normativos possíveis:
   * - MissingProfileError (AutoReviewPolicy vem do perfil)
   * - InvalidDateRangeError
   * - DomainViolationError
   *
   * Pré-condições:
   * - Política de revisão pode estar desabilitada; nesse caso retorna lista vazia.
   * - Intervalo válido.
   *
   * Pós-condições:
   * - reviewTasks contém apenas revisões “devidas” no intervalo,
   *   excluindo as marcadas como MISSED no ledger.
   *
   * Efeitos permitidos:
   * - Leitura: perfil (AutoReviewPolicy), ledger de revisões, fontes de “teoria concluída”
   * - Escrita: opcionalmente “upsertScheduled” no ledger (para materializar existência)
   *
   * Efeitos proibidos:
   * - Criar revisões retroativas
   * - Ressuscitar revisões perdidas
   */
  execute(input: ComputeReviewTasksInput): Promise<ComputeReviewTasksOutput>;
}
