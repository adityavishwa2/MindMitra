import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { importInput } from "@/lib/validation";
import { importPaper } from "@/lib/paper-import";
import {
  reviewContributionInput,
  assertPaperMatches,
} from "@/lib/contributions";
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (
    req.headers.get("origin") !==
    new URL(process.env.NEXTAUTH_URL ?? req.url).origin
  )
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  const admin = await currentUser();
  if (!admin)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (admin.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  try {
    const reader = req.body?.getReader();
    if (!reader) throw Error("Review required");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2_100_000) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Review exceeds 2 MB" },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const d = reviewContributionInput.parse(
      JSON.parse(Buffer.concat(chunks).toString()),
    );
    const { id } = await ctx.params;
    await db.$transaction(
      async (tx) => {
        const c = await tx.contribution.findUniqueOrThrow({ where: { id } });
        if (c.userId === admin.id)
          throw Error(
            "You cannot review your own contribution; use the admin import workflow for your papers",
          );
        if (d.decision === "REVOKE") {
          if (c.status !== "APPROVED" || !c.paperId)
            throw Error("Only approved contributions can be revoked");
          await tx.paper.update({
            where: { id: c.paperId },
            data: { status: "AWAITING_VERIFICATION" },
          });
          await tx.question.updateMany({
            where: { paperId: c.paperId },
            data: { verified: false },
          });
        } else if (c.status !== "PENDING")
          throw Error("This submission has already been reviewed");
        let paperId = c.paperId;
        if (d.decision === "APPROVE") {
          const paper = importInput.parse(d.payload ?? c.payload);
          assertPaperMatches(c, paper);
          if (paper.source.permission !== "AUTHORIZED")
            throw Error("Confirm reuse permission before publication");
          if (c.pdf && paper.source.checksum !== c.checksum)
            throw Error("Source checksum must match the uploaded PDF");
          const p = await importPaper(tx, paper);
          paperId = p.id;
          // Existing sources are reused without overwriting their permission decision.
          const source = await tx.sourceDocument.findUniqueOrThrow({
            where: { id: p.sourceId },
          });
          if (source.permission !== "AUTHORIZED")
            throw Error(
              "The existing source is not authorized; review it in the verification queue first",
            );
          await tx.question.updateMany({
            where: { paperId: p.id },
            data: { verified: true },
          });
          await tx.paper.update({
            where: { id: p.id },
            data: { status: "PUBLISHED" },
          });
          await tx.verificationReview.create({
            data: {
              paperId: p.id,
              reviewerId: admin.id,
              decision: "APPROVE",
              note: d.note,
            },
          });
        }
        await tx.contribution.update({
          where: { id },
          data: {
            status:
              d.decision === "APPROVE"
                ? "APPROVED"
                : d.decision === "REVOKE"
                  ? "REVOKED"
                  : "REJECTED",
            paperId,
            reviewNote: d.note,
            reviewerId: admin.id,
            reviewedAt: new Date(),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: `CONTRIBUTION_${d.decision}`,
            targetId: id,
            detail: { note: d.note, paperId },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
    return NextResponse.json({ saved: true });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2034"].includes(e.code)
    )
      return NextResponse.json(
        {
          error:
            "Paper already exists or was reviewed concurrently. Refresh the queue.",
        },
        { status: 409 },
      );
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? e.issues.map((i) => i.message).join("; ")
            : e instanceof Prisma.PrismaClientKnownRequestError
              ? "Unable to review this record"
              : e instanceof Error
                ? e.message
                : "Unable to save review",
      },
      { status: 400 },
    );
  }
}
