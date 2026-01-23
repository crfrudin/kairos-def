import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { UUID } from "@/features/subjects/application/ports/ISubjectPriorityOrderRepository";
import { fail, nowIso, ok, type Result } from "./_result";

export interface ReplaceSubjectOrderUseCase {
  execute(input: {
    userId: UUID;
    orderedSubjectIds: ReadonlyArray<UUID>;
  }): Promise<Result<{ replaced: true }>>;
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function createReplaceSubjectOrderUseCase(deps: { tx: ISubjectsTransaction }): ReplaceSubjectOrderUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");
      if (!Array.isArray(input.orderedSubjectIds)) return fail("VALIDATION_ERROR", "orderedSubjectIds must be an array.");

      const now = nowIso();

      try {
        await deps.tx.runInTransaction(async (t) => {
          await t.subjectPriorityOrderRepo.replaceOrder({
            userId: input.userId,
            orderedSubjectIds: input.orderedSubjectIds,
            now,
          });
        });

        return ok({ replaced: true });
      } catch (e: unknown) {
        return fail("INFRA_ERROR", "Failed to replace subject order.", { cause: getErrorMessage(e) });
      }
    },
  };
}
