import { DomainValidationError } from "../_shared/DomainValidationError";
import { Address, type AddressInput } from "./Address";

export type ValidatedAddressInput = AddressInput;

export class ValidatedAddress {
  private readonly _address: Address;

  private constructor(address: Address) {
    this._address = address;
  }

  public static create(input: ValidatedAddressInput | null): ValidatedAddress | null {
    if (input === null) return null;

    // Reusa o VO Address (já normaliza e valida parte das regras)
    const address = Address.create(input);
    if (address === null) return null;

    // Invariantes adicionais para "Endereço Administrativo Validado"
    const p = address.toPrimitives();

    // Para ser "validated", exigimos todos os componentes administrativos essenciais.
    // (Complemento é opcional)
    if (!p.cep) throw new DomainValidationError("VALIDATED_ADDRESS_CEP_REQUIRED", "Endereço validado inválido: CEP é obrigatório.");
    if (!p.uf) throw new DomainValidationError("VALIDATED_ADDRESS_UF_REQUIRED", "Endereço validado inválido: UF é obrigatória.");
    if (!p.city) throw new DomainValidationError("VALIDATED_ADDRESS_CITY_REQUIRED", "Endereço validado inválido: Município é obrigatório.");
    if (!p.street) throw new DomainValidationError("VALIDATED_ADDRESS_STREET_REQUIRED", "Endereço validado inválido: Logradouro é obrigatório.");
    if (!p.number) throw new DomainValidationError("VALIDATED_ADDRESS_NUMBER_REQUIRED", "Endereço validado inválido: Número é obrigatório.");
    if (!p.neighborhood) throw new DomainValidationError("VALIDATED_ADDRESS_NEIGHBORHOOD_REQUIRED", "Endereço validado inválido: Bairro é obrigatório.");

    return new ValidatedAddress(address);
  }

  public get address(): Address {
    return this._address;
  }

  public toPrimitives(): ValidatedAddressInput {
    return this._address.toPrimitives();
  }
}
