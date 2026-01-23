"use server";
import "server-only";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createSubjectsSsrComposition } from "@/core/composition/subjects.ssr.composition";
import type { Tribunal } from "@/features/subjects/application/ports/IInformativeFollowRepository";

export type InformativeFollowDTO = {
  tribunal: Tribunal;
  lastReadNumber: number;
  isActive: boolean;
  latestAvailableNumber?: number | null;
  unreadCount?: number | null;
  status?: "EM_DIA" | "NOVOS" | null;
};

export type InformativeExtraFollowDTO = {
  // STJ extraordinário (V2)
  tribunal: "STJ";
  lastReadNumber: number;
  isActive: boolean;
  latestAvailableNumber?: number | null;
  unreadCount?: number | null;
  status?: "EM_DIA" | "NOVOS" | null;
};

export type ResultOk<T> = { ok: true; data: T };
export type ResultErr = { ok: false; errorMessage: string };
export type Result<T> = ResultOk<T> | ResultErr;

async function getAuthedUserIdFromHeaders(): Promise<string> {
  const h = await headers();
  return h.get("x-kairos-user-id") ?? "";
}

function fail(message: string): ResultErr {
  return { ok: false, errorMessage: message };
}

/**
 * Runtime guards / mapping hardening
 * (evita "any" no caminho crítico e protege contra formato inesperado)
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toNumberOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function extractItemsFromUseCaseResult(res: unknown): ReadonlyArray<unknown> {
  if (!isRecord(res)) return [];
  const value = res["value"];
  if (!isRecord(value)) return [];
  const items = value["items"];
  return Array.isArray(items) ? items : [];
}

function mapFollowComputedToDto(x: unknown): InformativeFollowDTO | null {
  if (!isRecord(x)) return null;

  const tribunal = x["tribunal"];
  const lastReadNumber = toNumberOrNull(x["lastReadNumber"]);
  const isActive = x["isActive"];

  if (typeof tribunal !== "string") return null;
  if (lastReadNumber === null) return null;
  if (typeof isActive !== "boolean") return null;

  return {
    tribunal: tribunal as Tribunal,
    lastReadNumber,
    isActive,
    latestAvailableNumber: toNumberOrNull(x["latestAvailableNumber"]),
    unreadCount: toNumberOrNull(x["unreadCount"]),
    status: (typeof x["status"] === "string" ? x["status"] : null) as "EM_DIA" | "NOVOS" | null,
  };
}

function mapExtraFollowComputedToDto(x: unknown): InformativeExtraFollowDTO | null {
  if (!isRecord(x)) return null;

  const tribunal = x["tribunal"];
  const lastReadNumber = toNumberOrNull(x["lastReadNumber"]);
  const isActive = x["isActive"];

  if (tribunal !== "STJ") return null;
  if (lastReadNumber === null) return null;
  if (typeof isActive !== "boolean") return null;

  return {
    tribunal: "STJ",
    lastReadNumber,
    isActive,
    latestAvailableNumber: toNumberOrNull(x["latestAvailableNumber"]),
    unreadCount: toNumberOrNull(x["unreadCount"]),
    status: (typeof x["status"] === "string" ? x["status"] : null) as "EM_DIA" | "NOVOS" | null,
  };
}

/**
 * REGULAR (informative_follows + informative_latest_by_tribunal)
 */
export async function uc_i01_list(_userIdFromClient: string): Promise<Result<{ follows: InformativeFollowDTO[] }>> {
  void _userIdFromClient;

  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const { listInformativeFollowsUseCase } = createSubjectsSsrComposition({ userId });
  const res = await listInformativeFollowsUseCase.execute({ userId });
  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);

  const arr = extractItemsFromUseCaseResult(res);
  const follows = arr.map(mapFollowComputedToDto).filter(Boolean) as InformativeFollowDTO[];

  return { ok: true, data: { follows } };
}

export async function uc_i02_add(
  _userIdFromClient: string,
  input: { tribunal: Tribunal; lastReadNumber?: number }
): Promise<Result<{ follow: InformativeFollowDTO }>> {
  void _userIdFromClient;

  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const tribunal = input.tribunal;
  const lastReadNumber = input.lastReadNumber ?? 0;

  const { upsertInformativeFollowUseCase } = createSubjectsSsrComposition({ userId });
  const res = await upsertInformativeFollowUseCase.execute({
    userId,
    tribunal,
    lastReadNumber,
    isActive: true,
  });

  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);
  revalidatePath("/informativos");

  return { ok: true, data: { follow: { tribunal, lastReadNumber, isActive: true } } };
}

export async function uc_i03_mark_read_up_to(
  _userIdFromClient: string,
  input: { tribunal: Tribunal; markUpToNumber: number }
): Promise<Result<{ follow: InformativeFollowDTO }>> {
  void _userIdFromClient;

  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const tribunal = input.tribunal;
  const markUpToNumber = input.markUpToNumber;

  const { upsertInformativeFollowUseCase } = createSubjectsSsrComposition({ userId });
  const res = await upsertInformativeFollowUseCase.execute({
    userId,
    tribunal,
    lastReadNumber: markUpToNumber,
    isActive: true,
  });

  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);
  revalidatePath("/informativos");

  return { ok: true, data: { follow: { tribunal, lastReadNumber: markUpToNumber, isActive: true } } };
}

export async function uc_i04_remove(
  _userIdFromClient: string,
  input: { tribunal: Tribunal }
): Promise<Result<{ removedTribunal: Tribunal }>> {
  void _userIdFromClient;

  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const { deactivateInformativeFollowUseCase } = createSubjectsSsrComposition({ userId });
  const res = await deactivateInformativeFollowUseCase.execute({ userId, tribunal: input.tribunal });

  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);
  revalidatePath("/informativos");

  return { ok: true, data: { removedTribunal: input.tribunal } };
}

/**
 * EXTRA (STJ V2) — informative_extraordinary_follows + informative_latest_extraordinary_by_tribunal
 */
export async function uc_i01_list_extra(_userIdFromClient: string): Promise<Result<{ follows: InformativeExtraFollowDTO[] }>> {
  void _userIdFromClient;

  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const { listInformativeExtraordinaryFollowsUseCase } = createSubjectsSsrComposition({ userId });
  const res = await listInformativeExtraordinaryFollowsUseCase.execute({ userId });
  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);

  const arr = extractItemsFromUseCaseResult(res);
  const follows = arr.map(mapExtraFollowComputedToDto).filter(Boolean) as InformativeExtraFollowDTO[];

  return { ok: true, data: { follows } };
}

export async function uc_i02_add_extra(
  _userIdFromClient: string,
  input: { lastReadNumber?: number }
): Promise<Result<{ follow: InformativeExtraFollowDTO }>> {
  void _userIdFromClient;

  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const lastReadNumber = input.lastReadNumber ?? 0;

  const { upsertInformativeExtraordinaryFollowUseCase } = createSubjectsSsrComposition({ userId });
  const res = await upsertInformativeExtraordinaryFollowUseCase.execute({
    userId,
    tribunal: "STJ",
    lastReadNumber,
    isActive: true,
  });

  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);
  revalidatePath("/informativos");

  return { ok: true, data: { follow: { tribunal: "STJ", lastReadNumber, isActive: true } } };
}

export async function uc_i03_mark_read_up_to_extra(
  _userIdFromClient: string,
  input: { markUpToNumber: number }
): Promise<Result<{ follow: InformativeExtraFollowDTO }>> {
  void _userIdFromClient;

  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const markUpToNumber = input.markUpToNumber;

  const { upsertInformativeExtraordinaryFollowUseCase } = createSubjectsSsrComposition({ userId });
  const res = await upsertInformativeExtraordinaryFollowUseCase.execute({
    userId,
    tribunal: "STJ",
    lastReadNumber: markUpToNumber,
    isActive: true,
  });

  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);
  revalidatePath("/informativos");

  return { ok: true, data: { follow: { tribunal: "STJ", lastReadNumber: markUpToNumber, isActive: true } } };
}

export async function uc_i04_remove_extra(_userIdFromClient: string): Promise<Result<{ removed: true }>> {
  void _userIdFromClient;

  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const { deactivateInformativeExtraordinaryFollowUseCase } = createSubjectsSsrComposition({ userId });
  const res = await deactivateInformativeExtraordinaryFollowUseCase.execute({ userId, tribunal: "STJ" });

  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);
  revalidatePath("/informativos");

  return { ok: true, data: { removed: true } };
}

/**
 * Refresh (robô) — roda, e a UI recarrega REGULAR e EXTRA separadamente.
 */
export async function uc_i05_refresh_latest(
  _userIdFromClient: string,
  input?: { tribunals?: Tribunal[] }
): Promise<Result<{ latestByTribunal: Record<Tribunal, number> }>> {
  void _userIdFromClient;

  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const { runInformativesRobot } = await import("@/features/informatives/robot/informativesRobot");
  const r = await runInformativesRobot({ tribunals: input?.tribunals, debug: false });

  if (!r.ok) {
    const msg = isRecord(r) && typeof r["errorMessage"] === "string" ? r["errorMessage"] : "Unknown error";
    return fail(`ROBOT_FAILED: ${msg}`);
  }

  const { listInformativeFollowsUseCase } = createSubjectsSsrComposition({ userId });
  const res = await listInformativeFollowsUseCase.execute({ userId });
  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);

  const latestByTribunal: Record<Tribunal, number> = { STF: 0, STJ: 0, TST: 0, TSE: 0 };

  const items = extractItemsFromUseCaseResult(res);
  for (const it of items) {
    if (!isRecord(it)) continue;
    const tribunal = it["tribunal"];
    const latest = it["latestAvailableNumber"];
    if (typeof tribunal === "string" && typeof latest === "number") {
      latestByTribunal[tribunal as Tribunal] = latest;
    }
  }

  revalidatePath("/informativos");
  revalidatePath("/robo");

  return { ok: true, data: { latestByTribunal } };
}
