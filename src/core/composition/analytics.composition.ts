import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  IAnalyticsReadRepository,
  AnalyticalMetricsQuery,
  AnalyticalTimeSeriesQuery,
  AnalyticalPeriodSummaryQuery,
  AnalyticalProjectionQuery,
  AnalyticalFactsQuery,
} from '@/features/analytics';

import {
  AnalyticalMetricsQuery as UC01,
  AnalyticalTimeSeriesQuery as UC02,
  AnalyticalPeriodSummaryQuery as UC03,
  AnalyticalProjectionQuery as UC04,
  AnalyticalFactsQuery as UC05,
  SupabaseAnalyticsReadRepository,
} from '@/features/analytics';

export interface AnalyticsComposition {
  analyticsRepository: IAnalyticsReadRepository;

  uc01: AnalyticalMetricsQuery;
  uc02: AnalyticalTimeSeriesQuery;
  uc03: AnalyticalPeriodSummaryQuery;
  uc04: AnalyticalProjectionQuery;
  uc05: AnalyticalFactsQuery;
}

export function createAnalyticsComposition(supabase: SupabaseClient): AnalyticsComposition {
  const analyticsRepository = new SupabaseAnalyticsReadRepository(supabase);

  const uc01 = new UC01(analyticsRepository);
  const uc02 = new UC02(analyticsRepository);
  const uc03 = new UC03(analyticsRepository);
  const uc04 = new UC04();
  const uc05 = new UC05(analyticsRepository);

  return {
    analyticsRepository,
    uc01,
    uc02,
    uc03,
    uc04,
    uc05,
  };
}
