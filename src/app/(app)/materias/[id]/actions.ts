"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createSubjectsSsrComposition } from "@/core/composition/subjects.ssr.composition";
import type {
  SubjectAggregateDTO,
  SubjectCategory,
  SubjectStatus,
  SubjectRow,
  ReadingPacingMode,
  VideoPacingMode,
} from "@/features/subjects";

type VideoPlaybackSpeed = "1x" | "1.5x" | "2x";
type LawMode = "COUPLED_TO_THEORY" | "FIXED_ARTICLES_PER_DAY";

function parseStatus(v: FormDataEntryValue | null): SubjectStatus {
  const s = String(v ?? "ATIVA");
  const allowed: ReadonlySet<SubjectStatus> = new Set(["ATIVA", "EM_ANDAMENTO", "CONCLUIDA", "PAUSADA", "BLOQUEADA"]);
  return allowed.has(s as SubjectStatus) ? (s as SubjectStatus) : "ATIVA";
}

function parseCategories(fd: FormData): SubjectCategory[] {
  const raw = fd.getAll("categories").map(String);
  const allowed: ReadonlySet<SubjectCategory> = new Set(["THEORY", "QUESTIONS", "LAW"]);
  return raw.filter((x): x is SubjectCategory => allowed.has(x as SubjectCategory));
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

function numOrZero(v: FormDataEntryValue | null): number {
  const s = String(v ?? "0").trim();
  if (s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function strOrEmpty(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
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

export async function replaceMateriaAction(input: { subjectId: string; formData: FormData }) {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) throw new Error("Missing authenticated user claim (x-kairos-user-id).");

  const subjectId = input.subjectId;
  const fd = input.formData;

  const name = strOrEmpty(fd.get("name"));
  const status = parseStatus(fd.get("status"));
  const categories = parseCategories(fd);

  const readingEnabled = String(fd.get("reading_enabled") ?? "") === "on";
  const videoEnabled = String(fd.get("video_enabled") ?? "") === "on";
  const questionsEnabled = String(fd.get("questions_enabled") ?? "") === "on";
  const lawEnabled = String(fd.get("law_enabled") ?? "") === "on";

  const nowIso = new Date().toISOString();

  const readingTrack = readingEnabled
    ? {
        userId,
        subjectId,
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
        subjectId,
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
        subjectId,
        dailyTarget: numOrZero(fd.get("questions_daily_target")),
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    : null;

  const lawConfig = lawEnabled
    ? {
        userId,
        subjectId,
        lawName: strOrEmpty(fd.get("law_name")),
        totalArticles: numOrZero(fd.get("law_total_articles")),
        readArticles: numOrZero(fd.get("law_read_articles")),
        lawMode: parseLawMode(fd.get("law_mode")),
        fixedArticlesPerDay: numOrNull(fd.get("law_fixed_articles_per_day")),
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    : null;

  const aggregate: Omit<SubjectAggregateDTO, "subject"> & {
    subject: Omit<SubjectRow, "createdAt" | "updatedAt" | "id" | "userId">;
  } = {
    subject: {
      name,
      categories,
      status,
      isDeleted: false,
    },
    readingTrack,
    videoTrack,
    questionsMeta,
    lawConfig,
  };

  const { replaceSubjectAggregateUseCase } = createSubjectsSsrComposition({ userId });
  const res = await replaceSubjectAggregateUseCase.execute({
    userId,
    subjectId,
    aggregate,
  });

  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);

  revalidatePath(`/materias/${subjectId}`);
  revalidatePath("/materias");
}

export async function softDeleteMateriaByIdAction(input: { subjectId: string }) {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) throw new Error("Missing authenticated user claim (x-kairos-user-id).");

  const { softDeleteSubjectUseCase } = createSubjectsSsrComposition({ userId });
  const res = await softDeleteSubjectUseCase.execute({ userId, subjectId: input.subjectId });

  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);

  revalidatePath("/materias");
  revalidatePath(`/materias/${input.subjectId}`);
}
