// src/features/profile/application/use-cases/UpdateProfileUseCase.ts

import type { IProfileTransaction } from '../ports/IProfileTransaction';
import type { ProfileContract, ISODate, ISOTimestamp, UUID } from '../ports/ProfileContract';
import { validateProfileContract } from '@/features/profile/domain/validation/ProfileContractValidation';
import {
  ProfileApplyConfirmationRequiredError,
  ProfileValidationError,
} from '../errors/ProfileUseCaseErrors';

export interface UpdateProfileParams {
  userId: UUID;

  /**
   * Substituição integral do contrato (tudo ou nada).
   * Deve estar completo: rules + 7 weekdayRules + extras + autoReview + restPeriods.
   */
  contract: ProfileContract;

  /**
   * Regra normativa: persistir perfil SEM aplicação confirmada é proibido.
   */
  confirmApply: boolean;

  /**
   * Atualização manual de updated_at é responsabilidade da aplicação.
   * Deve ser um único timestamp para toda a operação.
   */
  now: ISOTimestamp;

  /**
   * Determinístico e testável: validações de "data passada" não dependem do relógio interno.
   */
  today: ISODate;
}

export interface UpdateProfileResult {
  informativeIssues: ReadonlyArray<ReturnType<typeof validateProfileContract>['informative'][number]>;
}

export class UpdateProfileUseCase {
  constructor(private readonly tx: IProfileTransaction) {}

  /**
   * UC-02 — UpdateProfile
   *
   * Sequência obrigatória:
   * 1) confirmação explícita (bloqueante)
   * 2) validação BLOQUEANTE (pré-persistência)
   * 3) transação única: replaceFullContract (tudo ou nada)
   *
   * Se falhar em qualquer ponto => nenhum estado intermediário é persistido.
   */
  async execute(params: UpdateProfileParams): Promise<UpdateProfileResult> {
    const { userId, contract, confirmApply, now, today } = params;

    if (!confirmApply) {
      throw new ProfileApplyConfirmationRequiredError();
    }

    const validation = validateProfileContract(contract, today);

    if (validation.blocking.length > 0) {
      throw new ProfileValidationError(validation.blocking);
    }

    await this.tx.runInTransaction(async (txRepo) => {
      await txRepo.replaceFullContract({
        userId,
        contract,
        now,
      });
    });

    return {
      informativeIssues: validation.informative,
    };
  }
}
