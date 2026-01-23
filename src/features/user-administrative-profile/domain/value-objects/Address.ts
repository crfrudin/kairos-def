import { DomainValidationError } from "../_shared/DomainValidationError";
import { Cep } from "./Cep";
import { Uf } from "./Uf";
import { City } from "./City";
import { Neighborhood } from "./Neighborhood";
import { Street } from "./Street";
import { AddressNumber } from "./AddressNumber";
import { Complement } from "./Complement";

export type AddressInput = {
  cep?: string | null;
  uf?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
};

/**
 * Endereço administrativo.
 * Regra BLOQUEANTE (normativa): se CEP informado => UF e Cidade obrigatórios.
 */
export class Address {
  private readonly _cep: Cep | null;
  private readonly _uf: Uf | null;
  private readonly _city: City | null;
  private readonly _neighborhood: Neighborhood | null;
  private readonly _street: Street | null;
  private readonly _number: AddressNumber | null;
  private readonly _complement: Complement | null;

  private constructor(props: {
    cep: Cep | null;
    uf: Uf | null;
    city: City | null;
    neighborhood: Neighborhood | null;
    street: Street | null;
    number: AddressNumber | null;
    complement: Complement | null;
  }) {
    this._cep = props.cep;
    this._uf = props.uf;
    this._city = props.city;
    this._neighborhood = props.neighborhood;
    this._street = props.street;
    this._number = props.number;
    this._complement = props.complement;
  }

  public static create(input: AddressInput | null | undefined): Address | null {
    if (!input) return null;

    const cep = Cep.create(input.cep);
    const uf = Uf.create(input.uf);
    const city = City.create(input.city);
    const neighborhood = Neighborhood.create(input.neighborhood);
    const street = Street.create(input.street);
    const number = AddressNumber.create(input.number);
    const complement = Complement.create(input.complement);

    const anyProvided =
      !!cep || !!uf || !!city || !!neighborhood || !!street || !!number || !!complement;

    if (!anyProvided) return null;

    if (cep && (!uf || !city)) {
      throw new DomainValidationError("ADDRESS_UF_CITY_REQUIRED_WITH_CEP", "UF and City are required when CEP is provided.");
    }

    return new Address({ cep, uf, city, neighborhood, street, number, complement });
  }

  public get cep(): Cep | null { return this._cep; }
  public get uf(): Uf | null { return this._uf; }
  public get city(): City | null { return this._city; }
  public get neighborhood(): Neighborhood | null { return this._neighborhood; }
  public get street(): Street | null { return this._street; }
  public get number(): AddressNumber | null { return this._number; }
  public get complement(): Complement | null { return this._complement; }

  public toPrimitives(): AddressInput {
    return {
      cep: this._cep?.digits ?? null,
      uf: this._uf?.value ?? null,
      city: this._city?.value ?? null,
      neighborhood: this._neighborhood?.value ?? null,
      street: this._street?.value ?? null,
      number: this._number?.value ?? null,
      complement: this._complement?.value ?? null,
    };
  }
}
