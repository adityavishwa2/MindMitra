import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, ctx: Context) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await ctx.params;
  const c = await db.contribution.findFirst({
    where: { id, ...(user.role === "ADMIN" ? {} : { userId: user.id }) },
  });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const content = c.pdf
    ? new Uint8Array(c.pdf)
    : JSON.stringify(c.payload, null, 2);
  return new NextResponse(content, {
    headers: {
      "Content-Type": c.pdf ? "application/pdf" : "application/json",
      "Content-Disposition": `${req.nextUrl.searchParams.get("preview") === "1" && user.role === "ADMIN" ? "inline" : "attachment"}; filename="${c.pdf ? "paper.pdf" : "paper.json"}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}
