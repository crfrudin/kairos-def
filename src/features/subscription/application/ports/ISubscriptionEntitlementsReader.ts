import { Entitlements, PlanTier } from '../../domain';

export interface ISubscriptionEntitlementsReader {
  getEntitlementsFor(plan: PlanTier): Entitlements;
}
