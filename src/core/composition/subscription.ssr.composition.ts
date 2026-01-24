import "server-only";

import type { ISubscriptionRepository } from "@/features/subscription/application/ports/ISubscriptionRepository";
import { GetSubscriptionStatus } from "@/features/subscription/application/use-cases/GetSubscriptionStatus";

import { SupabaseSubscriptionRepositorySSR } from "@/features/subscription/infra/ssr/SupabaseSubscriptionRepositorySSR";

export type SubscriptionSsrComposition = {
  subscriptionRepository: ISubscriptionRepository;
  getSubscriptionStatusUseCase: GetSubscriptionStatus;
};

export function createSubscriptionSsrComposition(): SubscriptionSsrComposition {
  const subscriptionRepository = new SupabaseSubscriptionRepositorySSR();
  const getSubscriptionStatusUseCase = new GetSubscriptionStatus(subscriptionRepository);

  return {
    subscriptionRepository,
    getSubscriptionStatusUseCase,
  };
}
