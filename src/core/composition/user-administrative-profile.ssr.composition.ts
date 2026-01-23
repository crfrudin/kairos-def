// src/core/composition/user-administrative-profile.ssr.composition.ts
import "server-only";

import { GetUserAdministrativeProfileUseCase } from "@/features/user-administrative-profile/application";
import { UpsertUserAdministrativeProfileUseCase } from "@/features/user-administrative-profile/application";
import { CheckUserAdministrativeProfileCompletenessUseCase } from "@/features/user-administrative-profile/application";

import { SupabaseUserAdministrativeProfileRepository } from "@/features/user-administrative-profile/infra/SupabaseUserAdministrativeProfileRepository";
import { SupabaseUserAdministrativeProfileTransaction } from "@/features/user-administrative-profile/infra/SupabaseUserAdministrativeProfileTransaction";

/**
 * Composition Root (SSR) — UserAdministrativeProfile
 *
 * - server-only
 * - Injeta infra Supabase (SSR + RLS) nos use-cases da Application
 * - Não expõe Supabase para UI
 */
export function createUserAdministrativeProfileSsrComposition() {
  const repo = new SupabaseUserAdministrativeProfileRepository();
  const tx = new SupabaseUserAdministrativeProfileTransaction();

  return {
    ucGet: new GetUserAdministrativeProfileUseCase(repo),
    ucUpsert: new UpsertUserAdministrativeProfileUseCase(tx),
    ucCheckCompleteness: new CheckUserAdministrativeProfileCompletenessUseCase(repo),
  } as const;
}
