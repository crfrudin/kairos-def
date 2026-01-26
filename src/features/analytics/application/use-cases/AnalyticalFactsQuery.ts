import { AnalyticalFact } from '../../domain';
import { AnalyticsError, analyticsError } from '../errors/AnalyticsError';
import { IAnalyticsReadRepository } from '../ports/IAnalyticsReadRepository';
import { Result, fail, ok } from '../_shared/Result';
import { validatePeriod, validateSource, validateUserId } from '../_shared/validation';
import { mapFact } from '../mappers/analyticsMappers';

export type AnalyticalFactsQueryInput = {
  readonly userId: string;
  readonly period: { start: string; end: string };
  readonly source?: unknown; // validado para FactSource
};

export type AnalyticalFactsQueryOutput = {
  readonly facts: AnalyticalFact[];
};

export class AnalyticalFactsQuery {
  constructor(private readonly repo: IAnalyticsReadRepository) {}

  async execute(
    input: AnalyticalFactsQueryInput
  ): Promise<Result<AnalyticalFactsQueryOutput, AnalyticsError>> {
    const userErr = validateUserId(input.userId);
    if (userErr) return fail(userErr);

    const periodErr = validatePeriod(input.period.start, input.period.end);
    if (periodErr) return fail(periodErr);

    const sourceErr = validateSource(input.source);
    if (sourceErr) return fail(sourceErr);

    const repoRes = await this.repo.getFacts({
      userId: input.userId,
      period: { start: input.period.start, end: input.period.end },
      source: input.source as any,
    });

    if (!repoRes.ok) {
      return fail(analyticsError(repoRes.error.code, repoRes.error.message, repoRes.error.details));
    }

    const facts = repoRes.data.map(mapFact);
    return ok({ facts });
  }
}
