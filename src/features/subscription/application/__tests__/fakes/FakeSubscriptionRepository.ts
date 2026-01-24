import type { ISubscriptionRepository } from '../../ports/ISubscriptionRepository';
import { Subscription, SubscriptionId } from '../../../domain';

export class FakeSubscriptionRepository implements ISubscriptionRepository {
  private readonly store = new Map<string, Subscription>();

  async getOrCreateForUser(userId: string): Promise<Subscription> {
    const existing = this.store.get(userId);
    if (existing) return existing;

    // SubscriptionId exige length >= 8 (DomainError se menor).
    // Geramos determinístico e sempre válido.
    const rawId = `sub_${userId}_0000`; // garante >= 8 mesmo para userId curto

    const { subscription } = Subscription.createFree(SubscriptionId.create(rawId));
    this.store.set(userId, subscription);
    return subscription;
  }

  async save(userId: string, subscription: Subscription): Promise<void> {
    this.store.set(userId, subscription);
  }
}
