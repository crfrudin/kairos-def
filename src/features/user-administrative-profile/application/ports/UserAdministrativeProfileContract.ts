import type { UserAdministrativeProfilePrimitives } from '@/features/user-administrative-profile/domain/entities/UserAdministrativeProfile';

export type UUID = string;
export type ISOTimestamp = string;

/**
 * Contrato de persistência (Application-level) para o perfil administrativo.
 * Importante:
 * - Contrato é literal e completo (sem patch implícito).
 * - Domínio permanece a fonte de validação (VOs + invariantes).
 */
export interface UserAdministrativeProfileContract {
  userId: UUID;

  profile: UserAdministrativeProfilePrimitives;

  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}
