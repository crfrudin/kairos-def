-- =========================================================
-- KAIROS · FASE 2 · ETAPA 4/5
-- GRANTS (necessário para acesso via conexão pg fora do PostgREST)
-- =========================================================

-- Observação:
-- - RLS controla "quais linhas" o usuário vê.
-- - GRANT controla "se o role pode acessar a tabela".
-- - Testes de integração via pg precisam dos dois.

-- Schema
grant usage on schema public to authenticated;

-- =========================================================
-- Tabelas-base (ETAPA 4)
-- =========================================================
grant select, insert, update, delete on table public.subjects to authenticated;
grant select, insert, update, delete on table public.subject_priority_order to authenticated;
grant select, insert, update, delete on table public.subject_activation_schedule to authenticated;

grant select, insert, update, delete on table public.standalone_laws to authenticated;
grant select, insert, update, delete on table public.informative_follows to authenticated;

-- =========================================================
-- Tabelas auxiliares (ADITIVO A v2)
-- =========================================================
grant select, insert, update, delete on table public.subject_theory_reading_tracks to authenticated;
grant select, insert, update, delete on table public.subject_theory_video_tracks to authenticated;
grant select, insert, update, delete on table public.subject_questions_meta to authenticated;
grant select, insert, update, delete on table public.subject_law_configs to authenticated;
