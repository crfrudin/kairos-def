import type { IUserAdministrativeProfileRepository } from './IUserAdministrativeProfileRepository';

export interface IUserAdministrativeProfileTransaction {
  /**
   * Executa work dentro de UMA transação.
   * - Commit se sucesso total.
   * - Rollback em qualquer erro.
   */
  runInTransaction<T>(work: (txRepo: IUserAdministrativeProfileRepository) => Promise<T>): Promise<T>;
}
