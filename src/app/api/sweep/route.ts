import { NextResponse } from "next/server";
import { startSweep } from "@/services/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Manually trigger the same supervision pass the cron daemon runs. */
export async function POST() {
  const result = startSweep();
  return result.accepted
    ? NextResponse.json({ status: "accepted" })
    : NextResponse.json({ error: result.reason }, { status: 409 });
}
