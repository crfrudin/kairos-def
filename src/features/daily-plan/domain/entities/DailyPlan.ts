import { assert } from '../_internal/assert';
import { CalendarDate } from '../value-objects/CalendarDate';
import { PlannedDuration } from '../value-objects/PlannedDuration';
import { PlanStatus } from '../value-objects/PlanStatus';
import { DailyPlanItem, NormativeLayer } from './DailyPlanItem';

export type DailyPlanProps = Readonly<{
  date: CalendarDate;
  status: PlanStatus;

  // Tempo total disponível do dia (já é um “input normativo” vindo do Perfil; aqui só validamos coerência).
  available: PlannedDuration;

  // Itens do dia (ordenados e coerentes com status)
  items: ReadonlyArray<DailyPlanItem>;
}>;

const layerRank: Record<NormativeLayer, number> = {
  [NormativeLayer.REVIEW]: 1,
  [NormativeLayer.EXTRAS]: 2,
  [NormativeLayer.THEORY]: 3,
};

export class DailyPlan {
  private readonly _items: ReadonlyArray<DailyPlanItem>;
  private readonly _required: PlannedDuration;

  private constructor(private readonly props: DailyPlanProps) {
    this._items = props.items;
    this._required = PlannedDuration.fromMinutes(
      props.items.reduce((acc, it) => acc + it.duration.minutes, 0)
    );
  }

  static create(props: DailyPlanProps): DailyPlan {
    assert(!!props.date, 'PLAN_DATE_REQUIRED', 'DailyPlan.date is required.');
    assert(Object.values(PlanStatus).includes(props.status), 'PLAN_STATUS', 'Invalid PlanStatus.');

    // Invariante: dia de descanso => nenhum item.
    if (props.status === PlanStatus.REST_DAY) {
      assert(props.items.length === 0, 'REST_DAY_HAS_ITEMS', 'REST_DAY cannot have plan items.');
      return new DailyPlan(Object.freeze({ ...props, items: Object.freeze([]) }));
    }

    // Ordenação determinística e estável: camada (rank) + order + tie-breaker por taskId
    const sorted = [...props.items].sort((a, b) => {
      const la = layerRank[a.layer];
      const lb = layerRank[b.layer];
      if (la !== lb) return la - lb;
      if (a.order !== b.order) return a.order - b.order;
      return a.taskId.localeCompare(b.taskId);
    });

    // Invariante: o input já deve respeitar precedência macro.
    // Aqui reforçamos: sequência de camadas não pode “voltar”.
    let maxSeen = 0;
    for (const it of sorted) {
      const r = layerRank[it.layer];
      assert(r >= maxSeen, 'LAYER_PRECEDENCE', 'Items violate normative layer precedence.');
      maxSeen = r;
    }

    const required = PlannedDuration.fromMinutes(sorted.reduce((acc, it) => acc + it.duration.minutes, 0));

    // Invariante: inviabilidade bloqueante (sem heurística de corte aqui)
    assert(
      required.minutes <= props.available.minutes,
      'PLAN_INFEASIBLE',
      `DailyPlan infeasible: required ${required.minutes} > available ${props.available.minutes}.`
    );

    return new DailyPlan(Object.freeze({ ...props, items: Object.freeze(sorted) }));
  }

  get date(): CalendarDate {
    return this.props.date;
  }

  get status(): PlanStatus {
    return this.props.status;
  }

  get available(): PlannedDuration {
    return this.props.available;
  }

  // Tempo exigido (revisões + extras + teoria planejados)
  get required(): PlannedDuration {
    return this._required;
  }

  get remaining(): PlannedDuration {
    return PlannedDuration.fromMinutes(this.available.minutes - this.required.minutes);
  }

  get items(): ReadonlyArray<DailyPlanItem> {
    return this._items;
  }

  // Regras “plano derivado”: um plano só pode ser regenerado se ainda não virou execução.
  // A validação de “data passada / dia corrente após início” é application/engine.
  canBeRegenerated(hasExecutionRecorded: boolean): boolean {
    if (this.status === PlanStatus.EXECUTED) return false;
    if (hasExecutionRecorded) return false;
    return true;
  }
}
