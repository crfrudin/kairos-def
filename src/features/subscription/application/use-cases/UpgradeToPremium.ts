import { Result, type Result as ResultType } from '../_shared/Result';
import { SubscriptionFailures, type SubscriptionFailure } from '../errors/SubscriptionErrors';
import type { SubscriptionSuccess } from '../contracts/SubscriptionResult';
import type { ISubscriptionRepository } from '../ports/ISubscriptionRepository';

export class UpgradeToPremium {
  constructor(private readonly repo: ISubscriptionRepository) {}

  async execute(input: { readonly userId: string }): Promise<ResultType<SubscriptionSuccess, SubscriptionFailure>> {
    try {
      const sub = await this.repo.getOrCreateForUser(input.userId);

      const events = sub.upgradeToPremium();

      await this.repo.save(input.userId, sub);

      const ent = sub.entitlements;

      const success: SubscriptionSuccess = {
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
        conceptualEvents: events,
      };

      return Result.ok(success);
    } catch (e: unknown) {
      return Result.err(SubscriptionFailures.mapDomainError(e));
    }
  }
}
