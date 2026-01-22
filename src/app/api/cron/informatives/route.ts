import "server-only";

import { NextResponse } from "next/server";
import { runInformativesRobot } from "@/features/informatives/robot/informativesRobot";

function unauthorized() {
  return new NextResponse("Unauthorized", { status: 401 });
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  if (!expected) return new NextResponse("CRON_SECRET not configured", { status: 500 });
  if (auth !== expected) return unauthorized();

  const result = await runInformativesRobot({ debug: false });

  return NextResponse.json(result, { status: 200 });
}
