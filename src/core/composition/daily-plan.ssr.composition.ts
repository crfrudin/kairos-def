import 'server-only';

import type { GenerateDailyPlanUseCase } from '@/features/daily-plan/application/use-cases/GenerateDailyPlan';
import type { RegenerateDailyPlanUseCase } from '@/features/daily-plan/application/use-cases/RegenerateDailyPlan';
import type { GenerateCalendarProjectionUseCase } from '@/features/daily-plan/application/use-cases/GenerateCalendarProjection';
import type { ExecuteDayUseCase } from '@/features/daily-plan/application/use-cases/ExecuteDay';

import {
  createGenerateDailyPlanUseCase,
  createRegenerateDailyPlanUseCase,
  createGenerateCalendarProjectionUseCase,
  createExecuteDayUseCase,
} from '@/core/composition/daily-plan-composition';

import type { IPlanningContextPort } from '@/features/daily-plan/application/ports/IPlanningContextPort';
import type { IDailyPlanPersistencePort } from '@/features/daily-plan/application/ports/IDailyPlanPersistencePort';
import type { ICalendarProjectionPersistencePort } from '@/features/daily-plan/application/ports/ICalendarProjectionPersistencePort';
import type { IExecutionPersistencePort } from '@/features/daily-plan/application/ports/IExecutionPersistencePort';

import { SupabasePlanningContextPortSSR } from '@/features/daily-plan/infra/ssr/SupabasePlanningContextPortSSR';
import { SupabaseDailyPlanPersistencePortSSR } from '@/features/daily-plan/infra/ssr/SupabaseDailyPlanPersistencePortSSR';
import { SupabaseCalendarProjectionPersistencePortSSR } from '@/features/daily-plan/infra/ssr/SupabaseCalendarProjectionPersistencePortSSR';
import { SupabaseExecutionPersistencePortSSR } from '@/features/daily-plan/infra/ssr/SupabaseExecutionPersistencePortSSR';

export interface DailyPlanSsrComposition {
  contextPort: IPlanningContextPort;

  dailyPlanPersistencePort: IDailyPlanPersistencePort;
  calendarProjectionPersistencePort: ICalendarProjectionPersistencePort;
  executionPersistencePort: IExecutionPersistencePort;

  generateDailyPlanUseCase: GenerateDailyPlanUseCase;
  regenerateDailyPlanUseCase: RegenerateDailyPlanUseCase;
  generateCalendarProjectionUseCase: GenerateCalendarProjectionUseCase;
  executeDayUseCase: ExecuteDayUseCase;
}

export function createDailyPlanSsrComposition(): DailyPlanSsrComposition {
  const contextPort = new SupabasePlanningContextPortSSR();

  const dailyPlanPersistencePort = new SupabaseDailyPlanPersistencePortSSR();
  const calendarProjectionPersistencePort = new SupabaseCalendarProjectionPersistencePortSSR();
  const executionPersistencePort = new SupabaseExecutionPersistencePortSSR();

  const generateDailyPlanUseCase = createGenerateDailyPlanUseCase({
    contextPort,
    persistencePort: dailyPlanPersistencePort,
  });

  const regenerateDailyPlanUseCase = createRegenerateDailyPlanUseCase({
    contextPort,
    persistencePort: dailyPlanPersistencePort,
  });

  const generateCalendarProjectionUseCase = createGenerateCalendarProjectionUseCase({
    contextPort,
    persistencePort: calendarProjectionPersistencePort,
  });

  const executeDayUseCase = createExecuteDayUseCase({
    contextPort,
    executionPersistencePort,
  });

  return {
    contextPort,

    dailyPlanPersistencePort,
    calendarProjectionPersistencePort,
    executionPersistencePort,

    generateDailyPlanUseCase,
    regenerateDailyPlanUseCase,
    generateCalendarProjectionUseCase,
    executeDayUseCase,
  };
}
