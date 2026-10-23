import { resolveDocumentTool } from "./document-tools";
import { reviewedScanPages } from "./scan-profiles";
import { readScanColumns } from "./pdf-scan";
import { questionsFromColumns, type ScanColumn } from "./pdf-layout";
import type { SourceRegion } from "./source-regions";
import { MAX_PDF_BYTES } from "./upload-limits";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importInput } from "./validation";

const exec = promisify(execFile);
const MAX_PAGES = 80;
const MAX_TEXT = 2_000_000;
export type ExtractedPage = {
  page: number;
  text: string;
  method: "TEXT" | "OCR" | "SCAN";
  cards?: import("./pdf-layout").ScanQuestion[];
  rules?: { marks: number; penalty: number; durationMinutes: number };
  columns?: ScanColumn[];
};
export type PaperMetadata = {
  examId: string;
  year: number;
  stage: string;
  shift: string;
  title: string;
  sourceUrl: string;
  permissionEvidence: string;
  checksum: string;
};

async function run(command: string, args: string[], timeout = 30_000) {
  try {
    const { stdout } = await exec(
      resolveDocumentTool(command as import("./document-tools").DocumentTool),
      args,
      {
        timeout,
        maxBuffer: MAX_TEXT,
        windowsHide: true,
      },
    );
    return stdout;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw Error(
        `PDF conversion needs ${command} installed on the server. Run npm.cmd run setup:pdf in the project folder, restart the server, then retry conversion.`,
      );
    throw Error(
      `${command} could not process this PDF within its limits. Check that it is valid, unlocked and readable.`,
    );
  }
}

export async function extractPdf(bytes: Buffer): Promise<ExtractedPage[]> {
  if (
    !bytes.length ||
    bytes.length > MAX_PDF_BYTES ||
    bytes.subarray(0, 5).toString() !== "%PDF-"
  )
    throw Error("Expected a PDF up to 20 MB");
  const reviewed = reviewedScanPages(bytes);
  if (reviewed) return reviewed;
  const dir = await mkdtemp(join(tmpdir(), "mindmitra-pdf-"));
  const file = join(dir, "source.pdf");
  const deadline = Date.now() + 8 * 60_000;
  try {
    await writeFile(file, bytes, { mode: 0o600 });
    const info = await run("pdfinfo", [file]);
    const count = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
    if (!Number.isInteger(count) || count < 1 || count > MAX_PAGES)
      throw Error(
        `PDFs must contain between 1 and ${MAX_PAGES} pages. Split larger documents before upload.`,
      );
    const text = await run("pdftotext", ["-layout", file, "-"]);
    const segments = text.split("\f");
    const pages: ExtractedPage[] = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      if (Date.now() > deadline)
        throw Error(
          "PDF processing exceeded 8 minutes. Split the document into smaller files.",
        );
      let pageText = segments[i]?.trim() ?? "";
      let method: ExtractedPage["method"] = "TEXT";
      let columns: ScanColumn[] | undefined;
      // Image-only or almost empty pages need OCR; mixed PDFs are handled page by page.
      if (pageText.replace(/\s/g, "").length < 40) {
        const prefix = join(dir, "page");
        await run("pdftoppm", [
          "-f",
          String(i + 1),
          "-l",
          String(i + 1),
          "-singlefile",
          "-scale-to",
          "3000",
          "-png",
          file,
          prefix,
        ]);
        const readOcr = (image: string, mode: string) =>
          run("tesseract", [
            image,
            "stdout",
            "-l",
            process.env.PDF_OCR_LANGUAGES || "eng",
            "--psm",
            mode,
            "tsv",
          ]);
        columns =
          (await readScanColumns(
            prefix + ".png",
            i + 1,
            prefix + "-col",
            readOcr,
          )) ?? undefined;
        if (columns)
          pageText = columns
            .map((column) => column.lines.map((line) => line.text).join("\n"))
            .join("\n\n");
        else {
          const ocr = await run("tesseract", [
            prefix + ".png",
            "stdout",
            "-l",
            process.env.PDF_OCR_LANGUAGES || "eng",
            "--psm",
            "3",
          ]);
          if (ocr.trim().length > pageText.length) pageText = ocr.trim();
        }
        method = "OCR";
      }
      total += Buffer.byteLength(pageText, "utf8");
      if (total > MAX_TEXT)
        throw Error("Extracted text exceeds 2 MB; split this PDF.");
      pages.push({
        page: i + 1,
        text: pageText,
        method,
        ...(columns ? { columns } : {}),
      });
    }
    return pages;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// A conservative numbered-question parser. It never fabricates answers or subjects.
export function draftFromPages(
  pages: ExtractedPage[],
  metadata: PaperMetadata,
) {
  const questions: Array<{
    number: number;
    text: string;
    type: "MCQ" | "MSQ";
    options: string[];
    subject: string;
    topic: string;
    language: "en" | "hi";
    sourcePage: number;
    sourceRegions: SourceRegion[];
    answer: null;
    correctAnswers: number[];
    keyStatus: "UNAVAILABLE";
    keyReference: string;
  }> = [];
  const warnings = [
    "Review every question, option, diagram and page against the PDF. OCR and column layouts may be inaccurate.",
    "Check marks, penalty and duration against the original paper before publication; unrecognized papers use draft defaults (1, 0, 60).",
    "MCQ/MSQ types are inferred from explicit instructions; review type and scoring rules against the original paper.",
    "Subjects require classification. Answers remain unverified until an administrator checks and selects the correct options.",
  ];
  const commonWarningCount = warnings.length;
  let sectionType: "MCQ" | "MSQ" = "MCQ";
  const multiSelect =
    /\bMSQ\b|multiple[- ](?:select|response|correct)|(?:select|choose) (?:all|one or more)|more than one (?:answer|option)|one or more correct|एक से अधिक (?:उत्तर|विकल्प)|सभी सही (?:उत्तर|विकल्प)/i;
  const singleSelect =
    /single[- ](?:choice|correct)|(?:choose|select) (?:only )?one (?:answer|option)|केवल एक (?:उत्तर|विकल्प)/i;
  let current: {
    number: number;
    text: string;
    options: string[];
    page: number;
    type: "MCQ" | "MSQ";
  } | null = null;
  function finish() {
    if (!current) return;
    const q = current;
    if (
      q.number > 0 &&
      q.text.trim() &&
      q.options.length >= 2 &&
      q.options.length <= 8
    ) {
      questions.push({
        number: q.number,
        text: q.text.trim(),
        type: multiSelect.test(q.text)
          ? "MSQ"
          : singleSelect.test(q.text)
            ? "MCQ"
            : q.type,
        options: q.options.map((v) => v.trim()),
        subject: "Unclassified",
        topic: "",
        language: /[\u0900-\u097f]/.test(q.text) ? "hi" : "en",
        sourcePage: q.page,
        sourceRegions: [],
        answer: null,
        correctAnswers: [],
        keyStatus: "UNAVAILABLE",
        keyReference: "",
      });
    } else
      warnings.push(
        `Question ${q.number} on page ${q.page} needs manual conversion: no complete MCQ option set was detected.`,
      );
  }
  const scanQuestions = [
    ...pages.flatMap((page) => page.cards || []),
    ...questionsFromColumns(pages.flatMap((page) => page.columns || [])),
  ];
  for (const q of scanQuestions) {
    warnings.push(...q.warnings);
    questions.push({
      ...q,
      type: "MCQ",
      subject: "Unclassified",
      topic: "",
      language: "en",
      answer: null,
      correctAnswers: [],
      keyStatus: "UNAVAILABLE",
      keyReference: "",
    });
  }
  for (const page of pages) {
    if (
      page.cards ||
      page.columns?.length ||
      (scanQuestions.length && /TEST BOOKLET|INSTRUCTIONS/i.test(page.text))
    )
      continue;
    for (const raw of page.text.split(/\r?\n/)) {
      let line = raw.trim();
      if (!line) continue;
      if (
        line.length < 160 &&
        /^(?:(?:section|part)\s+[^:]+:\s*)?(?:MSQs?\b|MCQs?\b|multiple[- ](?:select|response|correct|choice)\b)/i.test(
          line,
        )
      ) {
        finish();
        current = null;
        sectionType =
          multiSelect.test(line) || /^MSQs?\b/i.test(line) ? "MSQ" : "MCQ";
        continue;
      }
      const heading = line.match(
        /^(?:Q(?:uestion)?\.?\s*)?(\d{1,4})\s*[.)：:]\s*(.+)$/i,
      );
      // Numeric (1) options are deliberately not treated as question headings.
      if (heading) {
        finish();
        current = {
          number: Number(heading[1]),
          text: "",
          options: [],
          page: page.page,
          type: sectionType,
        };
        line = heading[2];
      }
      if (!current) continue;
      // Supports both one option per line and "(A) ... (B) ..." inline options.
      const parts = line.split(
        /(?:^|\s+)(?:\(([A-Ha-h1-8])\)|([A-Ha-h])[.):])\s*/,
      );
      if (parts.length > 1) {
        if (parts[0].trim()) {
          if (current.options.length)
            current.options[current.options.length - 1] +=
              "\n" + parts[0].trim();
          else current.text += (current.text ? "\n" : "") + parts[0].trim();
        }
        for (let i = 1; i < parts.length; i += 3) {
          const label = (parts[i] || parts[i + 1]).toUpperCase();
          const index = /\d/.test(label)
            ? Number(label) - 1
            : label.charCodeAt(0) - 65;
          if (index === current.options.length && parts[i + 2]?.trim())
            current.options.push(parts[i + 2].trim());
          else {
            warnings.push(
              `Question ${current.number}: ambiguous option order; compare with source.`,
            );
            current.text += "\n" + line;
            break;
          }
        }
      } else if (current.options.length)
        current.options[current.options.length - 1] += "\n" + line;
      else current.text += (current.text ? "\n" : "") + line;
    }
  }
  finish();
  const duplicate = new Set<number>();
  const unique = questions.filter((q) => {
    if (duplicate.has(q.number)) {
      warnings.push(
        `Repeated question number ${q.number}; repeated item omitted. Check section numbering.`,
      );
      return false;
    }
    duplicate.add(q.number);
    return true;
  });
  const expectedQuestionCount =
    Number(
      pages
        .map((page) => page.text)
        .join("\n")
        .match(
          /(?:contains|comprises|total(?: of)?)\s+(\d{1,3})\s+(?:items|questions)/i,
        )?.[1],
    ) || null;
  if (expectedQuestionCount && unique.length !== expectedQuestionCount)
    warnings.push(
      `Recovered ${unique.length} of ${expectedQuestionCount} expected questions. Correct the crop boundaries or add missing questions before publication.`,
    );
  const payload = {
    examId: metadata.examId,
    year: metadata.year,
    stage: metadata.stage,
    shift: metadata.shift,
    title: metadata.title,
    marks: pages.find((p) => p.rules)?.rules?.marks ?? 1,
    penalty: pages.find((p) => p.rules)?.rules?.penalty ?? 0,
    durationMinutes: pages.find((p) => p.rules)?.rules?.durationMinutes ?? 60,
    source: {
      title: metadata.title,
      url: metadata.sourceUrl,
      checksum: metadata.checksum,
      permission: "PENDING" as const,
      permissionEvidence: metadata.permissionEvidence,
    },
    questions: unique,
  };
  if (!unique.length)
    warnings.push(
      "No supported numbered MCQs detected. Use the extracted text to prepare questions manually.",
    );
  if (unique.length) importInput.parse(payload);
  return {
    payload: unique.length ? payload : null,
    pages,
    warnings: [...new Set(warnings)],
    layoutMode: pages.some((page) => page.cards)
      ? "REVIEWED_SOURCE_IMAGES"
      : scanQuestions.length
        ? "DETECTED_SOURCE_IMAGES"
        : "TEXT",
    questionCount: unique.length,
    expectedQuestionCount,
    needsReview:
      !unique.length ||
      warnings.length > commonWarningCount ||
      pages.some((page) => page.columns?.length),
  };
}
