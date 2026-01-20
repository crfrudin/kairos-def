import 'server-only';

import type { GenerateDailyPlanUseCase } from '@/features/daily-plan/application/use-cases/GenerateDailyPlan';

import { createGenerateDailyPlanUseCase } from '@/core/composition/daily-plan-composition';
import { SupabasePlanningContextPortSSR } from '@/features/daily-plan/infra/ssr/SupabasePlanningContextPortSSR';
import { SupabaseDailyPlanPersistencePortSSR } from '@/features/daily-plan/infra/ssr/SupabaseDailyPlanPersistencePortSSR';

export interface DailyPlanUc01SsrComposition {
  generateDailyPlanUseCase: GenerateDailyPlanUseCase;
}

export function createDailyPlanUc01SsrComposition(): DailyPlanUc01SsrComposition {
  const contextPort = new SupabasePlanningContextPortSSR();
  const persistencePort = new SupabaseDailyPlanPersistencePortSSR();

  const generateDailyPlanUseCase = createGenerateDailyPlanUseCase({
    contextPort,
    persistencePort,
    nowIso: () => new Date().toISOString(),
  });

  return { generateDailyPlanUseCase };
}
