-- =========================================================
-- KAIROS · FASE 4 · ETAPA 3
-- PERSISTÊNCIA ANALÍTICA (READ-ONLY) — VIEWS
--
-- Objetivo: suportar UC-01..UC-05 (Fase 4) via projeções somente-leitura,
--           derivadas 100% de fatos consolidados da Fase 3 (somente leitura).
--
-- Proibições: sem tabelas novas, sem INSERT/UPDATE/DELETE, sem triggers,
--             sem functions/jobs/procedural, sem materialized views, sem cache.
--
-- Segurança: isolamento multi-tenant obrigatório; sem service role; sem bypass.
-- Estratégia: views com (a) filtro user_id = auth.uid() e (b) security_invoker.
-- =========================================================

-- =========================================================
-- 0) VIEW: analytics_vw_executed_days
-- Base factual mínima (executed_days) — 1 linha por dia executado.
-- Suporte primário: UC-05 (facts) + insumo de UC-01/02/03/04.
-- =========================================================
drop view if exists public.analytics_vw_executed_days;

create view public.analytics_vw_executed_days
with (security_invoker = true)
as
select
  ed.id,
  ed.user_id,
  ed.plan_date as iso_date,
  ed.executed_at,
  ed.result_status,
  ed.total_executed_minutes,
  ed.factual_summary
from public.executed_days ed
where ed.user_id = auth.uid();


-- =========================================================
-- 1) VIEW: analytics_vw_analytical_facts_daily_execution
-- Fatos analíticos brutos (mínimos): data + fonte (DAILY_EXECUTION).
-- Observação: FactSource é metadado; aqui fixamos DAILY_EXECUTION.
-- Suporte: UC-05 (AnalyticalFactsQuery).
-- =========================================================
drop view if exists public.analytics_vw_analytical_facts_daily_execution;

create view public.analytics_vw_analytical_facts_daily_execution
with (security_invoker = true)
as
select
  ed.user_id,
  ed.plan_date as iso_date,
  'DAILY_EXECUTION'::text as source
from public.executed_days ed
where ed.user_id = auth.uid();


-- =========================================================
-- 2) VIEW: analytics_vw_daily_execution_metrics
-- Métricas diárias observacionais (TIME + execução):
-- - execution_count: 1 por dia com execução registrada
-- - time_spent_minutes: total_executed_minutes
-- Suporte: UC-01 (métricas), UC-02 (série temporal), UC-03 (resumo), UC-04 (insumo).
--
-- Nota: Não existe granularidade factual por activity_type/subject no schema da Fase 3.
-- Portanto, esta view só suporta dimensão TIME de forma factual.
-- =========================================================
drop view if exists public.analytics_vw_daily_execution_metrics;

create view public.analytics_vw_daily_execution_metrics
with (security_invoker = true)
as
select
  ed.user_id,
  ed.plan_date as iso_date,
  1::integer as execution_count,
  ed.total_executed_minutes::integer as time_spent_minutes,
  ed.result_status
from public.executed_days ed
where ed.user_id = auth.uid();


-- =========================================================
-- 3) VIEW: analytics_vw_review_ledger_due_status_daily
-- Fatos observacionais do ledger de revisões por data de vencimento (due_date).
-- Isso NÃO “cria execução”; apenas observa o estado consolidado do ledger (Fase 3).
-- Suporte: pode alimentar leituras descritivas de VOLUME/EXECUTION_COUNT para REVIEW,
--          quando o UC decidir suportar esta combinação no V1.
-- =========================================================
drop view if exists public.analytics_vw_review_ledger_due_status_daily;

create view public.analytics_vw_review_ledger_due_status_daily
with (security_invoker = true)
as
select
  rl.user_id,
  rl.due_date as iso_date,
  count(*) filter (where rl.status = 'PENDING')::integer as pending_count,
  count(*) filter (where rl.status = 'DONE')::integer as done_count,
  count(*) filter (where rl.status = 'LOST')::integer as lost_count,
  count(*)::integer as total_count
from public.review_ledger rl
where rl.user_id = auth.uid()
group by
  rl.user_id,
  rl.due_date;


-- =========================================================
-- 4) VIEW: analytics_vw_review_ledger_due_status_by_subject
-- Recorte observacional adicional por subject_id (quando existir).
-- Suporte: dimensão SUBJECT aplicada a REVIEW (ledger), de forma estritamente factual.
-- =========================================================
drop view if exists public.analytics_vw_review_ledger_due_status_by_subject;

create view public.analytics_vw_review_ledger_due_status_by_subject
with (security_invoker = true)
as
select
  rl.user_id,
  rl.due_date as iso_date,
  rl.subject_id,
  count(*) filter (where rl.status = 'PENDING')::integer as pending_count,
  count(*) filter (where rl.status = 'DONE')::integer as done_count,
  count(*) filter (where rl.status = 'LOST')::integer as lost_count,
  count(*)::integer as total_count
from public.review_ledger rl
where rl.user_id = auth.uid()
group by
  rl.user_id,
  rl.due_date,
  rl.subject_id;


-- =========================================================
-- 5) VIEW: analytics_vw_projection_inputs_daily_minutes
-- Insumo mínimo para projeção descritiva do tipo HISTORICAL_AVERAGE:
-- expõe a série diária de minutos executados (sem calcular média aqui).
-- O UC-04 calculará AVG/SUM conforme recorte/period solicitado (read-only).
-- =========================================================
drop view if exists public.analytics_vw_projection_inputs_daily_minutes;

create view public.analytics_vw_projection_inputs_daily_minutes
with (security_invoker = true)
as
select
  ed.user_id,
  ed.plan_date as iso_date,
  ed.total_executed_minutes::integer as time_spent_minutes
from public.executed_days ed
where ed.user_id = auth.uid();

