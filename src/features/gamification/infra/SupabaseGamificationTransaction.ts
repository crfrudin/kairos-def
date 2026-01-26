// src/features/gamification/infra/SupabaseGamificationTransaction.ts
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  IGamificationTransaction,
  IObservedEventRepository,
  IObservationMarkRepository,
  IAchievementGrantRepository,
  IStreakTransitionRepository,
  IStreakSnapshotRepository,
  IConsolidationLogRepository,
} from "@/features/gamification/application/ports";

import type {
  ObservedEvent,
  ObservationMark,
  AchievementGrant,
  StreakTransition,
  StreakSnapshot,
  TenantId,
  FactualEventType,
  FactualReference,
  ObservedEventId,
  AchievementGrantId,
  StreakTransitionId,
  StreakKey,
  IsoDateTimeString,
} from "@/features/gamification/application/contracts";

import type { ConsolidationLogEntry } from "@/features/gamification/application/ports/IConsolidationLogRepository";

/**
 * Transaction Runner (Supabase) — sem RPC, sem bypass de RLS, sem simulação enganosa.
 *
 * O Supabase (PostgREST) não oferece transação multi-statement sem RPC/functions.
 * Para preservar o contrato de "bloco transacional" da Application sem mentir sobre atomicidade:
 * - Bufferizamos as escritas (sem tocar no banco durante o work()).
 * - Aplicamos todas as escritas ao final, em ordem física segura (constraints/FKs).
 * - Se falhar, propagamos erro (Application converte para ViolacaoAntiAbuso).
 *
 * NÃO é garantia de atomicidade no banco.
 * É uma orquestração mecânica de IO, compatível com as limitações do Supabase sem criar regras novas.
 */
export class SupabaseGamificationTransaction implements IGamificationTransaction {
  constructor(
    private readonly deps: {
      supabase: SupabaseClient;
    }
  ) {}

  public async runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const buffer = new GamificationWriteBuffer(this.deps.supabase);

    // Repositórios "bufferizados" expostos para o bloco do UC via DI (na composition).
    // Nesta etapa, o runner existe e é utilizável por wiring futuro.
    buffer.expose();

    const result = await fn();

    // Aplica as escritas em ordem segura (sem regra normativa; apenas constraints).
    await buffer.flush();

    return result;
  }

  /**
   * Factory de repositórios para wiring futuro (Composition root).
   * Mantido aqui para centralizar o uso do buffer.
   */
  public createBufferedRepositories(): {
    observedEventRepo: IObservedEventRepository;
    observationMarkRepo: IObservationMarkRepository;
    achievementGrantRepo: IAchievementGrantRepository;
    streakTransitionRepo: IStreakTransitionRepository;
    streakSnapshotRepo: IStreakSnapshotRepository;
    consolidationLogRepo: IConsolidationLogRepository;
    flush: () => Promise<void>;
  } {
    const buffer = new GamificationWriteBuffer(this.deps.supabase);
    const repos = buffer.expose();
    return { ...repos, flush: () => buffer.flush() };
  }
}

type PendingObservedEvent = ObservedEvent;
type PendingMark = ObservationMark;

type PendingAchievementGrant = AchievementGrant;
type PendingStreakTransition = StreakTransition;
type PendingStreakSnapshot = StreakSnapshot;

type Json = Record<string, unknown>;

class GamificationWriteBuffer {
  private readonly supabase: SupabaseClient;

  private observedEvents: PendingObservedEvent[] = [];
  private marks: PendingMark[] = [];

  private grants: PendingAchievementGrant[] = [];
  private transitions: PendingStreakTransition[] = [];
  private snapshots: PendingStreakSnapshot[] = [];

  private consolidationEntries: ConsolidationLogEntry[] = [];

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  public expose(): {
    observedEventRepo: IObservedEventRepository;
    observationMarkRepo: IObservationMarkRepository;
    achievementGrantRepo: IAchievementGrantRepository;
    streakTransitionRepo: IStreakTransitionRepository;
    streakSnapshotRepo: IStreakSnapshotRepository;
    consolidationLogRepo: IConsolidationLogRepository;
  } {
    return {
      observedEventRepo: new BufferedObservedEventRepository(this),
      observationMarkRepo: new BufferedObservationMarkRepository(this),
      achievementGrantRepo: new BufferedAchievementGrantRepository(this),
      streakTransitionRepo: new BufferedStreakTransitionRepository(this),
      streakSnapshotRepo: new BufferedStreakSnapshotRepository(this),
      consolidationLogRepo: new BufferedConsolidationLogRepository(this),
    };
  }

  // --- buffer append operations (no DB writes here) ---
  public bufferObservedEvent(ev: PendingObservedEvent) {
    this.observedEvents.push(ev);
  }

  public bufferMark(mark: PendingMark) {
    this.marks.push(mark);
  }

  public bufferGrant(grant: PendingAchievementGrant) {
    this.grants.push(grant);
  }

  public bufferTransition(t: PendingStreakTransition) {
    this.transitions.push(t);
  }

  public bufferSnapshot(s: PendingStreakSnapshot) {
    this.snapshots.push(s);
  }

  public bufferConsolidationEntry(e: ConsolidationLogEntry) {
    this.consolidationEntries.push(e);
  }

  // --- flush (apply to DB in safe order) ---
  public async flush(): Promise<void> {
    // 1) Observed events (E1)
    if (this.observedEvents.length > 0) {
      const rows = this.observedEvents.map((e) => ({
        id: e.id,
        user_id: e.tenantId,
        event_type: e.eventType,
        reference_key: e.factualRef,
        occurred_at: e.occurredAt,
        metadata: {} as Json,
      }));

      const { error } = await this.supabase.from("gamification_observed_events").insert(rows);
      if (error) throw error;
    }

    // 2) Observation marks (E2) — needs observed_event_id FK
    if (this.marks.length > 0) {
      const markRows = this.marks.map((m) => {
        const canonicalKey = buildCanonicalKey(m.eventType, m.factualRef);

        // Resolver mecânico do observed_event_id:
        // - deve existir um ObservedEvent correspondente no mesmo buffer.
        const matching = this.observedEvents.find(
          (e) => e.tenantId === m.tenantId && e.eventType === m.eventType && e.factualRef === m.factualRef
        );
        if (!matching) {
          throw new Error(
            `GAM_INFRA_MARK_NO_MATCHING_EVENT: mark exige observed_event_id, mas não há ObservedEvent no buffer (tenantId=${m.tenantId})`
          );
        }

        return {
          user_id: m.tenantId,
          canonical_key: canonicalKey,
          observed_event_id: matching.id,
        };
      });

      const { error } = await this.supabase.from("gamification_observation_marks").insert(markRows);
      if (error) throw error;
    }

    // 3) Achievement grants + link (E3)
    if (this.grants.length > 0) {
      const grantRows = this.grants.map((g) => ({
        id: g.id,
        user_id: g.tenantId,
        achievement_key: g.achievementSlug,
        grant_key: g.achievementSlug, // idempotência mecânica por slug (Application também usa existsGrantBySlug)
        rule_key: g.achievementSlug, // placeholder estrutural (sem semântica normativa na infra)
        recognized_at: g.grantedAt,
        metadata: {} as Json,
      }));

      const { error: grantErr } = await this.supabase.from("gamification_achievement_grants").insert(grantRows);
      if (grantErr) throw grantErr;

      // Link table: grant ↔ observed events
      const linkRows: Array<{ user_id: string; achievement_grant_id: string; observed_event_id: string }> = [];
      for (const g of this.grants) {
        for (const evId of g.basedOnObservedEventIds ?? []) {
          linkRows.push({
            user_id: g.tenantId,
            achievement_grant_id: g.id,
            observed_event_id: evId,
          });
        }
      }

      if (linkRows.length > 0) {
        const { error: linkErr } = await this.supabase.from("gamification_achievement_grant_events").insert(linkRows);
        if (linkErr) throw linkErr;
      }
    }

    // 4) Streak transitions + link (E4)
    if (this.transitions.length > 0) {
      const transitionRows = this.transitions.map((t) => ({
        id: t.id,
        user_id: t.tenantId,
        streak_key: t.streakKey,
        transition_type: t.streakKey, // mapeamento mecânico (UC03 não fornece tipo específico)
        recognized_at: t.occurredAt,
        from_state: null as string | null,
        to_state: null as string | null,
        current_length: 0,
        best_length: 0,
        metadata: (t.payload ?? {}) as Json,
      }));

      const { error: trErr } = await this.supabase.from("gamification_streak_transitions").insert(transitionRows);
      if (trErr) throw trErr;

      // Link table: transition ↔ observed event (se houver)
      const tLinkRows: Array<{ user_id: string; streak_transition_id: string; observed_event_id: string }> = [];
      for (const t of this.transitions) {
        const based = tryGetString((t.payload ?? {}) as Json, "basedOnObservedEventId");
        if (based) {
          tLinkRows.push({
            user_id: t.tenantId,
            streak_transition_id: t.id,
            observed_event_id: based,
          });
        }
      }

      if (tLinkRows.length > 0) {
        const { error: tLinkErr } = await this.supabase.from("gamification_streak_transition_events").insert(tLinkRows);
        if (tLinkErr) throw tLinkErr;
      }
    }

    // 5) Streak snapshots (E5) — needs last_transition_id FK
    if (this.snapshots.length > 0) {
      const snapRows = this.snapshots.map((s) => {
        const lastObservedEventId = tryGetString((s.state ?? {}) as Json, "lastObservedEventId");

        // Resolver mecânico do last_transition_id:
        // - tenta achar transição no buffer do mesmo streak baseada no mesmo observed event.
        const matchingTransition = lastObservedEventId
          ? this.transitions.find(
              (t) =>
                t.tenantId === s.tenantId &&
                t.streakKey === s.streakKey &&
                tryGetString((t.payload ?? {}) as Json, "basedOnObservedEventId") === lastObservedEventId
            )
          : null;

        if (!matchingTransition) {
          throw new Error(
            `GAM_INFRA_SNAPSHOT_NO_LAST_TRANSITION: snapshot exige last_transition_id e não foi possível resolver (tenantId=${s.tenantId}, streakKey=${s.streakKey})`
          );
        }

        return {
          user_id: s.tenantId,
          streak_key: s.streakKey,
          current_state: stringifySafe(s.state ?? {}),
          current_length: 0,
          best_length: 0,
          last_transition_id: matchingTransition.id,
          updated_at: s.updatedAt,
        };
      });

      // upsert via primary key (user_id, streak_key)
      const { error: snapErr } = await this.supabase
        .from("gamification_streak_snapshots")
        .upsert(snapRows, { onConflict: "user_id,streak_key" });

      if (snapErr) throw snapErr;
    }

    // 6) Consolidation log (E6)
    if (this.consolidationEntries.length > 0) {
      const rows = this.consolidationEntries.map((e) => {
        const date = (e.createdAt ?? "").slice(0, 10) || isoNow().slice(0, 10);
        return {
          user_id: e.tenantId,
          window_start: date,
          window_end: date,
          consolidated_at: e.createdAt,
          source_observed_event_id: null,
          result_last_achievement_grant_id: null,
          result_last_streak_transition_id: null,
          metadata: {
            key: e.key,
            payload: e.payload ?? {},
          } as Json,
        };
      });

      const { error } = await this.supabase.from("gamification_consolidation_log").insert(rows);
      if (error) throw error;
    }
  }
}

// -------------------------
// Buffered Repositories
// -------------------------

class BufferedObservedEventRepository implements IObservedEventRepository {
  constructor(private readonly buf: GamificationWriteBuffer) {}

  public async insertObservedEvent(event: ObservedEvent): Promise<void> {
    this.buf.bufferObservedEvent(event);
  }

  // Leitura não é bufferizada (é leitura direta)
  public async listObservedEventsByTenant(tenantId: TenantId): Promise<ReadonlyArray<ObservedEvent>> {
    const { data, error } = await (this.buf as any).supabase
      .from("gamification_observed_events")
      .select("id,user_id,event_type,reference_key,occurred_at")
      .eq("user_id", tenantId)
      .order("observed_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      tenantId: String(r.user_id),
      eventType: String(r.event_type),
      factualRef: String(r.reference_key),
      occurredAt: String(r.occurred_at),
    }));
  }

  public async getObservedEventById(tenantId: TenantId, id: ObservedEventId): Promise<ObservedEvent | null> {
    const { data, error } = await (this.buf as any).supabase
      .from("gamification_observed_events")
      .select("id,user_id,event_type,reference_key,occurred_at")
      .eq("user_id", tenantId)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: String(data.id),
      tenantId: String(data.user_id),
      eventType: String(data.event_type),
      factualRef: String(data.reference_key),
      occurredAt: String(data.occurred_at),
    };
  }
}

class BufferedObservationMarkRepository implements IObservationMarkRepository {
  constructor(private readonly buf: GamificationWriteBuffer) {}

  public async existsMark(tenantId: TenantId, eventType: FactualEventType, factualRef: FactualReference): Promise<boolean> {
    const canonicalKey = buildCanonicalKey(eventType, factualRef);

    const { data, error } = await (this.buf as any).supabase
      .from("gamification_observation_marks")
      .select("id")
      .eq("user_id", tenantId)
      .eq("canonical_key", canonicalKey)
      .limit(1);

    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  }

  public async insertMark(mark: ObservationMark): Promise<void> {
    // bufferiza; o FK observed_event_id será resolvido no flush()
    this.buf.bufferMark(mark);
  }
}

class BufferedAchievementGrantRepository implements IAchievementGrantRepository {
  constructor(private readonly buf: GamificationWriteBuffer) {}

  public async insertGrant(grant: AchievementGrant): Promise<void> {
    this.buf.bufferGrant(grant);
  }

  public async existsGrantBySlug(tenantId: TenantId, achievementSlug: string): Promise<boolean> {
    const { data, error } = await (this.buf as any).supabase
      .from("gamification_achievement_grants")
      .select("id")
      .eq("user_id", tenantId)
      .eq("achievement_key", achievementSlug)
      .limit(1);

    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  }

  public async listGrantsByTenant(tenantId: TenantId): Promise<ReadonlyArray<AchievementGrant>> {
    const { data, error } = await (this.buf as any).supabase
      .from("gamification_achievement_grants")
      .select("id,user_id,achievement_key,recognized_at")
      .eq("user_id", tenantId)
      .order("recognized_at", { ascending: false });

    if (error) throw error;

    const grants = (data ?? []).map((r: any) => ({
      id: String(r.id),
      tenantId: String(r.user_id),
      achievementSlug: String(r.achievement_key),
      grantedAt: String(r.recognized_at),
      basedOnObservedEventIds: [] as ReadonlyArray<ObservedEventId>,
    }));

    // carregar links
    const ids = grants.map((g: AchievementGrant) => g.id);
    if (ids.length === 0) return grants;

    const { data: links, error: linkErr } = await (this.buf as any).supabase
      .from("gamification_achievement_grant_events")
      .select("achievement_grant_id,observed_event_id")
      .eq("user_id", tenantId)
      .in("achievement_grant_id", ids);

    if (linkErr) throw linkErr;

    const byGrant = new Map<string, string[]>();
    for (const l of links ?? []) {
      const gid = String((l as any).achievement_grant_id);
      const eid = String((l as any).observed_event_id);
      const arr = byGrant.get(gid) ?? [];
      arr.push(eid);
      byGrant.set(gid, arr);
    }

    return grants.map((g: AchievementGrant) => ({
      ...g,
      basedOnObservedEventIds: (byGrant.get(g.id) ?? []) as ReadonlyArray<ObservedEventId>,
    }));
  }

  public async getGrantById(tenantId: TenantId, id: AchievementGrantId): Promise<AchievementGrant | null> {
    const { data, error } = await (this.buf as any).supabase
      .from("gamification_achievement_grants")
      .select("id,user_id,achievement_key,recognized_at")
      .eq("user_id", tenantId)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const { data: links, error: linkErr } = await (this.buf as any).supabase
      .from("gamification_achievement_grant_events")
      .select("observed_event_id")
      .eq("user_id", tenantId)
      .eq("achievement_grant_id", id);

    if (linkErr) throw linkErr;

    return {
      id: String(data.id),
      tenantId: String(data.user_id),
      achievementSlug: String(data.achievement_key),
      grantedAt: String(data.recognized_at),
      basedOnObservedEventIds: (links ?? []).map((l: any) => String(l.observed_event_id)),
    };
  }
}

class BufferedStreakTransitionRepository implements IStreakTransitionRepository {
  constructor(private readonly buf: GamificationWriteBuffer) {}

  public async insertTransition(transition: StreakTransition): Promise<void> {
    this.buf.bufferTransition(transition);
  }

  public async listTransitionsByTenant(tenantId: TenantId): Promise<ReadonlyArray<StreakTransition>> {
    const { data, error } = await (this.buf as any).supabase
      .from("gamification_streak_transitions")
      .select("id,user_id,streak_key,recognized_at,metadata")
      .eq("user_id", tenantId)
      .order("recognized_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      tenantId: String(r.user_id),
      streakKey: String(r.streak_key),
      occurredAt: String(r.recognized_at),
      payload: (r.metadata ?? {}) as Json,
    }));
  }

  public async listTransitionsByStreak(tenantId: TenantId, streakKey: StreakKey): Promise<ReadonlyArray<StreakTransition>> {
    const { data, error } = await (this.buf as any).supabase
      .from("gamification_streak_transitions")
      .select("id,user_id,streak_key,recognized_at,metadata")
      .eq("user_id", tenantId)
      .eq("streak_key", streakKey)
      .order("recognized_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      tenantId: String(r.user_id),
      streakKey: String(r.streak_key),
      occurredAt: String(r.recognized_at),
      payload: (r.metadata ?? {}) as Json,
    }));
  }

  public async getTransitionById(tenantId: TenantId, id: StreakTransitionId): Promise<StreakTransition | null> {
    const { data, error } = await (this.buf as any).supabase
      .from("gamification_streak_transitions")
      .select("id,user_id,streak_key,recognized_at,metadata")
      .eq("user_id", tenantId)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: String(data.id),
      tenantId: String(data.user_id),
      streakKey: String(data.streak_key),
      occurredAt: String(data.recognized_at),
      payload: (data.metadata ?? {}) as Json,
    };
  }
}

class BufferedStreakSnapshotRepository implements IStreakSnapshotRepository {
  constructor(private readonly buf: GamificationWriteBuffer) {}

  public async getSnapshot(tenantId: TenantId, streakKey: StreakKey): Promise<StreakSnapshot | null> {
    const { data, error } = await (this.buf as any).supabase
      .from("gamification_streak_snapshots")
      .select("user_id,streak_key,current_state,updated_at")
      .eq("user_id", tenantId)
      .eq("streak_key", streakKey)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      tenantId: String(data.user_id),
      streakKey: String(data.streak_key),
      state: parseSafe(String(data.current_state)),
      updatedAt: String(data.updated_at),
    };
  }

  public async upsertSnapshot(snapshot: StreakSnapshot): Promise<void> {
    this.buf.bufferSnapshot(snapshot);
  }

  public async listSnapshotsByTenant(tenantId: TenantId): Promise<ReadonlyArray<StreakSnapshot>> {
    const { data, error } = await (this.buf as any).supabase
      .from("gamification_streak_snapshots")
      .select("user_id,streak_key,current_state,updated_at")
      .eq("user_id", tenantId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      tenantId: String(r.user_id),
      streakKey: String(r.streak_key),
      state: parseSafe(String(r.current_state)),
      updatedAt: String(r.updated_at),
    }));
  }
}

class BufferedConsolidationLogRepository implements IConsolidationLogRepository {
  constructor(private readonly buf: GamificationWriteBuffer) {}

  public async insertEntry(entry: ConsolidationLogEntry): Promise<void> {
    this.buf.bufferConsolidationEntry(entry);
  }

  public async listEntriesByTenant(tenantId: TenantId): Promise<ReadonlyArray<ConsolidationLogEntry>> {
    const { data, error } = await (this.buf as any).supabase
      .from("gamification_consolidation_log")
      .select("user_id,consolidated_at,metadata")
      .eq("user_id", tenantId)
      .order("consolidated_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((r: any) => {
      const md = (r.metadata ?? {}) as Json;
      return {
        tenantId: String(r.user_id),
        key: String(md.key ?? ""),
        createdAt: String(r.consolidated_at),
        payload: (md.payload ?? {}) as Json,
      };
    });
  }
}

// -------------------------
// Helpers (no generic abstractions)
// -------------------------

function buildCanonicalKey(eventType: string, factualRef: string): string {
  // Mapeamento mecânico: concatenação estável (sem regra normativa adicional).
  return `${String(eventType)}::${String(factualRef)}`;
}

function stringifySafe(v: unknown): string {
  try {
    return JSON.stringify(v ?? {});
  } catch {
    return "{}";
  }
}

function parseSafe(text: string): Json {
  try {
    const v = JSON.parse(text);
    if (v && typeof v === "object") return v as Json;
    return { raw: text };
  } catch {
    return { raw: text };
  }
}

function tryGetString(obj: Json, key: string): string | null {
  const v = (obj as any)?.[key];
  if (typeof v === "string" && v.trim()) return v;
  return null;
}

function isoNow(): IsoDateTimeString {
  return new Date().toISOString();
}
