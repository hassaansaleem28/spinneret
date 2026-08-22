import { NextResponse } from "next/server";
import { startJob } from "@/services/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const { slug } = (await request.json()) as { slug?: string };
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const result = startJob(slug, "observe");
  return result.accepted
    ? NextResponse.json({ status: "accepted", slug })
    : NextResponse.json({ error: result.reason }, { status: 409 });
}
