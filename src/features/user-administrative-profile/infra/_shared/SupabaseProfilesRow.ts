// src/features/user-administrative-profile/infra/_shared/SupabaseProfilesRow.ts

export type SupabaseProfilesRow = {
  user_id: string;

  // Identificação
  full_name: string;
  social_name: string | null;
  birth_date: string | null; // YYYY-MM-DD (date no banco, mas chega como string)

  // Gênero
  gender: string | null;
  gender_other_description: string | null;

  // Contato
  phone: string | null;
  secondary_email: string | null;

  // Endereço (nomes inferidos a partir da constraint existente)
  cep: string | null;
  uf: string | null;
  address_city: string | null;

  // Campos comuns de endereço (muito prováveis na tabela)
  neighborhood: string | null;
  street: string | null;
  address_number: string | null;
  complement: string | null;

  // Preferências
  preferred_language: string | null;
  time_zone: string | null;
  communications_consent: boolean | null;

  created_at: string;
  updated_at: string;
};
