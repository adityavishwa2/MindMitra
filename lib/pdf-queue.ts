import { questionOcr } from "./question-ocr";
import { needsCbtText } from "./cbt";
import { inferPdfDetails, PDF_SOURCE, UPLOADED_PYQ_SLUG } from "./pdf-upload";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import {
  draftFromPages,
  extractPdf,
  type PaperMetadata,
} from "./pdf-conversion";

type Job = PaperMetadata & { id: string; pdf: Buffer; conversionToken: string };
// Claims are atomic across workers. Expired leases recover after process restarts.
export async function processNextPdf(pool: Pool) {
  const claimedAt = Date.now();
  await pool.query(`UPDATE "Contribution" SET "conversionStatus"='FAILED', "conversionToken"=NULL,
    "conversionError"='Processing was interrupted three times. Check the worker and retry.'
    WHERE "conversionStatus"='PROCESSING' AND "conversionStartedAt" < NOW()-INTERVAL '15 minutes'
    AND "conversionAttempts">=3`);
  const token = randomUUID();
  const { rows } = await pool.query<Job>(
    `
    UPDATE "Contribution" SET "conversionStatus"='PROCESSING', "conversionToken"=$1,
      "conversionStartedAt"=NOW(), "conversionAttempts"="conversionAttempts"+1, "conversionError"=NULL
    WHERE id=(SELECT id FROM "Contribution" WHERE status='PENDING' AND pdf IS NOT NULL AND
      ("conversionStatus"='QUEUED' OR ("conversionStatus"='PROCESSING' AND "conversionStartedAt" < NOW()-INTERVAL '15 minutes' AND "conversionAttempts"<3))
      ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING id, pdf, "examId", year, stage, shift, title, "sourceUrl", "permissionEvidence", checksum, "conversionToken"`,
    [token],
  );
  const job = rows[0];
  if (!job) return false;
  try {
    const pages = await extractPdf(job.pdf);
    let metadata = job;
    let notes: string[] = [];
    if (PDF_SOURCE.test(job.sourceUrl)) {
      const { rows: exams } = await pool.query<{
        id: string;
        name: string;
        slug: string;
      }>(`SELECT id,name,slug FROM "Exam"`);
      const fallback = exams.find((e) => e.slug === UPLOADED_PYQ_SLUG);
      if (fallback) {
        const inferred = inferPdfDetails(
          job.title +
            "\n" +
            pages
              .slice(0, 2)
              .map((p) => p.text.slice(0, 3000))
              .join("\n"),
          exams,
          fallback.id,
          job.title,
          job.checksum,
        );
        metadata = { ...job, ...inferred };
        notes = inferred.notes;
      }
    }
    const result = draftFromPages(pages, metadata);
    result.warnings.push(...notes);
    if (result.payload) {
      const deadline = Math.min(
        Date.now() + 6 * 60_000,
        claimedAt + 12 * 60_000,
      );
      let unresolved = 0;
      for (const q of result.payload.questions) {
        if (!needsCbtText(q)) continue;
        if (Date.now() > deadline) {
          unresolved++;
          continue;
        }
        try {
          Object.assign(
            q,
            await questionOcr(job.pdf, job.checksum, q.sourceRegions, q.number),
          );
        } catch {
          unresolved++;
        }
      }
      if (unresolved) {
        result.needsReview = true;
        result.warnings.push(
          `${unresolved} questions need CBT text correction. Use Read text from PDF or edit against the original before publishing.`,
        );
      }
    }
    await pool.query(
      `UPDATE "Contribution" SET "conversionStatus"=$1, "conversionResult"=$2::jsonb,
      "examId"=CASE WHEN payload IS NULL THEN $6 ELSE "examId" END,
      year=CASE WHEN payload IS NULL THEN $7 ELSE year END,
      payload=COALESCE(payload,$3::jsonb), "conversionToken"=NULL
      WHERE id=$4 AND "conversionToken"=$5 AND status='PENDING'`,
      [
        result.payload && !result.needsReview ? "READY" : "NEEDS_REVIEW",
        JSON.stringify(result),
        result.payload ? JSON.stringify(result.payload) : null,
        job.id,
        token,
        metadata.examId,
        metadata.year,
      ],
    );
  } catch (error) {
    await pool.query(
      `UPDATE "Contribution" SET "conversionStatus"='FAILED', "conversionError"=$1,
      "conversionToken"=NULL WHERE id=$2 AND "conversionToken"=$3 AND status='PENDING'`,
      [
        error instanceof Error
          ? error.message.slice(0, 500)
          : "PDF conversion failed",
        job.id,
        token,
      ],
    );
  }
  return true;
}
