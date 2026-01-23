import type { PoolClient } from "pg";
import type {
  ISubjectPriorityOrderRepository,
  SubjectPriorityOrderRow,
  UUID,
  ISOTimestamp,
} from "@/features/subjects/application/ports/ISubjectPriorityOrderRepository";

function toIso(ts: unknown): string {
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "string" || typeof ts === "number") return new Date(ts).toISOString();
  return new Date(String(ts)).toISOString();
}

export class PgSubjectPriorityOrderRepository implements ISubjectPriorityOrderRepository {
  constructor(private readonly client: PoolClient) {}

  async list(params: { userId: UUID }): Promise<ReadonlyArray<SubjectPriorityOrderRow>> {
    const { userId } = params;

    const res = await this.client.query(
      `
      select user_id, subject_id, position, created_at, updated_at
      from public.subject_priority_order
      where user_id = $1
      order by position asc
      `,
      [userId]
    );

    return res.rows.map((r) => ({
      userId: String(r.user_id),
      subjectId: String(r.subject_id),
      position: Number(r.position),
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    }));
  }

  async replaceOrder(params: { userId: UUID; orderedSubjectIds: ReadonlyArray<UUID>; now: ISOTimestamp }): Promise<void> {
    const { userId, orderedSubjectIds, now } = params;

    await this.client.query(`delete from public.subject_priority_order where user_id = $1`, [userId]);

    let pos = 1;
    for (const subjectId of orderedSubjectIds) {
      await this.client.query(
        `
        insert into public.subject_priority_order (user_id, subject_id, position, updated_at)
        values ($1,$2,$3,$4)
        `,
        [userId, subjectId, pos, now]
      );
      pos += 1;
    }
  }
}
