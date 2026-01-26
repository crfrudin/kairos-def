import { DimensionKey, AnalyticalMetric } from '../../domain';
import { AnalyticsError, analyticsError } from '../errors/AnalyticsError';
import { IAnalyticsReadRepository } from '../ports/IAnalyticsReadRepository';
import { Result, fail, ok } from '../_shared/Result';
import { validateDimensions, validateMetrics, validatePeriod, validateSource, validateUserId } from '../_shared/validation';
import { mapMetric, mapPeriod } from '../mappers/analyticsMappers';

export type AnalyticalMetricsQueryInput = {
  readonly userId: string;
  readonly period: { start: string; end: string };
  readonly dimensions: DimensionKey[];
  readonly metrics: unknown[]; // validado para MetricType (enum)
  readonly source?: unknown;   // validado para FactSource (enum)
};

export type AnalyticalMetricsQueryOutput = {
  readonly items: AnalyticalMetric[];
};

export class AnalyticalMetricsQuery {
  constructor(private readonly repo: IAnalyticsReadRepository) {}

  async execute(
    input: AnalyticalMetricsQueryInput
  ): Promise<Result<AnalyticalMetricsQueryOutput, AnalyticsError>> {
    const userErr = validateUserId(input.userId);
    if (userErr) return fail(userErr);

    const periodErr = validatePeriod(input.period.start, input.period.end);
    if (periodErr) return fail(periodErr);

    const dimErr = validateDimensions(input.dimensions);
    if (dimErr) return fail(dimErr);

    const metErr = validateMetrics(input.metrics);
    if (metErr) return fail(metErr);

    const sourceErr = validateSource(input.source);
    if (sourceErr) return fail(sourceErr);

    // Determinismo: se não há nada solicitado, retorna vazio sem IO.
    if (input.dimensions.length === 0 || input.metrics.length === 0) {
      return ok({ items: [] });
    }

    const repoRes = await this.repo.getMetrics({
      userId: input.userId,
      period: { start: input.period.start, end: input.period.end },
      dimensions: input.dimensions as unknown as any,
      metrics: input.metrics as any,
      source: input.source as any,
    });

    if (!repoRes.ok) {
      return fail(analyticsError(repoRes.error.code, repoRes.error.message, repoRes.error.details));
    }

    const period = mapPeriod(input.period.start, input.period.end);
    const items = repoRes.data.map((row) => mapMetric(row, period));

    return ok({ items });
  }
}
