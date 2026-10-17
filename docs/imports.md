# Trustworthy question ingestion

The development collection currently contains **zero authorized genuine PYQs**. Do not infer availability from the directory. Do not invent questions to populate an exam. Test fixtures stay in a dedicated `_test` database and carry SYNTHETIC TEST ONLY labels.

Start with the examination authority, for example the [UPSC previous-question-paper portal](https://www.upsc.gov.in/examinations/previous-question-papers). This is a source lead, not a reuse license. Research each year, paper, shift, answer key, and reuse permission separately. No source was scraped or republished during this implementation.

## Review process

1. Register the source URL and compute the original document’s SHA-256. Record the source title, rights status, and specific authorization evidence.
2. If authorized, extract PDF text with the helper below, or prepare a CSV/JSON dataset. Preserve original text, symbols, option ordering, numbering, and source-page references.
3. Check every extracted question against the original. Machine extraction is not verification. Resolve missing options and duplicate numbering before import. Diagram-dependent material must not be published until the diagram can be faithfully and legally represented; this version has no diagram asset ingestion.
4. Add official key references. Use UNAVAILABLE or DISPUTED when a reliable key is absent. Keep editorial explanations distinct.
5. Use `/admin/imports` to upload/paste JSON. The schema rejects bad numbering, invalid answer indexes, unsupported shapes, oversized payloads, and duplicate paper identities. A 2 MB / 1,000-question limit keeps this pipeline synchronous.
6. At `/admin/questions`, compare drafts with the linked source. Correct extracted question JSON when needed; each correction appends an answer-key version and audit record. A published paper must be withdrawn before text is corrected.
7. Update permission evidence if necessary. Record a human verification note and approve. This publishes only rights-cleared material. Withdraw errors promptly; existing sessions retain their original snapshots and key versions.

## JSON payload

Use `lib/validation.ts` as the executable schema. `answer` is a zero-based option index, or `null`. A descriptive question uses `type: DESCRIPTIVE`, empty options, null answer, and an unavailable key.

```json
{
  "examId": "actual-database-exam-id",
  "year": 2023,
  "stage": "exact-source-stage",
  "shift": "exact-source-shift",
  "title": "exact-source-paper-title",
  "marks": 2,
  "penalty": 0.5,
  "durationMinutes": 60,
  "source": {
    "title": "Original document title",
    "url": "https://official-authority.example/paper.pdf",
    "checksum": "64-character-lowercase-sha256-of-the-original-document",
    "permission": "PENDING",
    "permissionEvidence": "Document the rights determination; do not assume public means reusable."
  },
  "questions": []
}
```

This is a schema outline, deliberately not an importable or invented PYQ collection: replace metadata with verified facts and supply actual authorized question objects. Each question requires `number`, `text`, `type`, `options`, `subject`, `topic`, `language`, `sourcePage`, `answer`, `keyStatus`, and `keyReference`; `explanation` is optional. Plain text is escaped, while `$...$`, `$$...$$`, and `\(...\)` render through KaTeX with untrusted commands disabled.

## PDF and CSV helpers

Install Poppler using your platform package manager (Linux: `poppler-utils`; macOS: `brew install poppler`; Windows: an official/trusted Poppler distribution on PATH). Never disable TLS, signature, or checksum checks to obtain tools.

```sh
npm run import:pdf -- authorized-paper.pdf review.json --authorized
npm run import:csv -- paper-metadata.json questions.csv import.json
```

The PDF command requires an explicit authorization flag, validates the PDF signature and 20 MB size, executes `pdftotext` without a shell, and writes a review artifact without overwriting an existing file. It does not guess question boundaries or publish. OCR, figures, tables, and mathematical layout require human handling; raw extraction alone is insufficient.

CSV uses a header row: `number,text,type,options,subject,topic,language,sourcePage,answer,keyStatus,keyReference,explanation`. The `options` cell is a JSON array; use normal CSV quoting. Keep question arrays out of the metadata file; conversion supplies them and runs the same server schema. A successful conversion still requires admin source comparison and publication.

Cloud document storage, browser PDF upload, OCR jobs, and comprehensive historical inventory collection remain future work. Do not bypass CAPTCHAs, authorization, or reuse restrictions. If permission is absent, link to the official publication instead of copying it.
