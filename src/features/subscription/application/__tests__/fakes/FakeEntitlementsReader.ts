import { Entitlements, FeatureKey, LimitNumber, PlanTier } from '../../../domain';
import type { ISubscriptionEntitlementsReader } from '../../ports/ISubscriptionEntitlementsReader';

export class FakeEntitlementsReader implements ISubscriptionEntitlementsReader {
  getEntitlementsFor(plan: PlanTier): Entitlements {
    if (plan === 'PREMIUM') {
      return Entitlements.create({
        features: [FeatureKey.ALWAYS_FREE, FeatureKey.PREMIUM_FEATURES],
        maxActiveSubjects: LimitNumber.unlimited(),
      });
    }

    return Entitlements.create({
      features: [FeatureKey.ALWAYS_FREE],
      maxActiveSubjects: LimitNumber.limited(2),
    });
  }
}
