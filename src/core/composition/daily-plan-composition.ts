import { RestDayEvaluator } from '@/features/daily-plan/application/services/RestDayEvaluator';
import { ReviewAllocator } from '@/features/daily-plan/application/services/ReviewAllocator';
import { ExtrasAllocator } from '@/features/daily-plan/application/services/ExtrasAllocator';
import { TheoryAllocator } from '@/features/daily-plan/application/services/TheoryAllocator';
import { DailyPlanComposer } from '@/features/daily-plan/application/services/DailyPlanComposer';

import type { IPlanningContextPort } from '@/features/daily-plan/application/ports/IPlanningContextPort';

import type { IDailyPlanPersistencePort } from '@/features/daily-plan/application/ports/IDailyPlanPersistencePort';
import { GenerateDailyPlanUseCase } from '@/features/daily-plan/application/use-cases/GenerateDailyPlan';
import { RegenerateDailyPlanUseCase } from '@/features/daily-plan/application/use-cases/RegenerateDailyPlan';

import type { ICalendarProjectionPersistencePort } from '@/features/daily-plan/application/ports/ICalendarProjectionPersistencePort';
import { GenerateCalendarProjectionUseCase } from '@/features/daily-plan/application/use-cases/GenerateCalendarProjection';

import type { IExecutionPersistencePort } from '@/features/daily-plan/application/ports/IExecutionPersistencePort';
import { ExecuteDayUseCase } from '@/features/daily-plan/application/use-cases/ExecuteDay';

import type { IDailyPlanReadPort } from '@/features/daily-plan/application/ports/IDailyPlanReadPort';
import { GetDailyPlanUseCase } from '@/features/daily-plan/application/use-cases/GetDailyPlan';

export const createDailyPlanComposer = (): DailyPlanComposer => {
  const restDayEvaluator = new RestDayEvaluator();
  const reviewAllocator = new ReviewAllocator();
  const extrasAllocator = new ExtrasAllocator();
  const theoryAllocator = new TheoryAllocator();

  return new DailyPlanComposer(restDayEvaluator, reviewAllocator, extrasAllocator, theoryAllocator);
};

export interface CreateGenerateDailyPlanUseCaseDeps {
  contextPort: IPlanningContextPort;
  persistencePort: IDailyPlanPersistencePort;

  nowIso?: () => string;
}

export const createGenerateDailyPlanUseCase = (deps: CreateGenerateDailyPlanUseCaseDeps): GenerateDailyPlanUseCase => {
  const composer = createDailyPlanComposer();

  return new GenerateDailyPlanUseCase({
    contextPort: deps.contextPort,
    persistencePort: deps.persistencePort,
    composer,
    nowIso: deps.nowIso ?? (() => new Date().toISOString()),
  });
};

export interface CreateRegenerateDailyPlanUseCaseDeps {
  contextPort: IPlanningContextPort;
  persistencePort: IDailyPlanPersistencePort;

  nowIso?: () => string;
}

export const createRegenerateDailyPlanUseCase = (
  deps: CreateRegenerateDailyPlanUseCaseDeps
): RegenerateDailyPlanUseCase => {
  const composer = createDailyPlanComposer();

  return new RegenerateDailyPlanUseCase({
    contextPort: deps.contextPort,
    persistencePort: deps.persistencePort,
    composer,
    nowIso: deps.nowIso ?? (() => new Date().toISOString()),
  });
};

export interface CreateGenerateCalendarProjectionUseCaseDeps {
  contextPort: IPlanningContextPort;

  /**
   * Observa o contrato do UC-02:
   * GenerateCalendarProjectionDeps exige "persistencePort".
   */
  persistencePort: ICalendarProjectionPersistencePort;

  nowIso?: () => string;
}

export const createGenerateCalendarProjectionUseCase = (
  deps: CreateGenerateCalendarProjectionUseCaseDeps
): GenerateCalendarProjectionUseCase => {
  const composer = createDailyPlanComposer();

  return new GenerateCalendarProjectionUseCase({
    contextPort: deps.contextPort,
    persistencePort: deps.persistencePort,
    composer,
    nowIso: deps.nowIso ?? (() => new Date().toISOString()),
  });
};

export interface CreateExecuteDayUseCaseDeps {
  contextPort: IPlanningContextPort;
  executionPersistencePort: IExecutionPersistencePort;

  nowIso?: () => string;
}

export const createExecuteDayUseCase = (deps: CreateExecuteDayUseCaseDeps): ExecuteDayUseCase => {
  return new ExecuteDayUseCase({
    contextPort: deps.contextPort,
    executionPersistencePort: deps.executionPersistencePort,
    nowIso: deps.nowIso ?? (() => new Date().toISOString()),
  });
};

export interface CreateGetDailyPlanUseCaseDeps {
  readPort: IDailyPlanReadPort;
}

export const createGetDailyPlanUseCase = (deps: CreateGetDailyPlanUseCaseDeps): GetDailyPlanUseCase => {
  return new GetDailyPlanUseCase({
    readPort: deps.readPort,
  });
};
