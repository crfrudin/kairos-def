import type { PoolClient } from "pg";
import type {
  IStandaloneLawRepository,
  StandaloneLawRow,
  StandaloneLawBundleDTO,
  UUID,
  ISOTimestamp,
} from "@/features/subjects/application/ports/IStandaloneLawRepository";

type LawMode = StandaloneLawBundleDTO["lawMode"];

function toIso(ts: unknown): string {
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "string" || typeof ts === "number") return new Date(ts).toISOString();
  return new Date(String(ts)).toISOString();
}

function bundleOrNull(row: Record<string, unknown>): StandaloneLawBundleDTO | null {
  const lawName = row["law_name"];
  const totalArticles = row["total_articles"];
  const readArticles = row["read_articles"];
  const lawMode = row["law_mode"];
  const fixedArticlesPerDay = row["fixed_articles_per_day"];

  const hasAny =
    lawName !== null ||
    totalArticles !== null ||
    readArticles !== null ||
    lawMode !== null ||
    fixedArticlesPerDay !== null;

  if (!hasAny) return null;

  if (lawName === null || totalArticles === null || readArticles === null || lawMode === null) return null;

  return {
    lawName: String(lawName),
    totalArticles: Number(totalArticles),
    readArticles: Number(readArticles),
    lawMode: String(lawMode) as LawMode,
    fixedArticlesPerDay: fixedArticlesPerDay === null ? null : Number(fixedArticlesPerDay),
  };
}

export class PgStandaloneLawRepository implements IStandaloneLawRepository {
  constructor(private readonly client: PoolClient) {}

  async list(params: { userId: UUID }): Promise<ReadonlyArray<StandaloneLawRow>> {
    const { userId } = params;

    const res = await this.client.query(
      `
      select *
      from public.standalone_laws
      where user_id = $1
      order by other_subject_label asc
      `,
      [userId]
    );

    return res.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row["id"]),
        userId: String(row["user_id"]),
        otherSubjectLabel: String(row["other_subject_label"]),
        bundle: bundleOrNull(row),
        isDeleted: Boolean(row["is_deleted"]),
        createdAt: toIso(row["created_at"]),
        updatedAt: toIso(row["updated_at"]),
      };
    });
  }

  async getById(params: { userId: UUID; id: UUID }): Promise<StandaloneLawRow | null> {
    const { userId, id } = params;

    const res = await this.client.query(
      `
      select *
      from public.standalone_laws
      where user_id = $1 and id = $2
      `,
      [userId, id]
    );

    if (res.rowCount === 0) return null;

    const row = res.rows[0] as Record<string, unknown>;
    return {
      id: String(row["id"]),
      userId: String(row["user_id"]),
      otherSubjectLabel: String(row["other_subject_label"]),
      bundle: bundleOrNull(row),
      isDeleted: Boolean(row["is_deleted"]),
      createdAt: toIso(row["created_at"]),
      updatedAt: toIso(row["updated_at"]),
    };
  }

  async create(params: { userId: UUID; otherSubjectLabel: string; bundle: StandaloneLawBundleDTO | null; now: ISOTimestamp }): Promise<{ id: UUID }> {
    const { userId, otherSubjectLabel, bundle, now } = params;

    const res = await this.client.query(
      `
      insert into public.standalone_laws
        (user_id, other_subject_label, law_name, total_articles, read_articles, law_mode, fixed_articles_per_day, is_deleted, updated_at)
      values
        ($1,$2,$3,$4,$5,$6,$7,false,$8)
      returning id
      `,
      [
        userId,
        otherSubjectLabel,
        bundle ? bundle.lawName : null,
        bundle ? bundle.totalArticles : null,
        bundle ? bundle.readArticles : null,
        bundle ? bundle.lawMode : null,
        bundle ? bundle.fixedArticlesPerDay : null,
        now,
      ]
    );

    return { id: String((res.rows[0] as Record<string, unknown>)["id"]) };
  }

  async replace(params: {
    userId: UUID;
    id: UUID;
    otherSubjectLabel: string;
    bundle: StandaloneLawBundleDTO | null;
    isDeleted: boolean;
    now: ISOTimestamp;
  }): Promise<void> {
    const { userId, id, otherSubjectLabel, bundle, isDeleted, now } = params;

    await this.client.query(
      `
      update public.standalone_laws
      set
        other_subject_label = $3,
        law_name = $4,
        total_articles = $5,
        read_articles = $6,
        law_mode = $7,
        fixed_articles_per_day = $8,
        is_deleted = $9,
        updated_at = $10
      where user_id = $1 and id = $2
      `,
      [
        userId,
        id,
        otherSubjectLabel,
        bundle ? bundle.lawName : null,
        bundle ? bundle.totalArticles : null,
        bundle ? bundle.readArticles : null,
        bundle ? bundle.lawMode : null,
        bundle ? bundle.fixedArticlesPerDay : null,
        isDeleted,
        now,
      ]
    );
  }
}
