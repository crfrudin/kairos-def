import {
  SymbolicHistory,
  SymbolicHistoryScope,
  TenantId,
} from "../contracts";
import { Result } from "../contracts";
import { GamificationErrorCode } from "../errors";
import {
  IObservedEventRepository,
  IAchievementGrantRepository,
  IStreakTransitionRepository,
} from "../ports";

export type UC05GetSymbolicHistoryError =
  | { code: GamificationErrorCode.AcessoForaDoTenant };

export interface UC05GetSymbolicHistoryInput {
  tenantId: TenantId;
  scope: SymbolicHistoryScope;
}

export interface UC05GetSymbolicHistoryOutput {
  history: SymbolicHistory;
}

export interface IUC05GetSymbolicHistory {
  execute(
    input: UC05GetSymbolicHistoryInput
  ): Promise<Result<UC05GetSymbolicHistoryOutput, UC05GetSymbolicHistoryError>>;
}

export class UC05GetSymbolicHistory
  implements IUC05GetSymbolicHistory
{
  constructor(
    private readonly observedEventRepository: IObservedEventRepository,
    private readonly achievementGrantRepository: IAchievementGrantRepository,
    private readonly streakTransitionRepository: IStreakTransitionRepository
  ) {}

  async execute(
    input: UC05GetSymbolicHistoryInput
  ): Promise<
    Result<
      UC05GetSymbolicHistoryOutput,
      UC05GetSymbolicHistoryError
    >
  > {
    const { tenantId, scope } = input;

    if (!tenantId) {
      return {
        ok: false,
        error: { code: GamificationErrorCode.AcessoForaDoTenant },
      };
    }

    const observedEvents =
      scope.kind === "ALL" || scope.kind === "OBSERVED_EVENTS_ONLY"
        ? await this.observedEventRepository.listObservedEventsByTenant(
            tenantId
          )
        : [];

    const achievementGrants =
      scope.kind === "ALL" || scope.kind === "ACHIEVEMENTS_ONLY"
        ? await this.achievementGrantRepository.listGrantsByTenant(
            tenantId
          )
        : [];

    const streakTransitions =
      scope.kind === "ALL" || scope.kind === "STREAKS_ONLY"
        ? await this.streakTransitionRepository.listTransitionsByTenant(
            tenantId
          )
        : [];

    const history: SymbolicHistory = {
      tenantId,
      observedEvents,
      achievementGrants,
      streakTransitions,
    };

    return {
      ok: true,
      value: { history },
    };
  }
}
