// src/features/subjects/infra/repositories/PgInformativeLatestRepository.ts

import type { PoolClient } from "pg";
import type { IInformativeLatestRepository, InformativeLatestRow } from "@/features/subjects/application/ports/IInformativeLatestRepository";
import type { Tribunal } from "@/features/subjects/application/ports/IInformativeFollowRepository";

function toIso(ts: any): string {
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "string") return new Date(ts).toISOString();
  return new Date(ts).toISOString();
}

export class PgInformativeLatestRepository implements IInformativeLatestRepository {
  constructor(private readonly client: PoolClient) {}

  async listByTribunals(params: { tribunals: ReadonlyArray<Tribunal> }): Promise<ReadonlyArray<InformativeLatestRow>> {
    const tribunals = params.tribunals;
    if (!tribunals.length) return [];

    const res = await this.client.query(
      `
      select tribunal, latest_available_number, source, checked_day, checked_at
      from public.informative_latest_by_tribunal
      where tribunal = any($1::text[])
      order by tribunal asc
      `,
      [tribunals]
    );

    return res.rows.map((r) => ({
      tribunal: String(r.tribunal) as Tribunal,
      latestAvailableNumber: Number(r.latest_available_number),
      source: String(r.source),
      checkedDay: String(r.checked_day),
      checkedAt: toIso(r.checked_at),
    }));
  }
}
