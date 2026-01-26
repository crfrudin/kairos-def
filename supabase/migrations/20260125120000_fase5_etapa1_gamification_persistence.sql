-- =====================================================================================
-- KAIROS (kairos-def) — FASE 5 · ETAPA TÉCNICA 1 — FUNDAÇÃO DE PERSISTÊNCIA
-- MIGRATION: 20260125120000_fase5_etapa1_gamification_persistence.sql
--
-- Objetivo: materializar fielmente o Modelo Canônico de Persistência (ETAPA 5),
-- criando as estruturas físicas correspondentes a:
--   E1 Eventos Factuais Observados (append-only)
--   E2 Marca Canônica de Observação/Processamento (anti-duplicidade)
--   E3 Conquistas Concedidas (append-only; idempotência por constraint)
--   E4 Transições de Streak (append-only)
--   E5 Snapshot derivado de Streak (permitido; rastreável; apenas prospectivo)
--   E6 Log Canônico de Consolidação (anti-reprocessamento retroativo)
--
-- Proibições respeitadas:
--   - sem triggers
--   - sem functions / procedures
--   - sem seed
--   - sem soft delete
--   - sem “estado mágico”
--   - sem views
--
-- RLS:
--   - multi-tenant obrigatório: user_id = auth.uid()
--   - deny-by-default
--   - sem bypass administrativo
-- =====================================================================================

-- -------------------------------------------
-- E1 — Registro de Eventos Factuais Observados
-- -------------------------------------------
create table if not exists public.gamification_observed_events (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete restrict,

  -- Identificador canônico do tipo de evento (lista fechada na ETAPA 1, validada na Application).
  event_type text not null,

  -- Referência factual imutável do domínio, conforme contrato do UC-01 (ETAPA 6).
  -- Ex.: "executed_day:<id>", "subject:<id>", etc. (a composição exata é responsabilidade da Application).
  reference_key text not null,

  -- "Ocorreu em" (tempo do domínio; quando o fato aconteceu).
  occurred_at timestamptz not null,

  -- "Observado em" (tempo do sistema; quando o sistema registrou a observação).
  observed_at timestamptz not null default now(),

  -- Metadados estritamente necessários à prova do evento (sem excesso).
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.gamification_observed_events is
  'FASE 5/E1: Histórico imutável de eventos factuais observados (append-only). Fonte de verdade factual para leitura simbólica.';

comment on column public.gamification_observed_events.reference_key is
  'Referência factual imutável do domínio (contrato conceitual do UC-01).';

create index if not exists idx_gam_obs_events_user_observed_at
  on public.gamification_observed_events (user_id, observed_at desc);

create index if not exists idx_gam_obs_events_user_occurred_at
  on public.gamification_observed_events (user_id, occurred_at desc);

create index if not exists idx_gam_obs_events_user_type
  on public.gamification_observed_events (user_id, event_type);

-- ----------------------------------------------------
-- E2 — Marca Canônica de Observação/Processamento
-- (anti-duplicidade / anti-farming por reingestão)
-- ----------------------------------------------------
create table if not exists public.gamification_observation_marks (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete restrict,

  -- Chave canônica de unicidade do evento observado
  -- (derivada do tipo do evento + referência factual do domínio).
  canonical_key text not null,

  observed_at timestamptz not null default now(),

  observed_event_id uuid not null references public.gamification_observed_events(id) on delete restrict
);

comment on table public.gamification_observation_marks is
  'FASE 5/E2: Âncora de idempotência de observação. Impede dupla ingestão do mesmo fato como fonte de efeitos simbólicos.';

create unique index if not exists uq_gam_obs_marks_user_canonical
  on public.gamification_observation_marks (user_id, canonical_key);

create unique index if not exists uq_gam_obs_marks_user_event
  on public.gamification_observation_marks (user_id, observed_event_id);

create index if not exists idx_gam_obs_marks_user_observed_at
  on public.gamification_observation_marks (user_id, observed_at desc);

-- -----------------------------------------------
-- E3 — Registro Imutável de Conquistas Concedidas
-- -----------------------------------------------
create table if not exists public.gamification_achievement_grants (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete restrict,

  -- Identificador canônico da conquista (taxonomia congelada).
  achievement_key text not null,

  -- Chave canônica de idempotência da concessão.
  -- (unicidade por usuário + regra aplicável; pode incluir janela/edição quando aplicável).
  grant_key text not null,

  -- Identidade/versão da regra canônica aplicável (conceitual).
  rule_key text not null,

  -- "Reconhecido em" (instante do sistema).
  recognized_at timestamptz not null default now(),

  -- Rastro mínimo auditável (quando não houver necessidade de link tabular completo).
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.gamification_achievement_grants is
  'FASE 5/E3: Histórico imutável de concessões simbólicas (append-only). Sem revogação/reavaliação.';

create unique index if not exists uq_gam_ach_grants_user_grant_key
  on public.gamification_achievement_grants (user_id, grant_key);

create index if not exists idx_gam_ach_grants_user_recognized_at
  on public.gamification_achievement_grants (user_id, recognized_at desc);

create index if not exists idx_gam_ach_grants_user_achievement
  on public.gamification_achievement_grants (user_id, achievement_key);

-- -------------------------------------------------------
-- E3 (rastreamento) — Vínculo Conquista ↔ Eventos Observados
-- (cadeia de prova auditável até E1)
-- -------------------------------------------------------
create table if not exists public.gamification_achievement_grant_events (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete restrict,

  achievement_grant_id uuid not null references public.gamification_achievement_grants(id) on delete restrict,
  observed_event_id uuid not null references public.gamification_observed_events(id) on delete restrict,

  linked_at timestamptz not null default now()
);

comment on table public.gamification_achievement_grant_events is
  'FASE 5/E3: Tabela de ligação para rastreabilidade de concessões até eventos observados (cadeia de prova).';

create unique index if not exists uq_gam_ach_grant_events_unique_link
  on public.gamification_achievement_grant_events (user_id, achievement_grant_id, observed_event_id);

create index if not exists idx_gam_ach_grant_events_user_linked_at
  on public.gamification_achievement_grant_events (user_id, linked_at desc);

-- -------------------------------------------
-- E4 — Histórico de Transições de Streak
-- -------------------------------------------
create table if not exists public.gamification_streak_transitions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete restrict,

  -- Identificador canônico do streak (modelo congelado).
  streak_key text not null,

  -- Tipo de transição (conforme modelo canônico; validado na Application).
  transition_type text not null,

  -- "Reconhecido em"
  recognized_at timestamptz not null default now(),

  -- Estado anterior e atual (texto canônico; sem “estado mágico”)
  from_state text,
  to_state text,

  -- Atributos atuais (ex.: comprimento atual / recorde)
  current_length integer not null default 0,
  best_length integer not null default 0,

  metadata jsonb not null default '{}'::jsonb
);

comment on table public.gamification_streak_transitions is
  'FASE 5/E4: Histórico imutável de mudanças reconhecidas no estado de streak (append-only).';

create index if not exists idx_gam_streak_trans_user_recognized_at
  on public.gamification_streak_transitions (user_id, recognized_at desc);

create index if not exists idx_gam_streak_trans_user_streak
  on public.gamification_streak_transitions (user_id, streak_key);

-- -------------------------------------------------------
-- E4 (rastreamento) — Vínculo Transição ↔ Eventos Observados
-- -------------------------------------------------------
create table if not exists public.gamification_streak_transition_events (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete restrict,

  streak_transition_id uuid not null references public.gamification_streak_transitions(id) on delete restrict,
  observed_event_id uuid not null references public.gamification_observed_events(id) on delete restrict,

  linked_at timestamptz not null default now()
);

comment on table public.gamification_streak_transition_events is
  'FASE 5/E4: Tabela de ligação para rastreabilidade de transições até eventos observados (cadeia de prova).';

create unique index if not exists uq_gam_streak_trans_events_unique_link
  on public.gamification_streak_transition_events (user_id, streak_transition_id, observed_event_id);

create index if not exists idx_gam_streak_trans_events_user_linked_at
  on public.gamification_streak_transition_events (user_id, linked_at desc);

-- -------------------------------------------
-- E5 — Estado Atual Derivado de Streak (Snapshot)
-- -------------------------------------------
create table if not exists public.gamification_streak_snapshots (
  user_id uuid not null references auth.users(id) on delete restrict,
  streak_key text not null,

  -- Estado atual (ex.: ativo, quebrado, em pausa, etc.) — canonizado na Application.
  current_state text not null,

  current_length integer not null default 0,
  best_length integer not null default 0,

  -- Ponte de rastreio para a última transição consolidada (E4)
  last_transition_id uuid not null references public.gamification_streak_transitions(id) on delete restrict,

  updated_at timestamptz not null default now(),

  primary key (user_id, streak_key)
);

comment on table public.gamification_streak_snapshots is
  'FASE 5/E5: Snapshot derivado do histórico (E4). Permitido para leitura rápida, rastreável e apenas prospectivo (sem corrigir o passado).';

create index if not exists idx_gam_streak_snapshots_user_updated_at
  on public.gamification_streak_snapshots (user_id, updated_at desc);

-- -------------------------------------------
-- E6 — Log Canônico de Consolidação (anti-reprocessamento retroativo)
-- -------------------------------------------
create table if not exists public.gamification_consolidation_log (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete restrict,

  -- Janela temporal consolidada (qual período foi fechado).
  window_start date not null,
  window_end date not null,

  -- Instante de consolidação (tempo do sistema).
  consolidated_at timestamptz not null default now(),

  -- Referência à fonte: âncora em E1 (até onde o histórico foi considerado)
  source_observed_event_id uuid references public.gamification_observed_events(id) on delete restrict,

  -- Referência ao resultado: âncoras em E3/E4 (até onde se consolidou reconhecimento)
  result_last_achievement_grant_id uuid references public.gamification_achievement_grants(id) on delete restrict,
  result_last_streak_transition_id uuid references public.gamification_streak_transitions(id) on delete restrict,

  metadata jsonb not null default '{}'::jsonb,

  check (window_end >= window_start)
);

comment on table public.gamification_consolidation_log is
  'FASE 5/E6: Registro de consolidação por janela temporal. Uma vez consolidado, reprocessar o mesmo intervalo é proibido (unicidade por constraint).';

create unique index if not exists uq_gam_consolidation_user_window
  on public.gamification_consolidation_log (user_id, window_start, window_end);

create index if not exists idx_gam_consolidation_user_consolidated_at
  on public.gamification_consolidation_log (user_id, consolidated_at desc);

-- =====================================================================================
-- RLS — Deny-by-default + multi-tenant (user_id = auth.uid())
-- =====================================================================================

-- E1
alter table public.gamification_observed_events enable row level security;
create policy gam_obs_events_select_own
  on public.gamification_observed_events
  for select
  using (user_id = auth.uid());

create policy gam_obs_events_insert_own
  on public.gamification_observed_events
  for insert
  with check (user_id = auth.uid());

-- (sem policies de update/delete => append-only efetivo sob RLS)

-- E2
alter table public.gamification_observation_marks enable row level security;
create policy gam_obs_marks_select_own
  on public.gamification_observation_marks
  for select
  using (user_id = auth.uid());

create policy gam_obs_marks_insert_own
  on public.gamification_observation_marks
  for insert
  with check (user_id = auth.uid());

-- E3
alter table public.gamification_achievement_grants enable row level security;
create policy gam_ach_grants_select_own
  on public.gamification_achievement_grants
  for select
  using (user_id = auth.uid());

create policy gam_ach_grants_insert_own
  on public.gamification_achievement_grants
  for insert
  with check (user_id = auth.uid());

-- E3 link
alter table public.gamification_achievement_grant_events enable row level security;
create policy gam_ach_grant_events_select_own
  on public.gamification_achievement_grant_events
  for select
  using (user_id = auth.uid());

create policy gam_ach_grant_events_insert_own
  on public.gamification_achievement_grant_events
  for insert
  with check (user_id = auth.uid());

-- E4
alter table public.gamification_streak_transitions enable row level security;
create policy gam_streak_trans_select_own
  on public.gamification_streak_transitions
  for select
  using (user_id = auth.uid());

create policy gam_streak_trans_insert_own
  on public.gamification_streak_transitions
  for insert
  with check (user_id = auth.uid());

-- E4 link
alter table public.gamification_streak_transition_events enable row level security;
create policy gam_streak_trans_events_select_own
  on public.gamification_streak_transition_events
  for select
  using (user_id = auth.uid());

create policy gam_streak_trans_events_insert_own
  on public.gamification_streak_transition_events
  for insert
  with check (user_id = auth.uid());

-- E5 (snapshot: select/insert/update do próprio usuário; sem delete)
alter table public.gamification_streak_snapshots enable row level security;
create policy gam_streak_snapshots_select_own
  on public.gamification_streak_snapshots
  for select
  using (user_id = auth.uid());

create policy gam_streak_snapshots_insert_own
  on public.gamification_streak_snapshots
  for insert
  with check (user_id = auth.uid());

create policy gam_streak_snapshots_update_own
  on public.gamification_streak_snapshots
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- E6
alter table public.gamification_consolidation_log enable row level security;
create policy gam_consolidation_select_own
  on public.gamification_consolidation_log
  for select
  using (user_id = auth.uid());

create policy gam_consolidation_insert_own
  on public.gamification_consolidation_log
  for insert
  with check (user_id = auth.uid());

-- =====================================================================================
-- GRANTS (mínimos; RLS continua sendo a barreira real)
-- =====================================================================================
grant select, insert on public.gamification_observed_events to authenticated;
grant select, insert on public.gamification_observation_marks to authenticated;

grant select, insert on public.gamification_achievement_grants to authenticated;
grant select, insert on public.gamification_achievement_grant_events to authenticated;

grant select, insert on public.gamification_streak_transitions to authenticated;
grant select, insert on public.gamification_streak_transition_events to authenticated;

grant select, insert, update on public.gamification_streak_snapshots to authenticated;

grant select, insert on public.gamification_consolidation_log to authenticated;

