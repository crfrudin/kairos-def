// src/features/profile/application/use-cases/GetProfileUseCase.ts

import type { IProfileRepository } from '../ports/IProfileRepository';
import type { ProfileContract, UUID } from '../ports/ProfileContract';

export class GetProfileUseCase {
  constructor(
    private readonly profileRepository: IProfileRepository
  ) {}

  /**
   * UC-01 — GetProfile
   *
   * Retorna o contrato vigente COMPLETO do Perfil do usuário autenticado.
   *
   * Regras:
   * - Fonte única: DB protegido por RLS.
   * - Nenhuma inferência, cálculo ou preenchimento implícito.
   * - Se não existir perfil, retorna null (primeira gravação será tratada no UC-02).
   */
  async execute(userId: UUID): Promise<ProfileContract | null> {
    return this.profileRepository.getFullContract(userId);
  }
}
