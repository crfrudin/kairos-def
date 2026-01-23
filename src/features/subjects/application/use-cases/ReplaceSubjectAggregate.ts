import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { SubjectAggregateDTO, SubjectRow, UUID } from "@/features/subjects/application/ports/ISubjectRepository";
import { fail, nowIso, ok, type Result } from "./_result";

export interface ReplaceSubjectAggregateUseCase {
  execute(input: {
    userId: UUID;
    subjectId: UUID;
    aggregate: Omit<SubjectAggregateDTO, "subject"> & {
      subject: Omit<SubjectRow, "createdAt" | "updatedAt" | "id" | "userId">;
    };
  }): Promise<Result<{ updated: true }>>;
}

type ReplaceAggregate = Parameters<ReplaceSubjectAggregateUseCase["execute"]>[0]["aggregate"];

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function isNonNeg(n: unknown): boolean {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function validateAggregateForReplace(input: {
  userId: UUID;
  subjectId: UUID;
  aggregate: ReplaceAggregate;
}): Result<true> {
  const { aggregate } = input;

  const categories = new Set<string>((aggregate.subject.categories ?? []).map(String));

  const hasTheory = categories.has("THEORY");
  const hasQuestions = categories.has("QUESTIONS");
  const hasLaw = categories.has("LAW");

  if (!hasTheory && (aggregate.readingTrack || aggregate.videoTrack)) {
    return fail("INVARIANT_VIOLATION", "THEORY not selected but theory tracks were provided.");
  }
  if (!hasQuestions && aggregate.questionsMeta) {
    return fail("INVARIANT_VIOLATION", "QUESTIONS not selected but questionsMeta was provided.");
  }
  if (!hasLaw && aggregate.lawConfig) {
    return fail("INVARIANT_VIOLATION", "LAW not selected but lawConfig was provided.");
  }

  if (aggregate.readingTrack) {
    const t = aggregate.readingTrack;
    if (!isNonNeg(t.totalPages) || !isNonNeg(t.readPages)) {
      return fail("INVARIANT_VIOLATION", "Invalid reading totals.");
    }
    if (t.readPages > t.totalPages) {
      return fail("INVARIANT_VIOLATION", "reading.readPages cannot exceed reading.totalPages.");
    }

    const mode = String(t.pacingMode ?? "");
    if (mode === "FIXED_PAGES_PER_DAY") {
      if (t.pagesPerDay === null || t.pagesPerDay === undefined || !isNonNeg(Number(t.pagesPerDay))) {
        return fail("INVARIANT_VIOLATION", "Reading pacing FIXED_PAGES_PER_DAY requires pagesPerDay >= 0.");
      }
    } else if (mode === "PACE_PAGES_PER_HOUR") {
      if (t.pagesPerHour === null || t.pagesPerHour === undefined || !isNonNeg(Number(t.pagesPerHour))) {
        return fail("INVARIANT_VIOLATION", "Reading pacing PACE_PAGES_PER_HOUR requires pagesPerHour >= 0.");
      }
    }
  }

  if (aggregate.videoTrack) {
    const t = aggregate.videoTrack;
    if (!isNonNeg(t.totalBlocks) || !isNonNeg(t.watchedBlocks)) {
      return fail("INVARIANT_VIOLATION", "Invalid video totals.");
    }
    if (t.watchedBlocks > t.totalBlocks) {
      return fail("INVARIANT_VIOLATION", "video.watchedBlocks cannot exceed video.totalBlocks.");
    }

    const mode = String(t.pacingMode ?? "");
    if (mode === "FIXED_BLOCKS_PER_DAY") {
      if (t.blocksPerDay === null || t.blocksPerDay === undefined || !isNonNeg(Number(t.blocksPerDay))) {
        return fail("INVARIANT_VIOLATION", "Video pacing FIXED_BLOCKS_PER_DAY requires blocksPerDay >= 0.");
      }
    } else if (mode === "AUTO_BY_DURATION") {
      if (t.avgMinutes === null || t.avgMinutes === undefined || !isNonNeg(Number(t.avgMinutes))) {
        return fail("INVARIANT_VIOLATION", "Video pacing AUTO_BY_DURATION requires avgMinutes >= 0.");
      }
    }
  }

  if (aggregate.questionsMeta) {
    const q = aggregate.questionsMeta;
    if (!isNonNeg(q.dailyTarget)) return fail("INVARIANT_VIOLATION", "questions.dailyTarget must be >= 0.");
  }

  if (aggregate.lawConfig) {
    const l = aggregate.lawConfig;
    if (!isNonNeg(l.totalArticles) || !isNonNeg(l.readArticles)) {
      return fail("INVARIANT_VIOLATION", "Invalid law totals.");
    }
    if (l.readArticles > l.totalArticles) {
      return fail("INVARIANT_VIOLATION", "law.readArticles cannot exceed law.totalArticles.");
    }

    const mode = String(l.lawMode ?? "");
    if (mode === "FIXED_ARTICLES_PER_DAY") {
      if (l.fixedArticlesPerDay === null || l.fixedArticlesPerDay === undefined || !isNonNeg(Number(l.fixedArticlesPerDay))) {
        return fail("INVARIANT_VIOLATION", "Law mode FIXED_ARTICLES_PER_DAY requires fixedArticlesPerDay >= 0.");
      }
    }
  }

  return ok(true);
}

export function createReplaceSubjectAggregateUseCase(deps: { tx: ISubjectsTransaction }): ReplaceSubjectAggregateUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");
      if (!input.subjectId) return fail("VALIDATION_ERROR", "Missing subjectId.");
      if (!input.aggregate?.subject?.name) return fail("VALIDATION_ERROR", "Missing subject.name.");

      const inv = validateAggregateForReplace({
        userId: input.userId,
        subjectId: input.subjectId,
        aggregate: input.aggregate,
      });
      if (!inv.ok) return inv;

      const now = nowIso();

      try {
        await deps.tx.runInTransaction(async (t) => {
          await t.subjectRepo.replaceAggregate({
            userId: input.userId,
            subjectId: input.subjectId,
            aggregate: input.aggregate,
            now,
          });
        });

        return ok({ updated: true });
      } catch (e: unknown) {
        return fail("INFRA_ERROR", "Failed to replace subject aggregate.", { cause: getErrorMessage(e) });
      }
    },
  };
}
