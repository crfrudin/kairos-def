import { FullName } from "../value-objects/FullName";
import { SocialName } from "../value-objects/SocialName";
import { BirthDate } from "../value-objects/BirthDate";
import { Gender, type GenderInput } from "../value-objects/Gender";
import { Phone } from "../value-objects/Phone";
import { SecondaryEmail } from "../value-objects/SecondaryEmail";
import { Address, type AddressInput } from "../value-objects/Address";
import { AdminPreferences, type AdminPreferencesInput } from "../value-objects/AdminPreferences";
import { Cpf } from "../value-objects/Cpf";
import { ValidatedAddress, type ValidatedAddressInput } from "../value-objects/ValidatedAddress";

export type UserAdministrativeProfilePrimitives = {
  fullName: string;

  socialName?: string | null;
  birthDate?: string | null; // YYYY-MM-DD

  gender?: GenderInput | null;

  phone?: string | null; // digits-only
  secondaryEmail?: string | null;

  // FASE 6 (já existente)
  address?: AddressInput | null;
  preferences?: AdminPreferencesInput | null;

  // FASE 9 (novo)
  cpf?: string | null; // digits-only (11)
  validatedAddress?: ValidatedAddressInput | null;
};

/**
 * Agregado canônico:
 * - Passivo
 * - Não-decisório (não define "completude")
 * - Sem IO / sem Auth / sem Planejamento / sem Monetização
 */
export class UserAdministrativeProfile {
  private readonly _fullName: FullName;

  private readonly _socialName: SocialName | null;
  private readonly _birthDate: BirthDate | null;
  private readonly _gender: Gender | null;

  private readonly _phone: Phone | null;
  private readonly _secondaryEmail: SecondaryEmail | null;

  private readonly _address: Address | null;
  private readonly _preferences: AdminPreferences | null;

  // FASE 9
  private readonly _cpf: Cpf | null;
  private readonly _validatedAddress: ValidatedAddress | null;

  private constructor(props: {
    fullName: FullName;
    socialName: SocialName | null;
    birthDate: BirthDate | null;
    gender: Gender | null;
    phone: Phone | null;
    secondaryEmail: SecondaryEmail | null;
    address: Address | null;
    preferences: AdminPreferences | null;
    cpf: Cpf | null;
    validatedAddress: ValidatedAddress | null;
  }) {
    this._fullName = props.fullName;
    this._socialName = props.socialName;
    this._birthDate = props.birthDate;
    this._gender = props.gender;
    this._phone = props.phone;
    this._secondaryEmail = props.secondaryEmail;
    this._address = props.address;
    this._preferences = props.preferences;
    this._cpf = props.cpf;
    this._validatedAddress = props.validatedAddress;
  }

  public static create(input: UserAdministrativeProfilePrimitives): UserAdministrativeProfile {
    const fullName = FullName.create(input.fullName);

    const socialName = SocialName.create(input.socialName ?? null);
    const birthDate = BirthDate.create(input.birthDate ?? null);

    const gender = Gender.create(input.gender ?? null);

    const phone = Phone.create(input.phone ?? null);
    const secondaryEmail = SecondaryEmail.create(input.secondaryEmail ?? null);

    const address = Address.create(input.address ?? null);
    const preferences = AdminPreferences.create(input.preferences ?? null);

    // FASE 9 (novo)
    const cpf = Cpf.create(input.cpf ?? null);
    const validatedAddress = ValidatedAddress.create(input.validatedAddress ?? null);

    return new UserAdministrativeProfile({
      fullName,
      socialName,
      birthDate,
      gender,
      phone,
      secondaryEmail,
      address,
      preferences,
      cpf,
      validatedAddress,
    });
  }

  // getters (imutável)
  public get fullName(): FullName { return this._fullName; }
  public get socialName(): SocialName | null { return this._socialName; }
  public get birthDate(): BirthDate | null { return this._birthDate; }
  public get gender(): Gender | null { return this._gender; }
  public get phone(): Phone | null { return this._phone; }
  public get secondaryEmail(): SecondaryEmail | null { return this._secondaryEmail; }
  public get address(): Address | null { return this._address; }
  public get preferences(): AdminPreferences | null { return this._preferences; }

  // FASE 9
  public get cpf(): Cpf | null { return this._cpf; }
  public get validatedAddress(): ValidatedAddress | null { return this._validatedAddress; }

  public toPrimitives(): UserAdministrativeProfilePrimitives {
    const genderPrimitives = this._gender ? this._gender.toPrimitives() : null;

    return {
      fullName: this._fullName.value,
      socialName: this._socialName?.value ?? null,
      birthDate: this._birthDate?.value ?? null,
      gender: genderPrimitives
        ? { code: genderPrimitives.code, otherDescription: genderPrimitives.otherDescription }
        : null,
      phone: this._phone?.digits ?? null,
      secondaryEmail: this._secondaryEmail?.value ?? null,
      address: this._address?.toPrimitives() ?? null,
      preferences: this._preferences?.toPrimitives() ?? null,

      // FASE 9
      cpf: this._cpf?.digits ?? null,
      validatedAddress: this._validatedAddress?.toPrimitives() ?? null,
    };
  }
}
