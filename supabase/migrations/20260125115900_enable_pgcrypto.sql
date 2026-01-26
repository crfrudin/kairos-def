-- =====================================================================================
-- KAIROS (kairos-def) — PRÉ-REQUISITO TÉCNICO (DDL)
-- MIGRATION: 20260125115900_enable_pgcrypto.sql
--
-- Objetivo: garantir disponibilidade de gen_random_uuid() via extensão pgcrypto.
-- Observação: extensão é infraestrutura do banco; não contém regra normativa.
-- Proibições respeitadas: sem triggers, sem functions custom, sem seed.
-- =====================================================================================

create extension if not exists pgcrypto;
