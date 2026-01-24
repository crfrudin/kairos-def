-- KAIROS (kairos-def)
-- FASE 9 — ETAPA 4 — Schema & RLS
-- Identidade Fiscal & Endereço Validado — CPF DECLARATÓRIO (SEM validação externa)
--
-- Regras de compliance:
-- - CPF é declaratório: proibido qualquer coluna/flag/estado de "cpf validado".
-- - Sem triggers/functions/procedures.
-- - Apenas DDL declarativo + constraints estruturais.
-- - RLS já existente em public.profiles (user_id = auth.uid()) deve permanecer.

BEGIN;

-- 1) CPF declaratório (digits-only, 11 dígitos). Nullable.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text;

COMMENT ON COLUMN public.profiles.cpf IS
'CPF declaratório (digits-only). Sem validação externa. Responsabilidade do usuário.';

-- 2) Constraint estrutural (sem DV aqui; DV é responsabilidade do domínio)
--    Regra mínima: se cpf não for NULL, deve ser exatamente 11 dígitos [0-9].
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_cpf_digits_11_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_cpf_digits_11_chk
  CHECK (
    cpf IS NULL
    OR cpf ~ '^[0-9]{11}$'
  );

-- 3) Segurança: RLS já existe; reforço explícito (idempotente).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMIT;
