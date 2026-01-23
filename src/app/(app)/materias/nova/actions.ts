"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSubjectsSsrComposition } from "@/core/composition/subjects.ssr.composition";
import type { SubjectAggregateDTO, SubjectCategory, SubjectStatus } from "@/features/subjects";

function parseCategories(fd: FormData): SubjectCategory[] {
  const raw = fd.getAll("categories").map(String);
  const allowed = new Set<SubjectCategory>(["THEORY", "QUESTIONS", "LAW"]);

  const out: SubjectCategory[] = [];
  const seen = new Set<string>();

  for (const x of raw) {
    if (!allowed.has(x as any)) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x as SubjectCategory);
  }

  return out;
}

function parseStatus(fd: FormData): SubjectStatus {
  const s = String(fd.get("status") ?? "ATIVA");
  const allowed = new Set<SubjectStatus>(["ATIVA", "EM_ANDAMENTO", "CONCLUIDA", "PAUSADA", "BLOQUEADA"]);
  return allowed.has(s as any) ? (s as SubjectStatus) : "ATIVA";
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

  const readingTrack = readingEnabled
    ? {
        userId,
        subjectId: "00000000-0000-0000-0000-000000000000",
        totalPages: Number(fd.get("reading_total_pages") ?? 0),
        readPages: Number(fd.get("reading_read_pages") ?? 0),
        pacingMode: String(fd.get("reading_pacing_mode") ?? "FIXED_PAGES_PER_DAY") as any,
        pagesPerDay: numOrNull(fd.get("reading_pages_per_day")),
        pagesPerHour: numOrNull(fd.get("reading_pages_per_hour")),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    : null;

  const videoTrack = videoEnabled
    ? {
        userId,
        subjectId: "00000000-0000-0000-0000-000000000000",
        totalBlocks: Number(fd.get("video_total_blocks") ?? 0),
        watchedBlocks: Number(fd.get("video_watched_blocks") ?? 0),
        pacingMode: String(fd.get("video_pacing_mode") ?? "FIXED_BLOCKS_PER_DAY") as any,
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
        subjectId: "00000000-0000-0000-0000-000000000000",
        dailyTarget: numOrZero(fd.get("questions_daily_target")),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    : null;

  const lawConfig = lawEnabled
    ? {
        userId,
        subjectId: "00000000-0000-0000-0000-000000000000",
        lawName: String(fd.get("law_name") ?? "").trim(),
        totalArticles: numOrZero(fd.get("law_total_articles")),
        readArticles: numOrZero(fd.get("law_read_articles")),
        lawMode: String(fd.get("law_mode") ?? "COUPLED_TO_THEORY") as any,
        fixedArticlesPerDay: numOrNull(fd.get("law_fixed_articles_per_day")),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    : null;

  const aggregate: Omit<SubjectAggregateDTO, "subject"> & { subject: any } = {
    subject: {
      id: "",
      userId,
      name,
      categories,
      status,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    readingTrack,
    videoTrack,
    questionsMeta,
    lawConfig,
  };

  const { createSubjectAggregateUseCase } = createSubjectsSsrComposition({ userId });
  const res = await createSubjectAggregateUseCase.execute({ userId, aggregate });

if (!res.ok) {
  // ✅ Mostra no terminal o erro real retornado pela Application/Infra (inclui "cause" quando existir)
  console.error("[createMateriaAction] createSubjectAggregateUseCase failed:", res.error);

  // ✅ Repassa mensagem com o máximo de contexto (sem stack interna do DB, só o payload do Result)
  throw new Error(
    `${res.error.code}: ${res.error.message}${
      (res.error as any)?.details ? ` | details=${JSON.stringify((res.error as any).details)}` : ""
    }`
  );
}

  revalidatePath("/materias");
  redirect(`/materias/${res.value.subjectId}`);
}
