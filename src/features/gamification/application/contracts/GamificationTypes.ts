/**
 * Tipos estruturais (não normativos) para suportar contratos de Application.
 * Sem IO, sem schema, sem regras. Apenas "shape" de dados.
 */

export type TenantId = string;

export type IsoDateTimeString = string;

/** Tipo canônico do evento factual observado (ETAPA 1) — representado aqui como string fechada futuramente. */
export type FactualEventType = string;

/** Referência factual imutável (id externo/composto), usada para idempotência de observação. */
export type FactualReference = string;

export type ObservedEventId = string;
export type AchievementGrantId = string;
export type StreakTransitionId = string;
export type StreakKey = string;

export interface ObservedEvent {
  id: ObservedEventId;
  tenantId: TenantId;
  eventType: FactualEventType;
  factualRef: FactualReference;
  occurredAt: IsoDateTimeString;
}

export interface ObservationMark {
  tenantId: TenantId;
  eventType: FactualEventType;
  factualRef: FactualReference;
}

export interface AchievementGrant {
  id: AchievementGrantId;
  tenantId: TenantId;
  /** Identificador canônico (slug) da regra de conquista (ETAPA 2). */
  achievementSlug: string;
  grantedAt: IsoDateTimeString;
  /** IDs de eventos observados que fundamentaram a concessão (auditabilidade). */
  basedOnObservedEventIds: ReadonlyArray<ObservedEventId>;
}

export interface StreakTransition {
  id: StreakTransitionId;
  tenantId: TenantId;
  streakKey: StreakKey;
  occurredAt: IsoDateTimeString;
  /** Payload estrutural; sem interpretação normativa aqui. */
  payload: Record<string, unknown>;
}

export interface StreakSnapshot {
  tenantId: TenantId;
  streakKey: StreakKey;
  /** Estado atual derivado persistido (ETAPA 5). */
  state: Record<string, unknown>;
  updatedAt: IsoDateTimeString;
}

export interface CurrentSymbolicState {
  tenantId: TenantId;
  achievements: ReadonlyArray<AchievementGrant>;
  streaks: ReadonlyArray<StreakSnapshot>;
}

export type SymbolicHistoryScope =
  | { kind: "ALL" }
  | { kind: "OBSERVED_EVENTS_ONLY" }
  | { kind: "ACHIEVEMENTS_ONLY" }
  | { kind: "STREAKS_ONLY" };

export interface SymbolicHistory {
  tenantId: TenantId;
  observedEvents: ReadonlyArray<ObservedEvent>;
  achievementGrants: ReadonlyArray<AchievementGrant>;
  streakTransitions: ReadonlyArray<StreakTransition>;
}
