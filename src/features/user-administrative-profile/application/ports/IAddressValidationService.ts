import type { Result } from "./Result";
import type { ValidatedAddressInput } from "@/features/user-administrative-profile/domain/value-objects/ValidatedAddress";

export type AddressValidationErrorCode =
  | "ADDRESS_EXTERNAL_INVALID"
  | "ADDRESS_EXTERNAL_UNAVAILABLE";

/**
 * Porta de validação externa de endereço administrativo.
 *
 * Observação importante:
 * - O Domínio já valida estrutura e invariantes locais.
 * - Esta porta representa validação EXTERNA (ex.: base oficial).
 */
export interface IAddressValidationService {
  /**
   * Valida um endereço administrativo já aceito pelo domínio.
   */
  validateAddress(
    address: ValidatedAddressInput
  ): Promise<
    Result<
      { valid: true },
      AddressValidationErrorCode
    >
  >;
}
