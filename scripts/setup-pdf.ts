import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveDocumentTool, type DocumentTool } from "../lib/document-tools";
const exec = promisify(execFile);
async function main() {
  let failed = false;
  for (const tool of [
    "pdfinfo",
    "pdftotext",
    "pdftoppm",
    "tesseract",
  ] as DocumentTool[]) {
    const executable = resolveDocumentTool(tool);
    try {
      await exec(executable, [tool === "tesseract" ? "--version" : "-v"], {
        timeout: 10000,
        windowsHide: true,
      });
      console.log(`OK: ${tool} — ${executable}`);
    } catch {
      failed = true;
      console.error(
        `MISSING: ${tool}. Set ${tool.toUpperCase()}_PATH in .env to the full executable path.`,
      );
    }
  }
  if (failed) {
    console.error(
      "Windows: install Tesseract OCR and Poppler. Tesseract at C:\\Program Files\\Tesseract-OCR\\tesseract.exe is detected automatically. See docs/pdf-conversion.md.",
    );
    process.exitCode = 1;
  } else
    console.log(
      "PDF tools ready. Restart MindMitra, then open the failed paper and choose Retry conversion.",
    );
}
main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "PDF tool check failed",
  );
  process.exitCode = 1;
});
