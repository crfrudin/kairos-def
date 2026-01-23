import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { SubjectAggregateDTO, UUID } from "@/features/subjects/application/ports/ISubjectRepository";
import { fail, ok, type Result } from "./_result";

export interface GetSubjectAggregateUseCase {
  execute(input: { userId: UUID; subjectId: UUID }): Promise<Result<{ aggregate: SubjectAggregateDTO }>>;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function createGetSubjectAggregateUseCase(deps: { tx: ISubjectsTransaction }): GetSubjectAggregateUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");
      if (!input.subjectId) return fail("VALIDATION_ERROR", "Missing subjectId.");

      try {
        const aggregate = await deps.tx.runInTransaction(async (t) => {
          return t.subjectRepo.getAggregate({ userId: input.userId, subjectId: input.subjectId });
        });

        if (!aggregate) return fail("NOT_FOUND", "Subject not found.");

        return ok({ aggregate });
      } catch (e: unknown) {
        return fail("INFRA_ERROR", "Failed to get subject aggregate.", { cause: errorMessage(e) });
      }
    },
  };
}
