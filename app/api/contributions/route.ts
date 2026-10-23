import { inferPdfDetails, UPLOADED_PYQ_SLUG } from "@/lib/pdf-upload";
import { paperFileLimit } from "@/lib/upload-limits";
import { validRequestOrigin, ORIGIN_ERROR } from "@/lib/request-origin";
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
  if (!validRequestOrigin(req))
    return NextResponse.json({ error: ORIGIN_ERROR }, { status: 403 });
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let uploadedChecksum = "";
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
          { error: "Upload exceeds 20 MB" },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": req.headers.get("content-type") ?? "" },
    }).formData();
    const adminUpload = form.get("adminUpload") === "yes";
    if (adminUpload && user.role !== "ADMIN")
      return NextResponse.json(
        { error: "Administrator access required" },
        { status: 403 },
      );
    const pdfOnly = form.get("pdfOnly") === "yes";
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0)
      throw Error("Choose a PDF up to 20 MB or JSON up to 2 MB");
    if (file.size > paperFileLimit(file.name))
      return NextResponse.json(
        { error: "Choose a PDF up to 20 MB or JSON up to 2 MB" },
        { status: 413 },
      );
    const bytes = Buffer.from(await file.arrayBuffer());
    const pdf = file.name.toLowerCase().endsWith(".pdf");
    if (adminUpload && !pdf)
      throw Error("Choose a PDF for the admin PDF inbox");
    if (pdf && bytes.subarray(0, 5).toString() !== "%PDF-")
      throw Error("File is not a PDF");
    if (!pdf && !file.name.toLowerCase().endsWith(".json"))
      throw Error("Only PDF and JSON files are supported");
    if (pdfOnly && !pdf) throw Error("Choose a PDF up to 20 MB");
    const payload = pdf
      ? null
      : importInput.parse(JSON.parse(bytes.toString("utf8")));

    const checksum = createHash("sha256").update(bytes).digest("hex");
    uploadedChecksum = checksum;
    const supplied = pdfOnly
      ? null
      : contributionInput.parse(Object.fromEntries(form.entries()));
    if (payload && supplied) assertPaperMatches(supplied, payload);
    const c = await db.$transaction(async (tx) => {
      // Serialize quota checks per uploader, including simultaneous requests.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      const existing = await tx.contribution.findUnique({
        where: { checksum },
        select: {
          id: true,
          userId: true,
          status: true,
          conversionStatus: true,
          paperId: true,
        },
      });
      if (existing) {
        if (user.role !== "ADMIN" && existing.userId !== user.id)
          return { received: true, status: "RECEIVED" };
        if (
          !existing.paperId &&
          ["REJECTED", "PENDING"].includes(existing.status)
        ) {
          const retry = pdf && existing.conversionStatus === "FAILED";
          await tx.contribution.update({
            where: { id: existing.id },
            data: {
              status: "PENDING",
              ...(adminUpload && existing.userId === user.id
                ? { adminUpload: true }
                : {}),
              ...(retry
                ? {
                    conversionStatus: "QUEUED",
                    conversionAttempts: 0,
                    conversionError: null,
                    conversionToken: null,
                  }
                : {}),
            },
          });
        }
        return { id: existing.id, status: existing.status, existing: true };
      }
      let d;
      if (pdfOnly) {
        const authority = await tx.authority.upsert({
          where: { name: "Uploaded question papers" },
          create: { name: "Uploaded question papers" },
          update: {},
        });
        const fallback = await tx.exam.upsert({
          where: { slug: UPLOADED_PYQ_SLUG },
          create: {
            name: "Uploaded PYQ",
            slug: UPLOADED_PYQ_SLUG,
            category: "Uploaded PYQ",
            subjects: ["General"],
            authorityId: authority.id,
          },
          update: {},
        });
        const exams = await tx.exam.findMany({
          select: { id: true, name: true, slug: true },
        });
        const inferred = inferPdfDetails(
          file.name,
          exams,
          fallback.id,
          file.name,
          checksum,
        );
        const { notes, checksum: unused, ...metadata } = inferred;
        void notes;
        void unused;
        d = { ...metadata, publicAlias: "", rightsConfirmed: "yes" };
      } else d = supplied!;
      const { publicAlias, rightsConfirmed, ...metadata } = d;
      void rightsConfirmed;
      void publicAlias;
      const recent = await tx.contribution.count({
        where: {
          userId: user.id,
          createdAt: { gte: new Date(Date.now() - 86400000) },
        },
      });
      const pending = await tx.contribution.count({
        where: { userId: user.id, status: "PENDING" },
      });
      if (user.role !== "ADMIN" && (recent >= 5 || pending >= 10))
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
      // Aliases belong to profile settings; uploading never reserves or changes an alias.
      return tx.contribution.create({
        data: {
          ...metadata,
          adminUpload,
          conversionStatus: pdf ? "QUEUED" : "NOT_REQUIRED",
          userId: user.id,
          checksum,
          fileName: file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120),
          pdf: pdf ? bytes : undefined,
          payload: payload ?? Prisma.DbNull,
        },
        select: { id: true, status: true },
      });
    });
    return NextResponse.json(c, {
      status: "existing" in c || "received" in c ? 200 : 201,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002" && uploadedChecksum) {
        const existing = await db.contribution.findUnique({
          where: { checksum: uploadedChecksum },
          select: { id: true, userId: true, status: true },
        });
        if (existing)
          return NextResponse.json(
            user.role === "ADMIN" || existing.userId === user.id
              ? { id: existing.id, status: existing.status, existing: true }
              : { received: true, status: "RECEIVED" },
          );
      }
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
