-- =========================================================
-- KAIROS · FASE 8 · ETAPA D
-- AUTH — AUDITORIA E EVENTOS DE AUTENTICAÇÃO (DDL + RLS)
--
-- Objetivo:
--  - Registrar eventos factuais/imutáveis de autenticação, sem dados sensíveis
--  - Suportar rastreabilidade, compliance e análise forense
--
-- Proibições desta etapa:
--  - Sem triggers, sem functions, sem procedures, sem lógica procedural
--  - Sem alteração em middleware/auth runtime/UI/endpoints
--
-- Regras de acesso:
--  - RLS em 100% (tabela de logs)
--  - Usuários comuns: ZERO acesso (nenhuma policy para authenticated/anon)
--  - Acesso permitido: service role (bypass RLS no Supabase) e admin futuro (policy preparada)
-- =========================================================

-- =========================================================
-- 1) TIPO CONTROLADO DE EVENTOS (ENUM)
-- =========================================================

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'auth_audit_event_type' and n.nspname = 'public') then
    create type public.auth_audit_event_type as enum (
      'login_success',
      'login_failure',
      'logout',
      'signup',
      'email_confirmed',
      'password_reset_requested',
      'password_reset_completed'
    );
  end if;
end
$$;

comment on type public.auth_audit_event_type is
'Tipos de eventos auditáveis de autenticação. Controlado e fechado (enum).';

-- =========================================================
-- 2) TABELA IMUTÁVEL DE EVENTOS (APENAS FATOS)
-- =========================================================

create table if not exists public.auth_audit_events (
  -- Identificador do evento (imutável)
  id uuid primary key default gen_random_uuid(),

  -- user_id pode ser NULL para eventos sem identidade confirmada (ex.: login_failure)
  user_id uuid null
    constraint fk_auth_audit_events_user
    references auth.users (id) on delete set null,

  -- Tipo do evento (controlado)
  event_type public.auth_audit_event_type not null,

  -- Momento do evento (fato)
  occurred_at timestamptz not null default now(),

  -- Hashes (NUNCA armazenar IP / UA em claro)
  ip_hash text not null,
  user_agent_hash text not null,

  -- Metadados (restritos) - SEM dados sensíveis
  metadata jsonb not null default '{}'::jsonb,

  -- Auditoria mínima de inserção (não muda o fato ocorrido_at; apenas rastreio de persistência)
  inserted_at timestamptz not null default now(),

  -- CHECKs defensivos: formato mínimo e proibições explícitas
  constraint chk_auth_audit_events_ip_hash_min_len
    check (length(ip_hash) between 16 and 256),

  constraint chk_auth_audit_events_user_agent_hash_min_len
    check (length(user_agent_hash) between 16 and 256),

  -- metadata deve ser um objeto JSON (evita array/string)
  constraint chk_auth_audit_events_metadata_is_object
    check (jsonb_typeof(metadata) = 'object'),

  -- Proibição de chaves sensíveis (top-level)
  -- Obs.: não garante 100% contra payload sensível aninhado, mas cria barreira objetiva e auditável.
  constraint chk_auth_audit_events_metadata_no_sensitive_keys
    check (
      not (metadata ? 'email')
      and not (metadata ? 'password')
      and not (metadata ? 'senha')
      and not (metadata ? 'token')
      and not (metadata ? 'access_token')
      and not (metadata ? 'refresh_token')
      and not (metadata ? 'ip')
      and not (metadata ? 'user_agent')
      and not (metadata ? 'authorization')
    )
);

comment on table public.auth_audit_events is
'FASE 8 (ETAPA D): Eventos imutáveis de autenticação para auditoria/forense. Proibido armazenar dados sensíveis (email, tokens, IP em claro).';

comment on column public.auth_audit_events.user_id is
'Pode ser NULL quando a identidade não é confirmada (ex.: login_failure).';
comment on column public.auth_audit_events.ip_hash is
'Hash do IP (NUNCA armazenar IP em claro).';
comment on column public.auth_audit_events.user_agent_hash is
'Hash do User-Agent (NUNCA armazenar User-Agent em claro).';
comment on column public.auth_audit_events.metadata is
'JSONB restrito (sem dados sensíveis). Apenas atributos mínimos para auditoria (ex.: reason_code).';

-- Índices para investigações e análises (sem expor dados)
create index if not exists idx_auth_audit_events_occurred_at_desc
  on public.auth_audit_events (occurred_at desc);

create index if not exists idx_auth_audit_events_user_occurred_at_desc
  on public.auth_audit_events (user_id, occurred_at desc);

create index if not exists idx_auth_audit_events_type_occurred_at_desc
  on public.auth_audit_events (event_type, occurred_at desc);

-- =========================================================
-- 3) RLS — RESTRITIVO POR PADRÃO (ZERO acesso para usuários)
-- =========================================================

alter table public.auth_audit_events enable row level security;

-- IMPORTANTE:
-- - Não criamos policy para anon/authenticated => acesso negado por padrão.
-- - Service role (Supabase) bypassa RLS => escrita/leitura via backend/rotina de auditoria.
-- - Preparamos policy para um futuro papel admin, sem UI nesta etapa.

-- Remove qualquer policy antiga (hardening)
drop policy if exists "auth_audit_admin_select" on public.auth_audit_events;

-- Admin futuro: permitir SOMENTE SELECT quando claim explícita existir.
-- Modelo: JWT app_metadata.role = "admin"
create policy "auth_audit_admin_select"
on public.auth_audit_events
for select
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

comment on policy "auth_audit_admin_select" on public.auth_audit_events is
'Permite leitura apenas para admin futuro via claim app_metadata.role=admin. Usuários comuns não têm qualquer acesso.';

-- Nenhuma policy de INSERT/UPDATE/DELETE é criada deliberadamente:
-- - Usuários comuns: sem acesso
-- - Service role: bypass RLS (escrita/leitura controlada fora do DB, em camada autorizada)
