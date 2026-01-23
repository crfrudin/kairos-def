import type { Subscription } from '../../domain';
import type { PlanTier } from '../contracts/SubscriptionEntitlements';

export interface ISubscriptionRepository {
  /**
   * Retorna a Subscription do usuário ou null se não existir.
   * Observação: ausência de registro NÃO é erro normativo; o UC tratará como FREE efetivo.
   */
  getByUserId(userId: string): Promise<Subscription | null>;

  /**
   * Persistência da Subscription atual (upsert).
   * A infra concreta (Etapa 3) decide atomicidade/tx, sem vazar para Application.
   */
  save(userId: string, subscription: Subscription): Promise<void>;

  /**
   * Leitura rápida do plano efetivo, quando não for necessário materializar a entidade inteira.
   * Implementação pode derivar de getByUserId, mas fica como port para otimização/isolamento.
   */
  getPlanTier(userId: string): Promise<PlanTier>;
}
