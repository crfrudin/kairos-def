import "server-only";

import type { UUID } from "@/features/subjects/application/ports/ISubjectRepository";
import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";

import { getPgPool } from "@/features/subjects/infra/db/pgPool";
import { PgSubjectsTransaction } from "@/features/subjects/infra/transactions/PgSubjectsTransaction";

import { createSubjectsUseCases } from "@/core/composition/subjects-composition";

export interface SubjectsSsrComposition {
  tx: ISubjectsTransaction;

  listSubjectsMinimalUseCase: ReturnType<typeof createSubjectsUseCases>["listSubjectsMinimalUseCase"];
  getSubjectAggregateUseCase: ReturnType<typeof createSubjectsUseCases>["getSubjectAggregateUseCase"];
  createSubjectAggregateUseCase: ReturnType<typeof createSubjectsUseCases>["createSubjectAggregateUseCase"];
  replaceSubjectAggregateUseCase: ReturnType<typeof createSubjectsUseCases>["replaceSubjectAggregateUseCase"];
  softDeleteSubjectUseCase: ReturnType<typeof createSubjectsUseCases>["softDeleteSubjectUseCase"];
  replaceSubjectOrderUseCase: ReturnType<typeof createSubjectsUseCases>["replaceSubjectOrderUseCase"];

  // REGULAR
  listInformativeFollowsUseCase: ReturnType<typeof createSubjectsUseCases>["listInformativeFollowsUseCase"];
  upsertInformativeFollowUseCase: ReturnType<typeof createSubjectsUseCases>["upsertInformativeFollowUseCase"];
  deactivateInformativeFollowUseCase: ReturnType<typeof createSubjectsUseCases>["deactivateInformativeFollowUseCase"];

  // EXTRA (STJ)
  listInformativeExtraordinaryFollowsUseCase: ReturnType<typeof createSubjectsUseCases>["listInformativeExtraordinaryFollowsUseCase"];
  upsertInformativeExtraordinaryFollowUseCase: ReturnType<typeof createSubjectsUseCases>["upsertInformativeExtraordinaryFollowUseCase"];
  deactivateInformativeExtraordinaryFollowUseCase: ReturnType<typeof createSubjectsUseCases>["deactivateInformativeExtraordinaryFollowUseCase"];
}

export function createSubjectsSsrComposition(params: { userId: UUID }): SubjectsSsrComposition {
  const pool = getPgPool();
  const tx = new PgSubjectsTransaction(pool, { userId: params.userId });

  const ucs = createSubjectsUseCases({ tx });

  return {
    tx,
    ...ucs,
  };
}
