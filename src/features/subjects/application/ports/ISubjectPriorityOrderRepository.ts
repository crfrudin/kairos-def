// src/features/subjects/application/ports/ISubjectPriorityOrderRepository.ts
// FASE 2 · ETAPA 5: ordem determinística por usuário.
// Regra: nenhuma query usa subject_id sem user_id.

export type UUID = string;
export type ISOTimestamp = string;

export interface SubjectPriorityOrderRow {
  userId: UUID;
  subjectId: UUID;
  position: number;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface ISubjectPriorityOrderRepository {
  list(params: { userId: UUID }): Promise<ReadonlyArray<SubjectPriorityOrderRow>>;

  /**
   * Substituição integral (delete + insert N).
   * Deve ser usada em transação quando orquestrada com subjects/tracks.
   */
  replaceOrder(params: { userId: UUID; orderedSubjectIds: ReadonlyArray<UUID>; now: ISOTimestamp }): Promise<void>;
}
