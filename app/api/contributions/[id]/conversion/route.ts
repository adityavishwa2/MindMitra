import { validRequestOrigin, ORIGIN_ERROR } from "@/lib/request-origin";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await ctx.params;
  const c = await db.contribution.findFirst({
    where: { id, ...(user.role === "ADMIN" ? {} : { userId: user.id }) },
    select: {
      conversionStatus: true,
      conversionError: true,
      conversionResult: true,
      payload: true,
    },
  });
  if (!c)
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  return NextResponse.json(c, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
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
  const { id } = await ctx.params;
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.contribution.updateMany({
      where: {
        id,
        pdf: { not: null },
        OR: [
          {
            status: "PENDING",
            conversionStatus: {
              in: ["FAILED", "NEEDS_REVIEW", "READY", "CANCELLED"],
            },
          },
          {
            status: "REJECTED",
            conversionStatus: {
              in: ["FAILED", "NEEDS_REVIEW", "READY", "CANCELLED"],
            },
          },
        ],
      },
      data: {
        status: "PENDING",
        conversionStatus: "QUEUED",
        conversionAttempts: 0,
        conversionError: null,
        conversionToken: null,
        payload: Prisma.DbNull,
      },
    });
    if (updated.count)
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "CONTRIBUTION_REOPEN_CONVERSION",
          targetId: id,
          detail: { queued: true },
        },
      });
    return updated;
  });
  if (!result.count)
    return NextResponse.json(
      {
        error: "Only pending or rejected PDF conversions can be reopened",
      },
      { status: 409 },
    );
  return NextResponse.json({ queued: true });
}
