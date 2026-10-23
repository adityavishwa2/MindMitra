import type { NextRequest } from "next/server";
export async function limitedBody(req: NextRequest, limit: number) {
  const reader = req.body?.getReader();
  if (!reader) throw Error("Request body required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw Error("Request exceeds the upload size limit");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
