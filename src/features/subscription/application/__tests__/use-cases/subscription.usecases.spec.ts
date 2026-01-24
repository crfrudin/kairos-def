import { describe, it, expect } from 'vitest';

import { FakeSubscriptionRepository } from '../fakes/FakeSubscriptionRepository';

import { GetSubscriptionStatus } from '../../use-cases/GetSubscriptionStatus';
import { UpgradeToPremium } from '../../use-cases/UpgradeToPremium';
import { ScheduleCancellation } from '../../use-cases/ScheduleCancellation';
import { ReactivateSubscription } from '../../use-cases/ReactivateSubscription';

describe('subscription/application use-cases', () => {
  it('GetSubscriptionStatus: retorna FREE por padrão (via getOrCreate)', async () => {
    const repo = new FakeSubscriptionRepository();
    const uc = new GetSubscriptionStatus(repo);

    const res = await uc.execute({ userId: 'u1' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.subscription.plan).toBe('FREE');
    expect(res.value.subscription.state).toBe('FREE');
    expect(res.value.subscription.entitlements.maxActiveSubjects).toEqual({ kind: 'LIMITED', value: 2 });
    expect(res.value.conceptualEvents).toEqual([]);
  });

  it('UpgradeToPremium: transiciona para PREMIUM_ACTIVE e emite evento', async () => {
    const repo = new FakeSubscriptionRepository();
    const uc = new UpgradeToPremium(repo);

    const res = await uc.execute({ userId: 'u1' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.subscription.plan).toBe('PREMIUM');
    expect(res.value.subscription.state).toBe('PREMIUM_ACTIVE');
    expect(res.value.subscription.entitlements.maxActiveSubjects).toEqual({ kind: 'UNLIMITED' });
    expect(res.value.conceptualEvents.length).toBe(1);
    expect(res.value.conceptualEvents[0].type).toBe('SubscriptionUpgradedToPremium');
  });

  it('ScheduleCancellation: após premium, agenda cancelamento e emite evento', async () => {
    const repo = new FakeSubscriptionRepository();

    const upgrade = new UpgradeToPremium(repo);
    const schedule = new ScheduleCancellation(repo);

    const up = await upgrade.execute({ userId: 'u1' });
    expect(up.ok).toBe(true);

    const res = await schedule.execute({ userId: 'u1', cancelEffectiveOn: '2030-01-10' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.subscription.state).toBe('PREMIUM_CANCELING');
    expect(res.value.subscription.cancelEffectiveOn).toBe('2030-01-10');
    expect(res.value.conceptualEvents.length).toBe(1);
    expect(res.value.conceptualEvents[0].type).toBe('SubscriptionCancellationScheduled');
  });

  it('ReactivateSubscription: reverte PREMIUM_CANCELING -> PREMIUM_ACTIVE e emite evento', async () => {
    const repo = new FakeSubscriptionRepository();

    const upgrade = new UpgradeToPremium(repo);
    const schedule = new ScheduleCancellation(repo);
    const reactivate = new ReactivateSubscription(repo);

    await upgrade.execute({ userId: 'u1' });
    await schedule.execute({ userId: 'u1', cancelEffectiveOn: '2030-01-10' });

    const res = await reactivate.execute({ userId: 'u1' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.subscription.state).toBe('PREMIUM_ACTIVE');
    expect(res.value.subscription.cancelEffectiveOn).toBe(null);
    expect(res.value.conceptualEvents.length).toBe(1);
    expect(res.value.conceptualEvents[0].type).toBe('SubscriptionReactivated');
  });

  it('ScheduleCancellation: formato inválido retorna INVALID_SUBSCRIPTION_DATE', async () => {
    const repo = new FakeSubscriptionRepository();

    const upgrade = new UpgradeToPremium(repo);
    await upgrade.execute({ userId: 'u1' });

    const uc = new ScheduleCancellation(repo);

    const res = await uc.execute({ userId: 'u1', cancelEffectiveOn: '2030-1-10' }); // inválido (regex)
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.error.type).toBe('INVALID_SUBSCRIPTION_DATE');
  });
});
