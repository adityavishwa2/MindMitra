import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mediaRange } from "@/lib/video-policy";
export const runtime = "nodejs";
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await ctx.params;
  const record = await db.videoSubmission.findFirst({
    where: {
      id,
      OR: [
        { userId: user.id },
        ...(user.role === "ADMIN" ? [{}] : []),
        { status: "APPROVED", video: { approved: true } },
      ],
    },
    select: { bytes: true, mimeType: true, fileName: true },
  });
  if (!record)
    return NextResponse.json({ error: "Video unavailable" }, { status: 404 });
  const size = record.bytes.length;
  const headers = {
    "Content-Type": record.mimeType,
    "Content-Disposition": `inline; filename="${record.fileName}"`,
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    const range = mediaRange(req.headers.get("range"), size);
    if (range)
      return new NextResponse(
        new Uint8Array(record.bytes.subarray(range.start, range.end + 1)),
        {
          status: 206,
          headers: {
            ...headers,
            "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
            "Content-Length": String(range.end - range.start + 1),
          },
        },
      );
    return new NextResponse(new Uint8Array(record.bytes), {
      headers: { ...headers, "Content-Length": String(size) },
    });
  } catch {
    return new NextResponse(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${size}` },
    });
  }
}
