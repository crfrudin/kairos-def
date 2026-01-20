import { assert } from '../_internal/assert';
import { CalendarDate } from '../value-objects/CalendarDate';
import { PlannedDuration } from '../value-objects/PlannedDuration';
import { TaskType } from '../value-objects/TaskType';

export type PlannedTaskId = string;

export type ReviewLink = Readonly<{
  originDate: CalendarDate; // data em que a revisão foi gerada (conclusão da teoria)
  dueDate: CalendarDate;    // data em que a revisão vence (origin + frequency)
}>;

export type PlannedTaskProps = Readonly<{
  id: PlannedTaskId;
  type: TaskType;
  duration: PlannedDuration;

  // Campo conceitual para identificação humana/auditável sem depender de IDs externos.
  // Ex.: "Direito Penal", "STF Informativos", "Lei 9.099/95", etc.
  label?: string;

  // Apenas para REVIEW: vínculo normativo (não reagendável, não acumulável).
  reviewLink?: ReviewLink;
}>;

export class PlannedTask {
  private constructor(private readonly props: PlannedTaskProps) {}

  static create(props: PlannedTaskProps): PlannedTask {
    assert(typeof props.id === 'string' && props.id.trim().length > 0, 'TASK_ID', 'PlannedTask.id is required.');
    assert(Object.values(TaskType).includes(props.type), 'TASK_TYPE', 'Invalid TaskType.');
    assert(props.duration.minutes >= 0, 'TASK_DURATION', 'Task duration must be >= 0.');

    const isReview = props.type === TaskType.REVIEW;
    if (isReview) {
      assert(!!props.reviewLink, 'REVIEW_LINK_REQUIRED', 'Review tasks must have a reviewLink.');
      assert(props.reviewLink!.dueDate.equals(props.reviewLink!.dueDate), 'REVIEW_LINK_INVALID', 'Invalid reviewLink.');
    } else {
      assert(!props.reviewLink, 'REVIEW_LINK_FORBIDDEN', 'Non-review tasks cannot have reviewLink.');
    }

    return new PlannedTask(Object.freeze({ ...props }));
  }

  get id(): PlannedTaskId {
    return this.props.id;
  }

  get type(): TaskType {
    return this.props.type;
  }

  get duration(): PlannedDuration {
    return this.props.duration;
  }

  get label(): string | undefined {
    return this.props.label;
  }

  get reviewLink(): ReviewLink | undefined {
    return this.props.reviewLink;
  }
}
