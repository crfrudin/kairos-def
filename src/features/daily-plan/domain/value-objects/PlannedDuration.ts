import { assert } from '../_internal/assert';

export class PlannedDuration {
  private constructor(public readonly minutes: number) {}

  static fromMinutes(minutes: number): PlannedDuration {
    assert(Number.isInteger(minutes), 'DURATION_NOT_INT', 'PlannedDuration.minutes must be an integer.');
    assert(minutes >= 0, 'DURATION_NEGATIVE', 'PlannedDuration.minutes must be >= 0.');
    assert(minutes <= 1440, 'DURATION_TOO_LARGE', 'PlannedDuration.minutes must be <= 1440.');
    return new PlannedDuration(minutes);
  }

  isZero(): boolean {
    return this.minutes === 0;
  }

  add(other: PlannedDuration): PlannedDuration {
    return PlannedDuration.fromMinutes(this.minutes + other.minutes);
  }

  subtract(other: PlannedDuration): PlannedDuration {
    const v = this.minutes - other.minutes;
    assert(v >= 0, 'DURATION_UNDERFLOW', 'Cannot subtract to negative duration.');
    return PlannedDuration.fromMinutes(v);
  }
}
