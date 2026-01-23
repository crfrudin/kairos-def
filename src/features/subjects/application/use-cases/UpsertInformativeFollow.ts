import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { Tribunal, UUID } from "@/features/subjects/application/ports/IInformativeFollowRepository";
import { fail, nowIso, ok, type Result } from "./_result";

export interface UpsertInformativeFollowUseCase {
  execute(input: {
    userId: UUID;
    tribunal: Tribunal;
    lastReadNumber: number;
    isActive: boolean;
  }): Promise<Result<{ upserted: true }>>;
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function createUpsertInformativeFollowUseCase(deps: { tx: ISubjectsTransaction }): UpsertInformativeFollowUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");
      if (!input.tribunal) return fail("VALIDATION_ERROR", "Missing tribunal.");
      if (!Number.isFinite(input.lastReadNumber)) return fail("VALIDATION_ERROR", "lastReadNumber must be a number.");
      if (input.lastReadNumber < 0) return fail("VALIDATION_ERROR", "lastReadNumber must be >= 0.");

      const now = nowIso();

      try {
        await deps.tx.runInTransaction(async (t) => {
          await t.informativeFollowRepo.upsert({
            userId: input.userId,
            tribunal: input.tribunal,
            lastReadNumber: input.lastReadNumber,
            isActive: input.isActive,
            now,
          });
        });

        return ok({ upserted: true });
      } catch (e: unknown) {
        return fail("INFRA_ERROR", "Failed to upsert informative follow.", { cause: getErrorMessage(e) });
      }
    },
  };
}
