"use server";

import "server-only";

import { headers } from "next/headers";

import { getRobotPgPool } from "@/features/informatives/infra/db/pgRobotPool";
import { PgRobotTransaction } from "@/features/informatives/infra/transactions/PgRobotTransaction";
import { runInformativesRobot, type Tribunal } from "@/features/informatives/robot/informativesRobot";

type LatestRowDTO = {
  tribunal: Tribunal;
  latestAvailableNumber: number;
  checkedDay: string;
};

async function requireAuth() {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) throw new Error("Missing authenticated user claim (x-kairos-user-id).");
  return userId;
}

function asIsoDate(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

/**
 * ✅ DEBUG: retorna o JSON do robô para a UI (não depende do DB).
 * Importante: não revalida nem persiste. A UI mostra o retorno.
 */
export async function runRobotDebugAction(): Promise<any> {
  await requireAuth();
  return runInformativesRobot({ debug: true });
}

/**
 * Estado “oficial” (DB) — continua útil para ver o que foi persistido.
 */
export async function getRobotStateAction(): Promise<
  | { ok: true; latest: LatestRowDTO[]; runDay: string | null; lastRunDetails: any | null }
  | { ok: false; errorMessage: string }
> {
  await requireAuth();

  const tx = new PgRobotTransaction(getRobotPgPool());

  try {
    return await tx.runInTransaction(async (client) => {
      const latestRes = await client.query(
        `select tribunal, latest_available_number, checked_day
         from public.informative_latest_by_tribunal
         order by tribunal asc`
      );

      const runRes = await client.query(
        `select run_day, status, details, error_message
         from public.informative_robot_runs
         order by started_at desc
         limit 1`
      );

      const latest: LatestRowDTO[] = latestRes.rows.map((r) => ({
        tribunal: r.tribunal,
        latestAvailableNumber: Number(r.latest_available_number),
        checkedDay: String(r.checked_day),
      }));

      const last = runRes.rows[0] ?? null;

      return {
        ok: true as const,
        latest,
        runDay: last ? asIsoDate(last.run_day) : null,
        lastRunDetails: last
          ? { run_day: asIsoDate(last.run_day), status: last.status, error_message: last.error_message, details: last.details }
          : null,
      };
    });
  } catch (e: any) {
    return { ok: false, errorMessage: String(e?.message ?? e) };
  }
}
