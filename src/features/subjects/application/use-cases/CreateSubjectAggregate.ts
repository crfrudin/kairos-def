import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { SubjectAggregateDTO, SubjectRow, UUID } from "@/features/subjects/application/ports/ISubjectRepository";
import { fail, nowIso, ok, type Result } from "./_result";

export interface CreateSubjectAggregateUseCase {
  execute(input: {
    userId: UUID;
    aggregate: Omit<SubjectAggregateDTO, "subject"> & {
      subject: Omit<SubjectRow, "createdAt" | "updatedAt">;
    };
  }): Promise<Result<{ subjectId: UUID }>>;
}

function isNonNeg(n: any): boolean {
  return Number.isFinite(n) && n >= 0;
}

function validateAggregateForCreate(input: { userId: UUID; aggregate: any }): Result<true> {
  const { aggregate } = input;
  const categories = new Set<string>((aggregate?.subject?.categories ?? []).map(String));

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
    if (!isNonNeg(t.totalPages) || !isNonNeg(t.readPages)) return fail("INVARIANT_VIOLATION", "Invalid reading totals.");
    if (t.readPages > t.totalPages) return fail("INVARIANT_VIOLATION", "reading.readPages cannot exceed reading.totalPages.");
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
    if (!isNonNeg(t.totalBlocks) || !isNonNeg(t.watchedBlocks)) return fail("INVARIANT_VIOLATION", "Invalid video totals.");
    if (t.watchedBlocks > t.totalBlocks) return fail("INVARIANT_VIOLATION", "video.watchedBlocks cannot exceed video.totalBlocks.");
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
    if (!isNonNeg(l.totalArticles) || !isNonNeg(l.readArticles)) return fail("INVARIANT_VIOLATION", "Invalid law totals.");
    if (l.readArticles > l.totalArticles) return fail("INVARIANT_VIOLATION", "law.readArticles cannot exceed law.totalArticles.");
    const mode = String(l.lawMode ?? "");
    if (mode === "FIXED_ARTICLES_PER_DAY") {
      if (l.fixedArticlesPerDay === null || l.fixedArticlesPerDay === undefined || !isNonNeg(Number(l.fixedArticlesPerDay))) {
        return fail("INVARIANT_VIOLATION", "Law mode FIXED_ARTICLES_PER_DAY requires fixedArticlesPerDay >= 0.");
      }
    }
  }

  return ok(true);
}

export function createCreateSubjectAggregateUseCase(deps: { tx: ISubjectsTransaction }): CreateSubjectAggregateUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");
      if (!input.aggregate?.subject?.name) return fail("VALIDATION_ERROR", "Missing subject.name.");

      const inv = validateAggregateForCreate({ userId: input.userId, aggregate: input.aggregate });
      if (!inv.ok) return inv;

      const now = nowIso();

      try {
        const { subjectId } = await deps.tx.runInTransaction(async (t) => {
          return t.subjectRepo.createAggregate({
            userId: input.userId,
            aggregate: input.aggregate,
            now,
          });
        });

        return ok({ subjectId });
      } catch (e: any) {
        return fail("INFRA_ERROR", "Failed to create subject aggregate.", { cause: String(e?.message ?? e) });
      }
    },
  };
}
