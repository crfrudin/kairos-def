import { DomainValidationError } from "../_shared/DomainValidationError";

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
      throw new DomainValidationError("CPF_INVALID_LENGTH", "CPF inválido: deve conter 11 dígitos.");
    }

    if (Cpf.isAllSameDigit(digits)) {
      throw new DomainValidationError("CPF_INVALID_SEQUENCE", "CPF inválido: sequência inválida.");
    }

    if (!Cpf.hasValidCheckDigits(digits)) {
      throw new DomainValidationError("CPF_INVALID_CHECK_DIGITS", "CPF inválido: dígitos verificadores inválidos.");
    }

    return new Cpf(digits);
  }

  public get digits(): string {
    return this._digits;
  }

  public get formatted(): string {
    // Formatação apenas para exibição (domínio puro)
    return `${this._digits.slice(0, 3)}.${this._digits.slice(3, 6)}.${this._digits.slice(6, 9)}-${this._digits.slice(9, 11)}`;
  }

  private static normalizeToDigits(raw: string): string {
    // Sem regex como validação final. Aqui é apenas normalização.
    let out = "";
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c >= "0" && c <= "9") out += c;
    }
    return out;
  }

  private static isAllSameDigit(digits: string): boolean {
    const first = digits[0];
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] !== first) return false;
    }
    return true;
  }

  private static hasValidCheckDigits(digits: string): boolean {
    const d1 = Cpf.computeCheckDigit(digits.slice(0, 9), 10);
    const d2 = Cpf.computeCheckDigit(digits.slice(0, 9) + String(d1), 11);

    const last2 = digits.slice(9, 11);
    return last2 === `${d1}${d2}`;
  }

  private static computeCheckDigit(base: string, startWeight: number): number {
    let sum = 0;
    let weight = startWeight;

    for (let i = 0; i < base.length; i++) {
      const code = base.charCodeAt(i);
      const n = code - 48; // '0' -> 48
      sum += n * weight;
      weight -= 1;
    }

    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  }
}
