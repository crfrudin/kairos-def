"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createSubjectsSsrComposition } from "@/core/composition/subjects.ssr.composition";
import type {
  SubjectAggregateDTO,
  SubjectCategory,
  SubjectStatus,
  ReadingPacingMode,
  VideoPacingMode,
} from "@/features/subjects";

function parseStatus(v: FormDataEntryValue | null): SubjectStatus {
  const s = String(v ?? "ATIVA");
  const allowed = new Set<SubjectStatus>(["ATIVA", "EM_ANDAMENTO", "CONCLUIDA", "PAUSADA", "BLOQUEADA"]);
  return allowed.has(s as any) ? (s as SubjectStatus) : "ATIVA";
}

function parseCategories(fd: FormData): SubjectCategory[] {
  const raw = fd.getAll("categories").map(String);
  const allowed = new Set<SubjectCategory>(["THEORY", "QUESTIONS", "LAW"]);
  return raw.filter((x): x is SubjectCategory => allowed.has(x as any));
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
  const n = Number(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

function strOrEmpty(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

function ensureUserId(): string {
  const h = headers();
  const userId = (h as any).get ? (h as any).get("x-kairos-user-id") ?? "" : "";
  if (!userId) throw new Error("Missing authenticated user claim (x-kairos-user-id).");
  return userId;
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

  const readingTrack = readingEnabled
    ? {
        userId,
        subjectId,
        totalPages: numOrZero(fd.get("reading_total_pages")),
        readPages: numOrZero(fd.get("reading_read_pages")),
        pacingMode: String(fd.get("reading_pacing_mode") ?? "FIXED_PAGES_PER_DAY") as ReadingPacingMode,
        pagesPerDay: numOrNull(fd.get("reading_pages_per_day")),
        pagesPerHour: numOrNull(fd.get("reading_pages_per_hour")),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    : null;

  const videoTrack = videoEnabled
    ? {
        userId,
        subjectId,
        totalBlocks: numOrZero(fd.get("video_total_blocks")),
        watchedBlocks: numOrZero(fd.get("video_watched_blocks")),
        pacingMode: String(fd.get("video_pacing_mode") ?? "FIXED_BLOCKS_PER_DAY") as VideoPacingMode,
        blocksPerDay: numOrNull(fd.get("video_blocks_per_day")),
        avgMinutes: numOrNull(fd.get("video_avg_minutes")),
        playbackSpeed: String(fd.get("video_playback_speed") ?? "1x") as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    : null;

  const questionsMeta = questionsEnabled
    ? {
        userId,
        subjectId,
        dailyTarget: numOrZero(fd.get("questions_daily_target")),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    : null;

  const lawConfig = lawEnabled
    ? {
        userId,
        subjectId,
        lawName: strOrEmpty(fd.get("law_name")),
        totalArticles: numOrZero(fd.get("law_total_articles")),
        readArticles: numOrZero(fd.get("law_read_articles")),
        lawMode: String(fd.get("law_mode") ?? "COUPLED_TO_THEORY") as any,
        fixedArticlesPerDay: numOrNull(fd.get("law_fixed_articles_per_day")),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    : null;

  const aggregate: Omit<SubjectAggregateDTO, "subject"> & {
    subject: { name: string; categories: SubjectCategory[]; status: SubjectStatus; isDeleted: boolean };
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
    aggregate: aggregate as any,
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
