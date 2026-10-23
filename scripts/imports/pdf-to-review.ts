import "dotenv/config";
import { resolveDocumentTool } from "../../lib/document-tools";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const [input, output, ...flags] = process.argv.slice(2);
if (!input || !output || !flags.includes("--authorized"))
  throw new Error(
    "Usage: npm run import:pdf -- authorized-paper.pdf review.json --authorized. Confirm your right to process this document first.",
  );
async function main() {
  const bytes = await readFile(input);
  if (bytes.length > 20_000_000 || bytes.subarray(0, 5).toString() !== "%PDF-")
    throw new Error("Expected a PDF under 20 MB");
  const { stdout } = await promisify(execFile)(
    resolveDocumentTool("pdftotext"),
    ["-layout", input, "-"],
    { maxBuffer: 10_000_000, timeout: 30000 },
  );
  const pages = stdout.split("\f");
  await writeFile(
    output,
    JSON.stringify(
      {
        status: "EXTRACTION_ONLY_NOT_IMPORTABLE",
        sourceChecksum: createHash("sha256").update(bytes).digest("hex"),
        pages: pages.map((text, i) => ({ page: i + 1, text })),
        reviewRequired: [
          "Check every symbol, number, option order, diagram, and instruction against original pages.",
          "Scanned documents require separate OCR and manual review.",
          "Create the documented structured import payload and provide permission evidence. No questions are automatically verified.",
        ],
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(
    `Extracted ${pages.length} page segments into a review file. Nothing published.`,
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
