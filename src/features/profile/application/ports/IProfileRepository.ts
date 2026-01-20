// src/features/profile/application/ports/IProfileRepository.ts

import type { ProfileContract, UUID, ISOTimestamp } from './ProfileContract';

export interface IProfileRepository {
  /**
   * Leitura integral do contrato vigente do perfil.
   * Fonte: DB protegido por RLS.
   *
   * Retorna:
   * - null => perfil ainda não existe (primeira gravação será necessária)
   * - ProfileContract => contrato completo e consistente
   */
  getFullContract(userId: UUID): Promise<ProfileContract | null>;

  /**
   * Substitui INTEGRALMENTE o contrato do perfil (tudo ou nada).
   *
   * Regras:
   * - Implementação DEVE garantir que não existe estado intermediário observável.
   * - Implementação DEVE atualizar updated_at explicitamente (responsabilidade da aplicação).
   * - Implementação DEVE lidar com "primeira gravação" criando tudo de forma consistente.
   */
  replaceFullContract(params: {
    userId: UUID;
    contract: ProfileContract;
    now: ISOTimestamp; // timestamp único para updated_at (e, se necessário, created_at na criação inicial)
  }): Promise<void>;
}
