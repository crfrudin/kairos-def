// src/features/user-administrative-profile/infra/_shared/SupabaseProfilesRow.ts

export type SupabaseProfilesRow = {
  user_id: string;

  // Identificação
  full_name: string;
  social_name: string | null;
  birth_date: string | null;

  // Gênero
  gender: string | null;
  gender_other_description: string | null;

  // Contato
  phone: string | null;
  secondary_email: string | null;

  // Endereço (COLUNAS — conforme onboarding)
  cep: string | null;
  uf: string | null;
  address_city: string | null;
  address_neighborhood: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;

  // Preferências
  preferred_language: string | null;
  time_zone: string | null;
  communications_consent: boolean | null;

  created_at: string;
  updated_at: string;
};
