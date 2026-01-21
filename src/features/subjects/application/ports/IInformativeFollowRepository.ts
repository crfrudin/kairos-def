// src/features/subjects/application/ports/IInformativeFollowRepository.ts
// FASE 2 · ETAPA 5: informative_follows
// Regras: UNIQUE (user_id, tribunal), soft delete via is_active=false,
// e nenhuma persistência de "latestAvailableNumber".

export type UUID = string;
export type ISOTimestamp = string;

export type Tribunal = 'STF' | 'STJ' | 'TST' | 'TSE';

export interface InformativeFollowRow {
  id: string;
  userId: UUID;
  tribunal: Tribunal;

  lastReadNumber: number;
  isActive: boolean;

  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface IInformativeFollowRepository {
  list(params: { userId: UUID }): Promise<ReadonlyArray<InformativeFollowRow>>;

  upsert(params: { userId: UUID; tribunal: Tribunal; lastReadNumber: number; isActive: boolean; now: ISOTimestamp }): Promise<void>;

  deactivate(params: { userId: UUID; tribunal: Tribunal; now: ISOTimestamp }): Promise<void>;
}
