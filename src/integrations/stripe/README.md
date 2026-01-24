# KAIROS — Integração Stripe (FASE 7 · ETAPA 4)

## Natureza
Camada EXCLUSIVAMENTE de integração externa com gateway (Stripe).

## Proibições absolutas (gates)
- Não criar regras de assinatura.
- Não decidir estados/planos.
- Não calcular preço/impostos.
- Não persistir dados fora do aprovado.
- Não bypassar use-cases existentes.
- Não acessar banco diretamente.
- Não criar UI.
- Não contaminar domínio/application/persistência.

## Responsabilidades permitidas
- Adapter de checkout (Stripe SDK oficial).
- Webhook handlers.
- Verificação de assinatura do webhook.
- Mapeamento evento externo -> chamada de use-case interno (sem decisão normativa).
- Idempotência e auditabilidade na camada de integração.

## Regra de ouro
Stripe é fonte externa de eventos.
O sistema reage via use-cases já existentes.
