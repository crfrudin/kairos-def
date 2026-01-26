import { AchievementGrant, AchievementGrantId, TenantId } from "../contracts/GamificationTypes";

export interface IAchievementGrantRepository {
  insertGrant(grant: AchievementGrant): Promise<void>;
  listGrantsByTenant(tenantId: TenantId): Promise<ReadonlyArray<AchievementGrant>>;
  getGrantById(tenantId: TenantId, id: AchievementGrantId): Promise<AchievementGrant | null>;
  existsGrantBySlug(tenantId: TenantId, achievementSlug: string): Promise<boolean>;
}
