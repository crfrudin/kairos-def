import { DomainError } from "../_shared/DomainError";
import { SubscriptionId } from "../value-objects/SubscriptionId";
import { PlanTier } from "../value-objects/PlanTier";
import { SubscriptionState } from "../value-objects/SubscriptionState";
import { SubscriptionDate } from "../value-objects/SubscriptionDate";
import { entitlementsFor, Entitlements } from "../value-objects/Entitlements";
import { SubscriptionDomainEvent } from "../events/SubscriptionEvents";

type CancelReason = "EXPIRED" | "CANCELED" | "ADMIN_ACTION";

export class Subscription {
  private readonly _id: SubscriptionId;
  private _state: SubscriptionState;
  private _plan: PlanTier;

  // cancelamento agendado (conceitual; data fornecida de fora, sem Date/now)
  private _cancelEffectiveOn?: SubscriptionDate;

  private constructor(params: {
    id: SubscriptionId;
    state: SubscriptionState;
    plan: PlanTier;
    cancelEffectiveOn?: SubscriptionDate;
  }) {
    this._id = params.id;
    this._state = params.state;
    this._plan = params.plan;
    this._cancelEffectiveOn = params.cancelEffectiveOn;

    this.assertInvariants();
  }

  // ----------------------------
  // Factories (puras)
  // ----------------------------
  public static createFree(id: SubscriptionId): { subscription: Subscription; events: SubscriptionDomainEvent[] } {
    const subscription = new Subscription({
      id,
      state: "FREE",
      plan: "FREE",
    });

    const events: SubscriptionDomainEvent[] = [
      { type: "SubscriptionCreated", payload: { subscriptionId: id.value, initialState: "FREE" } },
    ];

    return { subscription, events };
  }

  // ----------------------------
  // Getters (puros)
  // ----------------------------
  public get id(): SubscriptionId {
    return this._id;
  }

  public get state(): SubscriptionState {
    return this._state;
  }

  public get plan(): PlanTier {
    return this._plan;
  }

  public get cancelEffectiveOn(): SubscriptionDate | undefined {
    return this._cancelEffectiveOn;
  }

  public get entitlements(): Entitlements {
    return entitlementsFor(this._plan);
  }

  // ----------------------------
  // Operações de domínio (puras)
  // ----------------------------

  /**
   * Upgrade para PREMIUM (sem gateway, sem dinheiro, sem datas).
   */
  public upgradeToPremium(): SubscriptionDomainEvent[] {
    if (this._state !== "FREE") {
      throw new DomainError("UpgradeNotAllowed", "Upgrade só é permitido a partir do estado FREE.");
    }

    this._state = "PREMIUM_ACTIVE";
    this._plan = "PREMIUM";
    this._cancelEffectiveOn = undefined;

    this.assertInvariants();

    return [{ type: "SubscriptionUpgradedToPremium", payload: { subscriptionId: this._id.value } }];
  }

  /**
   * Agenda cancelamento (vira PREMIUM_CANCELING).
   * effectiveOn é opcional; se fornecido, é validado como SubscriptionDate (sem Date/now).
   */
  public scheduleCancellation(effectiveOn?: SubscriptionDate): SubscriptionDomainEvent[] {
    if (this._state !== "PREMIUM_ACTIVE" && this._state !== "PREMIUM_CANCELING") {
      throw new DomainError(
        "CancellationNotAllowed",
        "Cancelamento só pode ser agendado quando PREMIUM está ativo."
      );
    }

    this._state = "PREMIUM_CANCELING";
    this._cancelEffectiveOn = effectiveOn;

    this.assertInvariants();

    return [
      {
        type: "SubscriptionCancellationScheduled",
        payload: { subscriptionId: this._id.value, effectiveOn: effectiveOn?.value },
      },
    ];
  }

  /**
   * Reativação (remove cancelamento agendado).
   */
  public reactivate(): SubscriptionDomainEvent[] {
    if (this._state !== "PREMIUM_CANCELING") {
      throw new DomainError("ReactivateNotAllowed", "Reativação só é permitida quando PREMIUM_CANCELING.");
    }

    this._state = "PREMIUM_ACTIVE";
    this._cancelEffectiveOn = undefined;

    this.assertInvariants();

    return [{ type: "SubscriptionReactivated", payload: { subscriptionId: this._id.value } }];
  }

  /**
   * Downgrade definitivo para FREE (por expiração/cancelamento/admin).
   * Observação normativa: assinatura só controla acesso (não altera domínio/plano diário/etc.).:contentReference[oaicite:8]{index=8}:contentReference[oaicite:9]{index=9}
   */
  public downgradeToFree(reason: CancelReason): SubscriptionDomainEvent[] {
    if (this._state === "FREE") {
      // idempotente: já está FREE
      return [];
    }

    this._state = "FREE";
    this._plan = "FREE";
    this._cancelEffectiveOn = undefined;

    this.assertInvariants();

    return [
      {
        type: "SubscriptionDowngradedToFree",
        payload: { subscriptionId: this._id.value, reason },
      },
    ];
  }

  // ----------------------------
  // Invariantes (bloqueantes)
  // ----------------------------
  private assertInvariants(): void {
    // Invariante 1: estado FREE implica plano FREE
    if (this._state === "FREE" && this._plan !== "FREE") {
      throw new DomainError("InvariantViolation", "Estado FREE exige plano FREE.");
    }

    // Invariante 2: estados premium implicam plano PREMIUM
    if ((this._state === "PREMIUM_ACTIVE" || this._state === "PREMIUM_CANCELING") && this._plan !== "PREMIUM") {
      throw new DomainError("InvariantViolation", "Estado PREMIUM exige plano PREMIUM.");
    }

    // Invariante 3: cancelEffectiveOn só faz sentido se PREMIUM_CANCELING
    if (this._cancelEffectiveOn && this._state !== "PREMIUM_CANCELING") {
      throw new DomainError("InvariantViolation", "cancelEffectiveOn só pode existir quando PREMIUM_CANCELING.");
    }
  }
}
