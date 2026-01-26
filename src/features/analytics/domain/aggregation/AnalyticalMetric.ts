import { MetricType } from '../metrics/MetricType';
import { MetricValue } from '../metrics/MetricValue';
import { AnalyticalPeriod } from '../time/AnalyticalPeriod';
import { DimensionKey } from '../dimensions/DimensionKey';

export class AnalyticalMetric {
  readonly metric: MetricType;
  readonly value: MetricValue;
  readonly period: AnalyticalPeriod;
  readonly dimension: DimensionKey;

  constructor(
    metric: MetricType,
    value: MetricValue,
    period: AnalyticalPeriod,
    dimension: DimensionKey
  ) {
    this.metric = metric;
    this.value = value;
    this.period = period;
    this.dimension = dimension;
  }
}
