import 'server-only';

import type { GenerateDailyPlanUseCase } from '@/features/daily-plan/application/use-cases/GenerateDailyPlan';
import type { GenerateCalendarProjectionUseCase } from '@/features/daily-plan/application/use-cases/GenerateCalendarProjection';

import {
  createGenerateDailyPlanUseCase,
  createGenerateCalendarProjectionUseCase,
} from '@/core/composition/daily-plan-composition';

import type { IPlanningContextPort } from '@/features/daily-plan/application/ports/IPlanningContextPort';
import type { IDailyPlanPersistencePort } from '@/features/daily-plan/application/ports/IDailyPlanPersistencePort';
import type { ICalendarProjectionPersistencePort } from '@/features/daily-plan/application/ports/ICalendarProjectionPersistencePort';

import { SupabasePlanningContextPortSSR } from '@/features/daily-plan/infra/ssr/SupabasePlanningContextPortSSR';
import { SupabaseDailyPlanPersistencePortSSR } from '@/features/daily-plan/infra/ssr/SupabaseDailyPlanPersistencePortSSR';
import { SupabaseCalendarProjectionPersistencePortSSR } from '@/features/daily-plan/infra/ssr/SupabaseCalendarProjectionPersistencePortSSR';

export interface DailyPlanSsrComposition {
  contextPort: IPlanningContextPort;
  persistencePort: IDailyPlanPersistencePort;
  projectionPersistencePort: ICalendarProjectionPersistencePort;

  generateDailyPlanUseCase: GenerateDailyPlanUseCase;
  generateCalendarProjectionUseCase: GenerateCalendarProjectionUseCase;
}

export function createDailyPlanSsrComposition(): DailyPlanSsrComposition {
  const contextPort = new SupabasePlanningContextPortSSR();
  const persistencePort = new SupabaseDailyPlanPersistencePortSSR();
  const projectionPersistencePort = new SupabaseCalendarProjectionPersistencePortSSR();

  const generateDailyPlanUseCase = createGenerateDailyPlanUseCase({
    contextPort,
    persistencePort,
  });

  const generateCalendarProjectionUseCase = createGenerateCalendarProjectionUseCase({
    contextPort,
    projectionPersistencePort,
  });

  return {
    contextPort,
    persistencePort,
    projectionPersistencePort,
    generateDailyPlanUseCase,
    generateCalendarProjectionUseCase,
  };
}
