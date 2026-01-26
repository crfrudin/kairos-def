import { AnalyticalDate } from './AnalyticalDate';

export class AnalyticalPeriod {
  readonly start: AnalyticalDate;
  readonly end: AnalyticalDate;

  constructor(start: AnalyticalDate, end: AnalyticalDate) {
    this.start = start;
    this.end = end;
  }
}
