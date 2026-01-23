import type { UserAdministrativeProfilePrimitives } from '@/features/user-administrative-profile/domain/entities/UserAdministrativeProfile';

export interface UserAdministrativeProfileDTO {
  profile: UserAdministrativeProfilePrimitives | null;
}
