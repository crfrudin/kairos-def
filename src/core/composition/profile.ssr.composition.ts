import "server-only";

import type { UUID } from "@/features/profile/application/ports/ProfileContract";
import type { GetProfileUseCase } from "@/features/profile/application/use-cases/GetProfileUseCase";

import { createProfileUseCases } from "@/features/profile";

/**
 * Composition SSR oficial do Profile para consumo pelo Core (Fase 0).
 *
 * Regras:
 * - Somente server-side.
 * - Sem Supabase direto (Profile usa PgPool + RLS por transação).
 * - UI não instancia use-case; só consome via composition root.
 */
export type ProfileSsrComposition = {
  getProfileUseCase: GetProfileUseCase;
};

export function createProfileSsrComposition(params: { userId: UUID }): ProfileSsrComposition {
  const { getProfile } = createProfileUseCases({ userId: params.userId });

  return {
    getProfileUseCase: getProfile,
  };
}
