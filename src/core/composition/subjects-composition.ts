import "server-only";

import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";

import { createListSubjectsMinimalUseCase } from "@/features/subjects/application/use-cases/ListSubjectsMinimal";
import { createGetSubjectAggregateUseCase } from "@/features/subjects/application/use-cases/GetSubjectAggregate";
import { createCreateSubjectAggregateUseCase } from "@/features/subjects/application/use-cases/CreateSubjectAggregate";
import { createReplaceSubjectAggregateUseCase } from "@/features/subjects/application/use-cases/ReplaceSubjectAggregate";
import { createSoftDeleteSubjectUseCase } from "@/features/subjects/application/use-cases/SoftDeleteSubject";
import { createReplaceSubjectOrderUseCase } from "@/features/subjects/application/use-cases/ReplaceSubjectOrder";

import { createListInformativeFollowsUseCase } from "@/features/subjects/application/use-cases/ListInformativeFollows";
import { createUpsertInformativeFollowUseCase } from "@/features/subjects/application/use-cases/UpsertInformativeFollow";
import { createDeactivateInformativeFollowUseCase } from "@/features/subjects/application/use-cases/DeactivateInformativeFollow";

import { createListInformativeExtraordinaryFollowsUseCase } from "@/features/subjects/application/use-cases/ListInformativeExtraordinaryFollows";
import { createUpsertInformativeExtraordinaryFollowUseCase } from "@/features/subjects/application/use-cases/UpsertInformativeExtraordinaryFollow";
import { createDeactivateInformativeExtraordinaryFollowUseCase } from "@/features/subjects/application/use-cases/DeactivateInformativeExtraordinaryFollow";

export function createSubjectsUseCases(deps: { tx: ISubjectsTransaction }) {
  return {
    listSubjectsMinimalUseCase: createListSubjectsMinimalUseCase(deps),
    getSubjectAggregateUseCase: createGetSubjectAggregateUseCase(deps),
    createSubjectAggregateUseCase: createCreateSubjectAggregateUseCase(deps),
    replaceSubjectAggregateUseCase: createReplaceSubjectAggregateUseCase(deps),
    softDeleteSubjectUseCase: createSoftDeleteSubjectUseCase(deps),
    replaceSubjectOrderUseCase: createReplaceSubjectOrderUseCase(deps),

    // REGULAR
    listInformativeFollowsUseCase: createListInformativeFollowsUseCase(deps),
    upsertInformativeFollowUseCase: createUpsertInformativeFollowUseCase(deps),
    deactivateInformativeFollowUseCase: createDeactivateInformativeFollowUseCase(deps),

    // EXTRA (STJ)
    listInformativeExtraordinaryFollowsUseCase: createListInformativeExtraordinaryFollowsUseCase(deps),
    upsertInformativeExtraordinaryFollowUseCase: createUpsertInformativeExtraordinaryFollowUseCase(deps),
    deactivateInformativeExtraordinaryFollowUseCase: createDeactivateInformativeExtraordinaryFollowUseCase(deps),
  };
}
