// src/features/subjects/application/ports/IStandaloneLawRepository.ts
// FASE 2 · ETAPA 5: standalone_laws conforme schema consolidado (bundle opcional/nullable).

export type UUID = string;
export type ISOTimestamp = string;

export type LawMode = 'COUPLED_TO_THEORY' | 'FIXED_ARTICLES_PER_DAY';

export interface StandaloneLawBundleDTO {
  lawName: string;
  totalArticles: number;
  readArticles: number;
  lawMode: LawMode;
  fixedArticlesPerDay: number | null;
}

export interface StandaloneLawRow {
  id: UUID;
  userId: UUID;

  otherSubjectLabel: string;

  // Bundle opcional (nullable no DB)
  bundle: StandaloneLawBundleDTO | null;

  isDeleted: boolean;

  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface IStandaloneLawRepository {
  list(params: { userId: UUID }): Promise<ReadonlyArray<StandaloneLawRow>>;

  getById(params: { userId: UUID; id: UUID }): Promise<StandaloneLawRow | null>;

  create(params: { userId: UUID; otherSubjectLabel: string; bundle: StandaloneLawBundleDTO | null; now: ISOTimestamp }): Promise<{ id: UUID }>;

  replace(params: { userId: UUID; id: UUID; otherSubjectLabel: string; bundle: StandaloneLawBundleDTO | null; isDeleted: boolean; now: ISOTimestamp }): Promise<void>;
}
