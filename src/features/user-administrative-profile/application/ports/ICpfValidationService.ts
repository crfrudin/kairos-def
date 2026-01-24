import type { Result } from "./Result";

export type CpfValidationErrorCode =
  | "CPF_EXTERNAL_INVALID"
  | "CPF_EXTERNAL_UNAVAILABLE";

/**
 * Porta de validação externa de CPF.
 *
 * Regras:
 * - Application depende APENAS desta interface.
 * - Nenhuma chamada real de API aqui.
 * - Implementações concretas ficam para a Infra (Fase futura).
 */
export interface ICpfValidationService {
  /**
   * Valida um CPF já normalizado (digits-only, 11).
   *
   * ok=true  => CPF considerado válido por fonte externa
   * ok=false => bloqueio normativo
   */
  validateCpf(cpfDigits: string): Promise<
    Result<
      { valid: true },
      CpfValidationErrorCode
    >
  >;
}
