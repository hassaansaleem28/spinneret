import { NextResponse } from "next/server";
import { buildFleetState } from "@/services/state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Whole-dashboard snapshot. One round trip keeps the client free of stitching logic. */
export async function GET() {
  return NextResponse.json(buildFleetState());
}
