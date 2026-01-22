-- FASE INFORMATIVOS (Robot + Latest)
-- Tabelas globais (não por usuário) + logs de execução
-- Segurança: RLS deny-by-default, escrita/leitura sensível via service_role (job),
-- e leitura do "latest" liberada para authenticated (para UC-I01 enriquecer DTO).

create table if not exists public.informative_latest_by_tribunal (
  tribunal text primary key check (tribunal in ('STF','STJ','TST','TSE')),
  latest_available_number integer not null check (latest_available_number >= 0),
  source text not null,
  checked_at timestamptz not null default now(),
  checked_day date not null
)
create table if not exists public.informative_robot_runs (
  id uuid primary key default gen_random_uuid(),
  run_day date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  status text not null check (status in ('STARTED','SUCCESS','FAILED','SKIPPED')),
  details jsonb not null default '{}'::jsonb,
  error_message text null
)
-- Garante "no máximo 1 execução por dia"
create unique index if not exists informative_robot_runs_unique_day on public.informative_robot_runs(run_day)
alter table public.informative_latest_by_tribunal enable row level security
alter table public.informative_robot_runs enable row level security
-- Latest: authenticated pode ler (para API/UC enriquecer DTO)
drop policy if exists "informative_latest_select_authenticated" on public.informative_latest_by_tribunal
create policy "informative_latest_select_authenticated"
on public.informative_latest_by_tribunal
for select
to authenticated
using (true)
-- Latest: somente service_role pode inserir/atualizar
drop policy if exists "informative_latest_write_service_role" on public.informative_latest_by_tribunal
create policy "informative_latest_write_service_role"
on public.informative_latest_by_tribunal
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role')
-- Runs: somente service_role pode ler/escrever (logs são sensíveis)
drop policy if exists "informative_runs_service_role_only" on public.informative_robot_runs
create policy "informative_runs_service_role_only"
on public.informative_robot_runs
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role')