/**
 * Contratos locais de UI (não são domínio).
 * Este arquivo NÃO deve implementar regras normativas.
 *
 * A ideia é:
 * - Receber o "Profile DTO" do UC-01 (GetProfile) e mapear para campos de tela.
 * - Enviar payload completo para UC-02 (UpdateProfile).
 *
 * IMPORTANTE:
 * - Não importar infra nem acessar DB.
 * - Não criar defaults normativos aqui.
 * - Validações aqui são só de UX (ex: required, formato).
 */

// ViewModel usado pela tela (provisório; será alinhado ao retorno real do GetProfile no BLOCO 6.2)
export type ProfileEditViewModel = unknown;

// Payload que a UI envia para o UC-02 (provisório; será alinhado ao input real do UpdateProfile no BLOCO 6.2)
export type ProfileEditSubmitInput = unknown;

// Resultado padronizado para feedback de UI (bloqueantes/avisos)
export type ProfileEditSubmitResult =
  | { ok: true; warnings?: string[] }
  | { ok: false; blockingErrors: string[]; warnings?: string[] };
