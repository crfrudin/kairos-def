-- =========================================================
-- KAIROS · FASE 2 · ETAPA 4
-- PERSISTÊNCIA (SCHEMA + RLS) — MATÉRIAS & INFORMATIVOS
-- Regras: SQL declarativo; sem triggers; sem functions; sem lógica procedural
-- Multi-tenancy absoluto: user_id em 100% das tabelas + RLS user_id = auth.uid()
-- =========================================================

-- Requer extensão pgcrypto para gen_random_uuid() (Supabase geralmente já tem).
-- create extension if not exists pgcrypto;

-- =========================================================
-- 1) subjects (Agregado Subject)
-- =========================================================
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    constraint fk_subjects_user
    references auth.users (id) on delete cascade,

  name text not null
    constraint chk_subjects_name_len
    check (char_length(name) between 3 and 100),

  -- CategorySet: THEORY | QUESTIONS | LAW (não vazio)
  categories text[] not null
    constraint chk_subjects_categories_nonempty
    check (cardinality(categories) >= 1)
    constraint chk_subjects_categories_allowed
    check (categories <@ array['THEORY','QUESTIONS','LAW']),

  -- SubjectStatus: ATIVA | EM_ANDAMENTO | CONCLUIDA | PAUSADA | BLOQUEADA
  status text not null
    constraint chk_subjects_status
    check (status in ('ATIVA','EM_ANDAMENTO','CONCLUIDA','PAUSADA','BLOQUEADA')),

  -- =========================
  -- THEORY (TheoryConfig -> ReadingTrack / VideoTrack)
  -- =========================
  reading_total_pages integer null
    constraint chk_subjects_reading_total_pages
    check (reading_total_pages between 1 and 9999),
  reading_read_pages integer null
    constraint chk_subjects_reading_read_pages_nonneg
    check (reading_read_pages >= 0),
  reading_pacing_mode text null
    constraint chk_subjects_reading_pacing_mode
    check (reading_pacing_mode in ('FIXED_PAGES_PER_DAY','PACE_PAGES_PER_HOUR')),
  reading_pages_per_day integer null
    constraint chk_subjects_reading_pages_per_day
    check (reading_pages_per_day between 1 and 9999),
  reading_pages_per_hour integer null
    constraint chk_subjects_reading_pages_per_hour
    check (reading_pages_per_hour between 1 and 500),

  video_total_blocks integer null
    constraint chk_subjects_video_total_blocks
    check (video_total_blocks between 1 and 9999),
  video_watched_blocks integer null
    constraint chk_subjects_video_watched_blocks_nonneg
    check (video_watched_blocks >= 0),
  video_pacing_mode text null
    constraint chk_subjects_video_pacing_mode
    check (video_pacing_mode in ('FIXED_BLOCKS_PER_DAY','AUTO_BY_DURATION')),
  video_blocks_per_day integer null
    constraint chk_subjects_video_blocks_per_day
    check (video_blocks_per_day between 1 and 9999),
  video_avg_minutes integer null
    constraint chk_subjects_video_avg_minutes
    check (video_avg_minutes between 1 and 300),
  video_playback_speed text null
    constraint chk_subjects_video_playback_speed
    check (video_playback_speed in ('X1','X1_5','X2')),

  -- =========================
  -- QUESTIONS (QuestionsMeta)
  -- =========================
  questions_daily_target integer null
    constraint chk_subjects_questions_daily_target
    check (questions_daily_target between 1 and 999),

  -- =========================
  -- LAW (LawConfig)
  -- =========================
  law_name text null
    constraint chk_subjects_law_name_len
    check (law_name is null or char_length(law_name) <= 200),
  law_total_articles integer null
    constraint chk_subjects_law_total_articles
    check (law_total_articles between 1 and 9999999),
  law_read_articles integer null
    constraint chk_subjects_law_read_articles_nonneg
    check (law_read_articles >= 0),
  law_mode text null
    constraint chk_subjects_law_mode
    check (law_mode in ('COUPLED_TO_THEORY','FIXED_ARTICLES_PER_DAY')),
  law_link_type text null
    constraint chk_subjects_law_link_type
    check (law_link_type in ('SUBJECT','STANDALONE_OTHER')),
  law_other_subject_label text null
    constraint chk_subjects_law_other_label_len
    check (law_other_subject_label is null or char_length(law_other_subject_label) between 1 and 200),

  -- Soft delete (conceitual)
  is_deleted boolean not null default false,

  -- Auditoria mínima
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- =========================
  -- CHECKs de coerência estrutural (sem duplicar Application)
  -- =========================

  -- Se THEORY NÃO está ativa, zera (null) todos os campos de theory.
    constraint chk_subjects_theory_null_when_inactive
  check (
    (('THEORY' = any(categories))) OR (
      reading_total_pages is null and reading_read_pages is null and reading_pacing_mode is null
      and reading_pages_per_day is null and reading_pages_per_hour is null
      and video_total_blocks is null and video_watched_blocks is null and video_pacing_mode is null
      and video_blocks_per_day is null and video_avg_minutes is null and video_playback_speed is null
    )
  ),

  -- Se THEORY está ativa, exige ao menos uma trilha (reading ou video).
    constraint chk_subjects_theory_requires_some_track
  check (
    (not ('THEORY' = any(categories))) OR (reading_total_pages is not null or video_total_blocks is not null)
  ),

  -- Reading: se definido, exige read_pages <= total_pages
  constraint chk_subjects_reading_read_le_total
  check (
    (reading_total_pages is null) or (reading_read_pages is not null and reading_read_pages <= reading_total_pages)
  ),

  -- Reading pacing exclusividade
  constraint chk_subjects_reading_pacing_exclusive
  check (
    reading_pacing_mode is null
    or (
      (reading_pacing_mode = 'FIXED_PAGES_PER_DAY' and reading_pages_per_day is not null and reading_pages_per_hour is null)
      or
      (reading_pacing_mode = 'PACE_PAGES_PER_HOUR' and reading_pages_per_hour is not null and reading_pages_per_day is null)
    )
  ),

  -- Video: se definido, exige watched_blocks <= total_blocks
  constraint chk_subjects_video_watched_le_total
  check (
    (video_total_blocks is null) or (video_watched_blocks is not null and video_watched_blocks <= video_total_blocks)
  ),

  -- Video pacing exclusividade
  constraint chk_subjects_video_pacing_exclusive
  check (
    video_pacing_mode is null
    or (
      (video_pacing_mode = 'FIXED_BLOCKS_PER_DAY' and video_blocks_per_day is not null
        and video_avg_minutes is null and video_playback_speed is null)
      or
      (video_pacing_mode = 'AUTO_BY_DURATION' and video_avg_minutes is not null and video_playback_speed is not null
        and video_blocks_per_day is null)
    )
  ),

  -- QUESTIONS: se inativa, questions_daily_target deve ser null; se ativa, não-null
  constraint chk_subjects_questions_presence
  check (
    (('QUESTIONS' = any(categories)) and questions_daily_target is not null)
    or
    ((not ('QUESTIONS' = any(categories))) and questions_daily_target is null)
  ),

  -- LAW: se inativa, law_* deve ser null; se ativa, mínimos não-null
  constraint chk_subjects_law_presence
  check (
    (('LAW' = any(categories)) and law_name is not null and law_total_articles is not null and law_read_articles is not null and law_mode is not null and law_link_type is not null)
    or
    ((not ('LAW' = any(categories))) and law_name is null and law_total_articles is null and law_read_articles is null and law_mode is null and law_link_type is null and law_other_subject_label is null)
  ),

  -- Law read_articles <= total_articles
  constraint chk_subjects_law_read_le_total
  check (
    (law_total_articles is null) or (law_read_articles is not null and law_read_articles <= law_total_articles)
  ),

  -- Law link_type standalone exige label
  constraint chk_subjects_law_standalone_requires_label
  check (
    law_link_type is null
    or law_link_type = 'SUBJECT'
    or (law_link_type = 'STANDALONE_OTHER' and law_other_subject_label is not null and char_length(law_other_subject_label) >= 1)
  )
);

create index if not exists idx_subjects_user_deleted
  on public.subjects (user_id, is_deleted);

create index if not exists idx_subjects_user_status
  on public.subjects (user_id, status);

create index if not exists idx_subjects_user_name
  on public.subjects (user_id, name);


-- =========================================================
-- 2) subject_priority_order (ordem determinística por usuário)
-- =========================================================
create table if not exists public.subject_priority_order (
  user_id uuid not null
    constraint fk_subject_priority_user
    references auth.users (id) on delete cascade,

  subject_id uuid not null
    constraint fk_subject_priority_subject
    references public.subjects (id) on delete restrict,

  position integer not null
    constraint chk_subject_priority_position
    check (position >= 1),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_subject_priority primary key (user_id, subject_id),
  constraint uq_subject_priority_user_position unique (user_id, position)
);

create index if not exists idx_subject_priority_user_position
  on public.subject_priority_order (user_id, position);


-- =========================================================
-- 3) subject_activation_schedule (free plan D+1)
-- =========================================================
create table if not exists public.subject_activation_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    constraint fk_subject_activation_user
    references auth.users (id) on delete cascade,

  effective_date date not null,

  active_subject_id_1 uuid not null
    constraint fk_subject_activation_subject_1
    references public.subjects (id) on delete restrict,

  active_subject_id_2 uuid not null
    constraint fk_subject_activation_subject_2
    references public.subjects (id) on delete restrict,

  created_at timestamptz not null default now(),

  constraint chk_subject_activation_distinct
    check (active_subject_id_1 <> active_subject_id_2),

  constraint uq_subject_activation_user_effective_date
    unique (user_id, effective_date)
);

create index if not exists idx_subject_activation_user_effective_date
  on public.subject_activation_schedule (user_id, effective_date);


-- =========================================================
-- 4) standalone_laws (lei seca "Outro")
-- =========================================================
create table if not exists public.standalone_laws (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    constraint fk_standalone_laws_user
    references auth.users (id) on delete cascade,

  other_subject_label text not null
    constraint chk_standalone_laws_other_label_len
    check (char_length(other_subject_label) between 1 and 200),

  law_name text not null
    constraint chk_standalone_laws_law_name_len
    check (char_length(law_name) <= 200),

  law_total_articles integer not null
    constraint chk_standalone_laws_total_articles
    check (law_total_articles between 1 and 9999999),

  law_read_articles integer not null
    constraint chk_standalone_laws_read_articles_nonneg
    check (law_read_articles >= 0),

  law_mode text not null
    constraint chk_standalone_laws_law_mode
    check (law_mode in ('COUPLED_TO_THEORY','FIXED_ARTICLES_PER_DAY')),

  is_deleted boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_standalone_laws_read_le_total
    check (law_read_articles <= law_total_articles)
);

create index if not exists idx_standalone_laws_user_deleted
  on public.standalone_laws (user_id, is_deleted);

create index if not exists idx_standalone_laws_user_label
  on public.standalone_laws (user_id, other_subject_label);


-- =========================================================
-- 5) informative_follows
-- =========================================================
create table if not exists public.informative_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    constraint fk_informative_follows_user
    references auth.users (id) on delete cascade,

  tribunal text not null
    constraint chk_informative_follows_tribunal
    check (tribunal in ('STF','STJ','TST','TSE')),

  last_read_number integer not null default 0
    constraint chk_informative_follows_last_read_number
    check (last_read_number between 0 and 9999),

  -- soft delete conceitual: isActive=false
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_informative_follows_user_tribunal unique (user_id, tribunal)
);

create index if not exists idx_informative_follows_user_active
  on public.informative_follows (user_id, is_active);

create index if not exists idx_informative_follows_user_tribunal
  on public.informative_follows (user_id, tribunal);

-- =========================================================
-- RLS · deny-by-default + policies por tabela
-- =========================================================

-- subjects

alter table public.subjects enable row level security;

drop policy if exists "subjects_select_own" on public.subjects;
create policy "subjects_select_own"
on public.subjects
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "subjects_insert_own" on public.subjects;
create policy "subjects_insert_own"
on public.subjects
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "subjects_update_own" on public.subjects;
create policy "subjects_update_own"
on public.subjects
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "subjects_delete_own" on public.subjects;
create policy "subjects_delete_own"
on public.subjects
for delete
to authenticated
using (user_id = auth.uid());


-- subject_priority_order
alter table public.subject_priority_order enable row level security;

drop policy if exists "subject_priority_select_own" on public.subject_priority_order;
create policy "subject_priority_select_own"
on public.subject_priority_order
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "subject_priority_insert_own" on public.subject_priority_order;
create policy "subject_priority_insert_own"
on public.subject_priority_order
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "subject_priority_update_own" on public.subject_priority_order;
create policy "subject_priority_update_own"
on public.subject_priority_order
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "subject_priority_delete_own" on public.subject_priority_order;
create policy "subject_priority_delete_own"
on public.subject_priority_order
for delete
to authenticated
using (user_id = auth.uid());


-- subject_activation_schedule
alter table public.subject_activation_schedule enable row level security;

drop policy if exists "subject_activation_select_own" on public.subject_activation_schedule;
create policy "subject_activation_select_own"
on public.subject_activation_schedule
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "subject_activation_insert_own" on public.subject_activation_schedule;
create policy "subject_activation_insert_own"
on public.subject_activation_schedule
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "subject_activation_update_own" on public.subject_activation_schedule;
create policy "subject_activation_update_own"
on public.subject_activation_schedule
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "subject_activation_delete_own" on public.subject_activation_schedule;
create policy "subject_activation_delete_own"
on public.subject_activation_schedule
for delete
to authenticated
using (user_id = auth.uid());


-- standalone_laws
alter table public.standalone_laws enable row level security;

drop policy if exists "standalone_laws_select_own" on public.standalone_laws;
create policy "standalone_laws_select_own"
on public.standalone_laws
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "standalone_laws_insert_own" on public.standalone_laws;
create policy "standalone_laws_insert_own"
on public.standalone_laws
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "standalone_laws_update_own" on public.standalone_laws;
create policy "standalone_laws_update_own"
on public.standalone_laws
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "standalone_laws_delete_own" on public.standalone_laws;
create policy "standalone_laws_delete_own"
on public.standalone_laws
for delete
to authenticated
using (user_id = auth.uid());


-- informative_follows
alter table public.informative_follows enable row level security;

drop policy if exists "informative_follows_select_own" on public.informative_follows;
create policy "informative_follows_select_own"
on public.informative_follows
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "informative_follows_insert_own" on public.informative_follows;
create policy "informative_follows_insert_own"
on public.informative_follows
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "informative_follows_update_own" on public.informative_follows;
create policy "informative_follows_update_own"
on public.informative_follows
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "informative_follows_delete_own" on public.informative_follows;
create policy "informative_follows_delete_own"
on public.informative_follows
for delete
to authenticated
using (user_id = auth.uid());
