# KAIROS — FASE 7 · ETAPA 2 (APPLICATION)
## Lista Oficial de Use-Cases — Assinatura (Subscription)

Caráter: Vinculante para a ETAPA 2 (Application)
Escopo: Definição de Use-Cases, inputs/outputs, erros tipados e eventos conceituais.
Proibições: sem UI, sem infra, sem billing, sem Stripe, sem preços, sem ciclos, sem relógio/data real.

---

## Convenções obrigatórias

1) Todo use-case recebe `userId` (fornecido por camada superior; Application não lê cookie/sessão).
2) Retorno padronizado: `Result<Success, Failure>` (nenhuma exception pode vazar).
3) A Application NÃO cria regras novas: apenas orquestra transições válidas do domínio congelado.
4) Datas: qualquer data é conceitual (string YYYY-MM-DD via VO `SubscriptionDate`), jamais `Date/now`.

---

## Terminologia (conforme Domínio Puro congelado)

- `PlanTier`: FREE | PREMIUM
- `SubscriptionState`: FREE | PREMIUM_ACTIVE | PREMIUM_CANCELING
- `cancelEffectiveOn?: SubscriptionDate` (somente quando PREMIUM_CANCELING)

---

## UC-SS01 — GetSubscriptionStatus

### Intenção
Obter o status atual de assinatura do usuário para feature gating e exibição.

### Input
- `{ userId: string }`

### Output (Success)
- `{ planTier: 'FREE'|'PREMIUM', state: 'FREE'|'PREMIUM_ACTIVE'|'PREMIUM_CANCELING', cancelEffectiveOn?: 'YYYY-MM-DD' }`

### Erros (Failure)
- Nenhum erro normativo bloqueante.
- Falhas de infraestrutura (futuras) NÃO são modeladas aqui; serão tratadas por adapters na Etapa 3/Infra.

### Observações normativas
- Se a assinatura não existir no repositório, o retorno DEVE ser tratado como **FREE** (estado efetivo), sem side-effects e sem criação implícita de registro.

### Eventos conceituais
- Nenhum (leitura pura)

---

## UC-SS02 — UpgradeToPremium

### Intenção
Promover o usuário de FREE para PREMIUM_ACTIVE, respeitando transições válidas do domínio.
Não envolve pagamento/billing; apenas a transição de estado conceitual.

### Input
- `{ userId: string }`

### Output (Success)
- `{ planTier: 'PREMIUM', state: 'PREMIUM_ACTIVE', cancelEffectiveOn?: undefined, conceptualEvents: DomainEvent[] }`

### Erros (Failure)
- `InvalidSubscriptionStateTransition` (se o domínio bloquear a transição a partir do estado atual)
- `SubscriptionInvariantViolation` (qualquer violação bloqueante do domínio ao materializar/alterar Subscription)

### Regras de idempotência (Application)
- Se já estiver `PREMIUM_ACTIVE`, retornar Success idempotente (sem mudança adicional).

### Eventos conceituais
- `SubscriptionUpgraded` (FREE -> PREMIUM_ACTIVE)

---

## UC-SS03 — ScheduleCancellation

### Intenção
Agendar cancelamento: `PREMIUM_ACTIVE` -> `PREMIUM_CANCELING`, com `cancelEffectiveOn` obrigatório.
Sem relógio real e sem cálculo de data: a data é input conceitual.

### Input
- `{ userId: string, cancelEffectiveOn: 'YYYY-MM-DD' }`

### Output (Success)
- `{ planTier: 'PREMIUM', state: 'PREMIUM_CANCELING', cancelEffectiveOn: 'YYYY-MM-DD', conceptualEvents: DomainEvent[] }`

### Erros (Failure)
- `NotPremiumSubscriber` (se estiver em FREE)
- `InvalidSubscriptionDate` (se `cancelEffectiveOn` violar o VO/construtor do domínio)
- `InvalidSubscriptionStateTransition`
- `SubscriptionInvariantViolation`

### Regras de idempotência (Application)
- Se já estiver `PREMIUM_CANCELING` com a mesma `cancelEffectiveOn`, retornar Success idempotente.

### Eventos conceituais
- `SubscriptionCancellationScheduled`

---

## UC-SS04 — ReactivateSubscription

### Intenção
Reativar assinatura cancelando o agendamento:
`PREMIUM_CANCELING` -> `PREMIUM_ACTIVE`, limpando `cancelEffectiveOn`.

### Input
- `{ userId: string }`

### Output (Success)
- `{ planTier: 'PREMIUM', state: 'PREMIUM_ACTIVE', cancelEffectiveOn?: undefined, conceptualEvents: DomainEvent[] }`

### Erros (Failure)
- `NotPremiumSubscriber` (se estiver em FREE)
- `NotInCancelingState` (se estiver PREMIUM_ACTIVE — nada a reativar)
- `InvalidSubscriptionStateTransition`
- `SubscriptionInvariantViolation`

### Regras de idempotência (Application)
- Se já estiver `PREMIUM_ACTIVE`, retornar Failure `NotInCancelingState` (não é idempotência silenciosa; é estado semanticamente inválido para este UC).

### Eventos conceituais
- `SubscriptionReactivated`

---

## Lista oficial de Failures (tipos)

- `InvalidSubscriptionStateTransition`
- `SubscriptionInvariantViolation`
- `NotPremiumSubscriber`
- `NotInCancelingState`
- `InvalidSubscriptionDate`

Observação: falhas de infra (DB/HTTP/etc.) serão responsabilidade da Infra (Etapa 3) e não entram nesta lista normativa.

---

## Lista oficial de DomainEvents (conceituais)

- `SubscriptionUpgraded`
- `SubscriptionCancellationScheduled`
- `SubscriptionReactivated`

