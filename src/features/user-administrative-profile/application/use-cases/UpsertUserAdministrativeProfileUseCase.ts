import { UserAdministrativeProfile } from '@/features/user-administrative-profile/domain/entities/UserAdministrativeProfile';
import { DomainValidationError } from '@/features/user-administrative-profile/domain/_shared/DomainValidationError';

import type { IUserAdministrativeProfileTransaction } from '../ports/IUserAdministrativeProfileTransaction';
import type { Result } from '../ports/Result';
import type {
  UpsertUserAdministrativeProfileInputDTO,
  UpsertUserAdministrativeProfileOutputDTO,
} from '../dtos/UpsertUserAdministrativeProfileDTO';
import type { UserAdministrativeProfileErrorCode } from '../errors/UserAdministrativeProfileErrors';
import { UserAdministrativeProfileErrors } from '../errors/UserAdministrativeProfileErrors';

export type UpsertUserAdministrativeProfileResult =
  Result<UpsertUserAdministrativeProfileOutputDTO, UserAdministrativeProfileErrorCode>;

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return String(e);
  } catch {
    return 'UNKNOWN_ERROR';
  }
}

export class UpsertUserAdministrativeProfileUseCase {
  constructor(private readonly tx: IUserAdministrativeProfileTransaction) {}

  public async execute(input: UpsertUserAdministrativeProfileInputDTO): Promise<UpsertUserAdministrativeProfileResult> {
    if (!input.userId || typeof input.userId !== 'string') {
      return {
        ok: false,
        error: UserAdministrativeProfileErrors.validation('userId é obrigatório.', { field: 'userId' }),
      };
    }

    if (!input.now || typeof input.now !== 'string') {
      return {
        ok: false,
        error: UserAdministrativeProfileErrors.validation('now (ISO) é obrigatório.', { field: 'now' }),
      };
    }

    if (!input.profile || typeof input.profile !== 'object') {
      return {
        ok: false,
        error: UserAdministrativeProfileErrors.validation('profile é obrigatório.', { field: 'profile' }),
      };
    }

    // Validação normativa via domínio (VOs). Sem inferência.
    let aggregate: UserAdministrativeProfile;
    try {
      aggregate = UserAdministrativeProfile.create(input.profile);
    } catch (e: unknown) {
      if (e instanceof DomainValidationError) {
        return {
          ok: false,
          error: UserAdministrativeProfileErrors.validation('Falha de validação do domínio.', {
            domainCode: e.code,
            message: e.message,
          }),
        };
      }

      return {
        ok: false,
        error: UserAdministrativeProfileErrors.unexpected(undefined, { cause: errMsg(e) }),
      };
    }

    const contract = {
      userId: input.userId,
      profile: aggregate.toPrimitives(),
    } as const;

    try {
      await this.tx.runInTransaction(async (txRepo) => {
        await txRepo.replaceFullContract({
          userId: input.userId,
          contract,
          now: input.now,
        });
      });

      return { ok: true, data: { saved: true } };
    } catch (e: unknown) {
      return {
        ok: false,
        error: UserAdministrativeProfileErrors.infra(undefined, { cause: errMsg(e) }),
      };
    }
  }
}
