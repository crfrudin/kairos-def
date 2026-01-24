export type SubscriptionStatusDTO = {
  readonly state: 'FREE' | 'PREMIUM_ACTIVE' | 'PREMIUM_CANCELING';
  readonly plan: 'FREE' | 'PREMIUM';
  readonly cancelEffectiveOn: string | null; // YYYY-MM-DD (sem Date/now)
  readonly entitlements: {
    readonly features: readonly string[]; // FeatureKey (enum fechado no domínio) serializado
    readonly maxActiveSubjects: { readonly kind: 'LIMITED'; readonly value: number } | { readonly kind: 'UNLIMITED' };
  };
};
