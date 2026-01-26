import { AnalyticalDimension } from './AnalyticalDimension';
import { ActivityType } from './ActivityType';

export type DimensionKey =
  | { type: AnalyticalDimension.TIME }
  | { type: AnalyticalDimension.SUBJECT; subjectId: string }
  | { type: AnalyticalDimension.ACTIVITY_TYPE; activity: ActivityType };
