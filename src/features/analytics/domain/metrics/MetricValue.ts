import { MetricUnit } from './MetricUnit';

export class MetricValue {
  readonly value: number;
  readonly unit: MetricUnit;

  constructor(value: number, unit: MetricUnit) {
    this.value = value;
    this.unit = unit;
  }
}
