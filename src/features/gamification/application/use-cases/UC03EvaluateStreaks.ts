import {
  ObservedEvent,
  StreakSnapshot,
  StreakTransition,
  TenantId,
  IsoDateTimeString,
  StreakKey,
} from "../contracts";
import { Result } from "../contracts";
import {
  GamificationError,
  GamificationErrorCode,
} from "../errors";
import {
  IStreakSnapshotRepository,
  IStreakTransitionRepository,
  IGamificationTransaction,
} from "../ports";

export type UC03EvaluateStreaksError =
  | { code: GamificationErrorCode.EventoIncompativelComStreak }
  | { code: GamificationErrorCode.ViolacaoAntiAbuso }
  | { code: GamificationErrorCode.AcessoForaDoTenant };

export interface UC03EvaluateStreaksInput {
  tenantId: TenantId;
  observedEvents: ReadonlyArray<ObservedEvent>;
  /**
   * Estado atual derivado (snapshot), fornecido como input conforme o contrato conceitual.
   * Sem interpretação normativa aqui.
   */
  currentState: ReadonlyArray<StreakSnapshot>;
}

export interface UC03EvaluateStreaksOutput {
  /**
   * true  => transição registrada (append-only) + atualização prospectiva de snapshot
   * false => nenhuma transição
   */
  transitioned: boolean;
  transitions: ReadonlyArray<StreakTransition>;
  updatedSnapshots: ReadonlyArray<StreakSnapshot>;
}

export interface IUC03EvaluateStreaks {
  execute(
    input: UC03EvaluateStreaksInput
  ): Promise<Result<UC03EvaluateStreaksOutput, UC03EvaluateStreaksError>>;
}

export type UC03EvaluateStreaksAnyError = Extract<
  GamificationError,
  UC03EvaluateStreaksError
>;

export class UC03EvaluateStreaks
  implements IUC03EvaluateStreaks
{
  constructor(
    private readonly streakSnapshotRepository: IStreakSnapshotRepository,
    private readonly streakTransitionRepository: IStreakTransitionRepository,
    private readonly transaction: IGamificationTransaction
  ) {}

  async execute(
    input: UC03EvaluateStreaksInput
  ): Promise<
    Result<
      UC03EvaluateStreaksOutput,
      UC03EvaluateStreaksError
    >
  > {
    const { tenantId, observedEvents, currentState } = input;

    if (!tenantId) {
      return {
        ok: false,
        error: { code: GamificationErrorCode.AcessoForaDoTenant },
      };
    }

    if (!observedEvents || observedEvents.length === 0) {
      return {
        ok: true,
        value: {
          transitioned: false,
          transitions: [],
          updatedSnapshots: currentState,
        },
      };
    }

    const now: IsoDateTimeString = new Date().toISOString();

    const transitions: StreakTransition[] = [];
    const updatedSnapshots: StreakSnapshot[] = [];

    /**
     * Estratégia canônica:
     * - Cada evento observado pode, ou não, gerar uma transição prospectiva.
     * - Não há heurística nem interpretação; apenas materialização estrutural.
     * - A definição semântica da transição é externa (modelo canônico).
     */
    for (const event of observedEvents) {
      const streakKey: StreakKey = event.eventType;

      const previousSnapshot =
        currentState.find((s) => s.streakKey === streakKey) ?? null;

      const transition: StreakTransition = {
        id: crypto.randomUUID(),
        tenantId,
        streakKey,
        occurredAt: now,
        payload: {
          basedOnObservedEventId: event.id,
          previousState: previousSnapshot?.state ?? null,
        },
      };

      transitions.push(transition);

      const newSnapshot: StreakSnapshot = {
        tenantId,
        streakKey,
        state: {
          lastObservedEventId: event.id,
        },
        updatedAt: now,
      };

      updatedSnapshots.push(newSnapshot);
    }

    if (transitions.length === 0) {
      return {
        ok: true,
        value: {
          transitioned: false,
          transitions: [],
          updatedSnapshots: currentState,
        },
      };
    }

    try {
      await this.transaction.runInTransaction(async () => {
        for (const transition of transitions) {
          await this.streakTransitionRepository.insertTransition(
            transition
          );
        }

        for (const snapshot of updatedSnapshots) {
          await this.streakSnapshotRepository.upsertSnapshot(
            snapshot
          );
        }
      });
    } catch {
      return {
        ok: false,
        error: { code: GamificationErrorCode.ViolacaoAntiAbuso },
      };
    }

    return {
      ok: true,
      value: {
        transitioned: true,
        transitions,
        updatedSnapshots,
      },
    };
  }
}
