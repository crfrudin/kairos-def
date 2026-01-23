import { UserAdministrativeProfile } from '@/features/user-administrative-profile/domain/entities/UserAdministrativeProfile';
import { DomainValidationError } from '@/features/user-administrative-profile/domain/_shared/DomainValidationError';

import type { IUserAdministrativeProfileRepository } from '../ports/IUserAdministrativeProfileRepository';
import type { Result } from '../ports/Result';
import type { UserAdministrativeProfileCompletenessDTO } from '../dtos/UserAdministrativeProfileCompletenessDTO';
import type { UserAdministrativeProfileErrorCode } from '../errors/UserAdministrativeProfileErrors';
import { UserAdministrativeProfileErrors } from '../errors/UserAdministrativeProfileErrors';

export interface CheckUserAdministrativeProfileCompletenessInput {
  userId: string;
}

export type CheckUserAdministrativeProfileCompletenessResult =
  Result<UserAdministrativeProfileCompletenessDTO, UserAdministrativeProfileErrorCode>;

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return String(e);
  } catch {
    return 'UNKNOWN_ERROR';
  }
}

/**
 * CheckUserAdministrativeProfileCompleteness
 *
 * Critério técnico (sem inferência normativa nova):
 * - exists=false => não há contrato persistido.
 * - exists=true & isComplete=true => domínio aceita instanciar o agregado.
 * - exists=true & isComplete=false => domínio rejeita (DomainValidationError).
 */
export class CheckUserAdministrativeProfileCompletenessUseCase {
  constructor(private readonly repo: IUserAdministrativeProfileRepository) {}

  public async execute(
    input: CheckUserAdministrativeProfileCompletenessInput
  ): Promise<CheckUserAdministrativeProfileCompletenessResult> {
    if (!input.userId || typeof input.userId !== 'string') {
      return {
        ok: false,
        error: UserAdministrativeProfileErrors.validation('userId é obrigatório.', { field: 'userId' }),
      };
    }

    try {
      const contract = await this.repo.getFullContract(input.userId);

      if (!contract) {
        return {
          ok: true,
          data: { exists: false, isComplete: false, validation: null },
        };
      }

      try {
        UserAdministrativeProfile.create(contract.profile);
        return {
          ok: true,
          data: { exists: true, isComplete: true, validation: null },
        };
      } catch (e: unknown) {
        if (e instanceof DomainValidationError) {
          return {
            ok: true,
            data: {
              exists: true,
              isComplete: false,
              validation: { domainCode: e.code, message: e.message },
            },
          };
        }

        return {
          ok: false,
          error: UserAdministrativeProfileErrors.unexpected(undefined, { cause: errMsg(e) }),
        };
      }
    } catch (e: unknown) {
      return {
        ok: false,
        error: UserAdministrativeProfileErrors.infra(undefined, { cause: errMsg(e) }),
      };
    }
  }
}
