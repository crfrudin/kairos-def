import {
  FactualEventType,
  FactualReference,
  IsoDateTimeString,
  ObservedEvent,
  TenantId,
} from "../contracts";
import { Result } from "../contracts";
import {
  GamificationError,
  GamificationErrorCode,
} from "../errors";
import {
  IObservedEventRepository,
  IObservationMarkRepository,
  IGamificationTransaction,
} from "../ports";

export type UC01ObserveFactualEventError =
  | { code: GamificationErrorCode.EventoNaoElegivel }
  | { code: GamificationErrorCode.EventoJaObservado }
  | { code: GamificationErrorCode.ViolacaoAntiAbuso }
  | { code: GamificationErrorCode.AcessoForaDoTenant };

export interface UC01ObserveFactualEventInput {
  tenantId: TenantId;
  eventType: FactualEventType;
  factualRef: FactualReference;
  occurredAt: IsoDateTimeString;
}

export interface UC01ObserveFactualEventOutput {
  observedEvent: ObservedEvent;
}

export interface IUC01ObserveFactualEvent {
  execute(
    input: UC01ObserveFactualEventInput
  ): Promise<Result<UC01ObserveFactualEventOutput, UC01ObserveFactualEventError>>;
}

export type UC01ObserveFactualEventAnyError = Extract<
  GamificationError,
  UC01ObserveFactualEventError
>;

export class UC01ObserveFactualEvent
  implements IUC01ObserveFactualEvent
{
  constructor(
    private readonly observedEventRepository: IObservedEventRepository,
    private readonly observationMarkRepository: IObservationMarkRepository,
    private readonly transaction: IGamificationTransaction
  ) {}

  async execute(
    input: UC01ObserveFactualEventInput
  ): Promise<
    Result<
      UC01ObserveFactualEventOutput,
      UC01ObserveFactualEventError
    >
  > {
    const { tenantId, eventType, factualRef, occurredAt } = input;

    if (!tenantId) {
      return { ok: false, error: { code: GamificationErrorCode.AcessoForaDoTenant } };
    }

    const alreadyObserved =
      await this.observationMarkRepository.existsMark(
        tenantId,
        eventType,
        factualRef
      );

    if (alreadyObserved) {
      return {
        ok: false,
        error: { code: GamificationErrorCode.EventoJaObservado },
      };
    }

    const observedEvent: ObservedEvent = {
      id: crypto.randomUUID(),
      tenantId,
      eventType,
      factualRef,
      occurredAt,
    };

    try {
      await this.transaction.runInTransaction(async () => {
        await this.observationMarkRepository.insertMark({
          tenantId,
          eventType,
          factualRef,
        });

        await this.observedEventRepository.insertObservedEvent(
          observedEvent
        );
      });
    } catch {
      return {
        ok: false,
        error: { code: GamificationErrorCode.ViolacaoAntiAbuso },
      };
    }

    return {
      ok: true,
      value: { observedEvent },
    };
  }
}
