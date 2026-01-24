import type { ISubjectsTransaction } from "@/features/subjects/application/ports/ISubjectsTransaction";
import type { Tribunal, UUID } from "@/features/subjects/application/ports/IInformativeFollowRepository";
import { fail, ok, type Result } from "./_result";

export type InformativeFollowComputed = {
  tribunal: Tribunal;
  lastReadNumber: number;
  isActive: boolean;

  latestAvailableNumber: number | null;
  latestCheckedAt: string | null;

  unreadCount: number | null;
  status: "EM_DIA" | "NOVOS" | null;
};

export interface ListInformativeFollowsUseCase {
  execute(input: { userId: UUID }): Promise<Result<{ items: ReadonlyArray<InformativeFollowComputed> }>>;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Regras (V1 legado):
 * - Se latest=null => status/unread = null (não inventar nada).
 * - Se lastRead > latest:
 *    - TSE: NOVOS + unread = latest (virada de ano V1, determinístico).
 *    - Outros: status/unread = null (inconsistência, não mascarar).
 * - Caso normal:
 *    unread = max(0, latest - lastRead)
 *    status = EM_DIA se unread=0, senão NOVOS
 *
 * OBS: A UI agora pode aplicar uma regra visual mais rica (Em dia / Novo / Atrasado),
 * mas este use-case mantém a regra V1 para compatibilidade e para não "inventar" quando inconsistente.
 */
function compute(params: {
  tribunal: Tribunal;
  latest: number | null;
  lastRead: number;
}): { unreadCount: number | null; status: "EM_DIA" | "NOVOS" | null } {
  const { tribunal, latest, lastRead } = params;

  if (latest === null) return { unreadCount: null, status: null };

  if (lastRead > latest) {
    if (tribunal === "TSE") {
      // V1 aprovado: evita "Em dia" indevido na virada de ano.
      return { unreadCount: latest, status: "NOVOS" };
    }
    // Inconsistência para tribunais monotônicos: não mascarar.
    return { unreadCount: null, status: null };
  }

  const delta = latest - lastRead;
  const unread = delta > 0 ? delta : 0;

  return { unreadCount: unread, status: unread === 0 ? "EM_DIA" : "NOVOS" };
}

export function createListInformativeFollowsUseCase(deps: { tx: ISubjectsTransaction }): ListInformativeFollowsUseCase {
  return {
    async execute(input) {
      if (!input.userId) return fail("UNAUTHENTICATED", "Missing userId.");

      try {
        const items = await deps.tx.runInTransaction(async (t) => {
          const follows = await t.informativeFollowRepo.list({ userId: input.userId });

          const tribunals = Array.from(new Set(follows.map((f) => f.tribunal)));
          const latestRows = await t.informativeLatestRepo.listByTribunals({ tribunals });

          const latestMap = new Map<Tribunal, { latest: number; checkedAt: string }>();
          for (const r of latestRows) {
            latestMap.set(r.tribunal, { latest: r.latestAvailableNumber, checkedAt: r.checkedAt });
          }

          return follows.map((f) => {
            const row = latestMap.has(f.tribunal) ? (latestMap.get(f.tribunal) as { latest: number; checkedAt: string }) : null;

            const latest = row ? row.latest : null;
            const latestCheckedAt = row ? row.checkedAt : null;

            const { unreadCount, status } = compute({ tribunal: f.tribunal, latest, lastRead: f.lastReadNumber });

            return {
              tribunal: f.tribunal,
              lastReadNumber: f.lastReadNumber,
              isActive: f.isActive,
              latestAvailableNumber: latest,
              latestCheckedAt,
              unreadCount,
              status,
            } satisfies InformativeFollowComputed;
          });
        });

        return ok({ items });
      } catch (e: unknown) {
        return fail("INFRA_ERROR", "Failed to list informative follows.", { cause: errorMessage(e) });
      }
    },
  };
}
