-- =========================================================
-- KAIROS · FASE 2 · ETAPA 5 (REEXECUÇÃO)
-- GRANTS para execução via Pooler/pg (role: kairos_app)
-- Objetivo: permitir testes/infras com RLS ativa + policies TO authenticated
-- Proibições: sem triggers/functions/procedures
-- =========================================================

begin;

-- 1) Garantir acesso ao schema
grant usage on schema public to kairos_app;

-- 2) Tabelas da FASE 2 (subjects + auxiliares)
grant select, insert, update, delete on table public.subjects to kairos_app;
grant select, insert, update, delete on table public.subject_priority_order to kairos_app;
grant select, insert, update, delete on table public.subject_activation_schedule to kairos_app;

grant select, insert, update, delete on table public.subject_theory_reading_tracks to kairos_app;
grant select, insert, update, delete on table public.subject_theory_video_tracks to kairos_app;
grant select, insert, update, delete on table public.subject_questions_meta to kairos_app;
grant select, insert, update, delete on table public.subject_law_configs to kairos_app;

grant select, insert, update, delete on table public.standalone_laws to kairos_app;
grant select, insert, update, delete on table public.informative_follows to kairos_app;

-- 3) CRÍTICO: policies estão "TO authenticated"
-- Precisamos que o role do pooler (kairos_app) esteja coberto por essas policies.
-- Em Postgres, membership de role permite que "TO authenticated" seja aplicável.
grant authenticated to kairos_app;

commit;
