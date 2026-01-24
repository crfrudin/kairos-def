-- =========================================================
-- KAIROS · FASE 7 · ETAPA 3
-- ASSINATURA & MONETIZAÇÃO — PERSISTÊNCIA (DDL + RLS)
--
-- Objetivo: materializar o estado de assinatura no banco
-- Proibições: sem triggers | sem functions | sem procedures | sem lógica normativa
-- RLS: 100% (deny-by-default) com regra única user_id = auth.uid()
--
-- Tabelas:
-- 1) public.subscriptions (estado atual, 1 linha por usuário)
-- 2) public.subscription_events (opcional, append-only; sem payload inventado)
-- =========================================================

-- =========================================================
-- 1) public.subscriptions
-- 1 linha por usuário (estado vigente)
-- =========================================================
create table if not exists public.subscriptions (
  -- Multi-tenancy (isolamento absoluto)
  user_id uuid primary key
    constraint fk_subscriptions_user
    references auth.users (id) on delete cascade,

  -- Plano (PlanTier) — enum fechado via CHECK
  plan_tier text not null
    constraint chk_subscriptions_plan_tier
    check (plan_tier in ('FREE', 'PREMIUM')),

  -- Estado (SubscriptionState) — enum fechado via CHECK
  state text not null
    constraint chk_subscriptions_state
    check (state in ('FREE', 'PREMIUM_ACTIVE', 'PREMIUM_CANCELING')),

  -- Cancelamento agendado (conceitual) — só existe em PREMIUM_CANCELING
  cancel_effective_on date null,

  -- Auditoria mínima (infra)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ---------------------------------------------------------
  -- CHECKs estruturais (espelham invariantes do domínio)
  -- ---------------------------------------------------------

  -- Invariante: state=FREE => plan_tier=FREE
  constraint chk_subscriptions_free_implies_plan_free
    check (
      (state <> 'FREE') or (plan_tier = 'FREE')
    ),

  -- Invariante: state in PREMIUM_* => plan_tier=PREMIUM
  constraint chk_subscriptions_premium_states_imply_plan_premium
    check (
      (state not in ('PREMIUM_ACTIVE', 'PREMIUM_CANCELING')) or (plan_tier = 'PREMIUM')
    ),

  -- Invariante: cancel_effective_on só pode existir quando state=PREMIUM_CANCELING
  constraint chk_subscriptions_cancel_date_only_when_canceling
    check (
      (cancel_effective_on is null) or (state = 'PREMIUM_CANCELING')
    )
);

comment on table public.subscriptions is
'FASE 7: estado atual da assinatura. 1 linha por user. Sem lógica no banco; CHECKs refletem invariantes do domínio.';

comment on column public.subscriptions.user_id is
'Isolamento multi-tenant absoluto. Regra única de acesso por RLS: user_id = auth.uid().';
comment on column public.subscriptions.plan_tier is
'PlanTier (enum fechado): FREE | PREMIUM.';
comment on column public.subscriptions.state is
'SubscriptionState (enum fechado): FREE | PREMIUM_ACTIVE | PREMIUM_CANCELING.';
comment on column public.subscriptions.cancel_effective_on is
'Cancelamento agendado (date). Só permitido quando state=PREMIUM_CANCELING.';
comment on column public.subscriptions.created_at is
'Auditoria mínima (infra).';
comment on column public.subscriptions.updated_at is
'Auditoria mínima (infra). Atualização controlada pela aplicação/infra (sem trigger).';


-- =========================================================
-- 2) public.subscription_events (opcional, append-only)
-- Sem payload inventado: apenas tipo + timestamp + user
-- =========================================================
create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    constraint fk_subscription_events_user
    references auth.users (id) on delete cascade,

  -- Lista fechada de eventos conceituais (texto controlado)
  event_type text not null
    constraint chk_subscription_events_type
    check (event_type in (
      'SubscriptionCreated',
      'SubscriptionUpgradedToPremium',
      'SubscriptionCancellationScheduled',
      'SubscriptionReactivated',
      'SubscriptionDowngradedToFree'
    )),

  occurred_at timestamptz not null default now()
);

-- Append-only hardening (sem trigger): não permitir UPDATE/DELETE por RLS (sem policies)
create index if not exists idx_subscription_events_user_occurred_at
  on public.subscription_events (user_id, occurred_at desc);

comment on table public.subscription_events is
'FASE 7: eventos de assinatura (opcional). Append-only. Sem payload/metadata para não criar domínio novo.';
comment on column public.subscription_events.event_type is
'Evento conceitual (lista fechada via CHECK).';
comment on column public.subscription_events.occurred_at is
'Timestamp factual do registro do evento (default now).';


-- =========================================================
-- RLS — 100% DAS TABELAS
-- Deny-by-default: sem policy => sem acesso
-- Regra única: user_id = auth.uid()
-- =========================================================

-- subscriptions
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
using (user_id = auth.uid());

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
on public.subscriptions
for insert
with check (user_id = auth.uid());

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
on public.subscriptions
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_delete_own"
on public.subscriptions
for delete
using (user_id = auth.uid());


-- subscription_events (append-only)
alter table public.subscription_events enable row level security;

drop policy if exists "subscription_events_select_own" on public.subscription_events;
create policy "subscription_events_select_own"
on public.subscription_events
for select
using (user_id = auth.uid());

drop policy if exists "subscription_events_insert_own" on public.subscription_events;
create policy "subscription_events_insert_own"
on public.subscription_events
for insert
with check (user_id = auth.uid());

-- IMPORTANTE: não criar policy de UPDATE/DELETE => continua deny-by-default => append-only efetivo.


-- =========================================================
-- TESTE BÁSICO DE RLS (manual)
--
-- Observação: auth.uid() lê o claim "sub" do JWT no request.
-- Em SQL puro, é comum simular com:
--   select set_config('request.jwt.claim.sub', '<uuid>', true);
-- e setar role para authenticated:
--   set local role authenticated;
--
-- 1) Simular usuário A e inserir linha:
--   begin;
--   select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001', true);
--   set local role authenticated;
--
--   insert into public.subscriptions (user_id, plan_tier, state)
--   values ('00000000-0000-0000-0000-000000000001','FREE','FREE');
--
--   select * from public.subscriptions; -- deve ver 1 linha
--   commit;
--
-- 2) Simular usuário B e tentar ler usuário A (deve retornar 0 linhas):
--   begin;
--   select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002', true);
--   set local role authenticated;
--   select * from public.subscriptions; -- deve ver 0 linhas
--   rollback;
--
-- 3) Verificar invariantes (deve falhar):
--   begin;
--   select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003', true);
--   set local role authenticated;
--
--   -- inválido: state=FREE mas plan=PREMIUM
--   insert into public.subscriptions (user_id, plan_tier, state)
--   values ('00000000-0000-0000-0000-000000000003','PREMIUM','FREE');
--   rollback;
-- =========================================================
