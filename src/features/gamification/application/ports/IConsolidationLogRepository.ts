import { TenantId, IsoDateTimeString } from "../contracts/GamificationTypes";

export interface ConsolidationLogEntry {
  tenantId: TenantId;
  key: string;
  createdAt: IsoDateTimeString;
  payload: Record<string, unknown>;
}

export interface IConsolidationLogRepository {
  insertEntry(entry: ConsolidationLogEntry): Promise<void>;
  listEntriesByTenant(tenantId: TenantId): Promise<ReadonlyArray<ConsolidationLogEntry>>;
}
