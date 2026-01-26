import { StreakKey, StreakSnapshot, TenantId } from "../contracts/GamificationTypes";

export interface IStreakSnapshotRepository {
  getSnapshot(tenantId: TenantId, streakKey: StreakKey): Promise<StreakSnapshot | null>;
  upsertSnapshot(snapshot: StreakSnapshot): Promise<void>;
  listSnapshotsByTenant(tenantId: TenantId): Promise<ReadonlyArray<StreakSnapshot>>;
}
