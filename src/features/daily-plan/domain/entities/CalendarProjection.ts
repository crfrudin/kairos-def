import { assert } from '../_internal/assert';
import { CalendarDate } from '../value-objects/CalendarDate';
import { DailyPlan } from './DailyPlan';

export type CalendarProjectionProps = Readonly<{
  from: CalendarDate;
  to: CalendarDate; // inclusivo (modelo conceitual)
  days: ReadonlyArray<DailyPlan>;

  // Metadado conceitual: identifica o “contrato normativo” usado na geração (sem auth/infra).
  // Ex.: "profile_rules_version_hash" gerado fora do domínio.
  normativeSnapshotId?: string;
}>;

export class CalendarProjection {
  private constructor(private readonly props: CalendarProjectionProps) {}

  static create(props: CalendarProjectionProps): CalendarProjection {
    assert(props.from.compareTo(props.to) <= 0, 'PROJECTION_RANGE', 'Projection range must satisfy from <= to.');
    assert(Array.isArray(props.days), 'PROJECTION_DAYS', 'Projection.days must be an array.');

    // Invariante: todos os dias devem estar dentro do range e únicos.
    const seen = new Set<string>();
    for (const d of props.days) {
      const iso = d.date.toISO();
      assert(d.date.compareTo(props.from) >= 0 && d.date.compareTo(props.to) <= 0, 'PROJECTION_OUT_OF_RANGE', 'Day out of range.');
      assert(!seen.has(iso), 'PROJECTION_DUPLICATE_DAY', `Duplicate day in projection: ${iso}`);
      seen.add(iso);
    }

    return new CalendarProjection(Object.freeze({ ...props, days: Object.freeze([...props.days]) }));
  }

  get from(): CalendarDate {
    return this.props.from;
  }

  get to(): CalendarDate {
    return this.props.to;
  }

  get days(): ReadonlyArray<DailyPlan> {
    return this.props.days;
  }

  get normativeSnapshotId(): string | undefined {
    return this.props.normativeSnapshotId;
  }
}
