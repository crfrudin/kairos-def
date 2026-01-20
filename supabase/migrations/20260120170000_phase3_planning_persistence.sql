-- =========================================================
-- KAIROS · FASE 3 · ETAPA 3
-- PERSISTENCIA DO PLANEJAMENTO (DDL + RLS)
--
-- Escopo: daily_plans, daily_plan_items, calendar_projections,
--         executed_days (factual/imutavel), review_ledger, plan_generation_log
--
-- Regras: Multi-tenancy absoluto + RLS 100% das tabelas
-- Proibições: sem triggers, sem functions, sem lógica procedural
-- =========================================================

-- =========================================================
-- 0) TABELA: plan_generation_log
-- Trilho auditável de geração/regeração (motivo + intervalo + contexto)
-- =========================================================

create table if not exists public.plan_generation_log (
  id uuid primary key default gen_random_uuid(),

  -- Multi-tenancy (isolamento absoluto)
  user_id uuid not null,

  -- Intervalo afetado (inclusive)
  range_start date not null,
  range_end date not null,
  constraint chk_plan_generation_log_range check (range_start <= range_end),

  -- Motivo normatizado (sem heurística; enum fechado por CHECK)
  reason text not null
    constraint chk_plan_generation_log_reason
    check (reason in (
      'profile_changed',
      'subjects_changed',
      'manual_regenerate',
      'system'
    )),

  -- Contexto normativo/snapshot (estrutura apenas; sem algoritmo aqui)
  normative_context jsonb not null default '{}'::jsonb
    constraint chk_plan_generation_log_normative_context_is_object
    check (jsonb_typeof(normative_context) = 'object'),

  occurred_at timestamptz not null default now(),

  -- Campo livre (auditabilidade humana, opcional)
  notes text null,

  constraint fk_plan_generation_log_user
    foreign key (user_id) references auth.users (id) on delete cascade
);

create index if not exists idx_plan_generation_log_user_time
  on public.plan_generation_log (user_id, occurred_at desc);

create index if not exists idx_plan_generation_log_user_range
  on public.plan_generation_log (user_id, range_start, range_end);

comment on table public.plan_generation_log is
'FASE 3: log auditavel de geracao/regeracao de planos/projecoes (motivo + intervalo + contexto).';

comment on column public.plan_generation_log.reason is
'Motivo normatizado: profile_changed | subjects_changed | manual_regenerate | system.';
comment on column public.plan_generation_log.normative_context is
'Snapshot/contexto normativo (jsonb objeto). Estrutura para rastreabilidade; sem algoritmo nesta etapa.';


-- =========================================================
-- 1) TABELA: daily_plans
-- Materialização do plano de um dia (derivado; regenerável enquanto não executado)
-- 1 plano por user por data, quando existir materialização.
-- =========================================================

create table if not exists public.daily_plans (
  user_id uuid not null,
  plan_date date not null,

  -- Status do dia (estrutural, enum fechado)
  status text not null
    constraint chk_daily_plans_status
    check (status in ('PLANNED', 'REST_DAY', 'EXECUTED')),

  -- Contexto normativo da materialização (estrutura p/ auditoria)
  normative_context jsonb not null default '{}'::jsonb
    constraint chk_daily_plans_normative_context_is_object
    check (jsonb_typeof(normative_context) = 'object'),

  -- Auditoria
  materialized_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_daily_plans primary key (user_id, plan_date),

  constraint fk_daily_plans_user
    foreign key (user_id) references auth.users (id) on delete cascade
);

create index if not exists idx_daily_plans_user_date_desc
  on public.daily_plans (user_id, plan_date desc);

comment on table public.daily_plans is
'FASE 3: plano diario materializado (derivado). 1 por user_id+data quando existir. Regeneravel enquanto nao executado (regra de aplicacao).';

comment on column public.daily_plans.status is
'Status estrutural: PLANNED | REST_DAY | EXECUTED.';
comment on column public.daily_plans.normative_context is
'Contexto normativo/snapshot para auditoria e rastreabilidade (jsonb objeto). Sem regra nova.';


-- =========================================================
-- 2) TABELA: daily_plan_items
-- Itens ordenados determinísticos do plano (camadas normativas: review/extras/theory).
-- =========================================================

create table if not exists public.daily_plan_items (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  plan_date date not null,

  -- Ordem determinística dentro do dia
  ordinal integer not null
    constraint chk_daily_plan_items_ordinal check (ordinal >= 1),

  -- Camada normativa (enum fechado)
  layer text not null
    constraint chk_daily_plan_items_layer
    check (layer in ('REVIEW', 'EXTRAS', 'THEORY')),

  -- Tipo do item (enum fechado; teoria/revisao/extras específicos)
  item_type text not null
    constraint chk_daily_plan_items_item_type
    check (item_type in ('THEORY', 'REVIEW', 'QUESTIONS', 'INFORMATIVOS', 'LEI_SECA')),

  -- Duração planejada (minutos)
  planned_minutes integer not null
    constraint chk_daily_plan_items_planned_minutes
    check (planned_minutes between 1 and 1440),

  -- Referências opcionais (sem depender de schemas de outras fases nesta migration)
  -- subject_id: quando fizer sentido (THEORY/REVIEW/QUESTIONS/LEI_SECA)
  subject_id uuid null,

  -- Metadados mínimos (ex.: tribunal informativo, origem da revisão, etc.)
  meta jsonb not null default '{}'::jsonb
    constraint chk_daily_plan_items_meta_is_object
    check (jsonb_typeof(meta) = 'object'),

  created_at timestamptz not null default now(),

  constraint fk_daily_plan_items_plan
    foreign key (user_id, plan_date)
    references public.daily_plans (user_id, plan_date)
    on delete cascade,

  -- Ordem única por dia
  constraint uq_daily_plan_items_day_ordinal
    unique (user_id, plan_date, ordinal)
);

create index if not exists idx_daily_plan_items_user_day
  on public.daily_plan_items (user_id, plan_date);

comment on table public.daily_plan_items is
'FASE 3: itens do plano diario (ordenados e determinísticos) por camada normativa (REVIEW/EXTRAS/THEORY).';

comment on column public.daily_plan_items.layer is
'Camada normativa: REVIEW (revisoes auto), EXTRAS (questoes/informativos/lei seca), THEORY (teoria).';
comment on column public.daily_plan_items.item_type is
'Tipo do item: THEORY | REVIEW | QUESTIONS | INFORMATIVOS | LEI_SECA (enum fechado por CHECK).';
comment on column public.daily_plan_items.meta is
'Metadados estruturais p/ rastreabilidade (jsonb objeto). Sem algoritmo nesta etapa.';


-- =========================================================
-- 3) TABELA: calendar_projections
-- Projeções regeneráveis por intervalo (sem valor histórico).
-- Mantém rastreabilidade de geração via plan_generation_log.
-- =========================================================

create table if not exists public.calendar_projections (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,

  range_start date not null,
  range_end date not null,
  constraint chk_calendar_projections_range check (range_start <= range_end),

  -- Limite estrutural de intervalo (V1: max 90 dias por request)
  -- Observação: regra de aplicação também existe; aqui é integridade defensiva.
  constraint chk_calendar_projections_max_90_days
    check ((range_end - range_start) <= 90),

  -- Referência ao log de geração (audit trail)
  generation_log_id uuid not null,

  -- Snapshot/contexto (estrutura)
  normative_context jsonb not null default '{}'::jsonb
    constraint chk_calendar_projections_normative_context_is_object
    check (jsonb_typeof(normative_context) = 'object'),

  generated_at timestamptz not null default now(),

  -- Conteúdo projetado (estrutura; decisão de storage: jsonb para não acoplar algoritmo)
  -- Observação: a projeção é regenerável e pode ser armazenada de forma compacta.
  projection_payload jsonb not null default '{}'::jsonb
    constraint chk_calendar_projections_payload_is_object
    check (jsonb_typeof(projection_payload) = 'object'),

  constraint fk_calendar_projections_user
    foreign key (user_id) references auth.users (id) on delete cascade,

  constraint fk_calendar_projections_generation_log
    foreign key (generation_log_id) references public.plan_generation_log (id) on delete restrict
);

create index if not exists idx_calendar_projections_user_generated
  on public.calendar_projections (user_id, generated_at desc);

create index if not exists idx_calendar_projections_user_range
  on public.calendar_projections (user_id, range_start, range_end);

comment on table public.calendar_projections is
'FASE 3: projeções regeneráveis por intervalo (sem valor histórico), com rastreabilidade de geração.';
comment on column public.calendar_projections.projection_payload is
'Payload de projeção (jsonb objeto). Regenerável; sem algoritmo nesta etapa.';


-- =========================================================
-- 4) TABELA: executed_days
-- Execução factual (imutável). Registro do que ocorreu no dia.
-- Política de RLS: apenas SELECT + INSERT. UPDATE/DELETE NEGADOS por ausência de policy.
-- =========================================================

create table if not exists public.executed_days (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  plan_date date not null,

  executed_at timestamptz not null default now(),

  -- Status factual do dia executado (enum fechado)
  result_status text not null
    constraint chk_executed_days_result_status
    check (result_status in ('COMPLETED', 'PARTIAL', 'NOT_COMPLETED', 'REST_DAY')),

  total_executed_minutes integer not null default 0
    constraint chk_executed_days_total_minutes
    check (total_executed_minutes between 0 and 1440),

  -- Sumário factual (estrutura; sem decisão normativa aqui)
  factual_summary jsonb not null default '{}'::jsonb
    constraint chk_executed_days_summary_is_object
    check (jsonb_typeof(factual_summary) = 'object'),

  constraint uq_executed_days_user_date unique (user_id, plan_date),

  constraint fk_executed_days_user
    foreign key (user_id) references auth.users (id) on delete cascade
);

create index if not exists idx_executed_days_user_date_desc
  on public.executed_days (user_id, plan_date desc);

comment on table public.executed_days is
'FASE 3: execução factual do dia (imutável). Inserção única por user+data. Sem alteração retroativa.';
comment on column public.executed_days.factual_summary is
'Resumo factual (jsonb objeto). Estrutura para auditoria; sem algoritmo nesta etapa.';


-- =========================================================
-- 5) TABELA: review_ledger
-- Persistência do estado mínimo para cumprir:
-- - vinculação a origem + vencimento
-- - não-acúmulo (sem rolagem automática)
-- - bloqueio de duplicidades
--
-- Observação: algoritmo é da application; aqui é só estrutura e integridade.
-- =========================================================

create table if not exists public.review_ledger (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,

  -- Origem determinística (enum fechado)
  origin_type text not null
    constraint chk_review_ledger_origin_type
    check (origin_type in ('THEORY_SESSION', 'INFORMATIVES', 'MANUAL')),

  -- Identificador da origem (ex.: id de sessão/registro que gerou revisão)
  origin_id uuid not null,

  -- Vencimento (data agendada)
  due_date date not null,

  -- Status mínimo
  status text not null
    constraint chk_review_ledger_status
    check (status in ('PENDING', 'DONE', 'LOST')),

  -- Referência opcional a matéria quando aplicável
  subject_id uuid null,

  -- Metadados mínimos (ex.: frequência usada, duração planejada, etc.)
  meta jsonb not null default '{}'::jsonb
    constraint chk_review_ledger_meta_is_object
    check (jsonb_typeof(meta) = 'object'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fk_review_ledger_user
    foreign key (user_id) references auth.users (id) on delete cascade,

  -- Bloqueio de duplicidade por origem + vencimento (não criar duas revisões iguais)
  constraint uq_review_ledger_origin_due unique (user_id, origin_type, origin_id, due_date)
);

create index if not exists idx_review_ledger_user_due
  on public.review_ledger (user_id, due_date);

create index if not exists idx_review_ledger_user_status_due
  on public.review_ledger (user_id, status, due_date);

comment on table public.review_ledger is
'FASE 3: ledger mínimo de revisões (origem + vencimento + status), com bloqueio de duplicidades. Sem algoritmo.';
comment on column public.review_ledger.status is
'Status mínimo: PENDING | DONE | LOST (nao-acumulo: LOST representa revisao perdida).';


-- =========================================================
-- RLS (Row Level Security) — 100% das tabelas
-- Regra base obrigatória: user_id = auth.uid()
-- Políticas explícitas: SELECT/INSERT/UPDATE/DELETE (quando aplicável)
-- Nota: executed_days é imutável -> sem UPDATE/DELETE policies.
-- =========================================================

-- plan_generation_log
alter table public.plan_generation_log enable row level security;

drop policy if exists "plan_generation_log_select_own" on public.plan_generation_log;
create policy "plan_generation_log_select_own"
on public.plan_generation_log
for select
using (user_id = auth.uid());

drop policy if exists "plan_generation_log_insert_own" on public.plan_generation_log;
create policy "plan_generation_log_insert_own"
on public.plan_generation_log
for insert
with check (user_id = auth.uid());

drop policy if exists "plan_generation_log_update_own" on public.plan_generation_log;
create policy "plan_generation_log_update_own"
on public.plan_generation_log
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "plan_generation_log_delete_own" on public.plan_generation_log;
create policy "plan_generation_log_delete_own"
on public.plan_generation_log
for delete
using (user_id = auth.uid());


-- daily_plans
alter table public.daily_plans enable row level security;

drop policy if exists "daily_plans_select_own" on public.daily_plans;
create policy "daily_plans_select_own"
on public.daily_plans
for select
using (user_id = auth.uid());

drop policy if exists "daily_plans_insert_own" on public.daily_plans;
create policy "daily_plans_insert_own"
on public.daily_plans
for insert
with check (user_id = auth.uid());

drop policy if exists "daily_plans_update_own" on public.daily_plans;
create policy "daily_plans_update_own"
on public.daily_plans
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "daily_plans_delete_own" on public.daily_plans;
create policy "daily_plans_delete_own"
on public.daily_plans
for delete
using (user_id = auth.uid());


-- daily_plan_items
alter table public.daily_plan_items enable row level security;

drop policy if exists "daily_plan_items_select_own" on public.daily_plan_items;
create policy "daily_plan_items_select_own"
on public.daily_plan_items
for select
using (user_id = auth.uid());

drop policy if exists "daily_plan_items_insert_own" on public.daily_plan_items;
create policy "daily_plan_items_insert_own"
on public.daily_plan_items
for insert
with check (user_id = auth.uid());

drop policy if exists "daily_plan_items_update_own" on public.daily_plan_items;
create policy "daily_plan_items_update_own"
on public.daily_plan_items
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "daily_plan_items_delete_own" on public.daily_plan_items;
create policy "daily_plan_items_delete_own"
on public.daily_plan_items
for delete
using (user_id = auth.uid());


-- calendar_projections
alter table public.calendar_projections enable row level security;

drop policy if exists "calendar_projections_select_own" on public.calendar_projections;
create policy "calendar_projections_select_own"
on public.calendar_projections
for select
using (user_id = auth.uid());

drop policy if exists "calendar_projections_insert_own" on public.calendar_projections;
create policy "calendar_projections_insert_own"
on public.calendar_projections
for insert
with check (user_id = auth.uid());

drop policy if exists "calendar_projections_update_own" on public.calendar_projections;
create policy "calendar_projections_update_own"
on public.calendar_projections
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "calendar_projections_delete_own" on public.calendar_projections;
create policy "calendar_projections_delete_own"
on public.calendar_projections
for delete
using (user_id = auth.uid());


-- executed_days (IMUTÁVEL: apenas SELECT + INSERT)
alter table public.executed_days enable row level security;

drop policy if exists "executed_days_select_own" on public.executed_days;
create policy "executed_days_select_own"
on public.executed_days
for select
using (user_id = auth.uid());

drop policy if exists "executed_days_insert_own" on public.executed_days;
create policy "executed_days_insert_own"
on public.executed_days
for insert
with check (user_id = auth.uid());

-- Nota: sem policy de UPDATE/DELETE => negado por padrão (imutabilidade estrutural via RLS).


-- review_ledger
alter table public.review_ledger enable row level security;

drop policy if exists "review_ledger_select_own" on public.review_ledger;
create policy "review_ledger_select_own"
on public.review_ledger
for select
using (user_id = auth.uid());

drop policy if exists "review_ledger_insert_own" on public.review_ledger;
create policy "review_ledger_insert_own"
on public.review_ledger
for insert
with check (user_id = auth.uid());

drop policy if exists "review_ledger_update_own" on public.review_ledger;
create policy "review_ledger_update_own"
on public.review_ledger
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "review_ledger_delete_own" on public.review_ledger;
create policy "review_ledger_delete_own"
on public.review_ledger
for delete
using (user_id = auth.uid());
