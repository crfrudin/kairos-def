import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { UUID } from "@/features/subjects/application/ports/IInformativeFollowRepository";
import type { ExtraordinaryTribunal } from "@/features/subjects/application/ports/IInformativeExtraordinaryFollowRepository";
import { fail, nowIso, ok, type Result } from "./_result";

export interface DeactivateInformativeExtraordinaryFollowUseCase {
  execute(input: { userId: UUID; tribunal: ExtraordinaryTribunal }): Promise<Result<{ deactivated: true }>>;
}

export function createDeactivateInformativeExtraordinaryFollowUseCase(deps: { tx: ISubjectsTransaction }): DeactivateInformativeExtraordinaryFollowUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");
      if (input.tribunal !== "STJ") return fail("VALIDATION_ERROR", "Invalid extraordinary tribunal.");

      const now = nowIso();

      try {
        await deps.tx.runInTransaction(async (t) => {
          await t.informativeExtraFollowRepo.deactivate({
            userId: input.userId,
            tribunal: "STJ",
            now,
          });
        });

        return ok({ deactivated: true });
      } catch (e: any) {
        return fail("INFRA_ERROR", "Failed to deactivate extraordinary informative follow.", { cause: String(e?.message ?? e) });
      }
    },
  };
}
