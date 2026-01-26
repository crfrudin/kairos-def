import { ActivityType, AnalyticalDimension, FactSource, MetricType, MetricUnit } from '../../domain';

export type DimensionKeyDTO =
  | { type: AnalyticalDimension.TIME }
  | { type: AnalyticalDimension.SUBJECT; subjectId: string }
  | { type: AnalyticalDimension.ACTIVITY_TYPE; activity: ActivityType };

export type MetricRowDTO = {
  readonly date: string; // ISO YYYY-MM-DD
  readonly metric: MetricType;
  readonly unit: MetricUnit;
  readonly value: number;

  readonly dimension: DimensionKeyDTO;

  readonly source?: FactSource;
};

export type FactRowDTO = {
  readonly date: string; // ISO YYYY-MM-DD
  readonly source: FactSource;
};

export type GetMetricsParams = {
  readonly userId: string;
  readonly period: { start: string; end: string };
  readonly dimensions: DimensionKeyDTO[];
  readonly metrics: MetricType[];
  readonly source?: FactSource;
};

export type GetTimeSeriesParams = {
  readonly userId: string;
  readonly period: { start: string; end: string };
  readonly metric: MetricType;
  readonly subjectId?: string;
  readonly activity?: ActivityType;
  readonly source?: FactSource;
};

export type GetFactsParams = {
  readonly userId: string;
  readonly period: { start: string; end: string };
  readonly source?: FactSource;
};

export type RepoErrorCode = 'AcessoForaDoTenant' | 'DadosIndisponiveis' | 'CombinacaoNaoSuportada';

export type RepoError = {
  readonly code: RepoErrorCode;
  readonly message: string;
  readonly details?: Record<string, string | number | boolean | null>;
};

export type RepoResult<T> = { ok: true; data: T } | { ok: false; error: RepoError };

export interface IAnalyticsReadRepository {
  getMetrics(params: GetMetricsParams): Promise<RepoResult<MetricRowDTO[]>>;
  getTimeSeries(params: GetTimeSeriesParams): Promise<RepoResult<MetricRowDTO[]>>;
  getFacts(params: GetFactsParams): Promise<RepoResult<FactRowDTO[]>>;
}
