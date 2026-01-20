import { assert } from '../_internal/assert';
import { PlannedDuration } from '../value-objects/PlannedDuration';
import { TaskType } from '../value-objects/TaskType';
import { PlannedTask, PlannedTaskId } from './PlannedTask';

export enum NormativeLayer {
  REVIEW = 'REVIEW',
  EXTRAS = 'EXTRAS',
  THEORY = 'THEORY',
}

export type DailyPlanItemProps = Readonly<{
  task: PlannedTask;
  layer: NormativeLayer;

  // Ordem determinística dentro do dia (para consumo sequencial e auditável).
  // A camada define precedência macro; o order define precedência micro.
  order: number;

  // Bloco opcional (apenas conceitual; não exige uso). Se inexistente, item é “livre”.
  // Mantido fora daqui para não forçar TimeBlock no item (é VO opcional na etapa).
}>;

export class DailyPlanItem {
  private constructor(private readonly props: DailyPlanItemProps) {}

  static create(props: DailyPlanItemProps): DailyPlanItem {
    assert(Number.isInteger(props.order) && props.order >= 0, 'ITEM_ORDER', 'DailyPlanItem.order must be an integer >= 0.');

    // Invariante: camada compatível com tipo
    if (props.layer === NormativeLayer.REVIEW) {
      assert(props.task.type === TaskType.REVIEW, 'LAYER_MISMATCH', 'REVIEW layer requires TaskType.REVIEW.');
    }
    if (props.layer === NormativeLayer.THEORY) {
      assert(props.task.type === TaskType.THEORY, 'LAYER_MISMATCH', 'THEORY layer requires TaskType.THEORY.');
    }
    if (props.layer === NormativeLayer.EXTRAS) {
      assert(
        props.task.type === TaskType.QUESTIONS ||
          props.task.type === TaskType.INFORMATIVES ||
          props.task.type === TaskType.LEI_SECA,
        'LAYER_MISMATCH',
        'EXTRAS layer requires QUESTIONS/INFORMATIVES/LEI_SECA.'
      );
    }

    return new DailyPlanItem(Object.freeze({ ...props }));
  }

  get taskId(): PlannedTaskId {
    return this.props.task.id;
  }

  get task(): PlannedTask {
    return this.props.task;
  }

  get layer(): NormativeLayer {
    return this.props.layer;
  }

  get order(): number {
    return this.props.order;
  }

  get duration(): PlannedDuration {
    return this.props.task.duration;
  }
}
