import type { PoolClient } from "pg";
import type {
  IInformativeFollowRepository,
  InformativeFollowRow,
  Tribunal,
  UUID,
  ISOTimestamp,
} from "@/features/subjects/application/ports/IInformativeFollowRepository";

function toIso(ts: unknown): string {
  const d =
    ts instanceof Date
      ? ts
      : typeof ts === "string" || typeof ts === "number"
        ? new Date(ts)
        : new Date(String(ts));

  if (!Number.isFinite(d.getTime())) {
    throw new Error("INVALID_TIMESTAMP");
  }
  return d.toISOString();
}

export class PgInformativeFollowRepository implements IInformativeFollowRepository {
  constructor(private readonly client: PoolClient) {}

  async list(params: { userId: UUID }): Promise<ReadonlyArray<InformativeFollowRow>> {
    const { userId } = params;

    const res = await this.client.query(
      `
      select id, user_id, tribunal, last_read_number, is_active, created_at, updated_at
      from public.informative_follows
      where user_id = $1
      order by tribunal asc
      `,
      [userId]
    );

    return res.rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      tribunal: String(r.tribunal) as Tribunal,
      lastReadNumber: Number(r.last_read_number),
      isActive: Boolean(r.is_active),
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    }));
  }

  async upsert(params: {
    userId: UUID;
    tribunal: Tribunal;
    lastReadNumber: number;
    isActive: boolean;
    now: ISOTimestamp;
  }): Promise<void> {
    const { userId, tribunal, lastReadNumber, isActive, now } = params;

    await this.client.query(
      `
      insert into public.informative_follows (user_id, tribunal, last_read_number, is_active, updated_at)
      values ($1,$2,$3,$4,$5)
      on conflict (user_id, tribunal)
      do update set
        last_read_number = excluded.last_read_number,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
      `,
      [userId, tribunal, lastReadNumber, isActive, now]
    );
  }

  async deactivate(params: { userId: UUID; tribunal: Tribunal; now: ISOTimestamp }): Promise<void> {
    const { userId, tribunal, now } = params;

    await this.client.query(
      `
      update public.informative_follows
      set is_active = false, updated_at = $3
      where user_id = $1 and tribunal = $2
      `,
      [userId, tribunal, now]
    );
  }
}
