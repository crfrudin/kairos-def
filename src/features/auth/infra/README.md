# Auth / Infra

Implementações concretas (IO/SDKs) da feature Auth.

Nesta etapa (ETAPA A - CORE):
- Implementado: SupabaseAuthRepository (encapsula Supabase Auth)
- Proibido: importar infra diretamente pela UI.
- Acesso deve ocorrer via:
  - Ports (IAuthRepository) + Use-cases
  - Composition root (src/core/composition/auth.composition.ts)
