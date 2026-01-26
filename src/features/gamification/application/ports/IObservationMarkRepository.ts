import { ObservationMark, TenantId, FactualEventType, FactualReference } from "../contracts/GamificationTypes";

export interface IObservationMarkRepository {
  existsMark(tenantId: TenantId, eventType: FactualEventType, factualRef: FactualReference): Promise<boolean>;
  insertMark(mark: ObservationMark): Promise<void>;
}
