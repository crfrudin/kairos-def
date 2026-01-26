import { ObservedEvent, ObservedEventId, TenantId } from "../contracts/GamificationTypes";

export interface IObservedEventRepository {
  insertObservedEvent(event: ObservedEvent): Promise<void>;
  listObservedEventsByTenant(tenantId: TenantId): Promise<ReadonlyArray<ObservedEvent>>;
  getObservedEventById(tenantId: TenantId, id: ObservedEventId): Promise<ObservedEvent | null>;
}
