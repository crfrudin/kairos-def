// src/features/subjects/application/ports/IInformativeLatestRepository.ts
// Fonte global: public.informative_latest_by_tribunal
// Leitura permitida para authenticated via RLS (policy).

import type { Tribunal } from "./IInformativeFollowRepository";

export type ISODate = string; // YYYY-MM-DD

export interface InformativeLatestRow {
  tribunal: Tribunal;
  latestAvailableNumber: number;
  source: string;
  checkedDay: ISODate;
  checkedAt: string; // ISO timestamp
}

export interface IInformativeLatestRepository {
  listByTribunals(params: { tribunals: ReadonlyArray<Tribunal> }): Promise<ReadonlyArray<InformativeLatestRow>>;
}
