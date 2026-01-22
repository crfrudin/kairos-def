// src/features/subjects/application/ports/IInformativeLatestExtraordinaryRepository.ts
// Fonte global: public.informative_latest_extraordinary_by_tribunal
// Leitura permitida para authenticated via RLS (policy).

export type ExtraordinaryTribunal = "STJ";
export type ISODate = string; // YYYY-MM-DD

export interface InformativeLatestExtraordinaryRow {
  tribunal: ExtraordinaryTribunal;
  latestAvailableNumber: number;
  source: string;
  checkedDay: ISODate;
  checkedAt: string; // ISO timestamp
}

export interface IInformativeLatestExtraordinaryRepository {
  listByTribunals(params: {
    tribunals: ReadonlyArray<ExtraordinaryTribunal>;
  }): Promise<ReadonlyArray<InformativeLatestExtraordinaryRow>>;
}
