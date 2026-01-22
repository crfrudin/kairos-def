-- 20260121241564_informatives_robot.sql
-- V2 (STJ) — suporte a "Edição Extraordinária" SEM quebrar o fluxo atual do STJ regular.
-- Regras: sem triggers/functions; RLS obrigatório; multi-tenant por auth.uid().

begin;

-- =========================================================
-- 1) GLOBAL: último "extraordinário" disponível (robô)
-- =========================================================
create table if not exists public.informative_latest_stj_extraordinary (
  -- tabela singleton (1 linha): chave fixa
  key text primary key,
  latest_available_edition_number integer not null,
  source text not null,
  checked_day date not null,
  checked_at timestamp with time zone not null,

  constraint informative_latest_stj_extraordinary_key_check
    check (key = 'STJ_EXTRA'),

  constraint informative_latest_stj_extraordinary_latest_available_edition_number_check
    check (latest_available_edition_number >= 0)
);

alter table public.informative_latest_stj_extraordinary enable row level security;

-- SELECT: qualquer usuário autenticado pode ler (igual à informative_latest_by_tribunal)
drop policy if exists informative_latest_stj_extraordinary_select_authenticated
  on public.informative_latest_stj_extraordinary;

create policy informative_latest_stj_extraordinary_select_authenticated
  on public.informative_latest_stj_extraordinary
  for select
  to authenticated
  using (true);

-- WRITE: somente service_role (robô) pode inserir/atualizar/apagar
drop policy if exists informative_latest_stj_extraordinary_write_service_role
  on public.informative_latest_stj_extraordinary;

create policy informative_latest_stj_extraordinary_write_service_role
  on public.informative_latest_stj_extraordinary
  for all
  to public
  using (auth.role() = 'service_role'::text)
  with check (auth.role() = 'service_role'::text);


-- =========================================================
-- 2) PER-USER: último "extraordinário" lido pelo usuário
-- =========================================================
create table if not exists public.informative_follow_stj_extraordinary (
  user_id uuid primary key,
  last_read_edition_number integer not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint informative_follow_stj_extraordinary_user_fk
    foreign key (user_id) references auth.users(id) on delete cascade,

  constraint informative_follow_stj_extraordinary_last_read_edition_number_check
    check (last_read_edition_number >= 0)
);

alter table public.informative_follow_stj_extraordinary enable row level security;

-- Usuário autenticado lê apenas o próprio registro
drop policy if exists informative_follow_stj_extraordinary_select_own
  on public.informative_follow_stj_extraordinary;

create policy informative_follow_stj_extraordinary_select_own
  on public.informative_follow_stj_extraordinary
  for select
  to authenticated
  using (user_id = auth.uid());

-- Usuário autenticado cria o próprio registro
drop policy if exists informative_follow_stj_extraordinary_insert_own
  on public.informative_follow_stj_extraordinary;

create policy informative_follow_stj_extraordinary_insert_own
  on public.informative_follow_stj_extraordinary
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Usuário autenticado atualiza apenas o próprio registro
drop policy if exists informative_follow_stj_extraordinary_update_own
  on public.informative_follow_stj_extraordinary;

create policy informative_follow_stj_extraordinary_update_own
  on public.informative_follow_stj_extraordinary
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- (Opcional) permitir delete do próprio registro
drop policy if exists informative_follow_stj_extraordinary_delete_own
  on public.informative_follow_stj_extraordinary;

create policy informative_follow_stj_extraordinary_delete_own
  on public.informative_follow_stj_extraordinary
  for delete
  to authenticated
  using (user_id = auth.uid());

commit;
