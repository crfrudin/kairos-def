// src/features/user-administrative-profile/infra/SupabaseUserAdministrativeProfileRepository.ts

import "server-only";

import { createSupabaseServerClient } from "@/core/clients/createSupabaseServerClient";
import type {
  IUserAdministrativeProfileRepository,
  UserAdministrativeProfileContract,
  UUID,
  ISOTimestamp,
} from "@/features/user-administrative-profile/application";
import type { UserAdministrativeProfilePrimitives } from "@/features/user-administrative-profile/domain/entities/UserAdministrativeProfile";

import type { SupabaseProfilesRow } from "./_shared/SupabaseProfilesRow";

type GenderCode = "MASCULINO" | "FEMININO" | "PREFIRO_NAO_INFORMAR" | "OUTRO";

function mapDbRowToPrimitives(row: SupabaseProfilesRow): UserAdministrativeProfilePrimitives {
  const genderCode = row.gender ? (row.gender as GenderCode) : null;

  return {
    fullName: row.full_name,

    socialName: row.social_name ?? null,
    birthDate: row.birth_date ?? null,

    gender: genderCode
      ? {
          code: genderCode,
          otherDescription: row.gender_other_description ?? null,
        }
      : null,

    phone: row.phone ?? null,
    secondaryEmail: row.secondary_email ?? null,

    address:
      row.cep || row.uf || row.address_city || row.neighborhood || row.street || row.address_number || row.complement
        ? {
            cep: row.cep ?? null,
            uf: row.uf ?? null,
            city: row.address_city ?? null,
            neighborhood: row.neighborhood ?? null,
            street: row.street ?? null,
            number: row.address_number ?? null,
            complement: row.complement ?? null,
          }
        : null,

    preferences:
      row.preferred_language || row.time_zone || row.communications_consent !== null
        ? {
            preferredLanguage: row.preferred_language ?? null,
            timeZone: row.time_zone ?? null,
            communicationsConsent: row.communications_consent ?? null,
          }
        : null,
  };
}

function mapPrimitivesToDbUpdate(input: {
  userId: UUID;
  primitives: UserAdministrativeProfilePrimitives;
  now: ISOTimestamp;
  isInsert: boolean;
}): Partial<SupabaseProfilesRow> & { user_id: string } {
  const p = input.primitives;

  return {
    user_id: input.userId,

    // Identificação
    full_name: p.fullName,
    social_name: p.socialName ?? null,
    birth_date: p.birthDate ?? null,

    // Gênero
    gender: p.gender?.code ?? null,
    gender_other_description: p.gender?.otherDescription ?? null,

    // Contato
    phone: p.phone ?? null,
    secondary_email: p.secondaryEmail ?? null,

    // Endereço
    cep: p.address?.cep ?? null,
    uf: p.address?.uf ?? null,
    address_city: p.address?.city ?? null,
    neighborhood: p.address?.neighborhood ?? null,
    street: p.address?.street ?? null,
    address_number: p.address?.number ?? null,
    complement: p.address?.complement ?? null,

    // Preferências
    preferred_language: p.preferences?.preferredLanguage ?? null,
    time_zone: p.preferences?.timeZone ?? null,
    communications_consent: p.preferences?.communicationsConsent ?? null,

    // Auditoria (infra)
    created_at: input.isInsert ? input.now : undefined,
    updated_at: input.now,
  };
}

export class SupabaseUserAdministrativeProfileRepository implements IUserAdministrativeProfileRepository {
  public async getFullContract(userId: UUID): Promise<UserAdministrativeProfileContract | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("profiles")
      .select(
        [
          "user_id",
          "full_name",
          "social_name",
          "birth_date",
          "gender",
          "gender_other_description",
          "phone",
          "secondary_email",
          "cep",
          "uf",
          "address_city",
          "neighborhood",
          "street",
          "address_number",
          "complement",
          "preferred_language",
          "time_zone",
          "communications_consent",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("user_id", userId)
      .maybeSingle<SupabaseProfilesRow>();

    if (error) {
      throw new Error(`UAP_INFRA_READ_FAILED: ${error.message}`);
    }

    if (!data) return null;

    return {
      userId: data.user_id,
      profile: mapDbRowToPrimitives(data),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  public async replaceFullContract(params: {
    userId: UUID;
    contract: Omit<UserAdministrativeProfileContract, "createdAt" | "updatedAt">;
    now: ISOTimestamp;
  }): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { data: existing, error: readErr } = await supabase
      .from("profiles")
      .select("user_id, created_at")
      .eq("user_id", params.userId)
      .maybeSingle<{ user_id: string; created_at: string }>();

    if (readErr) {
      throw new Error(`UAP_INFRA_PRECHECK_FAILED: ${readErr.message}`);
    }

    const isInsert = !existing;

    const payload = mapPrimitivesToDbUpdate({
      userId: params.userId,
      primitives: params.contract.profile,
      now: params.now,
      isInsert,
    });

    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });

    if (error) {
      throw new Error(`UAP_INFRA_WRITE_FAILED: ${error.message}`);
    }
  }
}
