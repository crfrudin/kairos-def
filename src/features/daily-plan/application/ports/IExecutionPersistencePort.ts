export type ExecutedDayResultStatus = 'COMPLETED' | 'PARTIAL' | 'NOT_COMPLETED' | 'REST_DAY';

export interface ExecuteDayEntry {
  userId: string;
  date: string; // YYYY-MM-DD

  resultStatus: ExecutedDayResultStatus;
  totalExecutedMinutes: number; // 0..1440

  /**
   * Resumo factual (jsonb objeto).
   * Estrutura auditável; sem algoritmo aqui.
   */
  factualSummary: Record<string, unknown>;

  executedAtIso: string; // ISO (clock injetável)
}

export interface IExecutionPersistencePort {
  insertExecutedDay(entry: ExecuteDayEntry): Promise<void>;
}
