// src/app/informativos/actions.ts
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

function mapFollowComputedToDto(x: any): InformativeFollowDTO | null {
  const tribunal = x?.tribunal;
  const lastReadNumber = x?.lastReadNumber;
  const isActive = x?.isActive;

  if (!tribunal || typeof tribunal !== "string") return null;
  if (!Number.isFinite(Number(lastReadNumber))) return null;
  if (typeof isActive !== "boolean") return null;

  const dto: InformativeFollowDTO = {
    tribunal,
    lastReadNumber: Number(lastReadNumber),
    isActive,
    latestAvailableNumber: x?.latestAvailableNumber ?? null,
    unreadCount: x?.unreadCount ?? null,
    status: x?.status ?? null,
  };

  return dto;
}

function mapExtraFollowComputedToDto(x: any): InformativeExtraFollowDTO | null {
  const tribunal = x?.tribunal;
  const lastReadNumber = x?.lastReadNumber;
  const isActive = x?.isActive;

  if (tribunal !== "STJ") return null;
  if (!Number.isFinite(Number(lastReadNumber))) return null;
  if (typeof isActive !== "boolean") return null;

  const dto: InformativeExtraFollowDTO = {
    tribunal: "STJ",
    lastReadNumber: Number(lastReadNumber),
    isActive,
    latestAvailableNumber: x?.latestAvailableNumber ?? null,
    unreadCount: x?.unreadCount ?? null,
    status: x?.status ?? null,
  };

  return dto;
}

/**
 * REGULAR (tabela atual: informative_follows + informative_latest_by_tribunal)
 */
export async function uc_i01_list(_userIdFromClient: string): Promise<Result<{ follows: InformativeFollowDTO[] }>> {
  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const { listInformativeFollowsUseCase } = createSubjectsSsrComposition({ userId });
  const res = await listInformativeFollowsUseCase.execute({ userId });

  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);

  const raw = (res as any).value?.items ?? [];
  const arr = Array.isArray(raw) ? raw : [];
  const follows = arr.map(mapFollowComputedToDto).filter(Boolean) as InformativeFollowDTO[];

  return { ok: true, data: { follows } };
}

export async function uc_i02_add(
  _userIdFromClient: string,
  input: { tribunal: Tribunal; lastReadNumber?: number }
): Promise<Result<{ follow: InformativeFollowDTO }>> {
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
  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const { deactivateInformativeFollowUseCase } = createSubjectsSsrComposition({ userId });

  const res = await deactivateInformativeFollowUseCase.execute({ userId, tribunal: input.tribunal });

  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);

  revalidatePath("/informativos");

  return { ok: true, data: { removedTribunal: input.tribunal } };
}

/**
 * EXTRA (STJ V2)
 * OBS: esses use-cases ainda vamos plugar na composition na etapa seguinte.
 */
export async function uc_i01_list_extra(_userIdFromClient: string): Promise<Result<{ follows: InformativeExtraFollowDTO[] }>> {
  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const { listInformativeExtraordinaryFollowsUseCase } = createSubjectsSsrComposition({ userId } as any);
  if (!listInformativeExtraordinaryFollowsUseCase) return fail("Extraordinary use-case not wired yet.");

  const res = await listInformativeExtraordinaryFollowsUseCase.execute({ userId });

  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);

  const raw = (res as any).value?.items ?? [];
  const arr = Array.isArray(raw) ? raw : [];
  const follows = arr.map(mapExtraFollowComputedToDto).filter(Boolean) as InformativeExtraFollowDTO[];

  return { ok: true, data: { follows } };
}

export async function uc_i02_add_extra(
  _userIdFromClient: string,
  input: { lastReadNumber?: number }
): Promise<Result<{ follow: InformativeExtraFollowDTO }>> {
  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const lastReadNumber = input.lastReadNumber ?? 0;

  const { upsertInformativeExtraordinaryFollowUseCase } = createSubjectsSsrComposition({ userId } as any);
  if (!upsertInformativeExtraordinaryFollowUseCase) return fail("Extraordinary use-case not wired yet.");

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
  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const markUpToNumber = input.markUpToNumber;

  const { upsertInformativeExtraordinaryFollowUseCase } = createSubjectsSsrComposition({ userId } as any);
  if (!upsertInformativeExtraordinaryFollowUseCase) return fail("Extraordinary use-case not wired yet.");

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
  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const { deactivateInformativeExtraordinaryFollowUseCase } = createSubjectsSsrComposition({ userId } as any);
  if (!deactivateInformativeExtraordinaryFollowUseCase) return fail("Extraordinary use-case not wired yet.");

  const res = await deactivateInformativeExtraordinaryFollowUseCase.execute({ userId, tribunal: "STJ" });

  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);

  revalidatePath("/informativos");

  return { ok: true, data: { removed: true } };
}

/**
 * Refresh (robô) — mantém como está: robô roda, depois list normal recarrega e preenche latestByTribunal.
 * A UI do EXTRA será atualizada pelo list_extra (vamos plugar depois).
 */
export async function uc_i05_refresh_latest(
  _userIdFromClient: string,
  input?: { tribunals?: Tribunal[] }
): Promise<Result<{ latestByTribunal: Record<Tribunal, number> }>> {
  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const { runInformativesRobot } = await import("@/features/informatives/robot/informativesRobot");
  const r = await runInformativesRobot({ tribunals: input?.tribunals, debug: false });

  if (!r.ok) return fail(`ROBOT_FAILED: ${(r as any).errorMessage ?? "Unknown error"}`);

  const { listInformativeFollowsUseCase } = createSubjectsSsrComposition({ userId });
  const res = await listInformativeFollowsUseCase.execute({ userId });
  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);

  const latestByTribunal: Record<Tribunal, number> = { STF: 0, STJ: 0, TST: 0, TSE: 0 };

  for (const it of (res as any).value?.items ?? []) {
    if (it && typeof it.latestAvailableNumber === "number" && typeof it.tribunal === "string") {
      latestByTribunal[it.tribunal as Tribunal] = it.latestAvailableNumber;
    }
  }

  revalidatePath("/informativos");
  revalidatePath("/robo");

  return { ok: true, data: { latestByTribunal } };
}