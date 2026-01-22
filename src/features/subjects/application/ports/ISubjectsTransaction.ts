// src/features/subjects/application/ports/ISubjectsTransaction.ts
// FASE 2 · ETAPA 5: Transaction Runner para orquestrações multi-tabela.

import type { ISubjectRepository } from "./ISubjectRepository";
import type { ISubjectPriorityOrderRepository } from "./ISubjectPriorityOrderRepository";
import type { IInformativeFollowRepository } from "./IInformativeFollowRepository";
import type { IStandaloneLawRepository } from "./IStandaloneLawRepository";
import type { IInformativeLatestRepository } from "./IInformativeLatestRepository";

export interface SubjectsTxContext {
  subjectRepo: ISubjectRepository;
  subjectPriorityOrderRepo: ISubjectPriorityOrderRepository;
  informativeFollowRepo: IInformativeFollowRepository;
  informativeLatestRepo: IInformativeLatestRepository;
  standaloneLawRepo: IStandaloneLawRepository;
}

export interface ISubjectsTransaction {
  runInTransaction<T>(work: (tx: SubjectsTxContext) => Promise<T>): Promise<T>;
}
