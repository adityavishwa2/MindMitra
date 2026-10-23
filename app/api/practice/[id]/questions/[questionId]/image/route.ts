import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sourceQuestionImage } from "@/lib/source-image";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; questionId: string }> },
) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id, questionId } = await ctx.params;
  const session = await db.practiceSession.findFirst({
    where: {
      id,
      userId: user.id,
      paper: { status: "PUBLISHED", source: { permission: "AUTHORIZED" } },
    },
    select: {
      paperId: true,
      paper: { select: { sourceId: true } },
      questions: { where: { questionId }, select: { snapshot: true } },
    },
  });
  if (!session?.questions.length)
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  const asset = await db.sourcePdf.findUnique({
    where: { sourceId: session.paper.sourceId },
    select: { bytes: true, checksum: true },
  });
  if (!asset)
    return NextResponse.json(
      { error: "Source not available" },
      { status: 404 },
    );
  try {
    const snapshot = session.questions[0].snapshot as {
      sourceRegions?: unknown;
    };
    if (
      !Array.isArray(snapshot.sourceRegions) ||
      !snapshot.sourceRegions.length
    )
      return NextResponse.json(
        { error: "CBT question has no paper crop" },
        { status: 404 },
      );
    const image = await sourceQuestionImage(
      Buffer.from(asset.bytes),
      asset.checksum,
      snapshot.sourceRegions || [],
    );
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to render source question" },
      { status: 400 },
    );
  }
}
