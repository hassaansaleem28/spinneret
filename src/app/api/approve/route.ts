import { NextResponse } from "next/server";
import { startJob } from "@/services/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const { slug, healId } = (await request.json()) as { slug?: string; healId?: number };
  if (!slug || healId === undefined) {
    return NextResponse.json({ error: "slug and healId are required" }, { status: 400 });
  }

  const result = startJob(slug, "approve", healId);
  return result.accepted
    ? NextResponse.json({ status: "accepted", slug, healId })
    : NextResponse.json({ error: result.reason }, { status: 409 });
}
