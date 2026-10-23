import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sourceQuestionImage } from "@/lib/source-image";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await ctx.params;
  const c = await db.contribution.findFirst({
    where: { id, ...(user.role === "ADMIN" ? {} : { userId: user.id }) },
    select: { pdf: true, checksum: true },
  });
  if (!c?.pdf)
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  try {
    const raw = req.nextUrl.searchParams.get("regions") || "[]";
    if (raw.length > 3000) throw Error("Invalid crop");
    const image = await sourceQuestionImage(
      Buffer.from(c.pdf),
      c.checksum,
      JSON.parse(raw),
    );
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to render question crop. Check Poppler and the crop settings.",
      },
      { status: 400 },
    );
  }
}
