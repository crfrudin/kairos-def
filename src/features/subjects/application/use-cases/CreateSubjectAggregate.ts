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

type CreateAggregate = Omit<SubjectAggregateDTO, "subject"> & {
  subject: Omit<SubjectRow, "createdAt" | "updatedAt">;
};

function toFiniteNonNegNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;

  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return null;
    const n = Number(s);
    if (Number.isFinite(n) && n >= 0) return n;
  }

  return null;
}

function validateAggregateForCreate(input: { userId: UUID; aggregate: CreateAggregate }): Result<true> {
  const { aggregate } = input;

  // Categories (garantir coerência com os blocos opcionais)
  const categories = new Set<string>((aggregate.subject.categories ?? []).map((c) => String(c)));

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

    const totalPages = toFiniteNonNegNumber(t.totalPages);
    const readPages = toFiniteNonNegNumber(t.readPages);

    if (totalPages === null || readPages === null) return fail("INVARIANT_VIOLATION", "Invalid reading totals.");
    if (readPages > totalPages) return fail("INVARIANT_VIOLATION", "reading.readPages cannot exceed reading.totalPages.");

    const mode = String(t.pacingMode ?? "");
    if (mode === "FIXED_PAGES_PER_DAY") {
      const pagesPerDay = toFiniteNonNegNumber(t.pagesPerDay);
      if (pagesPerDay === null) {
        return fail("INVARIANT_VIOLATION", "Reading pacing FIXED_PAGES_PER_DAY requires pagesPerDay >= 0.");
      }
    } else if (mode === "PACE_PAGES_PER_HOUR") {
      const pagesPerHour = toFiniteNonNegNumber(t.pagesPerHour);
      if (pagesPerHour === null) {
        return fail("INVARIANT_VIOLATION", "Reading pacing PACE_PAGES_PER_HOUR requires pagesPerHour >= 0.");
      }
    }
  }

  if (aggregate.videoTrack) {
    const t = aggregate.videoTrack;

    const totalBlocks = toFiniteNonNegNumber(t.totalBlocks);
    const watchedBlocks = toFiniteNonNegNumber(t.watchedBlocks);

    if (totalBlocks === null || watchedBlocks === null) return fail("INVARIANT_VIOLATION", "Invalid video totals.");
    if (watchedBlocks > totalBlocks) return fail("INVARIANT_VIOLATION", "video.watchedBlocks cannot exceed video.totalBlocks.");

    const mode = String(t.pacingMode ?? "");
    if (mode === "FIXED_BLOCKS_PER_DAY") {
      const blocksPerDay = toFiniteNonNegNumber(t.blocksPerDay);
      if (blocksPerDay === null) {
        return fail("INVARIANT_VIOLATION", "Video pacing FIXED_BLOCKS_PER_DAY requires blocksPerDay >= 0.");
      }
    } else if (mode === "AUTO_BY_DURATION") {
      const avgMinutes = toFiniteNonNegNumber(t.avgMinutes);
      if (avgMinutes === null) {
        return fail("INVARIANT_VIOLATION", "Video pacing AUTO_BY_DURATION requires avgMinutes >= 0.");
      }
    }
  }

  if (aggregate.questionsMeta) {
    const q = aggregate.questionsMeta;
    const dailyTarget = toFiniteNonNegNumber(q.dailyTarget);
    if (dailyTarget === null) return fail("INVARIANT_VIOLATION", "questions.dailyTarget must be >= 0.");
  }

  if (aggregate.lawConfig) {
    const l = aggregate.lawConfig;

    const totalArticles = toFiniteNonNegNumber(l.totalArticles);
    const readArticles = toFiniteNonNegNumber(l.readArticles);

    if (totalArticles === null || readArticles === null) return fail("INVARIANT_VIOLATION", "Invalid law totals.");
    if (readArticles > totalArticles) return fail("INVARIANT_VIOLATION", "law.readArticles cannot exceed law.totalArticles.");

    const mode = String(l.lawMode ?? "");
    if (mode === "FIXED_ARTICLES_PER_DAY") {
      const fixedArticlesPerDay = toFiniteNonNegNumber(l.fixedArticlesPerDay);
      if (fixedArticlesPerDay === null) {
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
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return fail("INFRA_ERROR", "Failed to create subject aggregate.", { cause: msg });
      }
    },
  };
}
