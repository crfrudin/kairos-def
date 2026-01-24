import { DomainError } from '../../domain';

export type SubscriptionFailure =
  // Infra (ainda abstrata nesta etapa; mantemos tipado para não vazar exception)
  | { readonly type: 'REPOSITORY_ERROR'; readonly message: string }

  // Domínio (codes conhecidos do domínio de assinatura)
  | { readonly type: 'INVALID_SUBSCRIPTION_ID'; readonly message: string }
  | { readonly type: 'INVALID_SUBSCRIPTION_DATE'; readonly message: string }
  | { readonly type: 'UPGRADE_NOT_ALLOWED'; readonly message: string }
  | { readonly type: 'CANCELLATION_NOT_ALLOWED'; readonly message: string }
  | { readonly type: 'REACTIVATE_NOT_ALLOWED'; readonly message: string }
  | { readonly type: 'INVARIANT_VIOLATION'; readonly message: string }
  | { readonly type: 'INVALID_PLAN_TIER'; readonly message: string }

  // Fallback seguro (sem vazar detalhes)
  | { readonly type: 'DOMAIN_VIOLATION'; readonly message: string };

export const SubscriptionFailures = {
  repository(message = 'Repository error'): SubscriptionFailure {
    return { type: 'REPOSITORY_ERROR', message };
  },

  domainViolation(message = 'Domain violation'): SubscriptionFailure {
    return { type: 'DOMAIN_VIOLATION', message };
  },

  mapDomainError(e: unknown): SubscriptionFailure {
    if (!(e instanceof DomainError)) {
      return SubscriptionFailures.domainViolation('Domain violation');
    }

    const code = e.code;
    const message = e.message;

    switch (code) {
      case 'InvalidSubscriptionId':
        return { type: 'INVALID_SUBSCRIPTION_ID', message };
      case 'InvalidSubscriptionDate':
        return { type: 'INVALID_SUBSCRIPTION_DATE', message };
      case 'UpgradeNotAllowed':
        return { type: 'UPGRADE_NOT_ALLOWED', message };
      case 'CancellationNotAllowed':
        return { type: 'CANCELLATION_NOT_ALLOWED', message };
      case 'ReactivateNotAllowed':
        return { type: 'REACTIVATE_NOT_ALLOWED', message };
      case 'InvariantViolation':
        return { type: 'INVARIANT_VIOLATION', message };
      case 'InvalidPlanTier':
        return { type: 'INVALID_PLAN_TIER', message };
      default:
        return SubscriptionFailures.domainViolation(message);
    }
  },
} as const;
