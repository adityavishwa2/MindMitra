# Automatic PDF conversion

Uploading a PDF from **Contribute** or **Admin → Import papers** now queues conversion automatically. `npm run dev` and `npm run start` run the web app and the PDF worker together. No paid AI API or manual conversion command is required.

## Update an existing installation

Back up your database, replace the source code, keep your private `.env`, then run:

```sh
npm ci
npm run db:migrate
npm run doctor
npm run build
npm run start
```

For a fresh local installation, use `npm ci`, `npm run setup:local`, and `npm run dev` as described in README. Configure your Google credentials and install the converter tools below. The readiness command reports missing configuration without printing secret values; it also shows the callback URL to register in Google Cloud. It cannot verify a real Google account's consent setup.

## Required converter tools

Install **Poppler** (`pdfinfo`, `pdftotext`, `pdftoppm`) and **Tesseract OCR** on the same host as the worker. All four tools must be installed. The server detects standard Windows Tesseract and Poppler locations automatically, as well as PATH commands. Run `npm.cmd run setup:pdf` to check them. For custom installations set `TESSERACT_PATH`, `PDFINFO_PATH`, `PDFTOTEXT_PATH` and `PDFTOPPM_PATH` to full executable paths, or `POPPLER_PATH` to the Poppler binary directory in `.env`. Restart the server after configuration changes. Missing tools cause a visible conversion error; the original upload remains available for download and retry.

Ubuntu/Debian:

```sh
sudo apt-get update
sudo apt-get install poppler-utils tesseract-ocr tesseract-ocr-hin
```

macOS with Homebrew:

```sh
brew install poppler tesseract tesseract-lang
```

Windows: install trusted Windows distributions of Poppler and Tesseract, add both `bin` directories to PATH, install the required Tesseract language data, and reopen PowerShell. Check `pdfinfo -v`, `pdftotext -v`, `pdftoppm -v`, and `tesseract --list-langs` before `npm run doctor`.

The default OCR language is English. To process Hindi scans, install the Hindi language pack and set `PDF_OCR_LANGUAGES=eng+hin` in the server environment. Restart the app/worker after changing PATH or language settings.

## Upload → draft → review

1. Upload a PDF and its exam/source metadata. Existing permission confirmation, 20 MB PDF upload limit, duplicate detection, and per-member quotas still apply.
2. The worker picks up the durable database queue within about three seconds when idle. It extracts the embedded text, then renders and OCRs pages containing fewer than 40 non-whitespace text characters. Mixed text/scanned PDFs are supported. An image embedded in an otherwise text-rich page is not separately OCRed.
3. Open the PDF's review record. Conversion status updates automatically. Numbered MCQs/MSQs with lettered or parenthesized numeric options become editable import JSON. Explicit multi-select instructions or section labels determine MSQ type; see [MCQ/MSQ detection and scoring](msq.md). Extracted page text and conversion warnings are available below the status.
4. Compare all questions/options with the original. Classify subjects and set the actual marks, negative marking and duration. Defaults are 1 mark, zero penalty and 60 minutes. The draft source permission is `PENDING`; change it to `AUTHORIZED` only after checking the evidence.
5. Supply reliable answers/references where available. Automatic extraction leaves answers null and key status `UNAVAILABLE`; these questions are unscored unless reviewed keys are added. It never guesses answers or marks a key verified.
6. Add the review note and approve publication. Member uploads still cannot be self-approved. Admin uploads use the existing admin import workflow and earn no leaderboard credit.

Conversion does not automatically publish a paper. Uploaded content is data, and no instructions or code inside it are executed. Scanned mathematics, diagrams, multi-column layouts, section number resets, answer-key tables, unnumbered questions and unusual options require manual correction. Diagrams are not extracted as question assets. Unsupported layouts retain extracted text and show `NEEDS_REVIEW` rather than fabricated questions.

## Queue operations and hosting

- Database states: `QUEUED`, `PROCESSING`, `READY`, `NEEDS_REVIEW`, `FAILED`; structured JSON uploads use `NOT_REQUIRED`. Review can cancel an active conversion.
- Jobs use atomic PostgreSQL claims and per-claim tokens. Multiple worker processes cannot claim the same live lease. A process interruption is reclaimed after 15 minutes, up to three attempts. A handled extraction failure is shown immediately; an administrator can retry after correcting the tools or language configuration, or regenerate a pending ready draft with the updated parser.
- Documents are limited to 80 pages, 20 MB PDF input and 2 MB extracted text. Native subprocesses have 30-second timeouts and bounded output. Processing has an eight-minute budget checked between pages. Split larger documents. Private temporary files are removed after success/failure; an abrupt machine/process kill can leave temporary directories for the host's normal temporary-file cleanup.
- Workers run one document at a time. Pending work survives application restarts. A worker database error is retried every three seconds. `npm run worker:pdf -- --once` processes one available item for diagnostics.
- A conventional Node host can use `npm run start`. For independently managed services, run `npx next start --hostname 0.0.0.0 --port PORT` for the web process and `npm run worker:pdf` for a supervised worker with the same database and OCR configuration. The worker requires `tsx`, so do not omit development dependencies in this release.
- A serverless web deployment needs a separate persistent worker host with Poppler/Tesseract and access to the same database. Uploading alone on a serverless host does not run the worker.
- Keep native PDF/OCR packages patched, use an unprivileged worker account, and enforce CPU/memory limits at the hosting layer for public workloads. No antivirus service or isolated per-document container is included.

To investigate a queued document, check the worker's startup log and database connectivity. To investigate `FAILED`, open the review screen for its error, run `npm run doctor`, correct the setup and choose **Retry conversion**. Original PDF bytes and their SHA-256 checksum remain unchanged.

## Container option

The supplied `Dockerfile` includes Poppler, English/Hindi OCR data, the web app and the persistent worker, running as the unprivileged Node user. Build with `docker build -t mindmitra .`. Keep `.env` private and supply runtime configuration using your hosting secret settings or `docker run --env-file .env -p 3000:3000 mindmitra`. The database must be reachable from inside the container; `localhost` in `DATABASE_URL` refers to the container itself. Apply migrations from an authorized release job (`npm run db:migrate`) before starting traffic. Do not put credentials in the image. An independently supervised worker may override the command with `npm run worker:pdf`.
