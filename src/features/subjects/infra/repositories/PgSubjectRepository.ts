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
  SubjectCategory,
  SubjectStatus,
  ReadingPacingMode,
  VideoPacingMode,
  VideoPlaybackSpeed,
  LawMode,
  LawLinkType,
} from '@/features/subjects/application/ports/ISubjectRepository';
import { SubjectsInfraError } from '../errors/SubjectsInfraError';

type DbRow = Record<string, unknown>;

const SUBJECT_CATEGORIES: ReadonlyArray<SubjectCategory> = ['THEORY', 'QUESTIONS', 'LAW'] as const;
const SUBJECT_STATUSES: ReadonlyArray<SubjectStatus> = ['ATIVA', 'EM_ANDAMENTO', 'CONCLUIDA', 'PAUSADA', 'BLOQUEADA'] as const;

const READING_PACING: ReadonlyArray<ReadingPacingMode> = ['FIXED_PAGES_PER_DAY', 'PACE_PAGES_PER_HOUR'] as const;
const VIDEO_PACING: ReadonlyArray<VideoPacingMode> = ['FIXED_BLOCKS_PER_DAY', 'AUTO_BY_DURATION'] as const;

// Importante: o schema consolidado (subjects.video_playback_speed) usa X1|X1_5|X2.
// O domínio/port pode evoluir; aqui aceitamos também strings do UI legado (1x/1.5x/2x) na escrita.
const DB_VIDEO_SPEED: ReadonlyArray<VideoPlaybackSpeed> = ['X1', 'X1_5', 'X2'] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readString(obj: DbRow, key: string): string {
  const v = obj[key];
  return typeof v === 'string' ? v : String(v ?? '');
}

function readBoolean(obj: DbRow, key: string): boolean {
  const v = obj[key];
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return Boolean(v);
}

function readNumber(obj: DbRow, key: string): number {
  const v = obj[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return Number(v ?? 0);
}

function toIso(ts: unknown): string {
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === 'string') return new Date(ts).toISOString();
  return new Date(String(ts ?? '')).toISOString();
}

function parseSubjectCategories(v: unknown): ReadonlyArray<SubjectCategory> {
  if (!Array.isArray(v)) return [];
  const arr = v.map((x) => String(x)) as string[];
  const filtered = arr.filter((x): x is SubjectCategory => (SUBJECT_CATEGORIES as readonly string[]).includes(x));
  return filtered;
}

function parseSubjectStatus(v: unknown): SubjectStatus {
  const s = String(v);
  if ((SUBJECT_STATUSES as readonly string[]).includes(s)) return s as SubjectStatus;
  // Fallback defensivo (não cria regra; evita crash em leitura suja)
  return 'ATIVA';
}

function parseReadingPacingMode(v: unknown): ReadingPacingMode {
  const s = String(v);
  if ((READING_PACING as readonly string[]).includes(s)) return s as ReadingPacingMode;
  return 'FIXED_PAGES_PER_DAY';
}

function parseVideoPacingMode(v: unknown): VideoPacingMode {
  const s = String(v);
  if ((VIDEO_PACING as readonly string[]).includes(s)) return s as VideoPacingMode;
  return 'FIXED_BLOCKS_PER_DAY';
}

function parseDbVideoPlaybackSpeed(v: unknown): '1x' | '1.5x' | '2x' {
  const s = String(v).trim();

  // DB atual (enum do schema) => normaliza para o tipo do port
  if (s === 'X1') return '1x';
  if (s === 'X1_5') return '1.5x';
  if (s === 'X2') return '2x';

  // Legado (se existir em tabelas auxiliares antigas) => pass-through normalizado
  if (s === '1x') return '1x';
  if (s === '1.5x') return '1.5x';
  if (s === '2x') return '2x';

  // Fallback defensivo (não cria regra; evita crash em leitura suja)
  return '1x';
}

function hasCategory(categories: ReadonlyArray<SubjectCategory>, category: SubjectCategory): boolean {
  return categories.includes(category);
}

function mapSubjectRow(rUnknown: unknown): SubjectRow {
  if (!isRecord(rUnknown)) {
    throw new SubjectsInfraError('mapSubjectRow: row inválida (não-objeto).');
  }
  const r = rUnknown as DbRow;

  return {
    id: readString(r, 'id'),
    userId: readString(r, 'user_id'),
    name: readString(r, 'name'),
    categories: parseSubjectCategories(r['categories']),
    status: parseSubjectStatus(r['status']),
    isDeleted: readBoolean(r, 'is_deleted'),
    createdAt: toIso(r['created_at']),
    updatedAt: toIso(r['updated_at']),
  };
}

function mapReadingTrack(rUnknown: unknown): SubjectTheoryReadingTrackRow {
  if (!isRecord(rUnknown)) {
    throw new SubjectsInfraError('mapReadingTrack: row inválida (não-objeto).');
  }
  const r = rUnknown as DbRow;

  return {
    userId: readString(r, 'user_id'),
    subjectId: readString(r, 'subject_id'),
    totalPages: readNumber(r, 'total_pages'),
    readPages: readNumber(r, 'read_pages'),
    pacingMode: parseReadingPacingMode(r['pacing_mode']),
    pagesPerDay: r['pages_per_day'] == null ? null : readNumber(r, 'pages_per_day'),
    pagesPerHour: r['pages_per_hour'] == null ? null : readNumber(r, 'pages_per_hour'),
    createdAt: toIso(r['created_at']),
    updatedAt: toIso(r['updated_at']),
  };
}

function mapVideoTrack(rUnknown: unknown): SubjectTheoryVideoTrackRow {
  if (!isRecord(rUnknown)) {
    throw new SubjectsInfraError('mapVideoTrack: row inválida (não-objeto).');
  }
  const r = rUnknown as DbRow;

  return {
    userId: readString(r, 'user_id'),
    subjectId: readString(r, 'subject_id'),
    totalBlocks: readNumber(r, 'total_blocks'),
    watchedBlocks: readNumber(r, 'watched_blocks'),
    pacingMode: parseVideoPacingMode(r['pacing_mode']),
    blocksPerDay: r['blocks_per_day'] == null ? null : readNumber(r, 'blocks_per_day'),
    avgMinutes: r['avg_minutes'] == null ? null : readNumber(r, 'avg_minutes'),
    // Port atual exige '1x'|'1.5x'|'2x'; DB pode armazenar X1|X1_5|X2 (ou legado). Normalizamos na leitura.
    playbackSpeed: parseDbVideoPlaybackSpeed(r['playback_speed']),
    createdAt: toIso(r['created_at']),
    updatedAt: toIso(r['updated_at']),
  };
}

function mapQuestionsMeta(rUnknown: unknown): SubjectQuestionsMetaRow {
  if (!isRecord(rUnknown)) {
    throw new SubjectsInfraError('mapQuestionsMeta: row inválida (não-objeto).');
  }
  const r = rUnknown as DbRow;

  return {
    userId: readString(r, 'user_id'),
    subjectId: readString(r, 'subject_id'),
    dailyTarget: readNumber(r, 'daily_target'),
    createdAt: toIso(r['created_at']),
    updatedAt: toIso(r['updated_at']),
  };
}

function mapLawConfig(rUnknown: unknown): SubjectLawConfigRow {
  if (!isRecord(rUnknown)) {
    throw new SubjectsInfraError('mapLawConfig: row inválida (não-objeto).');
  }
  const r = rUnknown as DbRow;

  return {
    userId: readString(r, 'user_id'),
    subjectId: readString(r, 'subject_id'),
    lawName: readString(r, 'law_name'),
    totalArticles: readNumber(r, 'total_articles'),
    readArticles: readNumber(r, 'read_articles'),
    lawMode: String(r['law_mode']) as LawMode,
    fixedArticlesPerDay: r['fixed_articles_per_day'] == null ? null : readNumber(r, 'fixed_articles_per_day'),
    createdAt: toIso(r['created_at']),
    updatedAt: toIso(r['updated_at']),
  };
}

function toDbVideoPlaybackSpeed(v: unknown): VideoPlaybackSpeed | null {
  if (v == null) return null;

  const s = String(v).trim();

  // aceita formatos do UI legado e do enum do schema
  if (s === '1x' || s === 'X1') return 'X1';
  if (s === '1.5x' || s === 'X1_5') return 'X1_5';
  if (s === '2x' || s === 'X2') return 'X2';

  return null;
}

/**
 * Normalização/validação defensiva para compatibilidade com os CHECKs do schema consolidado.
 *
 * Regras do schema (subjects.video_pacing_exclusive + checks de faixa):
 * - FIXED_BLOCKS_PER_DAY: blocks_per_day NOT NULL; avg_minutes/playback_speed MUST be NULL
 * - AUTO_BY_DURATION: avg_minutes NOT NULL (1..300); playback_speed NOT NULL; blocks_per_day MUST be NULL
 */
function normalizeVideoForWrite(video: SubjectTheoryVideoTrackRow): Readonly<{
  totalBlocks: number;
  watchedBlocks: number;
  pacingMode: VideoPacingMode;
  blocksPerDay: number | null;
  avgMinutes: number | null;
  playbackSpeed: VideoPlaybackSpeed | null;
}> {
  const pacingMode = video.pacingMode;

  const totalBlocks = Math.floor(video.totalBlocks);
  const watchedBlocks = Math.floor(video.watchedBlocks);

  // Guardrails (não criam regra; antecipam constraints do DB com mensagem melhor)
  if (!Number.isInteger(totalBlocks) || totalBlocks < 1) {
    throw new SubjectsInfraError('video.totalBlocks deve ser inteiro >= 1 (DDL: subjects.video_total_blocks between 1 and 9999).');
  }
  if (!Number.isInteger(watchedBlocks) || watchedBlocks < 0) {
    throw new SubjectsInfraError('video.watchedBlocks deve ser inteiro >= 0 (DDL: subjects.video_watched_blocks_nonneg).');
  }

  if (pacingMode === 'FIXED_BLOCKS_PER_DAY') {
    const bpd = video.blocksPerDay;

    if (bpd == null || !Number.isInteger(bpd) || bpd < 1) {
      throw new SubjectsInfraError(
        'video.blocksPerDay deve ser inteiro >= 1 quando video.pacingMode=FIXED_BLOCKS_PER_DAY (DDL: subjects.video_pacing_exclusive).'
      );
    }

    // MUST be null para passar chk_subjects_video_pacing_exclusive
    return {
      totalBlocks,
      watchedBlocks,
      pacingMode,
      blocksPerDay: bpd,
      avgMinutes: null,
      playbackSpeed: null,
    };
  }

  // AUTO_BY_DURATION
  const avg = video.avgMinutes;
  const speed = toDbVideoPlaybackSpeed(video.playbackSpeed);

  if (avg == null || !Number.isInteger(avg) || avg < 1 || avg > 300) {
    throw new SubjectsInfraError(
      'video.avgMinutes deve ser inteiro entre 1 e 300 quando video.pacingMode=AUTO_BY_DURATION (DDL: chk_subjects_video_avg_minutes + video_pacing_exclusive).'
    );
  }
  if (speed == null) {
    throw new SubjectsInfraError(
      'video.playbackSpeed deve ser X1|X1_5|X2 (ou legado 1x|1.5x|2x) quando video.pacingMode=AUTO_BY_DURATION (DDL: chk_subjects_video_playback_speed + video_pacing_exclusive).'
    );
  }

  // MUST be null para passar chk_subjects_video_pacing_exclusive
  return {
    totalBlocks,
    watchedBlocks,
    pacingMode,
    blocksPerDay: null,
    avgMinutes: avg,
    playbackSpeed: speed,
  };
}

type SubjectWriteModel = Readonly<{
  id: UUID | null;
  userId: UUID;
  name: string;
  categories: ReadonlyArray<SubjectCategory>;
  status: SubjectStatus;
  isDeleted: boolean;
}>;

type AggregateWriteModel = Readonly<{
  subject: SubjectWriteModel;
  readingTrack: SubjectTheoryReadingTrackRow | null;
  videoTrack: SubjectTheoryVideoTrackRow | null;
  questionsMeta: SubjectQuestionsMetaRow | null;
  lawConfig: SubjectLawConfigRow | null;
}>;

function buildAggregateWriteModel(params: {
  userId: UUID;
  subjectId?: UUID;
  aggregate:
    | (Omit<SubjectAggregateDTO, 'subject'> & { subject: Omit<SubjectRow, 'createdAt' | 'updatedAt'> })
    | (Omit<SubjectAggregateDTO, 'subject'> & {
        subject: Omit<SubjectRow, 'createdAt' | 'updatedAt' | 'id' | 'userId'>;
      });
}): AggregateWriteModel {
  const { userId, subjectId, aggregate } = params;

  const categories = (aggregate.subject.categories ?? []) as ReadonlyArray<SubjectCategory>;
  const status = aggregate.subject.status as SubjectStatus;

  const subject: SubjectWriteModel = {
    id: 'id' in aggregate.subject ? (aggregate.subject.id as UUID) : (subjectId ?? null),
    userId,
    name: aggregate.subject.name,
    categories,
    status,
    isDeleted: aggregate.subject.isDeleted,
  };

  return {
    subject,
    readingTrack: aggregate.readingTrack ?? null,
    videoTrack: aggregate.videoTrack ?? null,
    questionsMeta: aggregate.questionsMeta ?? null,
    lawConfig: aggregate.lawConfig ?? null,
  };
}

function computeSubjectsTableColumns(model: AggregateWriteModel): Readonly<{
  // THEORY
  reading_total_pages: number | null;
  reading_read_pages: number | null;
  reading_pacing_mode: ReadingPacingMode | null;
  reading_pages_per_day: number | null;
  reading_pages_per_hour: number | null;

  video_total_blocks: number | null;
  video_watched_blocks: number | null;
  video_pacing_mode: VideoPacingMode | null;
  video_blocks_per_day: number | null;
  video_avg_minutes: number | null;
  video_playback_speed: VideoPlaybackSpeed | null;

  // QUESTIONS
  questions_daily_target: number | null;

  // LAW
  law_name: string | null;
  law_total_articles: number | null;
  law_read_articles: number | null;
  law_mode: LawMode | null;
  law_link_type: LawLinkType | null;
  law_other_subject_label: string | null;
}> {
  const categories = model.subject.categories;

  // Guardrail infra (não cria regra nova; antecipa falha do CHECK com mensagem melhor)
  if (!Array.isArray(categories) || categories.length < 1) {
    throw new SubjectsInfraError('subjects.categories deve ser não-vazio (DDL: cardinality(categories) >= 1).');
  }

  const hasTheory = hasCategory(categories, 'THEORY');
  const hasQuestions = hasCategory(categories, 'QUESTIONS');
  const hasLaw = hasCategory(categories, 'LAW');

  // THEORY
  const reading = model.readingTrack;
  const video = model.videoTrack;

  if (hasTheory && !reading && !video) {
    throw new SubjectsInfraError('THEORY ativa exige readingTrack ou videoTrack (DDL: theory_requires_some_track).');
  }

  const reading_total_pages = hasTheory && reading ? reading.totalPages : null;
  const reading_read_pages = hasTheory && reading ? reading.readPages : null;
  const reading_pacing_mode = hasTheory && reading ? reading.pacingMode : null;
  const reading_pages_per_day = hasTheory && reading ? reading.pagesPerDay : null;
  const reading_pages_per_hour = hasTheory && reading ? reading.pagesPerHour : null;

  // VIDEO (normalizado para respeitar os CHECKs do schema)
  let video_total_blocks: number | null = null;
  let video_watched_blocks: number | null = null;
  let video_pacing_mode: VideoPacingMode | null = null;
  let video_blocks_per_day: number | null = null;
  let video_avg_minutes: number | null = null;
  let video_playback_speed: VideoPlaybackSpeed | null = null;

  if (hasTheory && video) {
    const v = normalizeVideoForWrite(video);

    video_total_blocks = v.totalBlocks;
    video_watched_blocks = v.watchedBlocks;
    video_pacing_mode = v.pacingMode;
    video_blocks_per_day = v.blocksPerDay;
    video_avg_minutes = v.avgMinutes;
    video_playback_speed = v.playbackSpeed;
  }

  // QUESTIONS
  const questions = model.questionsMeta;
  if (hasQuestions && !questions) {
    throw new SubjectsInfraError('QUESTIONS ativa exige questionsMeta (DDL: questions_presence).');
  }
  const questions_daily_target = hasQuestions && questions ? questions.dailyTarget : null;

  // LAW
  const law = model.lawConfig;
  if (hasLaw && !law) {
    throw new SubjectsInfraError('LAW ativa exige lawConfig (DDL: law_presence).');
  }

  const law_name = hasLaw && law ? law.lawName : null;
  const law_total_articles = hasLaw && law ? law.totalArticles : null;
  const law_read_articles = hasLaw && law ? law.readArticles : null;
  const law_mode = hasLaw && law ? law.lawMode : null;

  // ✅ Conformidade com o CHECK do schema consolidado (subjects.law_link_type / law_other_subject_label):
  // - Como o SubjectLawConfigRow do port atual ainda não expõe link_type/label,
  //   adotamos o default canônico e seguro: SUBJECT (não-standalone).
  // - Isso NÃO cria regra de domínio; apenas satisfaz a integridade estrutural do schema.
  const law_link_type: LawLinkType | null = hasLaw ? 'SUBJECT' : null;
  const law_other_subject_label: string | null = null;

  return {
    reading_total_pages,
    reading_read_pages,
    reading_pacing_mode,
    reading_pages_per_day,
    reading_pages_per_hour,

    video_total_blocks,
    video_watched_blocks,
    video_pacing_mode,
    video_blocks_per_day,
    video_avg_minutes,
    video_playback_speed,

    questions_daily_target,

    law_name,
    law_total_articles,
    law_read_articles,
    law_mode,
    law_link_type,
    law_other_subject_label,
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
    return res.rows.map((rUnknown) => {
      if (!isRecord(rUnknown)) {
        throw new SubjectsInfraError('listMinimal: row inválida (não-objeto).');
      }
      const r = rUnknown as DbRow;

      return {
        id: readString(r, 'id'),
        name: readString(r, 'name'),
        isActive: !readBoolean(r, 'is_deleted') && readString(r, 'status') === 'ATIVA',
      };
    });
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
      this.client.query(`select * from public.subject_theory_reading_tracks where user_id = $1 and subject_id = $2`, [
        userId,
        subjectId,
      ]),
      this.client.query(`select * from public.subject_theory_video_tracks where user_id = $1 and subject_id = $2`, [
        userId,
        subjectId,
      ]),
      this.client.query(`select * from public.subject_questions_meta where user_id = $1 and subject_id = $2`, [
        userId,
        subjectId,
      ]),
      this.client.query(`select * from public.subject_law_configs where user_id = $1 and subject_id = $2`, [
        userId,
        subjectId,
      ]),
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

    const model = buildAggregateWriteModel({ userId, aggregate });
    const cols = computeSubjectsTableColumns(model);

    const insertRes = await this.client.query(
      `
      insert into public.subjects (
        id, user_id, name, categories, status, is_deleted,

        reading_total_pages, reading_read_pages, reading_pacing_mode, reading_pages_per_day, reading_pages_per_hour,
        video_total_blocks, video_watched_blocks, video_pacing_mode, video_blocks_per_day, video_avg_minutes, video_playback_speed,

        questions_daily_target,

        law_name, law_total_articles, law_read_articles, law_mode, law_link_type, law_other_subject_label,

        updated_at
      )
      values (
        coalesce($1::uuid, gen_random_uuid()), $2, $3, $4::text[], $5, $6,

        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17,

        $18,

        $19, $20, $21, $22, $23, $24,

        $25
      )
      returning id
      `,
      [
        model.subject.id || null,
        userId,
        model.subject.name,
        model.subject.categories,
        model.subject.status,
        model.subject.isDeleted,

        cols.reading_total_pages,
        cols.reading_read_pages,
        cols.reading_pacing_mode,
        cols.reading_pages_per_day,
        cols.reading_pages_per_hour,

        cols.video_total_blocks,
        cols.video_watched_blocks,
        cols.video_pacing_mode,
        cols.video_blocks_per_day,
        cols.video_avg_minutes,
        cols.video_playback_speed,

        cols.questions_daily_target,

        cols.law_name,
        cols.law_total_articles,
        cols.law_read_articles,
        cols.law_mode,
        cols.law_link_type,
        cols.law_other_subject_label,

        now,
      ]
    );

    const subjectId = String((insertRes.rows[0] as { id?: unknown }).id);

    // Auxiliares (upsert por PK composta)
    await this.upsertAuxiliaries({
      userId,
      subjectId,
      aggregate: model,
      now,
    });

    return { subjectId };
  }

  async replaceAggregate(params: {
    userId: UUID;
    subjectId: UUID;
    aggregate: Omit<SubjectAggregateDTO, 'subject'> & {
      subject: Omit<SubjectRow, 'createdAt' | 'updatedAt' | 'id' | 'userId'>;
    };
    now: ISOTimestamp;
  }): Promise<void> {
    const { userId, subjectId, aggregate, now } = params;

    const model = buildAggregateWriteModel({ userId, subjectId, aggregate });
    const cols = computeSubjectsTableColumns(model);

    // ATENÇÃO: precisamos atualizar também as colunas dependentes de categories (THEORY/QUESTIONS/LAW),
    // senão o CHECK do schema pode quebrar (ex.: ativar LAW sem setar law_*).
    await this.client.query(
      `
      update public.subjects
      set
        name = $3,
        categories = $4::text[],
        status = $5,
        is_deleted = $6,

        reading_total_pages = $7,
        reading_read_pages = $8,
        reading_pacing_mode = $9,
        reading_pages_per_day = $10,
        reading_pages_per_hour = $11,

        video_total_blocks = $12,
        video_watched_blocks = $13,
        video_pacing_mode = $14,
        video_blocks_per_day = $15,
        video_avg_minutes = $16,
        video_playback_speed = $17,

        questions_daily_target = $18,

        law_name = $19,
        law_total_articles = $20,
        law_read_articles = $21,
        law_mode = $22,
        law_link_type = $23,
        law_other_subject_label = $24,

        updated_at = $25
      where user_id = $1 and id = $2
      `,
      [
        userId,
        subjectId,

        model.subject.name,
        model.subject.categories,
        model.subject.status,
        model.subject.isDeleted,

        cols.reading_total_pages,
        cols.reading_read_pages,
        cols.reading_pacing_mode,
        cols.reading_pages_per_day,
        cols.reading_pages_per_hour,

        cols.video_total_blocks,
        cols.video_watched_blocks,
        cols.video_pacing_mode,
        cols.video_blocks_per_day,
        cols.video_avg_minutes,
        cols.video_playback_speed,

        cols.questions_daily_target,

        cols.law_name,
        cols.law_total_articles,
        cols.law_read_articles,
        cols.law_mode,
        cols.law_link_type,
        cols.law_other_subject_label,

        now,
      ]
    );

    // Auxiliares: upsert/delete conforme presença
    await this.upsertAuxiliaries({
      userId,
      subjectId,
      aggregate: model,
      now,
    });
  }

  private async upsertAuxiliaries(params: {
    userId: UUID;
    subjectId: UUID;
    aggregate: AggregateWriteModel;
    now: ISOTimestamp;
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
      await this.client.query(`delete from public.subject_theory_reading_tracks where user_id = $1 and subject_id = $2`, [
        userId,
        subjectId,
      ]);
    }

    // Video track
    if (aggregate.videoTrack) {
      const v = normalizeVideoForWrite(aggregate.videoTrack);

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
          v.totalBlocks,
          v.watchedBlocks,
          v.pacingMode,
          v.blocksPerDay,
          v.avgMinutes,
          // Para FIXED_BLOCKS_PER_DAY, v.playbackSpeed é null (correto).
          // Para AUTO_BY_DURATION, v.playbackSpeed é não-null (validado).
          v.playbackSpeed,
          now,
        ]
      );
    } else {
      await this.client.query(`delete from public.subject_theory_video_tracks where user_id = $1 and subject_id = $2`, [
        userId,
        subjectId,
      ]);
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
      await this.client.query(`delete from public.subject_questions_meta where user_id = $1 and subject_id = $2`, [
        userId,
        subjectId,
      ]);
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
      await this.client.query(`delete from public.subject_law_configs where user_id = $1 and subject_id = $2`, [
        userId,
        subjectId,
      ]);
    }
  }
}
