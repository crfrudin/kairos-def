import {
  AchievementGrant,
  ObservedEvent,
  TenantId,
  IsoDateTimeString,
} from "../contracts";
import { Result } from "../contracts";
import {
  GamificationError,
  GamificationErrorCode,
} from "../errors";
import {
  IAchievementGrantRepository,
  IGamificationTransaction,
} from "../ports";

export type UC02EvaluateAchievementsError =
  | { code: GamificationErrorCode.ConquistaJaConcedida }
  | { code: GamificationErrorCode.CriterioNaoSatisfeito }
  | { code: GamificationErrorCode.ViolacaoAntiAbuso }
  | { code: GamificationErrorCode.AcessoForaDoTenant };

export interface UC02EvaluateAchievementsInput {
  tenantId: TenantId;
  observedEvents: ReadonlyArray<ObservedEvent>;
  achievementSlug: string;
}

export interface UC02EvaluateAchievementsOutput {
  /**
   * true  => concessão realizada (append-only)
   * false => nenhuma concessão (critério não satisfeito), ou erro explícito
   */
  granted: boolean;
  grant: AchievementGrant | null;
}

export interface IUC02EvaluateAchievements {
  execute(
    input: UC02EvaluateAchievementsInput
  ): Promise<Result<UC02EvaluateAchievementsOutput, UC02EvaluateAchievementsError>>;
}

export type UC02EvaluateAchievementsAnyError = Extract<
  GamificationError,
  UC02EvaluateAchievementsError
>;

export class UC02EvaluateAchievements
  implements IUC02EvaluateAchievements
{
  constructor(
    private readonly achievementGrantRepository: IAchievementGrantRepository,
    private readonly transaction: IGamificationTransaction
  ) {}

  async execute(
    input: UC02EvaluateAchievementsInput
  ): Promise<
    Result<
      UC02EvaluateAchievementsOutput,
      UC02EvaluateAchievementsError
    >
  > {
    const { tenantId, observedEvents, achievementSlug } = input;

    if (!tenantId) {
      return {
        ok: false,
        error: { code: GamificationErrorCode.AcessoForaDoTenant },
      };
    }

    // Idempotência canônica: conquista não pode ser concedida duas vezes
    const alreadyGranted =
      await this.achievementGrantRepository.existsGrantBySlug(
        tenantId,
        achievementSlug
      );

    if (alreadyGranted) {
      return {
        ok: false,
        error: { code: GamificationErrorCode.ConquistaJaConcedida },
      };
    }

    // Critério mínimo e declarativo:
    // a avaliação concreta do critério pertence à regra congelada;
    // aqui apenas verificamos se há base factual suficiente (não-vazio).
    if (!observedEvents || observedEvents.length === 0) {
      return {
        ok: true,
        value: { granted: false, grant: null },
      };
    }

    const grantedAt: IsoDateTimeString = new Date().toISOString();

    const grant: AchievementGrant = {
      id: crypto.randomUUID(),
      tenantId,
      achievementSlug,
      grantedAt,
      basedOnObservedEventIds: observedEvents.map((e) => e.id),
    };

    try {
      await this.transaction.runInTransaction(async () => {
        await this.achievementGrantRepository.insertGrant(grant);
      });
    } catch {
      return {
        ok: false,
        error: { code: GamificationErrorCode.ViolacaoAntiAbuso },
      };
    }

    return {
      ok: true,
      value: { granted: true, grant },
    };
  }
}
