import {
  ActivityType,
  AnalyticalDate,
  AnalyticalMetric,
  AnalyticalPeriod,
  AnalyticalDimension,
  DimensionKey,
  FactSource,
  MetricType,
  MetricUnit,
  MetricValue,
  AnalyticalFact,
} from '../../domain';

import { DimensionKeyDTO, FactRowDTO, MetricRowDTO } from '../ports/IAnalyticsReadRepository';

export const mapPeriod = (startIso: string, endIso: string): AnalyticalPeriod =>
  new AnalyticalPeriod(new AnalyticalDate(startIso), new AnalyticalDate(endIso));

export const mapDimension = (dto: DimensionKeyDTO): DimensionKey => {
  if (dto.type === AnalyticalDimension.TIME) return { type: AnalyticalDimension.TIME };

  if (dto.type === AnalyticalDimension.SUBJECT) {
    return { type: AnalyticalDimension.SUBJECT, subjectId: dto.subjectId };
  }

  // ACTIVITY_TYPE
  return { type: AnalyticalDimension.ACTIVITY_TYPE, activity: dto.activity as ActivityType };
};

export const mapMetric = (row: MetricRowDTO, period: AnalyticalPeriod): AnalyticalMetric => {
  const value = new MetricValue(row.value, row.unit as MetricUnit);
  const dimension = mapDimension(row.dimension);
  return new AnalyticalMetric(row.metric as MetricType, value, period, dimension);
};

export const mapFact = (row: FactRowDTO): AnalyticalFact => {
  return {
    date: new AnalyticalDate(row.date),
    source: row.source as FactSource,
  };
};
