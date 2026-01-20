# Auth / Infra

Implementações concretas (ex.: SupabaseAuthRepository) serão adicionadas em etapas futuras.

Regras:
- IO e SDKs (Supabase, etc.) ficam aqui.
- Nada daqui pode ser importado diretamente pela UI.
- Application acessa infra somente via composition root + ports.
