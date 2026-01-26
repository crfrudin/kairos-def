import { AnalyticalDate } from '../time/AnalyticalDate';
import { FactSource } from './FactSource';

export interface AnalyticalFact {
  readonly date: AnalyticalDate;
  readonly source: FactSource;
}
