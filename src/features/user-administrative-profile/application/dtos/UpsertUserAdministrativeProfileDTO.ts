import type { UserAdministrativeProfilePrimitives } from '@/features/user-administrative-profile/domain/entities/UserAdministrativeProfile';

export interface UpsertUserAdministrativeProfileInputDTO {
  userId: string;
  now: string; // ISO timestamp
  profile: UserAdministrativeProfilePrimitives;
}

export interface UpsertUserAdministrativeProfileOutputDTO {
  saved: boolean;
}
