export class Email {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(
    raw: string
  ): { ok: true; value: Email } | { ok: false; error: { code: 'INVALID_EMAIL'; message: string } } {
    const normalized = Email.normalize(raw);

    // Determinístico, simples e suficiente para V1:
    // - sem espaços
    // - um @
    // - domínio com ponto
    // - tamanho razoável (RFC-like, sem ser permissivo demais)
    const isValid =
      normalized.length >= 3 &&
      normalized.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);

    if (!isValid) {
      return { ok: false, error: { code: 'INVALID_EMAIL', message: 'Email inválido.' } };
    }

    return { ok: true, value: new Email(normalized) };
  }

  public static normalize(raw: string): string {
    return String(raw).trim().toLowerCase();
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: Email): boolean {
    return this.value === other.value;
  }
}
