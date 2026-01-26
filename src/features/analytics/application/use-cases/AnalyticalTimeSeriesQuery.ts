import { ActivityType, AnalyticalDimension, AnalyticalMetric, DimensionKey } from '../../domain';
import { AnalyticsError, analyticsError } from '../errors/AnalyticsError';
import { IAnalyticsReadRepository } from '../ports/IAnalyticsReadRepository';
import { Result, fail, ok } from '../_shared/Result';
import {
  validateActivity,
  validateMetricType,
  validatePeriod,
  validateSource,
  validateSubjectId,
  validateUserId,
} from '../_shared/validation';
import { mapMetric, mapPeriod } from '../mappers/analyticsMappers';

export type AnalyticalTimeSeriesQueryInput = {
  readonly userId: string;
  readonly period: { start: string; end: string };
  readonly metric: unknown;     // validado para MetricType (enum)
  readonly subjectId?: unknown; // validado
  readonly activity?: unknown;  // validado para ActivityType (enum)
  readonly source?: unknown;    // validado para FactSource (enum)
};

export type AnalyticalTimeSeriesQueryOutput = {
  readonly series: AnalyticalMetric[];
};

export class AnalyticalTimeSeriesQuery {
  constructor(private readonly repo: IAnalyticsReadRepository) {}

  async execute(
    input: AnalyticalTimeSeriesQueryInput
  ): Promise<Result<AnalyticalTimeSeriesQueryOutput, AnalyticsError>> {
    const userErr = validateUserId(input.userId);
    if (userErr) return fail(userErr);

    const periodErr = validatePeriod(input.period.start, input.period.end);
    if (periodErr) return fail(periodErr);

    const metricErr = validateMetricType(input.metric);
    if (metricErr) return fail(metricErr);

    const subjectErr = validateSubjectId(input.subjectId);
    if (subjectErr) return fail(subjectErr);

    const activityErr = validateActivity(input.activity);
    if (activityErr) return fail(activityErr);

    const sourceErr = validateSource(input.source);
    if (sourceErr) return fail(sourceErr);

    // Combinação V1: não suportamos subjectId e activity simultâneos (explícito e determinístico).
    if (input.subjectId !== undefined && input.activity !== undefined) {
      return fail(
        analyticsError('CombinacaoNaoSuportada', 'Combinação subjectId + activity não suportada no V1.')
      );
    }

    const repoRes = await this.repo.getTimeSeries({
      userId: input.userId,
      period: { start: input.period.start, end: input.period.end },
      metric: input.metric as any,
      subjectId: input.subjectId as any,
      activity: input.activity as ActivityType | undefined,
      source: input.source as any,
    });

    if (!repoRes.ok) {
      return fail(analyticsError(repoRes.error.code, repoRes.error.message, repoRes.error.details));
    }

    const period = mapPeriod(input.period.start, input.period.end);

    // Garantia conceitual: dimensão primária TIME (cada item tem dimension coerente com TIME).
    const series = repoRes.data.map((row) => {
      const forcedRow = {
        ...row,
        dimension: { type: AnalyticalDimension.TIME } as DimensionKey,
      } as any;

      return mapMetric(forcedRow, period);
    });

    return ok({ series });
  }
}
