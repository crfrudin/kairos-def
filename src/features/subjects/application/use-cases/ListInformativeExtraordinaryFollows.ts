import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { UUID } from "@/features/subjects/application/ports/IInformativeFollowRepository";
import type { ExtraordinaryTribunal } from "@/features/subjects/application/ports/IInformativeExtraordinaryFollowRepository";
import { fail, ok, type Result } from "./_result";

export type InformativeExtraordinaryFollowComputed = {
  tribunal: ExtraordinaryTribunal; // STJ
  lastReadNumber: number;
  isActive: boolean;

  latestAvailableNumber: number | null;
  unreadCount: number | null;
  status: "EM_DIA" | "NOVOS" | null;
};

export interface ListInformativeExtraordinaryFollowsUseCase {
  execute(input: { userId: UUID }): Promise<Result<{ items: ReadonlyArray<InformativeExtraordinaryFollowComputed> }>>;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function compute(params: {
  latest: number | null;
  lastRead: number;
}): { unreadCount: number | null; status: "EM_DIA" | "NOVOS" | null } {
  const { latest, lastRead } = params;

  if (latest === null) return { unreadCount: null, status: null };
  if (lastRead > latest) return { unreadCount: null, status: null };

  const delta = latest - lastRead;
  const unread = delta > 0 ? delta : 0;
  return { unreadCount: unread, status: unread === 0 ? "EM_DIA" : "NOVOS" };
}

export function createListInformativeExtraordinaryFollowsUseCase(deps: {
  tx: ISubjectsTransaction;
}): ListInformativeExtraordinaryFollowsUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");

      try {
        const items = await deps.tx.runInTransaction(async (t) => {
          const follows = await t.informativeExtraFollowRepo.list({ userId: input.userId });

          const tribunals = Array.from(new Set(follows.map((f) => f.tribunal))) as ExtraordinaryTribunal[];
          const latestRows = await t.informativeLatestExtraRepo.listByTribunals({ tribunals });

          const latestMap = new Map<ExtraordinaryTribunal, number>();
          for (const r of latestRows) latestMap.set(r.tribunal, r.latestAvailableNumber);

          return follows.map((f) => {
            const latest = latestMap.has(f.tribunal) ? (latestMap.get(f.tribunal) as number) : null;
            const { unreadCount, status } = compute({ latest, lastRead: f.lastReadNumber });

            return {
              tribunal: f.tribunal,
              lastReadNumber: f.lastReadNumber,
              isActive: f.isActive,
              latestAvailableNumber: latest,
              unreadCount,
              status,
            } satisfies InformativeExtraordinaryFollowComputed;
          });
        });

        return ok({ items });
      } catch (e: unknown) {
        return fail("INFRA_ERROR", "Failed to list extraordinary informative follows.", { cause: errorMessage(e) });
      }
    },
  };
}
