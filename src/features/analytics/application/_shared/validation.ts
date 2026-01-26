import { ActivityType, AnalyticalDimension, DimensionKey, FactSource, MetricType } from '../../domain';
import { analyticsError, AnalyticsError } from '../errors/AnalyticsError';
import { isEnumValue } from './enumGuards';
import { isIsoDateString } from './dateValidation';

export const validateUserId = (userId: string): AnalyticsError | null => {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return analyticsError('AcessoForaDoTenant', 'Identidade do tenant ausente.');
  }
  return null;
};

export const validatePeriod = (startIso: string, endIso: string): AnalyticsError | null => {
  if (!isIsoDateString(startIso) || !isIsoDateString(endIso)) {
    return analyticsError('PeriodoInvalido', 'Período inválido (esperado YYYY-MM-DD).', {
      start: startIso,
      end: endIso,
    });
  }
  return null;
};

export const validateMetricType = (metric: unknown): AnalyticsError | null => {
  if (!isEnumValue(MetricType, metric)) {
    return analyticsError('MetricaInvalida', 'Métrica inválida (enum fechado).');
  }
  return null;
};

export const validateMetrics = (metrics: unknown[]): AnalyticsError | null => {
  for (const m of metrics) {
    const err = validateMetricType(m);
    if (err) return err;
  }
  return null;
};

export const validateSource = (source: unknown): AnalyticsError | null => {
  if (source === undefined) return null;
  if (!isEnumValue(FactSource, source)) {
    return analyticsError('FonteInvalida', 'Fonte inválida (enum fechado).');
  }
  return null;
};

export const validateActivity = (activity: unknown): AnalyticsError | null => {
  if (activity === undefined) return null;
  if (!isEnumValue(ActivityType, activity)) {
    return analyticsError('AtividadeInvalida', 'Atividade inválida (enum fechado).');
  }
  return null;
};

export const validateSubjectId = (subjectId: unknown): AnalyticsError | null => {
  if (subjectId === undefined) return null;
  if (typeof subjectId !== 'string' || subjectId.trim().length === 0) {
    return analyticsError('SubjectIdInvalido', 'subjectId inválido.');
  }
  return null;
};

export const validateDimensionKey = (dimension: DimensionKey): AnalyticsError | null => {
  if (!dimension || typeof dimension !== 'object') {
    return analyticsError('DimensaoInvalida', 'Dimensão inválida.');
  }

  if (!isEnumValue(AnalyticalDimension, (dimension as { type?: unknown }).type)) {
    return analyticsError('DimensaoInvalida', 'Dimensão inválida (enum fechado).');
  }

  if (dimension.type === AnalyticalDimension.TIME) return null;

  if (dimension.type === AnalyticalDimension.SUBJECT) {
    return validateSubjectId((dimension as { subjectId?: unknown }).subjectId);
  }

  // ACTIVITY_TYPE
  return validateActivity((dimension as { activity?: unknown }).activity);
};

export const validateDimensions = (dimensions: DimensionKey[]): AnalyticsError | null => {
  for (const d of dimensions) {
    const err = validateDimensionKey(d);
    if (err) return err;
  }
  return null;
};
