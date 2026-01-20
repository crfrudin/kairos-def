import 'server-only';

import type { IPlanningContextPort } from '@/features/daily-plan/application/ports/IPlanningContextPort';
import type { IDailyPlanPersistencePort } from '@/features/daily-plan/application/ports/IDailyPlanPersistencePort';
import { createGenerateDailyPlanUseCase } from '@/core/composition/daily-plan-composition';

import { SupabaseDailyPlanPersistencePortSSR } from '@/features/daily-plan/infra/ssr/SupabaseDailyPlanPersistencePortSSR';

export interface DailyPlanSsrComposition {
  persistencePort: IDailyPlanPersistencePort;
  contextPort: IPlanningContextPort;

  generateDailyPlanUseCase: ReturnType<typeof createGenerateDailyPlanUseCase>;
}

/**
 * Composition SSR do daily-plan.
 * - Persistência: implementada (RLS via SSR client)
 * - Contexto: deve ser injetado (depende do schema de subjects e do cursor do CICLO)
 */
export function createDailyPlanSsrComposition(deps: { contextPort: IPlanningContextPort }): DailyPlanSsrComposition {
  const persistencePort: IDailyPlanPersistencePort = new SupabaseDailyPlanPersistencePortSSR();

  const generateDailyPlanUseCase = createGenerateDailyPlanUseCase({
    contextPort: deps.contextPort,
    persistencePort,
  });

  return {
    persistencePort,
    contextPort: deps.contextPort,
    generateDailyPlanUseCase,
  };
}
