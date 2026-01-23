"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSubjectsSsrComposition } from "@/core/composition/subjects.ssr.composition";
import type {
  SubjectAggregateDTO,
  SubjectCategory,
  SubjectStatus,
  ReadingPacingMode,
  VideoPacingMode,
} from "@/features/subjects";

type VideoPlaybackSpeed = "1x" | "1.5x" | "2x";
type LawMode = "COUPLED_TO_THEORY" | "FIXED_ARTICLES_PER_DAY";

function parseCategories(fd: FormData): SubjectCategory[] {
  const raw = fd.getAll("categories").map(String);
  const allowed: ReadonlySet<SubjectCategory> = new Set(["THEORY", "QUESTIONS", "LAW"]);

  const out: SubjectCategory[] = [];
  const seen = new Set<string>();

  for (const x of raw) {
    if (!allowed.has(x as SubjectCategory)) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x as SubjectCategory);
  }

  return out;
}

function parseStatus(fd: FormData): SubjectStatus {
  const s = String(fd.get("status") ?? "ATIVA");
  const allowed: ReadonlySet<SubjectStatus> = new Set(["ATIVA", "EM_ANDAMENTO", "CONCLUIDA", "PAUSADA", "BLOQUEADA"]);
  return allowed.has(s as SubjectStatus) ? (s as SubjectStatus) : "ATIVA";
}

function parseReadingPacingMode(v: FormDataEntryValue | null): ReadingPacingMode {
  const s = String(v ?? "FIXED_PAGES_PER_DAY").trim();
  const allowed: ReadonlySet<ReadingPacingMode> = new Set(["FIXED_PAGES_PER_DAY", "PACE_PAGES_PER_HOUR"]);
  return allowed.has(s as ReadingPacingMode) ? (s as ReadingPacingMode) : "FIXED_PAGES_PER_DAY";
}

function parseVideoPacingMode(v: FormDataEntryValue | null): VideoPacingMode {
  const s = String(v ?? "FIXED_BLOCKS_PER_DAY").trim();
  const allowed: ReadonlySet<VideoPacingMode> = new Set(["FIXED_BLOCKS_PER_DAY", "AUTO_BY_DURATION"]);
  return allowed.has(s as VideoPacingMode) ? (s as VideoPacingMode) : "FIXED_BLOCKS_PER_DAY";
}

function parseVideoPlaybackSpeed(v: FormDataEntryValue | null): VideoPlaybackSpeed {
  const s = String(v ?? "1x").trim();
  const allowed: ReadonlySet<VideoPlaybackSpeed> = new Set(["1x", "1.5x", "2x"]);
  return allowed.has(s as VideoPlaybackSpeed) ? (s as VideoPlaybackSpeed) : "1x";
}

function parseLawMode(v: FormDataEntryValue | null): LawMode {
  const s = String(v ?? "COUPLED_TO_THEORY").trim();
  const allowed: ReadonlySet<LawMode> = new Set(["COUPLED_TO_THEORY", "FIXED_ARTICLES_PER_DAY"]);
  return allowed.has(s as LawMode) ? (s as LawMode) : "COUPLED_TO_THEORY";
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function numOrZero(v: FormDataEntryValue | null): number {
  const s = String(v ?? "0").trim();
  if (s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function stringifyErrorDetails(e: unknown): string {
  if (typeof e !== "object" || e === null) return "";
  if (!("details" in e)) return "";
  const details = (e as Record<string, unknown>).details;
  if (details === undefined) return "";
  try {
    return ` | details=${JSON.stringify(details)}`;
  } catch {
    return " | details=[unserializable]";
  }
}

export async function createMateriaAction(fd: FormData) {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) throw new Error("Missing authenticated user claim (x-kairos-user-id).");

  const name = String(fd.get("name") ?? "").trim();
  const categories = parseCategories(fd);
  const status = parseStatus(fd);

  const readingEnabled = String(fd.get("reading_enabled") ?? "") === "on";
  const videoEnabled = String(fd.get("video_enabled") ?? "") === "on";
  const questionsEnabled = String(fd.get("questions_enabled") ?? "") === "on";
  const lawEnabled = String(fd.get("law_enabled") ?? "") === "on";

  const nowIso = new Date().toISOString();

  // subjectId placeholder (será substituído pelo backend ao criar)
  const PLACEHOLDER_SUBJECT_ID = "00000000-0000-0000-0000-000000000000";

  const readingTrack = readingEnabled
    ? {
        userId,
        subjectId: PLACEHOLDER_SUBJECT_ID,
        totalPages: numOrZero(fd.get("reading_total_pages")),
        readPages: numOrZero(fd.get("reading_read_pages")),
        pacingMode: parseReadingPacingMode(fd.get("reading_pacing_mode")),
        pagesPerDay: numOrNull(fd.get("reading_pages_per_day")),
        pagesPerHour: numOrNull(fd.get("reading_pages_per_hour")),
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    : null;

  const videoTrack = videoEnabled
    ? {
        userId,
        subjectId: PLACEHOLDER_SUBJECT_ID,
        totalBlocks: numOrZero(fd.get("video_total_blocks")),
        watchedBlocks: numOrZero(fd.get("video_watched_blocks")),
        pacingMode: parseVideoPacingMode(fd.get("video_pacing_mode")),
        blocksPerDay: numOrNull(fd.get("video_blocks_per_day")),
        avgMinutes: numOrNull(fd.get("video_avg_minutes")),
        playbackSpeed: parseVideoPlaybackSpeed(fd.get("video_playback_speed")),
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    : null;

  const questionsMeta = questionsEnabled
    ? {
        userId,
        subjectId: PLACEHOLDER_SUBJECT_ID,
        dailyTarget: numOrZero(fd.get("questions_daily_target")),
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    : null;

  const lawConfig = lawEnabled
    ? {
        userId,
        subjectId: PLACEHOLDER_SUBJECT_ID,
        lawName: String(fd.get("law_name") ?? "").trim(),
        totalArticles: numOrZero(fd.get("law_total_articles")),
        readArticles: numOrZero(fd.get("law_read_articles")),
        lawMode: parseLawMode(fd.get("law_mode")),
        fixedArticlesPerDay: numOrNull(fd.get("law_fixed_articles_per_day")),
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    : null;

  // Mantém a mesma estrutura “tolerante” anterior, mas sem `any`.
  // (Se o UC for mais estrito, ele vai rejeitar via Result; sem mascarar.)
  const aggregate = {
    subject: {
      id: "",
      userId,
      name,
      categories,
      status,
      isDeleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    readingTrack,
    videoTrack,
    questionsMeta,
    lawConfig,
  } as unknown as SubjectAggregateDTO;

  const { createSubjectAggregateUseCase } = createSubjectsSsrComposition({ userId });
  const res = await createSubjectAggregateUseCase.execute({ userId, aggregate });

  if (!res.ok) {
    // Mostra no terminal o erro real retornado (inclui details/cause quando existir)
    console.error("[createMateriaAction] createSubjectAggregateUseCase failed:", res.error);

    throw new Error(`${res.error.code}: ${res.error.message}${stringifyErrorDetails(res.error)}`);
  }

  revalidatePath("/materias");
  redirect(`/materias/${res.value.subjectId}`);
}
