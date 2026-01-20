import { assert } from '../_internal/assert';

export class CalendarDate {
  private constructor(
    public readonly year: number,
    public readonly month: number,
    public readonly day: number
  ) {}

  static parse(iso: string): CalendarDate {
    // ISO esperado: YYYY-MM-DD
    assert(typeof iso === 'string', 'DATE_INVALID', 'CalendarDate.parse expects a string.');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(iso), 'DATE_FORMAT', 'CalendarDate must be in YYYY-MM-DD format.');

    const year = Number(iso.slice(0, 4));
    const month = Number(iso.slice(5, 7));
    const day = Number(iso.slice(8, 10));

    return CalendarDate.create(year, month, day);
  }

  static create(year: number, month: number, day: number): CalendarDate {
    assert(Number.isInteger(year) && year >= 1 && year <= 9999, 'DATE_YEAR', 'Year must be 1..9999.');
    assert(Number.isInteger(month) && month >= 1 && month <= 12, 'DATE_MONTH', 'Month must be 1..12.');
    const maxDay = CalendarDate.daysInMonth(year, month);
    assert(Number.isInteger(day) && day >= 1 && day <= maxDay, 'DATE_DAY', `Day must be 1..${maxDay} for ${year}-${month}.`);
    return new CalendarDate(year, month, day);
  }

  toISO(): string {
    const y = String(this.year).padStart(4, '0');
    const m = String(this.month).padStart(2, '0');
    const d = String(this.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  equals(other: CalendarDate): boolean {
    return this.year === other.year && this.month === other.month && this.day === other.day;
  }

  compareTo(other: CalendarDate): number {
    const a = this.toOrdinal();
    const b = other.toOrdinal();
    return a === b ? 0 : a < b ? -1 : 1;
  }

  isBefore(other: CalendarDate): boolean {
    return this.compareTo(other) < 0;
  }

  isAfter(other: CalendarDate): boolean {
    return this.compareTo(other) > 0;
  }

  addDays(days: number): CalendarDate {
    assert(Number.isInteger(days), 'DATE_ADD_NOT_INT', 'addDays expects integer days.');
    const ord = this.toOrdinal() + days;
    assert(ord >= 1, 'DATE_ORDINAL_RANGE', 'Resulting date is out of supported range.');
    return CalendarDate.fromOrdinal(ord);
  }

  // ----- Pure Gregorian arithmetic (no Date) -----

  private static isLeapYear(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  }

  private static daysInMonth(y: number, m: number): number {
    const common = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (m === 2 && CalendarDate.isLeapYear(y)) return 29;
    return common[m - 1];
  }

  // Rata Die (ordinal): days since 0001-01-01 => 1
  private toOrdinal(): number {
    const y = this.year;
    const m = this.month;
    const d = this.day;

    const y1 = y - 1;
    const daysBeforeYear = 365 * y1 + Math.floor(y1 / 4) - Math.floor(y1 / 100) + Math.floor(y1 / 400);

    const monthDays = CalendarDate.monthStartOffset(y, m);
    return daysBeforeYear + monthDays + d;
  }

  private static fromOrdinal(ord: number): CalendarDate {
    // Convert ordinal back to Y-M-D (Gregorian), algorithm via decomposition.
    // Works for ord >= 1.
    let n = ord;

    // Approximate year using 400-year cycles
    const daysPer400 = 146097; // 365*400 + 97 leap days
    let y = 1;

    const cycles400 = Math.floor((n - 1) / daysPer400);
    y += cycles400 * 400;
    n -= cycles400 * daysPer400;

    // 100-year cycles (but the 4th is special)
    const daysPer100 = 36524; // 365*100 + 24 (leaps) minus 1 for non-leap centuries already handled by 400-cycle
    let cycles100 = Math.floor((n - 1) / daysPer100);
    if (cycles100 === 4) cycles100 = 3;
    y += cycles100 * 100;
    n -= cycles100 * daysPer100;

    // 4-year cycles
    const daysPer4 = 1461; // 365*4 + 1
    const cycles4 = Math.floor((n - 1) / daysPer4);
    y += cycles4 * 4;
    n -= cycles4 * daysPer4;

    // 1-year cycles
    const daysPer1 = 365;
    let cycles1 = Math.floor((n - 1) / daysPer1);
    if (cycles1 === 4) cycles1 = 3;
    y += cycles1;
    n -= cycles1 * daysPer1;

    // Now n is day-of-year (1..365/366)
    const dayOfYear = n;

    // Find month/day
    let m = 1;
    while (m <= 12) {
      const start = CalendarDate.monthStartOffset(y, m);
      const nextStart = m === 12 ? (CalendarDate.isLeapYear(y) ? 366 : 365) : CalendarDate.monthStartOffset(y, m + 1);
      if (dayOfYear > start && dayOfYear <= nextStart) break;
      m++;
    }

    const startOfMonth = CalendarDate.monthStartOffset(y, m);
    const d = dayOfYear - startOfMonth;

    return CalendarDate.create(y, m, d);
  }

  private static monthStartOffset(y: number, m: number): number {
    // Days before month m (1-based), in year y. Returns 0 for January.
    const leap = CalendarDate.isLeapYear(y);
    const offsetsCommon = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    const offsetsLeap =   [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
    return (leap ? offsetsLeap : offsetsCommon)[m - 1];
  }
}
