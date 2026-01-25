-- 20260124120000_legal_consents.sql
-- ETAPA 5 — Termos/LGPD: consentimento append-only + RLS

create table if not exists public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  doc_type text not null check (doc_type in ('TERMS', 'PRIVACY')),
  doc_version text not null,

  accepted_at timestamptz not null default now(),

  ip_hash text null,
  user_agent_hash text null,

  metadata jsonb not null default '{}'::jsonb
);

alter table public.legal_consents enable row level security;

-- Deny-by-default (não criar policy de update/delete)
revoke all on public.legal_consents from anon;
revoke all on public.legal_consents from authenticated;

grant select, insert on public.legal_consents to authenticated;

-- SELECT: apenas próprio user
create policy "legal_consents_select_own"
on public.legal_consents
for select
to authenticated
using (user_id = auth.uid());

-- INSERT: apenas próprio user (append-only)
create policy "legal_consents_insert_own"
on public.legal_consents
for insert
to authenticated
with check (user_id = auth.uid());
