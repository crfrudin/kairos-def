// src/features/subjects/infra/repositories/PgSubjectRepository.ts

import type { PoolClient } from 'pg';
import type {
  ISubjectRepository,
  SubjectAggregateDTO,
  SubjectRow,
  SubjectTheoryReadingTrackRow,
  SubjectTheoryVideoTrackRow,
  SubjectQuestionsMetaRow,
  SubjectLawConfigRow,
  UUID,
  ISOTimestamp,
} from '@/features/subjects/application/ports/ISubjectRepository';
import { SubjectsInfraError } from '../errors/SubjectsInfraError';

function toIso(ts: any): string {
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === 'string') return new Date(ts).toISOString();
  return new Date(ts).toISOString();
}

function mapSubjectRow(r: any): SubjectRow {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    name: String(r.name),
    categories: (r.categories ?? []) as any,
    status: String(r.status) as any,
    isDeleted: Boolean(r.is_deleted),
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function mapReadingTrack(r: any): SubjectTheoryReadingTrackRow {
  return {
    userId: String(r.user_id),
    subjectId: String(r.subject_id),
    totalPages: Number(r.total_pages),
    readPages: Number(r.read_pages),
    pacingMode: String(r.pacing_mode) as any,
    pagesPerDay: r.pages_per_day === null ? null : Number(r.pages_per_day),
    pagesPerHour: r.pages_per_hour === null ? null : Number(r.pages_per_hour),
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function mapVideoTrack(r: any): SubjectTheoryVideoTrackRow {
  return {
    userId: String(r.user_id),
    subjectId: String(r.subject_id),
    totalBlocks: Number(r.total_blocks),
    watchedBlocks: Number(r.watched_blocks),
    pacingMode: String(r.pacing_mode) as any,
    blocksPerDay: r.blocks_per_day === null ? null : Number(r.blocks_per_day),
    avgMinutes: r.avg_minutes === null ? null : Number(r.avg_minutes),
    playbackSpeed: String(r.playback_speed) as any,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function mapQuestionsMeta(r: any): SubjectQuestionsMetaRow {
  return {
    userId: String(r.user_id),
    subjectId: String(r.subject_id),
    dailyTarget: Number(r.daily_target),
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function mapLawConfig(r: any): SubjectLawConfigRow {
  return {
    userId: String(r.user_id),
    subjectId: String(r.subject_id),
    lawName: String(r.law_name),
    totalArticles: Number(r.total_articles),
    readArticles: Number(r.read_articles),
    lawMode: String(r.law_mode) as any,
    fixedArticlesPerDay: r.fixed_articles_per_day === null ? null : Number(r.fixed_articles_per_day),
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

export class PgSubjectRepository implements ISubjectRepository {
  constructor(private readonly client: PoolClient) {}

    async listMinimal(params: { userId: UUID }): Promise<ReadonlyArray<{ id: UUID; name: string; isActive: boolean }>> {
    const { userId } = params;

    const res = await this.client.query(
      `
      select
        s.id,
        s.user_id,
        s.name,
        s.status,
        s.is_deleted,
        spo.position
      from public.subjects s
      left join public.subject_priority_order spo
        on spo.user_id = s.user_id
       and spo.subject_id = s.id
      where s.user_id = $1
      order by
        case when spo.position is null then 1 else 0 end,
        spo.position asc,
        s.name asc
      `,
      [userId]
    );

    // Projeção mínima: não é “regra”, é compatibilização com o Subject mínimo atual.
    return res.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      isActive: !Boolean(r.is_deleted) && String(r.status) === "ATIVA",
    }));
  }

  async getAggregate(params: { userId: UUID; subjectId: UUID }): Promise<SubjectAggregateDTO | null> {
    const { userId, subjectId } = params;

    const subjRes = await this.client.query(
      `
      select *
      from public.subjects
      where user_id = $1 and id = $2
      `,
      [userId, subjectId]
    );
    if (subjRes.rowCount === 0) return null;

    const subject = mapSubjectRow(subjRes.rows[0]);

    // Auxiliares: sempre usando FK composta (user_id, subject_id)
    const [readingRes, videoRes, qRes, lawRes] = await Promise.all([
      this.client.query(
        `select * from public.subject_theory_reading_tracks where user_id = $1 and subject_id = $2`,
        [userId, subjectId]
      ),
      this.client.query(
        `select * from public.subject_theory_video_tracks where user_id = $1 and subject_id = $2`,
        [userId, subjectId]
      ),
      this.client.query(
        `select * from public.subject_questions_meta where user_id = $1 and subject_id = $2`,
        [userId, subjectId]
      ),
      this.client.query(
        `select * from public.subject_law_configs where user_id = $1 and subject_id = $2`,
        [userId, subjectId]
      ),
    ]);

    return {
      subject,
      readingTrack: readingRes.rowCount ? mapReadingTrack(readingRes.rows[0]) : null,
      videoTrack: videoRes.rowCount ? mapVideoTrack(videoRes.rows[0]) : null,
      questionsMeta: qRes.rowCount ? mapQuestionsMeta(qRes.rows[0]) : null,
      lawConfig: lawRes.rowCount ? mapLawConfig(lawRes.rows[0]) : null,
    };
  }

  async createAggregate(params: {
    userId: UUID;
    aggregate: Omit<SubjectAggregateDTO, 'subject'> & { subject: Omit<SubjectRow, 'createdAt' | 'updatedAt'> };
    now: ISOTimestamp;
  }): Promise<{ subjectId: UUID }> {
    const { userId, aggregate, now } = params;

    if (aggregate.subject.userId !== userId) {
      throw new SubjectsInfraError('createAggregate: aggregate.subject.userId difere do userId.');
    }

    // subjects: id pode vir preenchido (uuid) ou vazio (neste caso usamos default do DB)
    const insertRes = await this.client.query(
      `
      insert into public.subjects
        (id, user_id, name, categories, status, is_deleted, updated_at)
      values
        (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4::text[], $5, $6, $7)
      returning id
      `,
      [
        aggregate.subject.id || null,
        userId,
        aggregate.subject.name,
        aggregate.subject.categories,
        aggregate.subject.status,
        aggregate.subject.isDeleted,
        now,
      ]
    );

    const subjectId = String(insertRes.rows[0].id);

    // Auxiliares (upsert por PK composta)
    await this.upsertAuxiliaries({
      userId,
      subjectId,
      aggregate,
      now,
      mode: 'create',
    });

    return { subjectId };
  }

  async replaceAggregate(params: {
    userId: UUID;
    subjectId: UUID;
    aggregate: Omit<SubjectAggregateDTO, 'subject'> & { subject: Omit<SubjectRow, 'createdAt' | 'updatedAt' | 'id' | 'userId'> };
    now: ISOTimestamp;
  }): Promise<void> {
    const { userId, subjectId, aggregate, now } = params;

    // Atualiza subjects (sempre com user_id + id)
    await this.client.query(
      `
      update public.subjects
      set
        name = $3,
        categories = $4::text[],
        status = $5,
        is_deleted = $6,
        updated_at = $7
      where user_id = $1 and id = $2
      `,
      [
        userId,
        subjectId,
        aggregate.subject.name,
        aggregate.subject.categories,
        aggregate.subject.status,
        aggregate.subject.isDeleted,
        now,
      ]
    );

    // Auxiliares: upsert/delete conforme presença
    await this.upsertAuxiliaries({
      userId,
      subjectId,
      aggregate: { ...aggregate, subject: { ...(aggregate as any).subject, id: subjectId, userId } } as any,
      now,
      mode: 'replace',
    });
  }

  private async upsertAuxiliaries(params: {
    userId: UUID;
    subjectId: UUID;
    aggregate: any;
    now: ISOTimestamp;
    mode: 'create' | 'replace';
  }): Promise<void> {
    const { userId, subjectId, aggregate, now } = params;

    // Reading track
    if (aggregate.readingTrack) {
      await this.client.query(
        `
        insert into public.subject_theory_reading_tracks
          (user_id, subject_id, total_pages, read_pages, pacing_mode, pages_per_day, pages_per_hour, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8)
        on conflict (user_id, subject_id)
        do update set
          total_pages = excluded.total_pages,
          read_pages = excluded.read_pages,
          pacing_mode = excluded.pacing_mode,
          pages_per_day = excluded.pages_per_day,
          pages_per_hour = excluded.pages_per_hour,
          updated_at = excluded.updated_at
        `,
        [
          userId,
          subjectId,
          aggregate.readingTrack.totalPages,
          aggregate.readingTrack.readPages,
          aggregate.readingTrack.pacingMode,
          aggregate.readingTrack.pagesPerDay,
          aggregate.readingTrack.pagesPerHour,
          now,
        ]
      );
    } else {
      await this.client.query(
        `delete from public.subject_theory_reading_tracks where user_id = $1 and subject_id = $2`,
        [userId, subjectId]
      );
    }

    // Video track
    if (aggregate.videoTrack) {
      await this.client.query(
        `
        insert into public.subject_theory_video_tracks
          (user_id, subject_id, total_blocks, watched_blocks, pacing_mode, blocks_per_day, avg_minutes, playback_speed, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        on conflict (user_id, subject_id)
        do update set
          total_blocks = excluded.total_blocks,
          watched_blocks = excluded.watched_blocks,
          pacing_mode = excluded.pacing_mode,
          blocks_per_day = excluded.blocks_per_day,
          avg_minutes = excluded.avg_minutes,
          playback_speed = excluded.playback_speed,
          updated_at = excluded.updated_at
        `,
        [
          userId,
          subjectId,
          aggregate.videoTrack.totalBlocks,
          aggregate.videoTrack.watchedBlocks,
          aggregate.videoTrack.pacingMode,
          aggregate.videoTrack.blocksPerDay,
          aggregate.videoTrack.avgMinutes,
          aggregate.videoTrack.playbackSpeed,
          now,
        ]
      );
    } else {
      await this.client.query(
        `delete from public.subject_theory_video_tracks where user_id = $1 and subject_id = $2`,
        [userId, subjectId]
      );
    }

    // Questions meta
    if (aggregate.questionsMeta) {
      await this.client.query(
        `
        insert into public.subject_questions_meta
          (user_id, subject_id, daily_target, updated_at)
        values ($1,$2,$3,$4)
        on conflict (user_id, subject_id)
        do update set
          daily_target = excluded.daily_target,
          updated_at = excluded.updated_at
        `,
        [userId, subjectId, aggregate.questionsMeta.dailyTarget, now]
      );
    } else {
      await this.client.query(
        `delete from public.subject_questions_meta where user_id = $1 and subject_id = $2`,
        [userId, subjectId]
      );
    }

    // Law config (vinculada à matéria)
    if (aggregate.lawConfig) {
      await this.client.query(
        `
        insert into public.subject_law_configs
          (user_id, subject_id, law_name, total_articles, read_articles, law_mode, fixed_articles_per_day, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8)
        on conflict (user_id, subject_id)
        do update set
          law_name = excluded.law_name,
          total_articles = excluded.total_articles,
          read_articles = excluded.read_articles,
          law_mode = excluded.law_mode,
          fixed_articles_per_day = excluded.fixed_articles_per_day,
          updated_at = excluded.updated_at
        `,
        [
          userId,
          subjectId,
          aggregate.lawConfig.lawName,
          aggregate.lawConfig.totalArticles,
          aggregate.lawConfig.readArticles,
          aggregate.lawConfig.lawMode,
          aggregate.lawConfig.fixedArticlesPerDay,
          now,
        ]
      );
    } else {
      await this.client.query(
        `delete from public.subject_law_configs where user_id = $1 and subject_id = $2`,
        [userId, subjectId]
      );
    }
  }
}
