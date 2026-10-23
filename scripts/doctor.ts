import { resolveDocumentTool, type DocumentTool } from "../lib/document-tools";
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveMediaTool } from "../lib/media-tools";
import { Pool } from "pg";
const exec = promisify(execFile);
let failed = false;
function report(label: string, ok: boolean, advice = "") {
  console.log(
    `${ok ? "OK" : "ACTION NEEDED"}: ${label}${!ok && advice ? ` — ${advice}` : ""}`,
  );
  if (!ok) failed = true;
}
async function main() {
  report(
    "Node.js 22 or later",
    Number(process.versions.node.split(".")[0]) >= 22,
  );
  for (const binary of [
    "pdfinfo",
    "pdftotext",
    "pdftoppm",
    "tesseract",
    "ffprobe",
    "ffmpeg",
  ]) {
    try {
      await exec(
        binary === "ffmpeg" || binary === "ffprobe"
          ? resolveMediaTool(binary)
          : resolveDocumentTool(binary as DocumentTool),
        [
          binary === "tesseract"
            ? "--version"
            : ["ffprobe", "ffmpeg"].includes(binary)
              ? "-version"
              : "-v",
        ],
        {
          timeout: 10_000,
        },
      );
      report(binary, true);
    } catch {
      report(
        binary,
        false,
        "Install Poppler, Tesseract and FFmpeg; see docs/pdf-conversion.md and docs/videos.md",
      );
    }
  }
  try {
    const { stdout } = await exec(
      resolveDocumentTool("tesseract"),
      ["--list-langs"],
      {
        timeout: 10_000,
      },
    );
    const available = stdout.split(/\r?\n/).map((v) => v.trim());
    const languages = (process.env.PDF_OCR_LANGUAGES || "eng").split("+");
    report(
      "Configured OCR languages",
      languages.every((v) => available.includes(v)),
      "Install the configured language packs; Hindi requires hin",
    );
  } catch {
    report("OCR language packs", false);
  }
  for (const name of [
    "DATABASE_URL",
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ])
    report(
      name + " configured",
      !!process.env[name]?.trim(),
      "Set it in .env or your host's secret settings",
    );
  if (process.env.NEXTAUTH_URL) {
    try {
      const origin = new URL(process.env.NEXTAUTH_URL);
      report(
        "Auth origin",
        ["https:", "http:"].includes(origin.protocol) &&
          origin.pathname === "/",
        "Use the app origin without a path",
      );
      console.log(
        `Google redirect URI: ${origin.origin}/api/auth/callback/google`,
      );
    } catch {
      report("Auth origin", false, "NEXTAUTH_URL must be an absolute URL");
    }
  }
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    });
    try {
      await pool.query(
        'SELECT "conversionStatus", "conversionResult" FROM "Contribution" LIMIT 0',
      );
      await pool.query('SELECT "sourceRegions" FROM "Question" LIMIT 0');
      await pool.query('SELECT "sourceId" FROM "SourcePdf" LIMIT 0');
      await pool.query('SELECT "videoId" FROM "VideoLike" LIMIT 0');
      await pool.query('SELECT "correctAnswers" FROM "AnswerKey" LIMIT 0');
      await pool.query(
        'SELECT "correctAnswers" FROM "SessionQuestion" LIMIT 0',
      );
      await pool.query('SELECT "selectedOptions" FROM "StudentAnswer" LIMIT 0');
      report("Database, PDF queue and MSQ migrations", true);
    } catch {
      report(
        "Database, PDF queue and MSQ migrations",
        false,
        "Check DATABASE_URL, then run npm run db:migrate",
      );
    } finally {
      await pool.end();
    }
  }
  console.log(
    "This checks local configuration; complete a real Google sign-in and verify hosting separately.",
  );
  if (failed) process.exitCode = 1;
}
main().catch(() => {
  console.error("Readiness check failed");
  process.exitCode = 1;
});
