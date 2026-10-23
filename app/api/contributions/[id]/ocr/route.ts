import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { validRequestOrigin, ORIGIN_ERROR } from "@/lib/request-origin";
import { limitedBody } from "@/lib/upload-body";
import { sourceRegionsInput } from "@/lib/source-regions";
import { questionOcr } from "@/lib/question-ocr";
import { z } from "zod";
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!validRequestOrigin(req))
    return NextResponse.json({ error: ORIGIN_ERROR }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  try {
    const data = z
      .object({
        number: z.number().int().positive(),
        regions: sourceRegionsInput.min(1),
      })
      .parse(JSON.parse((await limitedBody(req, 5000)).toString()));
    const c = await db.contribution.findUnique({
      where: { id: (await ctx.params).id },
      select: {
        pdf: true,
        checksum: true,
        status: true,
        userId: true,
        adminUpload: true,
      },
    });
    if (
      !c?.pdf ||
      c.status !== "PENDING" ||
      (c.userId === user.id && !c.adminUpload)
    )
      return NextResponse.json(
        { error: "PDF unavailable for editing" },
        { status: 404 },
      );
    return NextResponse.json(
      await questionOcr(
        Buffer.from(c.pdf),
        c.checksum,
        data.regions,
        data.number,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Text extraction failed" },
      { status: 400 },
    );
  }
}
