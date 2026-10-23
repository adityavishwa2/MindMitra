import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { validRequestOrigin, ORIGIN_ERROR } from "@/lib/request-origin";
import { limitedBody } from "@/lib/upload-body";
export async function POST(req: NextRequest) {
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
    const input = z
      .object({
        id: z.string().min(1),
        kind: z.enum(["paper", "contribution"]),
        action: z.enum(["HIDE", "DELETE"]),
      })
      .parse(JSON.parse((await limitedBody(req, 4096)).toString()));
    await db.$transaction(async (tx) => {
      const contribution =
        input.kind === "contribution"
          ? await tx.contribution.findUniqueOrThrow({ where: { id: input.id } })
          : await tx.contribution.findUnique({ where: { paperId: input.id } });
      const paperId = input.kind === "paper" ? input.id : contribution?.paperId;
      if (paperId) {
        await tx.$queryRaw`SELECT id FROM "Paper" WHERE id=${paperId} FOR UPDATE`;
        await tx.paper.findUniqueOrThrow({ where: { id: paperId } });
      }
      if (input.action === "DELETE") {
        if (paperId && (await tx.practiceSession.count({ where: { paperId } })))
          throw Error(
            "This paper has practice history. Use Hide from students to preserve learners’ attempts and results.",
          );
        if (contribution)
          await tx.contribution.delete({ where: { id: contribution.id } });
        if (paperId) await tx.paper.delete({ where: { id: paperId } });
      } else {
        if (!paperId)
          throw Error(
            "This upload is already private. Only published papers need hiding.",
          );
        await tx.paper.update({
          where: { id: paperId },
          data: { status: "HIDDEN" },
        });
        if (contribution)
          await tx.contribution.update({
            where: { id: contribution.id },
            data: {
              status: "REVOKED",
              conversionToken: null,
              conversionStatus: "CANCELLED",
              reviewNote: "Hidden from students by administrator",
              reviewerId: admin.id,
              reviewedAt: new Date(),
            },
          });
      }
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: `PAPER_${input.action}`,
          targetId: input.id,
          detail: { kind: input.kind, paperId },
        },
      });
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to manage paper",
      },
      { status: 409 },
    );
  }
}
