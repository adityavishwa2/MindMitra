import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { importInput } from "@/lib/validation";
import { assertPaperMatches } from "@/lib/contributions";
import { limitedBody } from "@/lib/upload-body";
import { validRequestOrigin, ORIGIN_ERROR } from "@/lib/request-origin";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!validRequestOrigin(req))
    return NextResponse.json({ error: ORIGIN_ERROR }, { status: 403 });
  const admin = await currentUser();
  if (!admin)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (admin.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  try {
    const paper = importInput.parse(
      JSON.parse((await limitedBody(req, 2_000_000)).toString("utf8")),
    );
    const { id } = await ctx.params;
    const c = await db.contribution.findUnique({
      where: { id },
      select: {
        userId: true,
        adminUpload: true,
        status: true,
        examId: true,
        year: true,
        stage: true,
        shift: true,
        checksum: true,
        sourceUrl: true,
        fileName: true,
      },
    });
    if (!c)
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    if (c.userId === admin.id && !c.adminUpload)
      return NextResponse.json(
        { error: "You cannot review your own contribution" },
        { status: 403 },
      );
    assertPaperMatches(c, paper);
    if (
      paper.questions.some((q) => q.sourceRegions.length) &&
      !c.fileName.toLowerCase().endsWith(".pdf")
    )
      throw Error("Source-image questions need an original PDF submission");
    if (
      c.fileName.toLowerCase().endsWith(".pdf") &&
      paper.source.checksum !== c.checksum
    )
      throw Error("Source checksum must match the uploaded PDF");
    const saved = await db.contribution.updateMany({
      where: { id, status: "PENDING" },
      data: {
        payload: paper,
        ...(/^urn:sha256:/.test(c.sourceUrl)
          ? {
              examId: paper.examId,
              year: paper.year,
              stage: paper.stage,
              shift: paper.shift,
              title: paper.title,
            }
          : {}),
      },
    });
    if (!saved.count)
      return NextResponse.json(
        {
          error: "This submission has already been reviewed. Refresh the page.",
        },
        { status: 409 },
      );
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            : error instanceof Prisma.PrismaClientKnownRequestError
              ? "Unable to save draft"
              : error instanceof Error
                ? error.message
                : "Unable to save draft",
      },
      { status: 400 },
    );
  }
}
