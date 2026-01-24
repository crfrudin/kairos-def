export type PlanTier = 'FREE' | 'PREMIUM';

export type SubscriptionEntitlements = {
  /**
   * Único dado normativo necessário para gating em outras features:
   * - FREE ou PREMIUM
   *
   * Regras de quais features são premium NÃO são decididas aqui (Application),
   * apenas consumidas por quem for fazer gating na camada apropriada.
   */
  planTier: PlanTier;
};
