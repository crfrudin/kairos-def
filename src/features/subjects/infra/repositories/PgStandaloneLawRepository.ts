// src/features/subjects/infra/repositories/PgStandaloneLawRepository.ts

import type { PoolClient } from 'pg';
import type {
  IStandaloneLawRepository,
  StandaloneLawRow,
  StandaloneLawBundleDTO,
  UUID,
  ISOTimestamp,
} from '@/features/subjects/application/ports/IStandaloneLawRepository';

function toIso(ts: any): string {
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === 'string') return new Date(ts).toISOString();
  return new Date(ts).toISOString();
}

function bundleOrNull(r: any): StandaloneLawBundleDTO | null {
  const hasAny =
    r.law_name !== null ||
    r.total_articles !== null ||
    r.read_articles !== null ||
    r.law_mode !== null ||
    r.fixed_articles_per_day !== null;

  if (!hasAny) return null;

  // Bundle “válido” = todos os campos obrigatórios presentes.
  // (O DB já impõe o CHECK condicional; aqui apenas reconstruímos determinística e seguramente.)
  if (r.law_name === null || r.total_articles === null || r.read_articles === null || r.law_mode === null) return null;

  return {
    lawName: String(r.law_name),
    totalArticles: Number(r.total_articles),
    readArticles: Number(r.read_articles),
    lawMode: String(r.law_mode) as any,
    fixedArticlesPerDay: r.fixed_articles_per_day === null ? null : Number(r.fixed_articles_per_day),
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

    return res.rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      otherSubjectLabel: String(r.other_subject_label),
      bundle: bundleOrNull(r),
      isDeleted: Boolean(r.is_deleted),
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    }));
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

    const r = res.rows[0];
    return {
      id: String(r.id),
      userId: String(r.user_id),
      otherSubjectLabel: String(r.other_subject_label),
      bundle: bundleOrNull(r),
      isDeleted: Boolean(r.is_deleted),
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
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

    return { id: String(res.rows[0].id) };
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
