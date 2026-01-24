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

export function createUserAdministrativeProfileSsrComposition() {
  const repo = new SupabaseUserAdministrativeProfileRepository();
  const tx = new SupabaseUserAdministrativeProfileTransaction();

  const addressValidator = new ViaCepAddressValidationService();

  return {
    ucGet: new GetUserAdministrativeProfileUseCase(repo),
    ucUpsert: new UpsertUserAdministrativeProfileUseCase(tx),
    ucCheckCompleteness: new CheckUserAdministrativeProfileCompletenessUseCase(repo),

    // FASE 9 — fonte autorizada para gravação (UI /ajustes deve usar este UC)
    ucValidateAndUpsert: new ValidateAndUpsertUserAdministrativeProfileUseCase(
      tx,
      addressValidator
    ),
  } as const;
}
