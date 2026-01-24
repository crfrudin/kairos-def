import type { Result } from "../ports/Result";

import type { IUserAdministrativeProfileTransaction } from "../ports/IUserAdministrativeProfileTransaction";
import type { ICpfValidationService } from "../ports/ICpfValidationService";
import type { IAddressValidationService } from "../ports/IAddressValidationService";

import type {
  UpsertUserAdministrativeProfileInputDTO,
  UpsertUserAdministrativeProfileOutputDTO,
} from "../dtos/UpsertUserAdministrativeProfileDTO";

import type { UserAdministrativeProfileErrorCode } from "../errors/UserAdministrativeProfileErrors";
import { UserAdministrativeProfileErrors } from "../errors/UserAdministrativeProfileErrors";

import type { IdentityValidationErrorCode } from "../errors/IdentityValidationErrors";
import { IdentityValidationErrors } from "../errors/IdentityValidationErrors";

import { UserAdministrativeProfile } from "@/features/user-administrative-profile/domain/entities/UserAdministrativeProfile";
import { DomainValidationError } from "@/features/user-administrative-profile/domain/_shared/DomainValidationError";

export type ValidateAndUpsertUserAdministrativeProfileErrorCode =
  | UserAdministrativeProfileErrorCode
  | IdentityValidationErrorCode;

export type ValidateAndUpsertUserAdministrativeProfileResult = Result<
  UpsertUserAdministrativeProfileOutputDTO,
  ValidateAndUpsertUserAdministrativeProfileErrorCode
>;

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return String(e);
  } catch {
    return "UNKNOWN_ERROR";
  }
}

/**
 * ValidateAndUpsertUserAdministrativeProfileUseCase
 *
 * Regras normativas (FASE 9 — Application):
 * - Se CPF for informado (não-null) => validação EXTERNA obrigatória e bloqueante.
 * - Se validatedAddress for informado (não-null) => validação EXTERNA obrigatória e bloqueante.
 * - Após validações externas aprovadas, aplica validação local do Domínio e persiste (replaceFullContract).
 *
 * Proibições:
 * - sem IO concreto (usa ports)
 * - sem Supabase
 * - sem fetch/axios
 */
export class ValidateAndUpsertUserAdministrativeProfileUseCase {
  constructor(
    private readonly tx: IUserAdministrativeProfileTransaction,
    private readonly cpfValidator: ICpfValidationService,
    private readonly addressValidator: IAddressValidationService
  ) {}

  public async execute(
    input: UpsertUserAdministrativeProfileInputDTO
  ): Promise<ValidateAndUpsertUserAdministrativeProfileResult> {
    if (!input.userId || typeof input.userId !== "string") {
      return {
        ok: false,
        error: UserAdministrativeProfileErrors.validation("userId é obrigatório.", { field: "userId" }),
      };
    }

    if (!input.now || typeof input.now !== "string") {
      return {
        ok: false,
        error: UserAdministrativeProfileErrors.validation("now (ISO) é obrigatório.", { field: "now" }),
      };
    }

    if (!input.profile || typeof input.profile !== "object") {
      return {
        ok: false,
        error: UserAdministrativeProfileErrors.validation("profile é obrigatório.", { field: "profile" }),
      };
    }

    // 1) Validação local (Domínio) — garante normalização e invariantes básicas.
    let aggregate: UserAdministrativeProfile;
    try {
      aggregate = UserAdministrativeProfile.create(input.profile);
    } catch (e: unknown) {
      if (e instanceof DomainValidationError) {
        return {
          ok: false,
          error: UserAdministrativeProfileErrors.validation("Falha de validação do domínio.", {
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

    const primitives = aggregate.toPrimitives();

    // 2) Validação EXTERNA obrigatória quando CPF informado
    if (primitives.cpf) {
      const cpfRes = await this.cpfValidator.validateCpf(primitives.cpf);
      if (!cpfRes.ok) {
        if (cpfRes.error.code === "CPF_EXTERNAL_INVALID") {
          return { ok: false, error: IdentityValidationErrors.cpfInvalid(cpfRes.error.details) };
        }
        if (cpfRes.error.code === "CPF_EXTERNAL_UNAVAILABLE") {
          return { ok: false, error: IdentityValidationErrors.cpfUnavailable(cpfRes.error.details) };
        }

        // fallback defensivo
        return {
          ok: false,
          error: UserAdministrativeProfileErrors.unexpected("Falha inesperada na validação externa do CPF.", {
            cause: cpfRes.error,
          }),
        };
      }
    }

    // 3) Validação EXTERNA obrigatória quando validatedAddress informado
    if (primitives.validatedAddress) {
      const addrRes = await this.addressValidator.validateAddress(primitives.validatedAddress);
      if (!addrRes.ok) {
        if (addrRes.error.code === "ADDRESS_EXTERNAL_INVALID") {
          return { ok: false, error: IdentityValidationErrors.addressInvalid(addrRes.error.details) };
        }
        if (addrRes.error.code === "ADDRESS_EXTERNAL_UNAVAILABLE") {
          return { ok: false, error: IdentityValidationErrors.addressUnavailable(addrRes.error.details) };
        }

        return {
          ok: false,
          error: UserAdministrativeProfileErrors.unexpected(
            "Falha inesperada na validação externa do endereço.",
            { cause: addrRes.error }
          ),
        };
      }
    }

    // 4) Persistência — substituição integral (tudo ou nada), via Transaction port
    const contract = {
      userId: input.userId,
      profile: primitives,
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
