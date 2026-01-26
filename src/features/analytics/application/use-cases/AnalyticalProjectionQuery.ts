import { AnalyticalDate, AnalyticalPeriod, AnalyticalProjection, MetricType, ProjectionType } from '../../domain';
import { AnalyticsError, analyticsError } from '../errors/AnalyticsError';
import { Result, fail, ok } from '../_shared/Result';
import { validateMetricType, validatePeriod, validateSource, validateUserId, validateDimensionKey } from '../_shared/validation';

export type AnalyticalProjectionQueryInput = {
  readonly userId: string;
  readonly type: unknown; // ProjectionType (enum fechado)
  readonly basedOnPeriod: { start: string; end: string };
  readonly metric: unknown; // MetricType (enum fechado)
  readonly dimension?: unknown; // DimensionKey (quando presente)
  readonly source?: unknown; // FactSource (quando presente)
};

export type AnalyticalProjectionQueryOutput = {
  readonly projection: AnalyticalProjection;
};

const isProjectionType = (value: unknown): value is ProjectionType => {
  if (typeof value !== 'string') return false;
  return Object.values(ProjectionType).includes(value as ProjectionType);
};

export class AnalyticalProjectionQuery {
  async execute(
    input: AnalyticalProjectionQueryInput
  ): Promise<Result<AnalyticalProjectionQueryOutput, AnalyticsError>> {
    const userErr = validateUserId(input.userId);
    if (userErr) return fail(userErr);

    if (!isProjectionType(input.type)) {
      return fail(analyticsError('CombinacaoNaoSuportada', 'Tipo de projeção inválido/não suportado no V1.'));
    }

    const periodErr = validatePeriod(input.basedOnPeriod.start, input.basedOnPeriod.end);
    if (periodErr) return fail(periodErr);

    const metricErr = validateMetricType(input.metric);
    if (metricErr) return fail(metricErr);

    const sourceErr = validateSource(input.source);
    if (sourceErr) return fail(sourceErr);

    if (input.dimension !== undefined) {
      const dimErr = validateDimensionKey(input.dimension as any);
      if (dimErr) return fail(dimErr);
    }

    // Contrato conceitual fornecido: projeção é apenas descritiva (envelope), sem prever futuro e sem “valor” numérico no domínio.
    const basedOn = new AnalyticalPeriod(
      new AnalyticalDate(input.basedOnPeriod.start),
      new AnalyticalDate(input.basedOnPeriod.end)
    );

    const projection = new AnalyticalProjection(input.type, basedOn, input.metric as MetricType);

    return ok({ projection });
  }
}
