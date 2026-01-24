// src/core/composition/user-administrative-profile.ssr.composition.ts
import "server-only";

import {
  GetUserAdministrativeProfileUseCase,
  UpsertUserAdministrativeProfileUseCase,
  CheckUserAdministrativeProfileCompletenessUseCase,
} from "@/features/user-administrative-profile/application";

import { ValidateAndUpsertUserAdministrativeProfileUseCase } from "@/features/user-administrative-profile/application/use-cases/ValidateAndUpsertUserAdministrativeProfileUseCase";

import {
  SupabaseUserAdministrativeProfileRepository,
  SupabaseUserAdministrativeProfileTransaction,
  ViaCepAddressValidationService,
} from "@/features/user-administrative-profile/infra";

import type { ICpfValidationService } from "@/features/user-administrative-profile/application/ports/ICpfValidationService";
import { Result } from "@/features/user-administrative-profile/application/ports/Result";

/**
 * CPF validator dummy:
 * - Não é chamado se você removeu a validação externa de CPF do use-case (governança).
 * - Mantido apenas para satisfazer o construtor do UC, sem dependência externa.
 */
class CpfNoValidationService implements ICpfValidationService {
  async validateCpf(_: string) {
    return Result.ok({ valid: true as const });
  }
}

export function createUserAdministrativeProfileSsrComposition() {
  const repo = new SupabaseUserAdministrativeProfileRepository();
  const tx = new SupabaseUserAdministrativeProfileTransaction();

  const cpfValidator = new CpfNoValidationService();
  const addressValidator = new ViaCepAddressValidationService();

  return {
    ucGet: new GetUserAdministrativeProfileUseCase(repo),
    ucUpsert: new UpsertUserAdministrativeProfileUseCase(tx),
    ucCheckCompleteness: new CheckUserAdministrativeProfileCompletenessUseCase(repo),

    ucValidateAndUpsert: new ValidateAndUpsertUserAdministrativeProfileUseCase(
      tx,
      cpfValidator,
      addressValidator
    ),
  } as const;
}
