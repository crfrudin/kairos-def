import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { Tribunal, UUID } from "@/features/subjects/application/ports/IInformativeFollowRepository";
import { fail, nowIso, ok, type Result } from "./_result";

export interface DeactivateInformativeFollowUseCase {
  execute(input: { userId: UUID; tribunal: Tribunal }): Promise<Result<{ deactivated: true }>>;
}

export function createDeactivateInformativeFollowUseCase(deps: { tx: ISubjectsTransaction }): DeactivateInformativeFollowUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");
      if (!input.tribunal) return fail("VALIDATION_ERROR", "Missing tribunal.");

      const now = nowIso();

      try {
        await deps.tx.runInTransaction(async (t) => {
          await t.informativeFollowRepo.deactivate({
            userId: input.userId,
            tribunal: input.tribunal,
            now,
          });
        });

        return ok({ deactivated: true });
      } catch (e: any) {
        return fail("INFRA_ERROR", "Failed to deactivate informative follow.", { cause: String(e?.message ?? e) });
      }
    },
  };
}
