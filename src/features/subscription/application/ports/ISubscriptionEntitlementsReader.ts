import type { SubscriptionEntitlements } from '../contracts/SubscriptionEntitlements';

export interface ISubscriptionEntitlementsReader {
  /**
   * Retorna apenas o "envelope" mínimo para feature gating.
   * Sem regras de negócio novas aqui: apenas expõe o tier efetivo.
   */
  getEntitlements(userId: string): Promise<SubscriptionEntitlements>;
}
