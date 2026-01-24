import type { SubscriptionDomainEvent } from '../../domain';
import type { SubscriptionStatusDTO } from '../dtos/SubscriptionStatusDTO';

export type SubscriptionSuccess = {
  readonly subscription: SubscriptionStatusDTO;
  readonly conceptualEvents: readonly SubscriptionDomainEvent[];
};
