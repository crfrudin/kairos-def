// src/features/subjects/application/ports/ISubjectRepository.ts
// FASE 2 · ETAPA 5 (Infra): Port de persistência do agregado Subject (conforme schema consolidado).
// Regra: infra não calcula progresso/status; apenas persiste e reconstrói.

export type UUID = string;
export type ISOTimestamp = string;

export type SubjectStatus = 'ATIVA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'PAUSADA' | 'BLOQUEADA';
export type SubjectCategory = 'THEORY' | 'QUESTIONS' | 'LAW';

export type ReadingPacingMode = 'FIXED_PAGES_PER_DAY' | 'PACE_PAGES_PER_HOUR';
export type VideoPacingMode = 'FIXED_BLOCKS_PER_DAY' | 'AUTO_BY_DURATION';
export type VideoPlaybackSpeed = 'X1' | 'X1_5' | 'X2';

export type LawLinkType = 'SUBJECT' | 'STANDALONE_OTHER';
export type LawMode = 'COUPLED_TO_THEORY' | 'FIXED_ARTICLES_PER_DAY';

export interface SubjectRow {
  id: UUID;
  userId: UUID;

  name: string;
  categories: ReadonlyArray<SubjectCategory>;
  status: SubjectStatus;

  // Soft delete
  isDeleted: boolean;

  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface SubjectTheoryReadingTrackRow {
  userId: UUID;
  subjectId: UUID;

  totalPages: number;
  readPages: number;
  pacingMode: ReadingPacingMode;
  pagesPerDay: number | null;
  pagesPerHour: number | null;

  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface SubjectTheoryVideoTrackRow {
  userId: UUID;
  subjectId: UUID;

  totalBlocks: number;
  watchedBlocks: number;
  pacingMode: VideoPacingMode;
  blocksPerDay: number | null;
  avgMinutes: number | null;
  playbackSpeed: '1x' | '1.5x' | '2x';

  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface SubjectQuestionsMetaRow {
  userId: UUID;
  subjectId: UUID;

  dailyTarget: number;

  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface SubjectLawConfigRow {
  userId: UUID;
  subjectId: UUID;

  lawName: string;
  totalArticles: number;
  readArticles: number;

  lawMode: LawMode;
  fixedArticlesPerDay: number | null;

  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface SubjectAggregateDTO {
  subject: SubjectRow;

  readingTrack: SubjectTheoryReadingTrackRow | null;
  videoTrack: SubjectTheoryVideoTrackRow | null;

  questionsMeta: SubjectQuestionsMetaRow | null;
  lawConfig: SubjectLawConfigRow | null;
}

/**
 * Repositório do agregado Subject.
 * Operações multi-tabela devem ser orquestradas via Transaction Runner.
 */
export interface ISubjectRepository {
  /**
   * Leitura mínima para integrações que só precisam do "mínimo".
   * Observação: isActive aqui é apenas projeção compatível com o domínio mínimo atual.
   */
  listMinimal(params: { userId: UUID }): Promise<ReadonlyArray<{ id: UUID; name: string; isActive: boolean }>>;

  getAggregate(params: { userId: UUID; subjectId: UUID }): Promise<SubjectAggregateDTO | null>;

  /**
   * Criação do agregado com tabelas auxiliares opcionais.
   * Deve escrever sempre com FK composta (user_id, subject_id) nas auxiliares.
   */
  createAggregate(params: { userId: UUID; aggregate: Omit<SubjectAggregateDTO, 'subject'> & { subject: Omit<SubjectRow, 'createdAt' | 'updatedAt'> }; now: ISOTimestamp }): Promise<{ subjectId: UUID }>;

  /**
   * Substituição controlada do agregado:
   * - atualiza subjects
   * - substitui/atualiza auxiliares (upsert/delete conforme presença)
   */
  replaceAggregate(params: { userId: UUID; subjectId: UUID; aggregate: Omit<SubjectAggregateDTO, 'subject'> & { subject: Omit<SubjectRow, 'createdAt' | 'updatedAt' | 'id' | 'userId'> }; now: ISOTimestamp }): Promise<void>;
}
