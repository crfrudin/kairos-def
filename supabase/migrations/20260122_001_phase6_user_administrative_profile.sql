-- KAIROS (kairos-def)
-- FASE 6 — ETAPA 3 — Persistência (DDL + RLS)
-- Alvo: espelhar UserAdministrativeProfile na persistência existente (public.profiles),
-- evitando duplicação e mantendo conceito único.

BEGIN;

-- 1) Garantia explícita: tabela alvo existe (já criada por fase anterior).
-- (Sem CREATE TABLE aqui.)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_name text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS secondary_email text,
  ADD COLUMN IF NOT EXISTS preferred_language text,
  ADD COLUMN IF NOT EXISTS time_zone text,
  ADD COLUMN IF NOT EXISTS communications_consent boolean,
  ADD COLUMN IF NOT EXISTS gender_other_description text;

-- 2) Constraints estruturais (espelho de invariantes aprovadas; sem lógica procedural).
-- 2.1) Gender enum fechado (permitindo NULL).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_gender_allowed_chk'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_gender_allowed_chk
      CHECK (
        gender IS NULL
        OR gender IN ('MASCULINO','FEMININO','PREFIRO_NAO_INFORMAR','OUTRO')
      );
  END IF;
END $$;

-- 2.2) Se Gender=OUTRO, descrição obrigatória; caso contrário, pode ser NULL.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_gender_other_description_chk'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_gender_other_description_chk
      CHECK (
        gender IS DISTINCT FROM 'OUTRO'
        OR (gender = 'OUTRO' AND gender_other_description IS NOT NULL AND length(trim(gender_other_description)) > 0)
      );
  END IF;
END $$;

-- 2.3) Invariante de endereço: se CEP informado, UF e Cidade tornam-se obrigatórios.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_cep_requires_uf_city_chk'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_cep_requires_uf_city_chk
      CHECK (
        cep IS NULL
        OR (uf IS NOT NULL AND address_city IS NOT NULL)
      );
  END IF;
END $$;

-- 3) Segurança
-- Não criamos policies novas aqui porque a tabela já possui RLS e policies por user_id = auth.uid()
-- (registrado anteriormente). Ainda assim, reforçamos que RLS deve permanecer ativa.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMIT;
