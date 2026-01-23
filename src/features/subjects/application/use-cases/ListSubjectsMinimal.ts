import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { UUID } from "@/features/subjects/application/ports/ISubjectRepository";
import { fail, ok, type Result } from "./_result";

export interface ListSubjectsMinimalUseCase {
  execute(input: { userId: UUID }): Promise<Result<{ items: ReadonlyArray<{ id: UUID; name: string; isActive: boolean }> }>>;
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function createListSubjectsMinimalUseCase(deps: { tx: ISubjectsTransaction }): ListSubjectsMinimalUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");

      try {
        const items = await deps.tx.runInTransaction(async (t) => {
          return t.subjectRepo.listMinimal({ userId: input.userId });
        });

        return ok({ items });
      } catch (e: unknown) {
        return fail("INFRA_ERROR", "Failed to list subjects (minimal).", { cause: getErrorMessage(e) });
      }
    },
  };
}
