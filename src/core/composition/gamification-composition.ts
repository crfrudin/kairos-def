import type { IGamificationTransaction } from "@/features/gamification/application/ports/IGamificationTransaction";

import type {
  IObservedEventRepository,
  IObservationMarkRepository,
  IAchievementGrantRepository,
  IStreakTransitionRepository,
  IStreakSnapshotRepository,
} from "@/features/gamification/application/ports";

import {
  UC01ObserveFactualEvent,
  UC02EvaluateAchievements,
  UC03EvaluateStreaks,
  UC04GetCurrentSymbolicState,
  UC05GetSymbolicHistory,
} from "@/features/gamification/application/use-cases";

/**
 * Gamification — Use-cases factory (pure wiring)
 * - Não cria regras
 * - Não altera contratos
 * - Não toca UI
 * - Apenas compõe dependências
 */
export function createGamificationUseCases(params: {
  tx: IGamificationTransaction;

  observedEventRepo: IObservedEventRepository;
  observationMarkRepo: IObservationMarkRepository;

  achievementGrantRepo: IAchievementGrantRepository;

  streakTransitionRepo: IStreakTransitionRepository;
  streakSnapshotRepo: IStreakSnapshotRepository;
}) {
  const uc01ObserveFactualEvent = new UC01ObserveFactualEvent(
    params.observedEventRepo,
    params.observationMarkRepo,
    params.tx
  );

  const uc02EvaluateAchievements = new UC02EvaluateAchievements(
    params.achievementGrantRepo,
    params.tx
  );

  const uc03EvaluateStreaks = new UC03EvaluateStreaks(
    params.streakSnapshotRepo,
    params.streakTransitionRepo,
    params.tx
  );

  const uc04GetCurrentSymbolicState = new UC04GetCurrentSymbolicState(
    params.achievementGrantRepo,
    params.streakSnapshotRepo
  );

  const uc05GetSymbolicHistory = new UC05GetSymbolicHistory(
    params.observedEventRepo,
    params.achievementGrantRepo,
    params.streakTransitionRepo
  );

  return {
    uc01ObserveFactualEvent,
    uc02EvaluateAchievements,
    uc03EvaluateStreaks,
    uc04GetCurrentSymbolicState,
    uc05GetSymbolicHistory,
  };
}
