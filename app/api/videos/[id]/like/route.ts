import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { validRequestOrigin, ORIGIN_ERROR } from "@/lib/request-origin";
import { limitedBody } from "@/lib/upload-body";
import { z } from "zod";
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!validRequestOrigin(req))
    return NextResponse.json({ error: ORIGIN_ERROR }, { status: 403 });
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const { liked } = z
      .object({ liked: z.boolean() })
      .parse(JSON.parse((await limitedBody(req, 1000)).toString()));
    const id = (await ctx.params).id;
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Video" WHERE id=${id} FOR UPDATE`;
      if (
        !(await tx.video.findFirst({
          where: { id, approved: true },
          select: { id: true },
        }))
      )
        throw Error("Video unavailable");
      if (liked)
        await tx.videoLike.upsert({
          where: { userId_videoId: { userId: user.id, videoId: id } },
          create: { userId: user.id, videoId: id },
          update: {},
        });
      else
        await tx.videoLike.deleteMany({
          where: { userId: user.id, videoId: id },
        });
      return {
        liked,
        count: await tx.videoLike.count({ where: { videoId: id } }),
      };
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unable to save like" },
      { status: 400 },
    );
  }
}
