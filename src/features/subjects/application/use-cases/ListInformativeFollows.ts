import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { InformativeFollowRow, UUID } from "@/features/subjects/application/ports/IInformativeFollowRepository";
import { fail, ok, type Result } from "./_result";

export interface ListInformativeFollowsUseCase {
  execute(input: { userId: UUID }): Promise<Result<{ items: ReadonlyArray<InformativeFollowRow> }>>;
}

export function createListInformativeFollowsUseCase(deps: { tx: ISubjectsTransaction }): ListInformativeFollowsUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");

      try {
        const items = await deps.tx.runInTransaction(async (t) => {
          return t.informativeFollowRepo.list({ userId: input.userId });
        });

        return ok({ items });
      } catch (e: any) {
        return fail("INFRA_ERROR", "Failed to list informative follows.", { cause: String(e?.message ?? e) });
      }
    },
  };
}
