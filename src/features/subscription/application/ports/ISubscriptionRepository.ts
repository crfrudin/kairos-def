import { Subscription } from '../../domain';

export interface ISubscriptionRepository {
  /**
   * Não presume existência: se não existir, cria FREE (no repositório/fake),
   * sem IO real aqui (infra virá na Etapa 3).
   */
  getOrCreateForUser(userId: string): Promise<Subscription>;

  /**
   * Persistência da Subscription do usuário.
   */
  save(userId: string, subscription: Subscription): Promise<void>;
}
