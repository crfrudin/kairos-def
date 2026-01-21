import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { UUID } from "@/features/subjects/application/ports/ISubjectRepository";
import { fail, nowIso, ok, type Result } from "./_result";

export interface SoftDeleteSubjectUseCase {
  execute(input: { userId: UUID; subjectId: UUID }): Promise<Result<{ deleted: true }>>;
}

export function createSoftDeleteSubjectUseCase(deps: { tx: ISubjectsTransaction }): SoftDeleteSubjectUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");
      if (!input.subjectId) return fail("VALIDATION_ERROR", "Missing subjectId.");

      const now = nowIso();

      try {
        await deps.tx.runInTransaction(async (t) => {
          const agg = await t.subjectRepo.getAggregate({ userId: input.userId, subjectId: input.subjectId });
          if (!agg) {
            throw new Error("NOT_FOUND");
          }

          await t.subjectRepo.replaceAggregate({
            userId: input.userId,
            subjectId: input.subjectId,
            aggregate: {
              subject: {
                name: agg.subject.name,
                categories: agg.subject.categories,
                status: agg.subject.status,
                isDeleted: true,
              },
              readingTrack: agg.readingTrack,
              videoTrack: agg.videoTrack,
              questionsMeta: agg.questionsMeta,
              lawConfig: agg.lawConfig,
            },
            now,
          });
        });

        return ok({ deleted: true });
      } catch (e: any) {
        if (String(e?.message ?? e) === "NOT_FOUND") return fail("NOT_FOUND", "Subject not found.");
        return fail("INFRA_ERROR", "Failed to soft delete subject.", { cause: String(e?.message ?? e) });
      }
    },
  };
}
