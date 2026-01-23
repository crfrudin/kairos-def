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

type LastRunDetailsDTO = {
  run_day: string | null;
  status: string;
  error_message: string | null;
  details: unknown;
};

async function requireAuth(): Promise<string> {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) throw new Error("Missing authenticated user claim (x-kairos-user-id).");
  return userId;
}

function asIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * ✅ DEBUG: retorna o JSON do robô para a UI (não depende do DB).
 * Importante: não revalida nem persiste. A UI mostra o retorno.
 */
export async function runRobotDebugAction(): Promise<unknown> {
  await requireAuth();
  return runInformativesRobot({ debug: true });
}

/**
 * ✅ PROD manual: executa o robô COM persistência no DB (respeita guard 1x/dia).
 * Retorna o resultado do robô para a UI (inclui skipped se já rodou hoje).
 */
export async function runRobotPersistAction(): Promise<unknown> {
  await requireAuth();
  return runInformativesRobot({ debug: false });
}

/**
 * Estado “oficial” (DB) — continua útil para ver o que foi persistido.
 */
export async function getRobotStateAction(): Promise<
  | { ok: true; latest: LatestRowDTO[]; runDay: string | null; lastRunDetails: LastRunDetailsDTO | null }
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

      const latest: LatestRowDTO[] = latestRes.rows.map((r: Record<string, unknown>) => ({
        tribunal: String(r.tribunal) as Tribunal,
        latestAvailableNumber: Number(r.latest_available_number),
        checkedDay: String(r.checked_day),
      }));

      const last = (runRes.rows[0] as Record<string, unknown> | undefined) ?? null;

      const lastRunDetails: LastRunDetailsDTO | null = last
        ? {
            run_day: asIsoDate(last.run_day),
            status: String(last.status),
            error_message: last.error_message === null || last.error_message === undefined ? null : String(last.error_message),
            details: last.details,
          }
        : null;

      return {
        ok: true as const,
        latest,
        runDay: last ? asIsoDate(last.run_day) : null,
        lastRunDetails,
      };
    });
  } catch (e: unknown) {
    return { ok: false, errorMessage: toErrorMessage(e) };
  }
}
