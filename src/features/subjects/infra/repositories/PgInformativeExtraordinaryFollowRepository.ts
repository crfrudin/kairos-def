// src/features/subjects/infra/repositories/PgInformativeExtraordinaryFollowRepository.ts

import type { PoolClient } from "pg";
import type {
  IInformativeExtraordinaryFollowRepository,
  InformativeExtraordinaryFollowRow,
  ExtraordinaryTribunal,
  UUID,
  ISOTimestamp,
} from "@/features/subjects/application/ports/IInformativeExtraordinaryFollowRepository";

function toIso(ts: any): string {
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "string") return new Date(ts).toISOString();
  return new Date(ts).toISOString();
}

export class PgInformativeExtraordinaryFollowRepository implements IInformativeExtraordinaryFollowRepository {
  constructor(private readonly client: PoolClient) {}

  async list(params: { userId: UUID }): Promise<ReadonlyArray<InformativeExtraordinaryFollowRow>> {
    const res = await this.client.query(
      `
      select user_id, tribunal, last_read_number, is_active, created_at, updated_at
      from public.informative_extraordinary_follows
      where user_id = $1
      order by tribunal asc
      `,
      [params.userId]
    );

    return res.rows.map((r) => ({
      userId: String(r.user_id),
      tribunal: String(r.tribunal) as ExtraordinaryTribunal,
      lastReadNumber: Number(r.last_read_number),
      isActive: Boolean(r.is_active),
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    }));
  }

  async upsert(params: {
    userId: UUID;
    tribunal: ExtraordinaryTribunal;
    lastReadNumber: number;
    isActive: boolean;
    now: ISOTimestamp;
  }): Promise<void> {
    await this.client.query(
      `
      insert into public.informative_extraordinary_follows
        (user_id, tribunal, last_read_number, is_active, updated_at)
      values
        ($1, $2, $3, $4, $5)
      on conflict (user_id, tribunal)
      do update set
        last_read_number = excluded.last_read_number,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
      `,
      [params.userId, params.tribunal, params.lastReadNumber, params.isActive, params.now]
    );
  }

  async deactivate(params: { userId: UUID; tribunal: ExtraordinaryTribunal; now: ISOTimestamp }): Promise<void> {
    await this.client.query(
      `
      update public.informative_extraordinary_follows
      set is_active = false, updated_at = $3
      where user_id = $1 and tribunal = $2
      `,
      [params.userId, params.tribunal, params.now]
    );
  }
}
