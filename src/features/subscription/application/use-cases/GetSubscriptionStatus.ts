import { Result, type Result as ResultType } from '../_shared/Result';
import { SubscriptionFailures, type SubscriptionFailure } from '../errors/SubscriptionErrors';
import type { SubscriptionSuccess } from '../contracts/SubscriptionResult';
import type { ISubscriptionRepository } from '../ports/ISubscriptionRepository';

export class GetSubscriptionStatus {
  constructor(private readonly repo: ISubscriptionRepository) {}

  async execute(input: { readonly userId: string }): Promise<ResultType<SubscriptionSuccess, SubscriptionFailure>> {
    try {
      const sub = await this.repo.getOrCreateForUser(input.userId);
      const ent = sub.entitlements;

      return Result.ok({
        subscription: {
          state: sub.state,
          plan: sub.plan,
          cancelEffectiveOn: sub.cancelEffectiveOn ? sub.cancelEffectiveOn.value : null,
          entitlements: {
            features: Array.from(ent.features),
            maxActiveSubjects:
              ent.maxActiveSubjects.kind === 'UNLIMITED'
                ? { kind: 'UNLIMITED' }
                : { kind: 'LIMITED', value: ent.maxActiveSubjects.value },
          },
        },
        conceptualEvents: [],
      });
    } catch {
      return Result.err(SubscriptionFailures.repository('Failed to load subscription'));
    }
  }
}
