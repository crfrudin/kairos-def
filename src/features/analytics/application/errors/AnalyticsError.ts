export type AnalyticsErrorCode =
  | 'AcessoForaDoTenant'
  | 'PeriodoInvalido'
  | 'DimensaoInvalida'
  | 'MetricaInvalida'
  | 'AtividadeInvalida'
  | 'SubjectIdInvalido'
  | 'FonteInvalida'
  | 'DadosIndisponiveis'
  | 'CombinacaoNaoSuportada';

export type AnalyticsError = {
  readonly code: AnalyticsErrorCode;
  readonly message: string;
  readonly details?: Record<string, string | number | boolean | null>;
};

export const analyticsError = (
  code: AnalyticsErrorCode,
  message: string,
  details?: Record<string, string | number | boolean | null>
): AnalyticsError => ({ code, message, details });
