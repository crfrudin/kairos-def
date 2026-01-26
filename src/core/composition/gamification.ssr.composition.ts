import "server-only";

import type { TenantId } from "@/features/gamification/application/contracts";
import type { IGamificationTransaction } from "@/features/gamification/application/ports/IGamificationTransaction";

import { createSupabaseServerClient } from "@/core/clients/createSupabaseServerClient";
import { SupabaseGamificationTransaction } from "@/features/gamification/infra/SupabaseGamificationTransaction";

import { createGamificationUseCases } from "@/core/composition/gamification-composition";

export interface GamificationSsrComposition {
  tx: IGamificationTransaction;

  uc01ObserveFactualEvent: ReturnType<typeof createGamificationUseCases>["uc01ObserveFactualEvent"];
  uc02EvaluateAchievements: ReturnType<typeof createGamificationUseCases>["uc02EvaluateAchievements"];
  uc03EvaluateStreaks: ReturnType<typeof createGamificationUseCases>["uc03EvaluateStreaks"];
  uc04GetCurrentSymbolicState: ReturnType<typeof createGamificationUseCases>["uc04GetCurrentSymbolicState"];
  uc05GetSymbolicHistory: ReturnType<typeof createGamificationUseCases>["uc05GetSymbolicHistory"];
}

/**
 * SSR Composition for Gamification
 * - Supabase SSR client
 * - Supabase transaction adapter
 * - Buffered repositories wired into use-cases
 */
export async function createGamificationSsrComposition(params: {
  tenantId: TenantId;
}): Promise<GamificationSsrComposition> {
  const supabase = await createSupabaseServerClient();

  const txConcrete = new SupabaseGamificationTransaction({ supabase });

  const repos = txConcrete.createBufferedRepositories();

  const ucs = createGamificationUseCases({
    tx: txConcrete,
    observedEventRepo: repos.observedEventRepo,
    observationMarkRepo: repos.observationMarkRepo,
    achievementGrantRepo: repos.achievementGrantRepo,
    streakTransitionRepo: repos.streakTransitionRepo,
    streakSnapshotRepo: repos.streakSnapshotRepo,
  });

  return {
    tx: txConcrete,
    ...ucs,
  };
}
