import { StreakTransition, StreakTransitionId, TenantId, StreakKey } from "../contracts/GamificationTypes";

export interface IStreakTransitionRepository {
  insertTransition(transition: StreakTransition): Promise<void>;
  listTransitionsByTenant(tenantId: TenantId): Promise<ReadonlyArray<StreakTransition>>;
  listTransitionsByStreak(tenantId: TenantId, streakKey: StreakKey): Promise<ReadonlyArray<StreakTransition>>;
  getTransitionById(tenantId: TenantId, id: StreakTransitionId): Promise<StreakTransition | null>;
}
