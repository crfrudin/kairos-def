// src/features/profile/application/ports/IProfileTransaction.ts

import type { IProfileRepository } from './IProfileRepository';

export interface IProfileTransaction {
  /**
   * Executa `work` dentro de UMA transação de banco.
   * - Commit se sucesso total.
   * - Rollback em qualquer erro (inclusive validação bloqueante anterior à persistência pode abortar antes de abrir transação).
   *
   * Observação: a infra deve entregar um repository "scoped" à transação.
   */
  runInTransaction<T>(work: (txRepo: IProfileRepository) => Promise<T>): Promise<T>;
}
