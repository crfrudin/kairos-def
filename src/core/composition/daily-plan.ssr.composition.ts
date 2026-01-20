import 'server-only';

import type { GenerateDailyPlanUseCase } from '@/features/daily-plan/application/use-cases/GenerateDailyPlan';
import { createGenerateDailyPlanUseCase } from '@/core/composition/daily-plan-composition';

import type { IPlanningContextPort } from '@/features/daily-plan/application/ports/IPlanningContextPort';
import type { IDailyPlanPersistencePort } from '@/features/daily-plan/application/ports/IDailyPlanPersistencePort';

import { SupabasePlanningContextPortSSR } from '@/features/daily-plan/infra/ssr/SupabasePlanningContextPortSSR';
import { SupabaseDailyPlanPersistencePortSSR } from '@/features/daily-plan/infra/ssr/SupabaseDailyPlanPersistencePortSSR';

export interface DailyPlanSsrComposition {
  contextPort: IPlanningContextPort;
  persistencePort: IDailyPlanPersistencePort;

  generateDailyPlanUseCase: GenerateDailyPlanUseCase;
}

export function createDailyPlanSsrComposition(): DailyPlanSsrComposition {
  const contextPort = new SupabasePlanningContextPortSSR();
  const persistencePort = new SupabaseDailyPlanPersistencePortSSR();

  const generateDailyPlanUseCase = createGenerateDailyPlanUseCase({
    contextPort,
    persistencePort,
  });

  return {
    contextPort,
    persistencePort,
    generateDailyPlanUseCase,
  };
}
