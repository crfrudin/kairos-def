export interface IGamificationTransaction {
  /**
   * Executa uma função dentro de uma transação real na infra.
   * Contrato técnico apenas (sem implementação aqui).
   */
  runInTransaction<T>(fn: () => Promise<T>): Promise<T>;
}
