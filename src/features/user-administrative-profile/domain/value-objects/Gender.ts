import { DomainValidationError } from "../_shared/DomainValidationError";
import { collapseSpaces, trimToNull, upper } from "../_shared/normalize";

export enum GenderCode {
  MASCULINO = "MASCULINO",
  FEMININO = "FEMININO",
  PREFIRO_NAO_INFORMAR = "PREFIRO_NAO_INFORMAR",
  OUTRO = "OUTRO",
}

export type GenderInput = {
  code: string | null | undefined;
  otherDescription?: string | null | undefined;
};

/**
 * VO administrativo (não-decisório).
 * Regra BLOQUEANTE: se code=OUTRO => otherDescription obrigatório.
 */
export class Gender {
  private readonly _code: GenderCode;
  private readonly _otherDescription: string | null;

  private constructor(code: GenderCode, otherDescription: string | null) {
    this._code = code;
    this._otherDescription = otherDescription;
  }

  public static create(input: GenderInput | null | undefined): Gender | null {
    if (!input) return null;

    const rawCode = trimToNull(input.code);
    if (!rawCode) return null;

    const normalizedCode = normalizeGenderCode(rawCode);

    const allowed = new Set<string>(Object.values(GenderCode));
    if (!allowed.has(normalizedCode)) {
      throw new DomainValidationError(
        "GENDER_INVALID",
        "Gender must be one of: MASCULINO, FEMININO, PREFIRO_NAO_INFORMAR, OUTRO."
      );
    }

    const code = normalizedCode as GenderCode;

    const otherRaw = trimToNull(input.otherDescription);
    const other = otherRaw ? collapseSpaces(otherRaw) : null;

    if (code === GenderCode.OUTRO) {
      if (!other) {
        throw new DomainValidationError(
          "GENDER_OTHER_DESCRIPTION_REQUIRED",
          "When gender is OUTRO, otherDescription is required."
        );
      }
      if (other.length < 2) {
        throw new DomainValidationError(
          "GENDER_OTHER_DESCRIPTION_TOO_SHORT",
          "otherDescription must have at least 2 characters."
        );
      }
      if (other.length > 60) {
        throw new DomainValidationError(
          "GENDER_OTHER_DESCRIPTION_TOO_LONG",
          "otherDescription must have at most 60 characters."
        );
      }
      return new Gender(code, other);
    }

    // Se não for OUTRO, ignorar qualquer descrição fornecida (normalização determinística)
    return new Gender(code, null);
  }

  public get code(): GenderCode {
    return this._code;
  }

  public get otherDescription(): string | null {
    return this._otherDescription;
  }

  /** Para persistência/DTO futuro sem vazar estrutura interna */
  public toPrimitives(): { code: GenderCode; otherDescription: string | null } {
    return { code: this._code, otherDescription: this._otherDescription };
  }
}

function normalizeGenderCode(input: string): string {
  // Aceita variações simples e normaliza para enum estável
  const base = upper(input).trim();

  // normalizações comuns de escrita
  if (base === "PREFIRO NÃO INFORMAR" || base === "PREFIRO NAO INFORMAR") {
    return GenderCode.PREFIRO_NAO_INFORMAR;
  }

  // padrão: uppercase + espaços -> underscore
  return base.replace(/\s+/g, "_");
}
