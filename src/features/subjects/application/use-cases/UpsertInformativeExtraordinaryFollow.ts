import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { UUID } from "@/features/subjects/application/ports/IInformativeFollowRepository";
import type { ExtraordinaryTribunal } from "@/features/subjects/application/ports/IInformativeExtraordinaryFollowRepository";
import { fail, nowIso, ok, type Result } from "./_result";

export interface UpsertInformativeExtraordinaryFollowUseCase {
  execute(input: {
    userId: UUID;
    tribunal: ExtraordinaryTribunal; // STJ
    lastReadNumber: number;
    isActive: boolean;
  }): Promise<Result<{ upserted: true }>>;
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function createUpsertInformativeExtraordinaryFollowUseCase(deps: {
  tx: ISubjectsTransaction;
}): UpsertInformativeExtraordinaryFollowUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");
      if (input.tribunal !== "STJ") return fail("VALIDATION_ERROR", "Invalid extraordinary tribunal.");
      if (!Number.isFinite(input.lastReadNumber)) return fail("VALIDATION_ERROR", "lastReadNumber must be a number.");
      if (input.lastReadNumber < 0) return fail("VALIDATION_ERROR", "lastReadNumber must be >= 0.");

      const now = nowIso();

      try {
        await deps.tx.runInTransaction(async (t) => {
          await t.informativeExtraFollowRepo.upsert({
            userId: input.userId,
            tribunal: "STJ",
            lastReadNumber: input.lastReadNumber,
            isActive: input.isActive,
            now,
          });
        });

        return ok({ upserted: true });
      } catch (e: unknown) {
        return fail("INFRA_ERROR", "Failed to upsert extraordinary informative follow.", { cause: getErrorMessage(e) });
      }
    },
  };
}
