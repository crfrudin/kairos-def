import { DomainValidationError } from "../_shared/DomainValidationError";

/**
 * CPF (FASE 9 - V1)
 * - Declaratório: o sistema NÃO afirma que é válido.
 * - Sem validação de DV / sem bloqueio por sequência.
 * - Regra estrutural mínima: digits-only com 11 dígitos.
 */
export class Cpf {
  private readonly _digits: string;

  private constructor(digits: string) {
    this._digits = digits;
  }

  public static create(input: string | null): Cpf | null {
    if (input === null) return null;

    const digits = Cpf.normalizeToDigits(input);

    if (digits.length === 0) return null;

    if (digits.length !== 11) {
      throw new DomainValidationError(
        "CPF_INVALID_LENGTH",
        "CPF inválido: deve conter 11 dígitos."
      );
    }

    return new Cpf(digits);
  }

  public get digits(): string {
    return this._digits;
  }

  public get formatted(): string {
    // Formatação apenas para exibição.
    return `${this._digits.slice(0, 3)}.${this._digits.slice(3, 6)}.${this._digits.slice(6, 9)}-${this._digits.slice(9, 11)}`;
  }

  private static normalizeToDigits(raw: string): string {
    let out = "";
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c >= "0" && c <= "9") out += c;
    }
    return out;
  }
}
