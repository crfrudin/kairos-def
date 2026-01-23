import type { PoolClient } from "pg";
import type {
  IInformativeLatestExtraordinaryRepository,
  InformativeLatestExtraordinaryRow,
  ExtraordinaryTribunal,
} from "@/features/subjects/application/ports/IInformativeLatestExtraordinaryRepository";

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

export class PgInformativeLatestExtraordinaryRepository implements IInformativeLatestExtraordinaryRepository {
  constructor(private readonly client: PoolClient) {}

  async listByTribunals(params: {
    tribunals: ReadonlyArray<ExtraordinaryTribunal>;
  }): Promise<ReadonlyArray<InformativeLatestExtraordinaryRow>> {
    const tribunals = params.tribunals;
    if (!tribunals.length) return [];

    const res = await this.client.query(
      `
      select tribunal, latest_available_number, source, checked_day, checked_at
      from public.informative_latest_extraordinary_by_tribunal
      where tribunal = any($1::text[])
      order by tribunal asc
      `,
      [tribunals]
    );

    return res.rows.map((r) => ({
      tribunal: String(r.tribunal) as ExtraordinaryTribunal,
      latestAvailableNumber: Number(r.latest_available_number),
      source: String(r.source),
      checkedDay: String(r.checked_day),
      checkedAt: toIso(r.checked_at),
    }));
  }
}
