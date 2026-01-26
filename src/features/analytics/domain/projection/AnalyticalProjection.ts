import { ProjectionType } from './ProjectionType';
import { AnalyticalPeriod } from '../time/AnalyticalPeriod';
import { MetricType } from '../metrics/MetricType';

export class AnalyticalProjection {
  readonly type: ProjectionType;
  readonly basedOnPeriod: AnalyticalPeriod;
  readonly metric: MetricType;

  constructor(
    type: ProjectionType,
    basedOnPeriod: AnalyticalPeriod,
    metric: MetricType
  ) {
    this.type = type;
    this.basedOnPeriod = basedOnPeriod;
    this.metric = metric;
  }
}
