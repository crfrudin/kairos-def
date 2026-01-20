import { assert } from '../_internal/assert';
import { CalendarDate } from '../value-objects/CalendarDate';
import { PlannedDuration } from '../value-objects/PlannedDuration';
import { TaskType } from '../value-objects/TaskType';

export type ExecutedItem = Readonly<{
  type: TaskType;
  label?: string;
  actualDuration: PlannedDuration;
  completed: boolean;
}>;

export type ExecutedDayProps = Readonly<{
  date: CalendarDate;
  items: ReadonlyArray<ExecutedItem>;
  // total “real” executado (derivado dos items, mas mantemos aqui para auditoria simples se necessário)
}>;

export class ExecutedDay {
  private readonly _total: PlannedDuration;

  private constructor(private readonly props: ExecutedDayProps) {
    this._total = PlannedDuration.fromMinutes(
      props.items.reduce((acc, it) => acc + it.actualDuration.minutes, 0)
    );
  }

  static create(props: ExecutedDayProps): ExecutedDay {
    assert(Array.isArray(props.items), 'EXEC_ITEMS', 'ExecutedDay.items must be an array.');
    // Invariante: execução não pode ter duração negativa (garantido por VO), e é factual (sem validação de disponibilidade aqui).
    return new ExecutedDay(Object.freeze({ ...props, items: Object.freeze([...props.items]) }));
  }

  get date(): CalendarDate {
    return this.props.date;
  }

  get items(): ReadonlyArray<ExecutedItem> {
    return this.props.items;
  }

  get totalActualDuration(): PlannedDuration {
    return this._total;
  }
}
