# Run, manage and publish MindMitra

## Update an existing Windows installation without Docker

Download the latest GitHub source (Code → Download ZIP) and extract into a new folder. Keep your existing private `.env` and copy it beside the new `package.json`; do not replace it with `.env.example`. Keep your PostgreSQL database and server. Stop the old application with Ctrl+C before starting the updated one. Run these commands in PowerShell in the new application folder:

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

The additive contribution migration preserves existing accounts, papers and progress. Back up your database before applying migrations to an important deployment. `setup:local` is unnecessary when PostgreSQL is already installed locally.

## Become the administrator

First sign in normally with your Google account. In a trusted terminal using the database you want to manage, grant your existing account access:

```powershell
npm.cmd run admin:grant -- your-google-email@example.com
```

Reload the page. Administration appears in the sidebar; open `/admin`. Only ADMIN accounts can access this area or review contributions. Do not grant administrator access to contributors. There is no public role-change endpoint.

- **Overview**: registered users, new users in 7 days, active learners in 7 days, contributors, total/pending/published/rejected submissions, practice sessions, completed sessions, published questions, papers, imports and recent audit activity. Active means recorded practice, game or video activity; it is not a visitor count. No revenue/donation statistics exist because no payments are implemented.
- **Users**: private, searchable, paginated user directory with contribution and practice counts.
- **Contributions**: pending, approved, rejected and revoked submissions; source download, conversion review and moderation.
- **Import papers**: import your own structured question JSON.
- **Verification queue**: inspect/correct questions, record source permission and publish/unpublish imported papers.
- **Examinations, Coverage, Videos**: maintain the directory, inspect library gaps, and curate videos.

## Upload your own previous-year papers

Open `/admin/imports` and use **Upload a PDF question paper** to save your original PDF (up to 2 MB) with its exam, year, stage, shift and source evidence. Open the record in **PDF inbox**, download the original if needed, prepare the verified question JSON, and approve/publish it from the same screen. Admin PDF uploads never earn leaderboard points and do not change your contributor alias. Members cannot select the admin-upload mode. This mode permits administrators to review their own admin uploads; community self-review remains blocked.

You can also use the **Import prepared questions (JSON)** section, as documented in `docs/imports.md`. A scanned/PDF paper is not automatically an interactive quiz. Extract/transcribe its text, options and official answer keys, check each question, then import JSON and publish through the verification queue. The existing `import:pdf` helper extracts text for human review; it does not automatically create verified questions. Diagram ingestion is not supported; do not publish questions whose diagrams are missing.

Only use material you may redistribute. Document provenance and reuse evidence, preserve option order and marks/penalties, and mark missing/disputed answer keys accordingly. Imported drafts remain unavailable for practice until published.

## Community contributions

Signed-in members use **Contribute papers** (`/contribute`), also linked from Settings on mobile. They choose an exact exam, year, stage and shift, provide an HTTPS source URL and reuse evidence, and upload a PDF or structured JSON up to **2 MB**. JSON must use the existing import schema and match the chosen exam/year/stage/shift. Original uploads are downloadable only by their uploader and administrators; uploaded PDFs are served as attachments, never embedded or executed. Source URLs are not fetched automatically.

Uploads create private PENDING records; no public paper or points are created. Limits are 5 submissions per rolling 24 hours and 10 pending per member, enforced in a transaction. Exact file duplicates and existing registered paper identities are rejected. Different files for the same paper may enter the queue; only one paper identity can be published. These controls reduce spam but do not replace administrator review of content and duplicate source material.

At `/admin/contributions`, open a submission and inspect its source. For a PDF, prepare the verified import JSON, with `source.checksum` equal to the uploaded PDF's displayed SHA-256. JSON submissions are prefilled and can be corrected before approval. The final JSON must match the submitted exam/year/stage/shift. Confirm `source.permission` is AUTHORIZED, document evidence and check all questions, scoring and key references. Record a review note, then **Approve and publish**. Approval creates verified practice content and contributor credit atomically. If a reused source has a prior non-authorized permission decision, review that source in the existing verification workflow before approving; approval does not silently overwrite it.

Rejection leaves the upload private, creates no paper/points and shows your note to the uploader. **Revoke and unpublish** removes the paper from new practice and leaderboard credit. Administrators cannot approve their own community submissions; use Admin → Import papers → Upload a PDF question paper or the existing JSON import workflow for your own papers. Review notes are shared with the submitter, so do not include confidential moderation details.

The leaderboard (`/leaderboard`) awards **10 points per approved contribution whose paper is currently published**. Pending, rejected, duplicate, revoked and unpublished papers have no credit. Scores are computed from publication records; members cannot submit or edit points. Concurrent/repeated approvals cannot award multiple credits. Equal totals share a rank; the top 100 are listed. Publishing through a different admin screen cannot credit a contribution unless its contribution record was approved.

Participation is optional: members choose a unique public alias or leave it blank. No email is exposed on the leaderboard. **Leaderboard privacy** on the contribution page lets members change the alias or hide themselves without uploading again. Deleting an account deletes its uploads and credit; already published papers remain in the library, with their independent source/review records.

PDF originals are stored privately in PostgreSQL in this version, so they survive deploys when you use a persistent managed database. Include them in database backups and monitor storage costs. At larger volume, move originals to private object storage with signed access and a quarantine/scan pipeline; do not use a public upload bucket. This implementation validates the PDF signature and size, but is not a PDF malware scanner. Deleted accounts remove the associated contribution files. Rejected uploads otherwise remain available for owner/admin review; establish a retention schedule before scaling.

## Publish the website

Recommended starting combination: **Vercel for the Next.js app and a managed PostgreSQL database such as Neon or Supabase**. Render with managed PostgreSQL is another option. GitHub hosts source; it does not run this full-stack app through GitHub Pages. Your PC's localhost PostgreSQL is not reachable from a hosted application. Hosting/storage can have usage charges; check the provider's current limits.

1. Create a managed PostgreSQL database. Use the provider's TLS connection string (and its recommended application pooler). Keep it in secure environment variables, never GitHub. Import existing data with a separately tested backup/restore if needed; migrations do not transfer your local records.
2. Import `adityavishwa2/MindMitra` into Vercel, select Node 24, use `npm ci` as install command and `npm run build` as build command. Render uses `npm run start` to serve the built app. Configure `DATABASE_URL`, a fresh persistent `NEXTAUTH_SECRET`, `NEXTAUTH_URL` with the exact HTTPS production origin, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in production environment settings. Use separate databases for previews and production.
3. From a trusted release terminal connected to the production database, run `npm run db:migrate` and `npm run db:seed` before routing traffic to the new app. For a fresh checkout run `npm ci` and `npm run db:generate` first. Apply migrations once per release; avoid putting database mutations in concurrent preview builds. Seed is repeatable and adds exam directory entries only.
4. Add the production origin and `<origin>/api/auth/callback/google` to the Google OAuth web client. Keep localhost entries if you still use local development. Complete Google's audience/testing and consent requirements before inviting general users.
5. Deploy the application, then test real Google sign-in, grant your own production account ADMIN using the trusted CLI against the production database, and verify `/admin`. Test contribution upload/review, practice, alias opt-out and installation over HTTPS.
6. Configure database backups, verify a restore, set storage/hosting alerts, and complete the release gates in `docs/STATUS.md`, including content rights and privacy/legal review. No host, production database or deployment has been created automatically by this change.

The cloud development environment's network restrictions are separate from the deployed host. If the cloud environment is used to reach a managed database, configure supported TCP access for that database host. Never disable TLS validation to resolve access failures.

## PWA installation

The app has a manifest, icons and a service worker. **Settings → Install MindMitra** offers a button when Chrome/Edge supplies an install prompt. The prompt is captured at app startup so navigating to Settings does not lose it. Otherwise use the browser's install menu. On iPhone/iPad, open the published site in Safari and select Share → Add to Home Screen. Existing installed apps show installed status.

A public site needs HTTPS. Browser/device criteria determine whether a prompt is shown; installation is not an APK download and does not require Play Store publication. The service worker stores the offline fallback and static icons only. Authentication and fetching practice content need connectivity; the question library is not available offline. Browser-managed installation and real mobile-device behavior still need checks on the published HTTPS origin.
