export type PasswordErrorCode =
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_LONG'
  | 'PASSWORD_HAS_WHITESPACE'
  | 'PASSWORD_NEEDS_LETTER'
  | 'PASSWORD_NEEDS_NUMBER';

export class Password {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Regras mínimas (V1):
   * - 8 a 72 chars
   * - pelo menos 1 letra e 1 número
   * - sem espaços
   *
   * Importante: aqui NÃO há hash (proibido IO/infra nesta etapa).
   */
  public static create(
    raw: string
  ): { ok: true; value: Password } | { ok: false; error: { code: PasswordErrorCode; message: string } } {
    const value = String(raw);

    if (value.length < 8) return { ok: false, error: { code: 'PASSWORD_TOO_SHORT', message: 'Senha inválida.' } };
    if (value.length > 72) return { ok: false, error: { code: 'PASSWORD_TOO_LONG', message: 'Senha inválida.' } };
    if (/\s/.test(value))
      return { ok: false, error: { code: 'PASSWORD_HAS_WHITESPACE', message: 'Senha inválida.' } };
    if (!/[A-Za-z]/.test(value))
      return { ok: false, error: { code: 'PASSWORD_NEEDS_LETTER', message: 'Senha inválida.' } };
    if (!/[0-9]/.test(value))
      return { ok: false, error: { code: 'PASSWORD_NEEDS_NUMBER', message: 'Senha inválida.' } };

    return { ok: true, value: new Password(value) };
  }

  /**
   * ATENÇÃO: acesso “unsafe” apenas para enviar ao port nesta etapa (sem persistência).
   * Não logar, não serializar e não armazenar.
   */
  public getValueUnsafe(): string {
    return this.value;
  }
}
