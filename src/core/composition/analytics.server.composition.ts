import 'server-only';

import type { AnalyticsComposition } from '@/core/composition/analytics.composition';
import { createAnalyticsComposition } from '@/core/composition/analytics.composition';
import { createSupabaseServerClient } from '@/core/clients/createSupabaseServerClient';

/**
 * Composition SSR (server-only) da feature Analytics.
 *
 * - Cria Supabase SSR client (cookies do Next)
 * - Injeta no createAnalyticsComposition
 *
 * Sem IO adicional fora das queries executadas pelos UCs.
 */
export async function createAnalyticsServerComposition(): Promise<AnalyticsComposition> {
  const supabase = await createSupabaseServerClient();
  return createAnalyticsComposition(supabase);
}
