import { validRequestOrigin, ORIGIN_ERROR } from "@/lib/request-origin";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { videoReview } from "@/lib/video-policy";
import { limitedBody } from "@/lib/upload-body";
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!validRequestOrigin(req))
    return NextResponse.json({ error: ORIGIN_ERROR }, { status: 403 });
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  try {
    const input = videoReview.parse(
      JSON.parse((await limitedBody(req, 10_000)).toString()),
    );
    const { id } = await ctx.params;
    await db.$transaction(
      async (tx) => {
        const c = await tx.videoSubmission.findUniqueOrThrow({
          where: { id },
          select: {
            id: true,
            userId: true,
            status: true,
            videoId: true,
            title: true,
            creator: true,
            user: { select: { role: true } },
            category: true,
          },
        });
        if (input.decision === "REVOKE") {
          if (c.status !== "APPROVED" || !c.videoId)
            throw Error("Only an approved video can be revoked");
          await tx.video.update({
            where: { id: c.videoId },
            data: { approved: false },
          });
        } else if (c.status !== "PENDING")
          throw Error("This video has already been reviewed");
        let videoId = c.videoId;
        if (input.decision === "APPROVE") {
          const data = {
            title: c.title,
            creator:
              c.user.role === "ADMIN" ? "MindMitra Educators" : c.creator,
            category: c.category,
            approved: true,
          };
          videoId = c.videoId
            ? (await tx.video.update({ where: { id: c.videoId }, data })).id
            : (await tx.video.create({ data })).id;
        }
        await tx.videoSubmission.update({
          where: { id },
          data: {
            status:
              input.decision === "APPROVE"
                ? "APPROVED"
                : input.decision === "REVOKE"
                  ? "REVOKED"
                  : "REJECTED",
            videoId,
            reviewNote: input.note,
            reviewerId: user.id,
            reviewedAt: new Date(),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: `VIDEO_${input.decision}`,
            targetId: id,
            detail: input,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json({ saved: true });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? e.issues.map((i) => i.message).join("; ")
            : e instanceof Prisma.PrismaClientKnownRequestError
              ? "Video changed or was reviewed concurrently. Refresh and try again."
              : e instanceof Error
                ? e.message
                : "Review failed",
      },
      { status: e instanceof Prisma.PrismaClientKnownRequestError ? 409 : 400 },
    );
  }
}
