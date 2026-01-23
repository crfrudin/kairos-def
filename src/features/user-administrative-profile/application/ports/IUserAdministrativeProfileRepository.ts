import type { UUID, ISOTimestamp, UserAdministrativeProfileContract } from './UserAdministrativeProfileContract';

export interface IUserAdministrativeProfileRepository {
  /**
   * Retorna o contrato completo, ou null se ainda não existe.
   */
  getFullContract(userId: UUID): Promise<UserAdministrativeProfileContract | null>;

  /**
   * Substituição integral (tudo ou nada).
   * - A infra deve garantir consistência sem estado intermediário observável.
   * - updatedAt é responsabilidade da aplicação (passado via now).
   * - Na criação inicial, a infra deve definir createdAt = now.
   */
  replaceFullContract(params: {
    userId: UUID;
    contract: Omit<UserAdministrativeProfileContract, 'createdAt' | 'updatedAt'>;
    now: ISOTimestamp;
  }): Promise<void>;
}
