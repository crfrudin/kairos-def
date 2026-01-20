import { RestDayEvaluator } from '@/features/daily-plan/application/services/RestDayEvaluator';
import { ReviewAllocator } from '@/features/daily-plan/application/services/ReviewAllocator';
import { ExtrasAllocator } from '@/features/daily-plan/application/services/ExtrasAllocator';
import { TheoryAllocator } from '@/features/daily-plan/application/services/TheoryAllocator';
import { DailyPlanComposer } from '@/features/daily-plan/application/services/DailyPlanComposer';

import type { IPlanningContextPort } from '@/features/daily-plan/application/ports/IPlanningContextPort';
import type { IDailyPlanPersistencePort } from '@/features/daily-plan/application/ports/IDailyPlanPersistencePort';
import { GenerateDailyPlanUseCase } from '@/features/daily-plan/application/use-cases/GenerateDailyPlan';

export const createDailyPlanComposer = (): DailyPlanComposer => {
  const restDayEvaluator = new RestDayEvaluator();
  const reviewAllocator = new ReviewAllocator();
  const extrasAllocator = new ExtrasAllocator();
  const theoryAllocator = new TheoryAllocator();

  return new DailyPlanComposer(
    restDayEvaluator,
    reviewAllocator,
    extrasAllocator,
    theoryAllocator
  );
};

export interface CreateGenerateDailyPlanUseCaseDeps {
  contextPort: IPlanningContextPort;
  persistencePort: IDailyPlanPersistencePort;

  /**
   * Clock injetável:
   * - NÃO interfere no output do plano (somente auditoria do log).
   * - default: new Date().toISOString()
   */
  nowIso?: () => string;
}

export const createGenerateDailyPlanUseCase = (
  deps: CreateGenerateDailyPlanUseCaseDeps
): GenerateDailyPlanUseCase => {
  const composer = createDailyPlanComposer();

  return new GenerateDailyPlanUseCase({
    contextPort: deps.contextPort,
    persistencePort: deps.persistencePort,
    composer,
    nowIso: deps.nowIso ?? (() => new Date().toISOString()),
  });
};
