import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { importInput } from "@/lib/validation";
import {
  contributionInput,
  MAX_CONTRIBUTION_BYTES,
  assertPaperMatches,
} from "@/lib/contributions";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (
    req.headers.get("origin") !==
    new URL(process.env.NEXTAUTH_URL ?? req.url).origin
  )
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    // Enforce the actual stream size even when Content-Length is absent or dishonest.
    const reader = req.body?.getReader();
    if (!reader) throw Error("Choose a file");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_CONTRIBUTION_BYTES + 30_000) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Upload exceeds 2 MB" },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": req.headers.get("content-type") ?? "" },
    }).formData();
    const d = contributionInput.parse(Object.fromEntries(form.entries()));
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > MAX_CONTRIBUTION_BYTES
    )
      throw Error("Choose a PDF or JSON file up to 2 MB");
    const bytes = Buffer.from(await file.arrayBuffer());
    const pdf = file.name.toLowerCase().endsWith(".pdf");
    if (pdf && bytes.subarray(0, 5).toString() !== "%PDF-")
      throw Error("File is not a PDF");
    if (!pdf && !file.name.toLowerCase().endsWith(".json"))
      throw Error("Only PDF and JSON files are supported");
    const payload = pdf
      ? null
      : importInput.parse(JSON.parse(bytes.toString("utf8")));
    if (payload) assertPaperMatches(d, payload);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const { publicAlias, rightsConfirmed, ...metadata } = d;
    void rightsConfirmed;
    const c = await db.$transaction(async (tx) => {
      // Serialize quota checks per uploader, including simultaneous requests.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      const recent = await tx.contribution.count({
        where: {
          userId: user.id,
          createdAt: { gte: new Date(Date.now() - 86400000) },
        },
      });
      const pending = await tx.contribution.count({
        where: { userId: user.id, status: "PENDING" },
      });
      if (recent >= 5 || pending >= 10)
        throw Error("Upload limit reached: 5 per day and 10 awaiting review");
      if (
        await tx.paper.findUnique({
          where: {
            examId_year_stage_shift: {
              examId: d.examId,
              year: d.year,
              stage: d.stage,
              shift: d.shift,
            },
          },
        })
      )
        throw Error("This exam paper is already registered");
      await tx.user.update({
        where: { id: user.id },
        data: { contributorAlias: publicAlias || null },
      });
      return tx.contribution.create({
        data: {
          ...metadata,
          userId: user.id,
          checksum,
          fileName: file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120),
          pdf: pdf ? bytes : undefined,
          payload: payload ?? Prisma.DbNull,
        },
        select: { id: true, status: true },
      });
    });
    return NextResponse.json(c, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002")
        return NextResponse.json(
          { error: "This file or public alias is already registered" },
          { status: 409 },
        );
      if (e.code === "P2003")
        return NextResponse.json(
          { error: "Choose an existing examination" },
          { status: 400 },
        );
    }
    const error =
      e instanceof z.ZodError
        ? e.issues.map((i) => i.message).join("; ")
        : e instanceof Error &&
            !(e instanceof Prisma.PrismaClientKnownRequestError)
          ? e.message
          : "Unable to submit paper";
    return NextResponse.json({ error }, { status: 400 });
  }
}
