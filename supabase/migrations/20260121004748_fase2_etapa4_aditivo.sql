-- =========================================================
-- KAIROS · FASE 2 · ETAPA 4 (REABERTURA) · ADITIVO A v2
-- Safe migration: sem NOT NULL “às cegas” em tabelas já populadas
-- Proibições: sem triggers, sem functions, sem procedures
-- =========================================================

-- =========================================================
-- A1) HARDENING: permitir FK composta (user_id, subject_id) com clareza
-- Requisito: subjects.user_id e subjects.id devem existir (estado do Gate).
-- =========================================================

alter table public.subjects
  drop constraint if exists uq_subjects_user_id_id;

alter table public.subjects
  add constraint uq_subjects_user_id_id unique (user_id, id);

-- =========================================================
-- A2.1) subject_theory_reading_tracks
-- =========================================================

create table if not exists public.subject_theory_reading_tracks (
  user_id uuid not null,
  subject_id uuid not null,

  total_pages integer not null check (total_pages between 1 and 9999),
  read_pages integer not null default 0 check (read_pages >= 0),
  pacing_mode text not null check (pacing_mode in ('FIXED_PAGES_PER_DAY','PACE_PAGES_PER_HOUR')),
  pages_per_day integer null,
  pages_per_hour integer null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_subject_theory_reading_tracks primary key (user_id, subject_id),

  constraint fk_reading_tracks_user
    foreign key (user_id) references auth.users(id) on delete cascade,

  constraint fk_reading_tracks_subject
    foreign key (user_id, subject_id) references public.subjects(user_id, id) on delete cascade,

  constraint chk_read_pages_not_above_total
    check (read_pages <= total_pages),

  constraint chk_reading_pacing_exclusive
    check (
      (pacing_mode = 'FIXED_PAGES_PER_DAY'
        and pages_per_day is not null
        and pages_per_day between 1 and total_pages
        and pages_per_hour is null)
      or
      (pacing_mode = 'PACE_PAGES_PER_HOUR'
        and pages_per_hour is not null
        and pages_per_hour between 1 and 500
        and pages_per_day is null)
    )
);

create index if not exists idx_reading_tracks_user
  on public.subject_theory_reading_tracks (user_id);

-- =========================================================
-- A2.2) subject_theory_video_tracks
-- =========================================================

create table if not exists public.subject_theory_video_tracks (
  user_id uuid not null,
  subject_id uuid not null,

  total_blocks integer not null check (total_blocks between 1 and 9999),
  watched_blocks integer not null default 0 check (watched_blocks >= 0),
  pacing_mode text not null check (pacing_mode in ('FIXED_BLOCKS_PER_DAY','AUTO_BY_DURATION')),
  blocks_per_day integer null,
  avg_minutes integer null,
  playback_speed text null check (playback_speed in ('1x','1.5x','2x')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_subject_theory_video_tracks primary key (user_id, subject_id),

  constraint fk_video_tracks_user
    foreign key (user_id) references auth.users(id) on delete cascade,

  constraint fk_video_tracks_subject
    foreign key (user_id, subject_id) references public.subjects(user_id, id) on delete cascade,

  constraint chk_watched_not_above_total
    check (watched_blocks <= total_blocks),

  constraint chk_video_pacing_exclusive
    check (
      (pacing_mode = 'FIXED_BLOCKS_PER_DAY'
        and blocks_per_day is not null
        and blocks_per_day between 1 and total_blocks
        and avg_minutes is null
        and playback_speed is null)
      or
      (pacing_mode = 'AUTO_BY_DURATION'
        and avg_minutes is not null
        and avg_minutes between 1 and 300
        and playback_speed is not null
        and blocks_per_day is null)
    )
);

create index if not exists idx_video_tracks_user
  on public.subject_theory_video_tracks (user_id);

-- =========================================================
-- A2.3) subject_questions_meta
-- =========================================================

create table if not exists public.subject_questions_meta (
  user_id uuid not null,
  subject_id uuid not null,

  daily_target integer not null check (daily_target between 1 and 999),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_subject_questions_meta primary key (user_id, subject_id),

  constraint fk_questions_meta_user
    foreign key (user_id) references auth.users(id) on delete cascade,

  constraint fk_questions_meta_subject
    foreign key (user_id, subject_id) references public.subjects(user_id, id) on delete cascade
);

create index if not exists idx_questions_meta_user
  on public.subject_questions_meta (user_id);

-- =========================================================
-- A2.4) subject_law_configs (lei vinculada à matéria)
-- =========================================================

create table if not exists public.subject_law_configs (
  user_id uuid not null,
  subject_id uuid not null,

  law_name text not null check (char_length(law_name) <= 200),
  total_articles integer not null check (total_articles between 1 and 9999999),
  read_articles integer not null default 0 check (read_articles >= 0),

  law_mode text not null check (law_mode in ('COUPLED_TO_THEORY','FIXED_ARTICLES_PER_DAY')),
  fixed_articles_per_day integer null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_subject_law_configs primary key (user_id, subject_id),

  constraint fk_law_configs_user
    foreign key (user_id) references auth.users(id) on delete cascade,

  constraint fk_law_configs_subject
    foreign key (user_id, subject_id) references public.subjects(user_id, id) on delete cascade,

  constraint chk_read_articles_not_above_total
    check (read_articles <= total_articles),

  constraint chk_law_mode_exclusive
    check (
      (law_mode = 'COUPLED_TO_THEORY' and fixed_articles_per_day is null)
      or
      (law_mode = 'FIXED_ARTICLES_PER_DAY' and fixed_articles_per_day is not null and fixed_articles_per_day > 0)
    )
);

create index if not exists idx_law_configs_user
  on public.subject_law_configs (user_id);

-- =========================================================
-- A3) standalone_laws — adição segura (nullable + checks condicionais)
-- =========================================================

alter table public.standalone_laws
  add column if not exists law_name text null,
  add column if not exists total_articles integer null,
  add column if not exists read_articles integer null,
  add column if not exists law_mode text null,
  add column if not exists fixed_articles_per_day integer null,
  add column if not exists updated_at timestamptz null;

alter table public.standalone_laws
  drop constraint if exists chk_standalone_law_bundle_optional_or_valid;

alter table public.standalone_laws
  add constraint chk_standalone_law_bundle_optional_or_valid
  check (
    (law_name is null and total_articles is null and read_articles is null and law_mode is null and fixed_articles_per_day is null)
    or
    (
      law_name is not null
      and char_length(law_name) <= 200
      and total_articles between 1 and 9999999
      and read_articles between 0 and total_articles
      and law_mode in ('COUPLED_TO_THEORY','FIXED_ARTICLES_PER_DAY')
      and (
        (law_mode = 'COUPLED_TO_THEORY' and fixed_articles_per_day is null)
        or
        (law_mode = 'FIXED_ARTICLES_PER_DAY' and fixed_articles_per_day is not null and fixed_articles_per_day > 0)
      )
    )
  );

update public.standalone_laws
set updated_at = now()
where updated_at is null;

alter table public.standalone_laws
  alter column updated_at set default now();

-- =========================================================
-- RLS — novas tabelas + standalone_laws (deny-by-default)
-- =========================================================

alter table public.subject_theory_reading_tracks enable row level security;

drop policy if exists "reading_tracks_select_own" on public.subject_theory_reading_tracks;
create policy "reading_tracks_select_own"
on public.subject_theory_reading_tracks for select
using (user_id = auth.uid());

drop policy if exists "reading_tracks_insert_own" on public.subject_theory_reading_tracks;
create policy "reading_tracks_insert_own"
on public.subject_theory_reading_tracks for insert
with check (user_id = auth.uid());

drop policy if exists "reading_tracks_update_own" on public.subject_theory_reading_tracks;
create policy "reading_tracks_update_own"
on public.subject_theory_reading_tracks for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "reading_tracks_delete_own" on public.subject_theory_reading_tracks;
create policy "reading_tracks_delete_own"
on public.subject_theory_reading_tracks for delete
using (user_id = auth.uid());


alter table public.subject_theory_video_tracks enable row level security;

drop policy if exists "video_tracks_select_own" on public.subject_theory_video_tracks;
create policy "video_tracks_select_own"
on public.subject_theory_video_tracks for select
using (user_id = auth.uid());

drop policy if exists "video_tracks_insert_own" on public.subject_theory_video_tracks;
create policy "video_tracks_insert_own"
on public.subject_theory_video_tracks for insert
with check (user_id = auth.uid());

drop policy if exists "video_tracks_update_own" on public.subject_theory_video_tracks;
create policy "video_tracks_update_own"
on public.subject_theory_video_tracks for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "video_tracks_delete_own" on public.subject_theory_video_tracks;
create policy "video_tracks_delete_own"
on public.subject_theory_video_tracks for delete
using (user_id = auth.uid());


alter table public.subject_questions_meta enable row level security;

drop policy if exists "questions_meta_select_own" on public.subject_questions_meta;
create policy "questions_meta_select_own"
on public.subject_questions_meta for select
using (user_id = auth.uid());

drop policy if exists "questions_meta_insert_own" on public.subject_questions_meta;
create policy "questions_meta_insert_own"
on public.subject_questions_meta for insert
with check (user_id = auth.uid());

drop policy if exists "questions_meta_update_own" on public.subject_questions_meta;
create policy "questions_meta_update_own"
on public.subject_questions_meta for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "questions_meta_delete_own" on public.subject_questions_meta;
create policy "questions_meta_delete_own"
on public.subject_questions_meta for delete
using (user_id = auth.uid());


alter table public.subject_law_configs enable row level security;

drop policy if exists "law_configs_select_own" on public.subject_law_configs;
create policy "law_configs_select_own"
on public.subject_law_configs for select
using (user_id = auth.uid());

drop policy if exists "law_configs_insert_own" on public.subject_law_configs;
create policy "law_configs_insert_own"
on public.subject_law_configs for insert
with check (user_id = auth.uid());

drop policy if exists "law_configs_update_own" on public.subject_law_configs;
create policy "law_configs_update_own"
on public.subject_law_configs for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "law_configs_delete_own" on public.subject_law_configs;
create policy "law_configs_delete_own"
on public.subject_law_configs for delete
using (user_id = auth.uid());


alter table public.standalone_laws enable row level security;

drop policy if exists "standalone_laws_select_own" on public.standalone_laws;
create policy "standalone_laws_select_own"
on public.standalone_laws for select
using (user_id = auth.uid());

drop policy if exists "standalone_laws_insert_own" on public.standalone_laws;
create policy "standalone_laws_insert_own"
on public.standalone_laws for insert
with check (user_id = auth.uid());

drop policy if exists "standalone_laws_update_own" on public.standalone_laws;
create policy "standalone_laws_update_own"
on public.standalone_laws for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "standalone_laws_delete_own" on public.standalone_laws;
create policy "standalone_laws_delete_own"
on public.standalone_laws for delete
using (user_id = auth.uid());
