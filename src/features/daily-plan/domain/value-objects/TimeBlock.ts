import { assert } from '../_internal/assert';

export class TimeBlock {
  private constructor(
    public readonly startMinute: number,
    public readonly endMinute: number
  ) {}

  static create(startMinute: number, endMinute: number): TimeBlock {
    assert(Number.isInteger(startMinute) && Number.isInteger(endMinute), 'TIMEBLOCK_NOT_INT', 'TimeBlock bounds must be integers.');
    assert(startMinute >= 0 && startMinute <= 1440, 'TIMEBLOCK_START_RANGE', 'TimeBlock.startMinute must be within 0..1440.');
    assert(endMinute >= 0 && endMinute <= 1440, 'TIMEBLOCK_END_RANGE', 'TimeBlock.endMinute must be within 0..1440.');
    assert(endMinute >= startMinute, 'TIMEBLOCK_INVERTED', 'TimeBlock.endMinute must be >= startMinute.');
    return new TimeBlock(startMinute, endMinute);
  }

  get durationMinutes(): number {
    return this.endMinute - this.startMinute;
  }

  overlaps(other: TimeBlock): boolean {
    return this.startMinute < other.endMinute && other.startMinute < this.endMinute;
  }
}
