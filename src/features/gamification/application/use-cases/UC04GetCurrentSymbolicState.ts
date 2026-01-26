import {
  CurrentSymbolicState,
  TenantId,
} from "../contracts";
import { Result } from "../contracts";
import { GamificationErrorCode } from "../errors";
import {
  IAchievementGrantRepository,
  IStreakSnapshotRepository,
} from "../ports";

export type UC04GetCurrentSymbolicStateError =
  | { code: GamificationErrorCode.AcessoForaDoTenant };

export interface UC04GetCurrentSymbolicStateInput {
  tenantId: TenantId;
}

export interface UC04GetCurrentSymbolicStateOutput {
  state: CurrentSymbolicState;
}

export interface IUC04GetCurrentSymbolicState {
  execute(
    input: UC04GetCurrentSymbolicStateInput
  ): Promise<Result<UC04GetCurrentSymbolicStateOutput, UC04GetCurrentSymbolicStateError>>;
}

export class UC04GetCurrentSymbolicState
  implements IUC04GetCurrentSymbolicState
{
  constructor(
    private readonly achievementGrantRepository: IAchievementGrantRepository,
    private readonly streakSnapshotRepository: IStreakSnapshotRepository
  ) {}

  async execute(
    input: UC04GetCurrentSymbolicStateInput
  ): Promise<
    Result<
      UC04GetCurrentSymbolicStateOutput,
      UC04GetCurrentSymbolicStateError
    >
  > {
    const { tenantId } = input;

    if (!tenantId) {
      return {
        ok: false,
        error: { code: GamificationErrorCode.AcessoForaDoTenant },
      };
    }

    const achievements =
      await this.achievementGrantRepository.listGrantsByTenant(
        tenantId
      );

    const streaks =
      await this.streakSnapshotRepository.listSnapshotsByTenant(
        tenantId
      );

    const state: CurrentSymbolicState = {
      tenantId,
      achievements,
      streaks,
    };

    return {
      ok: true,
      value: { state },
    };
  }
}
