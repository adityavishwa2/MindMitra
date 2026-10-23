import { resolveDocumentTool } from "./document-tools";
import sharp from "sharp";
import { tsvLines } from "./pdf-layout";
import { sourceQuestionImage } from "./source-image";
import { parseQuestionOcr } from "./cbt";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const exec = promisify(execFile);
export async function questionOcr(
  pdf: Buffer,
  checksum: string,
  regions: unknown,
  number: number,
) {
  const dir = await mkdtemp(join(tmpdir(), "mindmitra-cbt-"));
  try {
    const file = join(dir, "question.jpg");
    await writeFile(file, await sourceQuestionImage(pdf, checksum, regions), {
      mode: 0o600,
    });
    let originalText = "";
    for (const mode of ["6", "3"]) {
      const { stdout } = await exec(
        resolveDocumentTool("tesseract"),
        [file, "stdout", "--psm", mode, "-l", "eng"],
        { timeout: 30000, maxBuffer: 100000, windowsHide: true },
      );
      if (!originalText) originalText = stdout;
      const parsed = parseQuestionOcr(stdout, number);
      if (parsed) return parsed;
    }
    // Handwritten circles can cause OCR to omit an entire option row. Read the
    // option text again with the label gutter removed, using OCR coordinates.
    const tsv = (
      await exec(
        resolveDocumentTool("tesseract"),
        [file, "stdout", "--psm", "6", "-l", "eng", "tsv"],
        { timeout: 30000, maxBuffer: 500000, windowsHide: true },
      )
    ).stdout;
    const rows = tsvLines(tsv);
    const instruction = rows
      .filter((l) => /code given below|answer using.*below/i.test(l.text))
      .at(-1);
    if (instruction) {
      const top = Math.ceil(instruction.top + instruction.height + 3);
      const words = tsv
        .split("\n")
        .slice(1)
        .map((line) => line.split("\t"))
        .filter((f) => f[0] === "5" && Number(f[7]) >= top && f[11]?.trim());
      const groups = new Map<string, string[][]>();
      for (const w of words) {
        const key = w.slice(1, 5).join(":");
        groups.set(key, [...(groups.get(key) || []), w]);
      }
      const starts = [...groups.values()]
        .map((w) =>
          Number((w[0][11].length <= 5 && w.length > 1 ? w[1] : w[0])[6]),
        )
        .sort((a, b) => a - b);
      const size = await sharp(file).metadata();
      const left = Math.max(
        0,
        Math.round(starts[Math.floor(starts.length / 2)] - 8),
      );
      if (
        starts.length >= 2 &&
        left < size.width! * 0.55 &&
        top < size.height!
      ) {
        const optionFile = join(dir, "options.jpg");
        await sharp(file)
          .extract({
            left,
            top,
            width: size.width! - left,
            height: size.height! - top,
          })
          .toFile(optionFile);
        const optionText = (
          await exec(
            resolveDocumentTool("tesseract"),
            [optionFile, "stdout", "--psm", "6", "-l", "eng"],
            { timeout: 30000, maxBuffer: 100000, windowsHide: true },
          )
        ).stdout;
        const options = optionText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const lines = originalText.split("\n");
        const at = lines.findLastIndex((s) =>
          /code given below|answer using.*below/i.test(s),
        );
        if (options.length === 4 && at >= 0)
          return {
            text: lines
              .slice(0, at + 1)
              .join("\n")
              .trim(),
            options,
          };
      }
    }
    throw Error(
      "Could not reliably separate question and options. Edit the CBT text against the original PDF.",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
