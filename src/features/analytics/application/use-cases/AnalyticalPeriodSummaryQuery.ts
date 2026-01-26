import { AnalyticalMetric, DimensionKey } from '../../domain';
import { AnalyticsError, analyticsError } from '../errors/AnalyticsError';
import { IAnalyticsReadRepository } from '../ports/IAnalyticsReadRepository';
import { Result, fail, ok } from '../_shared/Result';
import { validateDimensions, validateMetrics, validatePeriod, validateSource, validateUserId } from '../_shared/validation';
import { mapMetric, mapPeriod } from '../mappers/analyticsMappers';

export type RequestedMetric = { readonly metric: unknown; readonly dimension: DimensionKey };

export type AnalyticalPeriodSummaryQueryInput = {
  readonly userId: string;
  readonly period: { start: string; end: string };
  readonly requested: RequestedMetric[];
  readonly source?: unknown;
};

export type AnalyticalPeriodSummaryQueryOutput = {
  readonly items: AnalyticalMetric[];
};

export class AnalyticalPeriodSummaryQuery {
  constructor(private readonly repo: IAnalyticsReadRepository) {}

  async execute(
    input: AnalyticalPeriodSummaryQueryInput
  ): Promise<Result<AnalyticalPeriodSummaryQueryOutput, AnalyticsError>> {
    const userErr = validateUserId(input.userId);
    if (userErr) return fail(userErr);

    const periodErr = validatePeriod(input.period.start, input.period.end);
    if (periodErr) return fail(periodErr);

    const sourceErr = validateSource(input.source);
    if (sourceErr) return fail(sourceErr);

    const dimensions = input.requested.map((r) => r.dimension);
    const metrics = input.requested.map((r) => r.metric);

    const dimErr = validateDimensions(dimensions);
    if (dimErr) return fail(dimErr);

    const metErr = validateMetrics(metrics);
    if (metErr) return fail(metErr);

    // Determinismo: requested vazio => vazio (sem IO).
    if (input.requested.length === 0) {
      return ok({ items: [] });
    }

    const repoRes = await this.repo.getMetrics({
      userId: input.userId,
      period: { start: input.period.start, end: input.period.end },
      dimensions: dimensions as unknown as any,
      metrics: metrics as any,
      source: input.source as any,
    });

    if (!repoRes.ok) {
      return fail(analyticsError(repoRes.error.code, repoRes.error.message, repoRes.error.details));
    }

    const period = mapPeriod(input.period.start, input.period.end);

    // Regra do contrato: não “substitui ausência por zero”.
    // Se o repositório não conseguir responder ao pacote, ele deve sinalizar DadosIndisponiveis.
    // Aqui, apenas mapeamos o que veio, sem fabricar valores.
    const items = repoRes.data.map((row) => mapMetric(row, period));

    return ok({ items });
  }
}
