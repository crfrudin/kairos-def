// src/features/subjects/index.ts
export type { Subject } from "./domain/Subject";

export type {
  SubjectAggregateDTO,
  SubjectRow,
  SubjectTheoryReadingTrackRow,
  SubjectTheoryVideoTrackRow,
  SubjectQuestionsMetaRow,
  SubjectLawConfigRow,
  SubjectStatus,
  SubjectCategory,
  ReadingPacingMode,
  VideoPacingMode,
  VideoPlaybackSpeed,
  LawLinkType,
  LawMode,
} from "./application/ports/ISubjectRepository";

export type { ISubjectRepository } from "./application/ports/ISubjectRepository";
export type { ISubjectPriorityOrderRepository } from "./application/ports/ISubjectPriorityOrderRepository";
export type { IInformativeFollowRepository } from "./application/ports/IInformativeFollowRepository";
export type { IStandaloneLawRepository } from "./application/ports/IStandaloneLawRepository";
export type { ISubjectsTransaction, SubjectsTxContext } from "./application/ports/ISubjectsTransaction";

// Result helpers (Application-level)
export type { Result, AppErrorDTO, AppErrorCode } from "./application/use-cases/_result";

// Use-cases (types + factories)
export type { ListSubjectsMinimalUseCase } from "./application/use-cases/ListSubjectsMinimal";
export { createListSubjectsMinimalUseCase } from "./application/use-cases/ListSubjectsMinimal";

export type { GetSubjectAggregateUseCase } from "./application/use-cases/GetSubjectAggregate";
export { createGetSubjectAggregateUseCase } from "./application/use-cases/GetSubjectAggregate";

export type { CreateSubjectAggregateUseCase } from "./application/use-cases/CreateSubjectAggregate";
export { createCreateSubjectAggregateUseCase } from "./application/use-cases/CreateSubjectAggregate";

export type { ReplaceSubjectAggregateUseCase } from "./application/use-cases/ReplaceSubjectAggregate";
export { createReplaceSubjectAggregateUseCase } from "./application/use-cases/ReplaceSubjectAggregate";

export type { SoftDeleteSubjectUseCase } from "./application/use-cases/SoftDeleteSubject";
export { createSoftDeleteSubjectUseCase } from "./application/use-cases/SoftDeleteSubject";

export type { ReplaceSubjectOrderUseCase } from "./application/use-cases/ReplaceSubjectOrder";
export { createReplaceSubjectOrderUseCase } from "./application/use-cases/ReplaceSubjectOrder";

export type { ListInformativeFollowsUseCase } from "./application/use-cases/ListInformativeFollows";
export { createListInformativeFollowsUseCase } from "./application/use-cases/ListInformativeFollows";

export type { UpsertInformativeFollowUseCase } from "./application/use-cases/UpsertInformativeFollow";
export { createUpsertInformativeFollowUseCase } from "./application/use-cases/UpsertInformativeFollow";

export type { DeactivateInformativeFollowUseCase } from "./application/use-cases/DeactivateInformativeFollow";
export { createDeactivateInformativeFollowUseCase } from "./application/use-cases/DeactivateInformativeFollow";
