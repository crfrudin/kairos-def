// src/features/subjects/application/ports/IInformativeExtraordinaryFollowRepository.ts
// STJ V2 EXTRAORDINÁRIO
// Tabela: public.informative_extraordinary_follows
// Regras: PK (user_id, tribunal='STJ'), soft delete via is_active=false.

export type UUID = string;
export type ISOTimestamp = string;

export type ExtraordinaryTribunal = "STJ";

export interface InformativeExtraordinaryFollowRow {
  userId: UUID;
  tribunal: ExtraordinaryTribunal;

  lastReadNumber: number;
  isActive: boolean;

  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface IInformativeExtraordinaryFollowRepository {
  list(params: { userId: UUID }): Promise<ReadonlyArray<InformativeExtraordinaryFollowRow>>;

  upsert(params: {
    userId: UUID;
    tribunal: ExtraordinaryTribunal; // sempre STJ
    lastReadNumber: number;
    isActive: boolean;
    now: ISOTimestamp;
  }): Promise<void>;

  deactivate(params: { userId: UUID; tribunal: ExtraordinaryTribunal; now: ISOTimestamp }): Promise<void>;
}
