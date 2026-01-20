// src/features/daily-plan/application/use-cases/RecordExecution.usecase.ts

import type { RecordExecutionInput, RecordExecutionOutput } from "../dto/execution.dto";

export interface RecordExecutionUseCase {
  /**
   * Intenção:
   * Registrar a execução factual de um dia:
   * - produz ExecutedDay IMUTÁVEL
   * - não recalcula nem altera o plano passado
   * - consolida “plano derivado vs execução factual” :contentReference[oaicite:16]{index=16}
   *
   * Erros normativos possíveis:
   * - ExecutionAlreadyExistsError (não pode haver duas execuções)
   * - CannotExecuteRestDayError (se status normativo do dia é REST_DAY)
   * - MissingProfileError (se o sistema exigir perfil para validar consistência)
   * - DomainViolationError
   * - ConcurrencyConflictError
   *
   * Pré-condições:
   * - Não existe execução para a data
   * - A data não está bloqueada como descanso (REST_DAY)
   *
   * Pós-condições:
   * - ExecutedDay persistido (IExecutedDayRepository.insert)
   * - O plano persistido pode permanecer como estava (não é alterado retroativamente)
   *
   * Efeitos permitidos:
   * - Leitura: plano do dia, execução existente (checagem)
   * - Escrita: inserir ExecutedDay (e opcionalmente registrar execução de revisões no ledger)
   *
   * Efeitos proibidos:
   * - Editar execução após inserção
   * - Regerar plano para a mesma data após execução
   */
  execute(input: RecordExecutionInput): Promise<RecordExecutionOutput>;
}
