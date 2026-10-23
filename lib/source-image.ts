import { resolveDocumentTool } from "./document-tools";
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { sourceRegionsInput, type SourceRegion } from "./source-regions";
const exec = promisify(execFile);
const cache = new Map<string, Buffer>();
const pending = new Map<string, Promise<Buffer>>();
let cacheBytes = 0;
export async function sourceQuestionImage(
  pdf: Buffer,
  checksum: string,
  input: unknown,
) {
  const regions = sourceRegionsInput.min(1).parse(input);
  const key = createHash("sha256")
    .update(checksum + JSON.stringify(regions))
    .digest("hex");
  const saved = cache.get(key);
  if (saved) {
    cache.delete(key);
    cache.set(key, saved);
    return saved;
  }
  if (pending.has(key)) return pending.get(key)!;
  if (pending.size >= 3)
    throw Error("Source images are busy. Please retry in a moment.");
  const job = render(pdf, regions)
    .then((image) => {
      while (cacheBytes + image.length > 24_000_000 && cache.size) {
        const oldest = cache.keys().next().value!;
        cacheBytes -= cache.get(oldest)!.length;
        cache.delete(oldest);
      }
      if (image.length <= 24_000_000) {
        cache.set(key, image);
        cacheBytes += image.length;
      }
      return image;
    })
    .finally(() => pending.delete(key));
  pending.set(key, job);
  return job;
}
async function render(pdf: Buffer, regions: SourceRegion[]) {
  const dir = await mkdtemp(join(tmpdir(), "mindmitra-source-"));
  try {
    const file = join(dir, "source.pdf");
    await writeFile(file, pdf, { mode: 0o600 });
    const pages = new Map<number, Buffer>();
    const images: { input: Buffer; width: number; height: number }[] = [];
    for (const r of regions) {
      if (!pages.has(r.page)) {
        const prefix = join(dir, `page-${r.page}`);
        await exec(
          resolveDocumentTool("pdftoppm"),
          [
            "-f",
            String(r.page),
            "-l",
            String(r.page),
            "-singlefile",
            "-scale-to",
            "2400",
            "-jpeg",
            file,
            prefix,
          ],
          { timeout: 30000, maxBuffer: 100000, windowsHide: true },
        );
        pages.set(r.page, await readFile(prefix + ".jpg"));
      }
      const original = await sharp(pages.get(r.page)!)
        .rotate(r.rotation, { background: "white" })
        .toBuffer();
      const meta = await sharp(original).metadata();
      const left = Math.min(meta.width! - 1, Math.floor(r.x * meta.width!)),
        top = Math.min(meta.height! - 1, Math.floor(r.y * meta.height!));
      const image = await sharp(original)
        .extract({
          left,
          top,
          width: Math.max(
            1,
            Math.min(meta.width! - left, Math.round(r.width * meta.width!)),
          ),
          height: Math.max(
            1,
            Math.min(meta.height! - top, Math.round(r.height * meta.height!)),
          ),
        })
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toBuffer();
      const size = await sharp(image).metadata();
      images.push({ input: image, width: size.width!, height: size.height! });
    }
    const width = Math.max(...images.map((i) => i.width)),
      height = images.reduce((sum, i) => sum + i.height + 12, 0);
    let top = 0;
    return await sharp({
      create: { width, height, channels: 3, background: "white" },
    })
      .composite(
        images.map((image) => {
          const item = { input: image.input, top, left: 0 };
          top += image.height + 12;
          return item;
        }),
      )
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw Error(
        "Source images need pdftoppm (Poppler) available on the server PATH.",
      );
    throw Error(
      "Unable to render this source crop. Check its page/crop settings and the original PDF.",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
