-- STJ V2 (EXTRAORDINÁRIO)
-- Objetivo: adicionar trilha separada para edições extraordinárias SEM quebrar o fluxo regular.
-- Estratégia:
-- - Mantém informative_latest_by_tribunal e informative_follows para REGULAR
-- - Cria tabelas novas para EXTRAORDINÁRIO (latest global + follow por usuário)

create table if not exists public.informative_latest_extraordinary_by_tribunal (
  tribunal text primary key check (tribunal in ('STJ')),
  latest_available_number integer not null check (latest_available_number >= 0),
  source text not null,
  checked_at timestamptz not null default now(),
  checked_day date not null
);

create table if not exists public.informative_extraordinary_follows (
  user_id uuid not null,
  tribunal text not null check (tribunal in ('STJ')),
  last_read_number integer not null check (last_read_number >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tribunal)
);

alter table public.informative_latest_extraordinary_by_tribunal enable row level security;
alter table public.informative_extraordinary_follows enable row level security;

-- Latest EXTRA: authenticated pode ler (para UI/UC enriquecer no futuro)
drop policy if exists "informative_latest_extra_select_authenticated" on public.informative_latest_extraordinary_by_tribunal;
create policy "informative_latest_extra_select_authenticated"
on public.informative_latest_extraordinary_by_tribunal
for select
to authenticated
using (true);

-- Latest EXTRA: somente service_role pode inserir/atualizar
drop policy if exists "informative_latest_extra_write_service_role" on public.informative_latest_extraordinary_by_tribunal;
create policy "informative_latest_extra_write_service_role"
on public.informative_latest_extraordinary_by_tribunal
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Follows EXTRA: multi-tenant por auth.uid()
drop policy if exists "informative_extra_follows_select_own" on public.informative_extraordinary_follows;
create policy "informative_extra_follows_select_own"
on public.informative_extraordinary_follows
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "informative_extra_follows_insert_own" on public.informative_extraordinary_follows;
create policy "informative_extra_follows_insert_own"
on public.informative_extraordinary_follows
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "informative_extra_follows_update_own" on public.informative_extraordinary_follows;
create policy "informative_extra_follows_update_own"
on public.informative_extraordinary_follows
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "informative_extra_follows_delete_own" on public.informative_extraordinary_follows;
create policy "informative_extra_follows_delete_own"
on public.informative_extraordinary_follows
for delete
to authenticated
using (user_id = auth.uid());