-- =========================================================
-- KAIROS · FASE 7 · ETAPA 3
-- GRANTS — assinatura (pg/pooler + RLS)
-- =========================================================

begin;

-- schema
grant usage on schema public to authenticated;
grant usage on schema public to kairos_app;

-- tables
grant select, insert, update, delete on table public.subscriptions to authenticated;
grant select, insert, update, delete on table public.subscription_events to authenticated;

grant select, insert, update, delete on table public.subscriptions to kairos_app;
grant select, insert, update, delete on table public.subscription_events to kairos_app;

-- membership (policies TO authenticated)
grant authenticated to kairos_app;

commit;
