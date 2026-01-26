import type { SupabaseClient } from '@supabase/supabase-js';

import { AnalyticalDimension, FactSource, MetricType, MetricUnit } from '../domain';

import type {
  DimensionKeyDTO,
  FactRowDTO,
  GetFactsParams,
  GetMetricsParams,
  GetTimeSeriesParams,
  IAnalyticsReadRepository,
  MetricRowDTO,
  RepoResult,
} from '../application/ports/IAnalyticsReadRepository';



type DbUser = { id: string };

const tenantGuard = async (supabase: SupabaseClient, expectedUserId: string): Promise<RepoResult<DbUser>> => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user?.id) {
    return { ok: false, error: { code: 'AcessoForaDoTenant', message: 'Sessão ausente ou inválida.' } };
  }

  if (data.user.id !== expectedUserId) {
    return {
      ok: false,
      error: { code: 'AcessoForaDoTenant', message: 'Acesso fora do tenant (userId não corresponde à sessão).' },
    };
  }

  return { ok: true, data: { id: data.user.id } };
};

const isSupportedMetricsQuery = (dimensions: DimensionKeyDTO[], metrics: MetricType[]): boolean => {
  // Views aprovadas (ETAPA 3):
  // - executed_days => somente dimensão TIME
  // - métricas disponíveis: EXECUTION_COUNT e TIME_SPENT (minutos)
  if (dimensions.length === 0 || metrics.length === 0) return true;

  const onlyTime = dimensions.every((d) => d.type === AnalyticalDimension.TIME);
  if (!onlyTime) return false;

  const allowed = new Set<MetricType>([MetricType.EXECUTION_COUNT, MetricType.TIME_SPENT]);
  return metrics.every((m) => allowed.has(m));
};

const mapDailyExecutionMetricRows = (
  rows: Array<{ iso_date: string; execution_count: number; time_spent_minutes: number }>,
  metrics: MetricType[]
): MetricRowDTO[] => {
  const out: MetricRowDTO[] = [];

  for (const r of rows) {
    if (metrics.includes(MetricType.EXECUTION_COUNT)) {
      out.push({
        date: r.iso_date,
        metric: MetricType.EXECUTION_COUNT,
        unit: MetricUnit.COUNT,
        value: r.execution_count,
        dimension: { type: AnalyticalDimension.TIME },
        source: FactSource.DAILY_EXECUTION,
      });
    }

    if (metrics.includes(MetricType.TIME_SPENT)) {
      out.push({
        date: r.iso_date,
        metric: MetricType.TIME_SPENT,
        unit: MetricUnit.MINUTES,
        value: r.time_spent_minutes,
        dimension: { type: AnalyticalDimension.TIME },
        source: FactSource.DAILY_EXECUTION,
      });
    }
  }

  return out;
};

export class SupabaseAnalyticsReadRepository implements IAnalyticsReadRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getMetrics(params: GetMetricsParams): Promise<RepoResult<MetricRowDTO[]>> {
    const guard = await tenantGuard(this.supabase, params.userId);
    if (!guard.ok) return guard as RepoResult<MetricRowDTO[]>;

    if (params.source && params.source !== FactSource.DAILY_EXECUTION) {
      return {
        ok: false,
        error: {
          code: 'DadosIndisponiveis',
          message: 'Fonte solicitada indisponível nas views aprovadas.',
          details: { source: params.source },
        },
      };
    }

    if (!isSupportedMetricsQuery(params.dimensions, params.metrics)) {
      return {
        ok: false,
        error: { code: 'CombinacaoNaoSuportada', message: 'Dimensão/métrica não suportada no V1 pelas views aprovadas.' },
      };
    }

    if (params.dimensions.length === 0 || params.metrics.length === 0) {
      return { ok: true, data: [] };
    }

    const { data, error } = await this.supabase
      .from('analytics_vw_daily_execution_metrics')
      .select('iso_date, execution_count, time_spent_minutes')
      .gte('iso_date', params.period.start)
      .lte('iso_date', params.period.end)
      .order('iso_date', { ascending: true });

    if (error) {
      return {
        ok: false,
        error: { code: 'DadosIndisponiveis', message: 'Falha ao consultar métricas diárias.', details: { hint: error.message } },
      };
    }

    if (!data || data.length === 0) {
      return { ok: false, error: { code: 'DadosIndisponiveis', message: 'Sem base factual consolidada no período informado.' } };
    }

    const rows = data as Array<{ iso_date: string; execution_count: number; time_spent_minutes: number }>;
    const mapped = mapDailyExecutionMetricRows(rows, params.metrics);

    return { ok: true, data: mapped };
  }

  async getTimeSeries(params: GetTimeSeriesParams): Promise<RepoResult<MetricRowDTO[]>> {
    const guard = await tenantGuard(this.supabase, params.userId);
    if (!guard.ok) return guard as RepoResult<MetricRowDTO[]>;

    if (params.source && params.source !== FactSource.DAILY_EXECUTION) {
      return {
        ok: false,
        error: {
          code: 'DadosIndisponiveis',
          message: 'Fonte solicitada indisponível nas views aprovadas.',
          details: { source: params.source },
        },
      };
    }

    // Views aprovadas: execução diária NÃO tem granularidade factual por subject/activity.
    if (params.subjectId || params.activity) {
      return {
        ok: false,
        error: { code: 'CombinacaoNaoSuportada', message: 'Série temporal com recorte subject/activity não suportada no V1.' },
      };
    }

    if (![MetricType.EXECUTION_COUNT, MetricType.TIME_SPENT].includes(params.metric)) {
      return {
        ok: false,
        error: { code: 'CombinacaoNaoSuportada', message: 'Métrica não suportada para série temporal no V1.' },
      };
    }

    const { data, error } = await this.supabase
      .from('analytics_vw_daily_execution_metrics')
      .select('iso_date, execution_count, time_spent_minutes')
      .gte('iso_date', params.period.start)
      .lte('iso_date', params.period.end)
      .order('iso_date', { ascending: true });

    if (error) {
      return {
        ok: false,
        error: { code: 'DadosIndisponiveis', message: 'Falha ao consultar série temporal diária.', details: { hint: error.message } },
      };
    }

    if (!data || data.length === 0) {
      return { ok: false, error: { code: 'DadosIndisponiveis', message: 'Sem base factual consolidada no período informado.' } };
    }

    const rows = data as Array<{ iso_date: string; execution_count: number; time_spent_minutes: number }>;

    const series: MetricRowDTO[] =
      params.metric === MetricType.EXECUTION_COUNT
        ? rows.map((r) => ({
            date: r.iso_date,
            metric: MetricType.EXECUTION_COUNT,
            unit: MetricUnit.COUNT,
            value: r.execution_count,
            dimension: { type: AnalyticalDimension.TIME },
            source: FactSource.DAILY_EXECUTION,
          }))
        : rows.map((r) => ({
            date: r.iso_date,
            metric: MetricType.TIME_SPENT,
            unit: MetricUnit.MINUTES,
            value: r.time_spent_minutes,
            dimension: { type: AnalyticalDimension.TIME },
            source: FactSource.DAILY_EXECUTION,
          }));

    return { ok: true, data: series };
  }

  async getFacts(params: GetFactsParams): Promise<RepoResult<FactRowDTO[]>> {
    const guard = await tenantGuard(this.supabase, params.userId);
    if (!guard.ok) return guard as RepoResult<FactRowDTO[]>;

    if (params.source && params.source !== FactSource.DAILY_EXECUTION) {
      return {
        ok: false,
        error: {
          code: 'DadosIndisponiveis',
          message: 'Fonte solicitada indisponível nas views aprovadas.',
          details: { source: params.source },
        },
      };
    }

    const { data, error } = await this.supabase
      .from('analytics_vw_analytical_facts_daily_execution')
      .select('iso_date, source')
      .gte('iso_date', params.period.start)
      .lte('iso_date', params.period.end)
      .order('iso_date', { ascending: true });

    if (error) {
      return { ok: false, error: { code: 'DadosIndisponiveis', message: 'Falha ao consultar fatos analíticos.', details: { hint: error.message } } };
    }

    if (!data || data.length === 0) {
      return { ok: false, error: { code: 'DadosIndisponiveis', message: 'Sem base factual consolidada no período informado.' } };
    }

    const facts = (data as Array<{ iso_date: string; source: string }>).map((r) => ({
      date: r.iso_date,
      source: r.source as FactSource,
    }));

    return { ok: true, data: facts };
  }
}
