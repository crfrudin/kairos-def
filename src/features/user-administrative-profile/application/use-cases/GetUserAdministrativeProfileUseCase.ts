import type { IUserAdministrativeProfileRepository } from '../ports/IUserAdministrativeProfileRepository';
import type { Result } from '../ports/Result';
import type { UserAdministrativeProfileDTO } from '../dtos/UserAdministrativeProfileDTO';
import type { UserAdministrativeProfileErrorCode } from '../errors/UserAdministrativeProfileErrors';
import { UserAdministrativeProfileErrors } from '../errors/UserAdministrativeProfileErrors';

export interface GetUserAdministrativeProfileInput {
  userId: string;
}

export type GetUserAdministrativeProfileResult =
  Result<UserAdministrativeProfileDTO, UserAdministrativeProfileErrorCode>;

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return String(e);
  } catch {
    return 'UNKNOWN_ERROR';
  }
}

/**
 * GetUserAdministrativeProfile
 *
 * Regra:
 * - Fonte única: repositório (infra sob RLS).
 * - Sem inferência, sem “default”, sem completar campos.
 * - Se não existir contrato => profile=null.
 */
export class GetUserAdministrativeProfileUseCase {
  constructor(private readonly repo: IUserAdministrativeProfileRepository) {}

  public async execute(input: GetUserAdministrativeProfileInput): Promise<GetUserAdministrativeProfileResult> {
    if (!input.userId || typeof input.userId !== 'string') {
      return {
        ok: false,
        error: UserAdministrativeProfileErrors.validation('userId é obrigatório.', { field: 'userId' }),
      };
    }

    try {
      const contract = await this.repo.getFullContract(input.userId);
      return { ok: true, data: { profile: contract?.profile ?? null } };
    } catch (e: unknown) {
      return {
        ok: false,
        error: UserAdministrativeProfileErrors.infra(undefined, { cause: errMsg(e) }),
      };
    }
  }
}
