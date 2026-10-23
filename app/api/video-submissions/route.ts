import { validRequestOrigin, ORIGIN_ERROR } from "@/lib/request-origin";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  MAX_VIDEO_BYTES,
  MAX_DAILY_VIDEOS,
  videoMetadata,
} from "@/lib/video-policy";
import { inspectVideo } from "@/lib/video-inspection";
import { MissingMediaToolsError } from "@/lib/media-tools";
import { limitedBody } from "@/lib/upload-body";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  if (!validRequestOrigin(req))
    return NextResponse.json({ error: ORIGIN_ERROR }, { status: 403 });
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const form = await new Response(
      await limitedBody(req, MAX_VIDEO_BYTES + 30_000),
      { headers: { "Content-Type": req.headers.get("content-type") ?? "" } },
    ).formData();
    const data = videoMetadata.parse(Object.fromEntries(form.entries()));
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_VIDEO_BYTES)
      throw Error("Choose an MP4 or WebM video up to 25 MB");
    // Check quotas before spending time on native inspection; repeat under lock below.
    const recent = await db.videoSubmission.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 86400000) },
      },
    });
    if (recent >= MAX_DAILY_VIDEOS)
      throw Error("Video upload limit reached: 20 per day");
    const bytes = Buffer.from(await file.arrayBuffer());
    const inspected = await inspectVideo(bytes);
    const { rightsConfirmed, policyConfirmed, ...metadata } = data;
    void rightsConfirmed;
    void policyConfirmed;
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
      const count = await tx.videoSubmission.count({
        where: {
          userId: user.id,
          createdAt: { gte: new Date(Date.now() - 86400000) },
        },
      });
      if (count >= MAX_DAILY_VIDEOS)
        throw Error("Video upload limit reached: 20 per user per day");
      return tx.videoSubmission.create({
        data: {
          ...metadata,
          ...(user.role === "ADMIN" ? { creator: "MindMitra Educators" } : {}),
          ...inspected,
          userId: user.id,
          bytes: new Uint8Array(inspected.bytes),
          checksum: createHash("sha256").update(bytes).digest("hex"),
          fileName:
            inspected.mimeType === "video/mp4" ? "lesson.mp4" : "lesson.webm",
        },
        select: { id: true, status: true },
      });
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof MissingMediaToolsError)
      return NextResponse.json(
        { error: e.message, code: "MEDIA_TOOLS_MISSING" },
        { status: 503 },
      );
    if (e instanceof Prisma.PrismaClientKnownRequestError)
      return NextResponse.json(
        {
          error:
            e.code === "P2002"
              ? "This video has already been submitted"
              : "Unable to store video",
        },
        { status: e.code === "P2002" ? 409 : 400 },
      );
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? e.issues.map((i) => i.message).join("; ")
            : e instanceof Error
              ? e.message
              : "Video upload failed",
      },
      { status: 400 },
    );
  }
}
