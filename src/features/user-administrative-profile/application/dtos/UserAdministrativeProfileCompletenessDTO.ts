export interface UserAdministrativeProfileCompletenessDTO {
  exists: boolean;

  /**
   * Completeness técnico:
   * - true: existe contrato e o Domínio aceita instanciar o agregado (VOs + invariantes).
   * - false: não existe ou falha de validação do Domínio.
   */
  isComplete: boolean;

  /**
   * Quando isComplete=false por validação de domínio.
   */
  validation?: {
    domainCode: string;
    message: string;
  } | null;
}
