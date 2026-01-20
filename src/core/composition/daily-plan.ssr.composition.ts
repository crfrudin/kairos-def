import 'server-only';

import type { GenerateDailyPlanUseCase } from '@/features/daily-plan/application/use-cases/GenerateDailyPlan';
import type { RegenerateDailyPlanUseCase } from '@/features/daily-plan/application/use-cases/RegenerateDailyPlan';
import type { GenerateCalendarProjectionUseCase } from '@/features/daily-plan/application/use-cases/GenerateCalendarProjection';
import type { ExecuteDayUseCase } from '@/features/daily-plan/application/use-cases/ExecuteDay';
import type { GetDailyPlanUseCase } from '@/features/daily-plan/application/use-cases/GetDailyPlan';
import type { GetCalendarProjectionUseCase } from '@/features/daily-plan/application/use-cases/GetCalendarProjection';

import {
  createGenerateDailyPlanUseCase,
  createRegenerateDailyPlanUseCase,
  createGenerateCalendarProjectionUseCase,
  createExecuteDayUseCase,
  createGetDailyPlanUseCase,
  createGetCalendarProjectionUseCase,
} from '@/core/composition/daily-plan-composition';

import type { IPlanningContextPort } from '@/features/daily-plan/application/ports/IPlanningContextPort';
import type { IDailyPlanPersistencePort } from '@/features/daily-plan/application/ports/IDailyPlanPersistencePort';
import type { ICalendarProjectionPersistencePort } from '@/features/daily-plan/application/ports/ICalendarProjectionPersistencePort';
import type { ICalendarProjectionReadPort } from '@/features/daily-plan/application/ports/ICalendarProjectionReadPort';
import type { IExecutionPersistencePort } from '@/features/daily-plan/application/ports/IExecutionPersistencePort';
import type { IDailyPlanReadPort } from '@/features/daily-plan/application/ports/IDailyPlanReadPort';

import { SupabasePlanningContextPortSSR } from '@/features/daily-plan/infra/ssr/SupabasePlanningContextPortSSR';
import { SupabaseDailyPlanPersistencePortSSR } from '@/features/daily-plan/infra/ssr/SupabaseDailyPlanPersistencePortSSR';
import { SupabaseCalendarProjectionPersistencePortSSR } from '@/features/daily-plan/infra/ssr/SupabaseCalendarProjectionPersistencePortSSR';
import { SupabaseCalendarProjectionReadPortSSR } from '@/features/daily-plan/infra/ssr/SupabaseCalendarProjectionReadPortSSR';
import { SupabaseExecutionPersistencePortSSR } from '@/features/daily-plan/infra/ssr/SupabaseExecutionPersistencePortSSR';
import { SupabaseDailyPlanReadPortSSR } from '@/features/daily-plan/infra/ssr/SupabaseDailyPlanReadPortSSR';

export interface DailyPlanSsrComposition {
  contextPort: IPlanningContextPort;

  dailyPlanPersistencePort: IDailyPlanPersistencePort;

  calendarProjectionPersistencePort: ICalendarProjectionPersistencePort;
  calendarProjectionReadPort: ICalendarProjectionReadPort;

  executionPersistencePort: IExecutionPersistencePort;
  dailyPlanReadPort: IDailyPlanReadPort;

  generateDailyPlanUseCase: GenerateDailyPlanUseCase;
  regenerateDailyPlanUseCase: RegenerateDailyPlanUseCase;
  generateCalendarProjectionUseCase: GenerateCalendarProjectionUseCase;
  executeDayUseCase: ExecuteDayUseCase;

  getDailyPlanUseCase: GetDailyPlanUseCase;
  getCalendarProjectionUseCase: GetCalendarProjectionUseCase;
}

export function createDailyPlanSsrComposition(): DailyPlanSsrComposition {
  const contextPort = new SupabasePlanningContextPortSSR();

  const dailyPlanPersistencePort = new SupabaseDailyPlanPersistencePortSSR();

  const calendarProjectionPersistencePort = new SupabaseCalendarProjectionPersistencePortSSR();
  const calendarProjectionReadPort = new SupabaseCalendarProjectionReadPortSSR();

  const executionPersistencePort = new SupabaseExecutionPersistencePortSSR();
  const dailyPlanReadPort = new SupabaseDailyPlanReadPortSSR();

  const generateDailyPlanUseCase = createGenerateDailyPlanUseCase({
    contextPort,
    persistencePort: dailyPlanPersistencePort,
  });

  const regenerateDailyPlanUseCase = createRegenerateDailyPlanUseCase({
    contextPort,
    persistencePort: dailyPlanPersistencePort,
  });

  // ✅ IMPORTANTE: createGenerateCalendarProjectionUseCase NÃO recebe readPort.
  const generateCalendarProjectionUseCase = createGenerateCalendarProjectionUseCase({
    contextPort,
    persistencePort: calendarProjectionPersistencePort,
  });

  const executeDayUseCase = createExecuteDayUseCase({
    contextPort,
    executionPersistencePort,
  });

  const getDailyPlanUseCase = createGetDailyPlanUseCase({
    readPort: dailyPlanReadPort,
  });

  const getCalendarProjectionUseCase = createGetCalendarProjectionUseCase({
    readPort: calendarProjectionReadPort,
  });

  return {
    contextPort,

    dailyPlanPersistencePort,

    calendarProjectionPersistencePort,
    calendarProjectionReadPort,

    executionPersistencePort,
    dailyPlanReadPort,

    generateDailyPlanUseCase,
    regenerateDailyPlanUseCase,
    generateCalendarProjectionUseCase,
    executeDayUseCase,

    getDailyPlanUseCase,
    getCalendarProjectionUseCase,
  };
}
