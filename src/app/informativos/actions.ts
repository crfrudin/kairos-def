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

  // ⚠️ Campos “derivados” só existem se o backend fornecer.
  // Hoje, seu domínio/UCs não expõem latest/unread/status.
  // Mantemos no DTO como opcionais para a UI não inventar nada.
  latestAvailableNumber?: number;
  unreadCount?: number;
  status?: "EM_DIA" | "NOVOS";
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

function mapFollowLikeToDto(x: any): InformativeFollowDTO | null {
  // Aceita tanto formatos de repo (InformativeFollowRow) quanto DTOs já prontos.
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
  };

  // opcionais (se existirem)
  if (Number.isFinite(Number(x?.latestAvailableNumber))) dto.latestAvailableNumber = Number(x.latestAvailableNumber);
  if (Number.isFinite(Number(x?.unreadCount))) dto.unreadCount = Number(x.unreadCount);
  if (x?.status === "EM_DIA" || x?.status === "NOVOS") dto.status = x.status;

  return dto;
}

export async function uc_i01_list(_userIdFromClient: string): Promise<Result<{ follows: InformativeFollowDTO[] }>> {
  const userId = await getAuthedUserIdFromHeaders();
  if (!userId) return fail("Missing authenticated user claim (x-kairos-user-id).");

  const { listInformativeFollowsUseCase } = createSubjectsSsrComposition({ userId });
  const res = await listInformativeFollowsUseCase.execute({ userId });

  if (!res.ok) return fail(`${res.error.code}: ${res.error.message}`);

  // Seja resiliente ao shape retornado pelo UC (items | follows | rows)
  const anyVal: any = (res as any).value ?? (res as any).data ?? {};
  const raw =
    anyVal.follows ??
    anyVal.items ??
    anyVal.rows ??
    anyVal.list ??
    (Array.isArray(anyVal) ? anyVal : []);

  const arr = Array.isArray(raw) ? raw : [];
  const follows = arr.map(mapFollowLikeToDto).filter(Boolean) as InformativeFollowDTO[];

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

  // Retorno “follow” sem inventar campos derivados
  return {
    ok: true,
    data: {
      follow: {
        tribunal,
        lastReadNumber,
        isActive: true,
      },
    },
  };
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

  return {
    ok: true,
    data: {
      follow: {
        tribunal,
        lastReadNumber: markUpToNumber,
        isActive: true,
      },
    },
  };
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

export async function uc_i05_refresh_latest(
  _userIdFromClient: string,
  _input?: { tribunals?: Tribunal[] }
): Promise<Result<{ latestByTribunal: Record<Tribunal, number> }>> {
  // Não existe UC-I05 exposto no composition atual.
  return fail("UNIMPLEMENTED: UC-I05 (RefreshLatestInformativeNumbers) não está disponível no backend.");
}
