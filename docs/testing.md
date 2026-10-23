# Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Browser flows use `npm run test:e2e` with a dedicated `_test` database. The Playwright setup inserts opaque database session fixtures for tests only; real Google OAuth remains unverified without credentials.

Domain tests exercise paper-specific penalties, excluded disputed/unavailable keys, null accuracy, nonempty full-paper completion, merge-once rules, vertical movement, and sliding-puzzle solvability. Extend fixtures only under tests and never seed invented public PYQs.

Browser checks cover landing widths 320/390/768/1024/1440, authentication boundaries, same-origin and admin authorization, structured import, draft exclusion from practice, duplicate rejection, human publication, answer-key omission from active quiz HTML, answering, reload recovery, idempotent submission, cross-user isolation, planner persistence, and four playable game loops. Screenshot artifacts are created under ignored `test-results/`.

Functional source licensing, Google’s consent/account configuration, real YouTube availability, assistive-technology evaluation, production performance/load, and production backup restoration require separate verification. Passing synthetic flows does not establish real-paper availability or a live Google login.

See the final task report for the latest executed results; commands listed here are not claims that an unexecuted flow passed.

## Executed evidence — 17 October 2026

| Check                                                           | Outcome                                                                                                                                             |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean `npm ci` and repeatable `setup:local`                     | Passed; existing environment and database preserved                                                                                                 |
| Strict TypeScript, ESLint, production build                     | Passed                                                                                                                                              |
| Vitest                                                          | 12 tests passed, 0 failed                                                                                                                           |
| Playwright against isolated PostgreSQL                          | 10 browser tests passed, 0 failed (6 existing + 4 contribution/PWA)                                                                                 |
| Landing responsive widths                                       | 320, 390, 768, 1024, and 1440 px passed without horizontal overflow                                                                                 |
| Structured content flows                                        | Rights gate, duplicate rejection, publication, hidden active explanations/keys, recovery, finalization, shift completion, and user isolation passed |
| Game and video flows                                            | Four games launched, Memory Match completed, Number Merge played; finite video-session limit passed using an intercepted synthetic provider frame   |
| Import helpers                                                  | Authorized synthetic PDF text/checksum and validated CSV conversion passed; no test data imported into the main database                            |
| Main database inventory                                         | 52 exam directory entries; 0 papers, 0 questions, 0 videos, 0 users                                                                                 |
| Production dependency audit                                     | 0 known advisories                                                                                                                                  |
| Full dependency audit                                           | 5 high findings in one development lint-parser chain; no patched compatible upstream release available; see security.md                             |
| Live Google OAuth / actual video playback / real PYQ collection | Not validated: external credentials, reviewed video curation, and authorized paper sources are absent                                               |

Expected failed API requests in the browser server log belong to negative authorization, draft-practice, and rights-gate assertions; they are not counted as passed application operations. The application has not been deployed or tested through a published fresh environment snapshot. The local development server also rendered the Brain Arcade without browser JavaScript errors.

## Contribution and PWA verification

The contribution tests use a dedicated `_test` database, synthetic exam/paper fixtures and database-backed test sessions, with no Google authentication bypass in application routes. They exercise the member upload form, pending privacy, duplicate detection, member/admin authorization, private file downloads, moderation UI, rights checks, publication into practice, single credit, revocation, opt-out, PDF signature checks, quota enforcement, concurrent approval and self-review rejection. Administrator overview and user directory are exercised as part of the review flow. The PWA test simulates the browser install event, checks the button flow, and retrieves the manifest and every declared icon; it does not claim real mobile OS installation was tested.

The planner browser assertion is scoped to the main region to avoid hidden retained Next.js route content creating an ambiguous text match. Latest full browser run: 10 passed, 0 failed (4 contribution/PWA + 6 existing platform checks). Lint, TypeScript and the production build passed. A fresh deployed HTTPS origin, managed database, real mobile installation and production Google OAuth still require deployment validation.

The admin PDF test uploads an original from `/admin/imports`, opens its inbox record, supplies verified question JSON and publishes it. It also verifies that member requests cannot select admin-upload mode, admin aliases are preserved and admin uploads receive no leaderboard points.

## Executed evidence — 19 October 2026

Automatic conversion update: strict TypeScript, ESLint and production build passed. Vitest passed 21 tests, including real synthetic text-PDF extraction, image-only PDF OCR, numbered/inline/wrapped/numeric options, Hindi text, unsupported layouts, duplicate numbering and corrupt inputs. Playwright passed all 12 tests against a freshly migrated isolated PostgreSQL 17 `_test` database, including upload-to-draft conversion without a manual trigger, owner/admin access boundaries, unauthorized-publication rejection, expired worker-lease recovery, failed conversion/retry, and the existing application flows.

The Node 24 Docker image built successfully with native Poppler and English/Hindi Tesseract packages. Its eight conversion tests passed under the unprivileged image user, including actual image-only OCR. The additional inline-question parser case was then covered by the local 21-test suite. `npm run doctor` passed against the isolated test configuration; configuration presence does not prove a real Google sign-in.

Dependency audit still reports five high findings in the pre-existing development ESLint chain; no compatible automatic fix is available (the suggested fix downgrades the framework lint configuration to v14). This update does not claim a live OAuth test, a deployment, full Hindi localization, complete source coverage, diagram ingestion, or public-launch readiness. See STATUS and pdf-conversion.md for remaining work and operating requirements.

## Educational video update — 19 October 2026

The combined application passed all **28 domain tests** and **15 browser/database tests**, plus strict TypeScript, ESLint and a production build. The new browser flows exercise actual MediaRecorder recording through Chromium's synthetic camera/microphone devices, normalization of streaming recordings, upload from the UI, pending-file privacy, full educational/safety checks, self-review prevention, native player integration, range responses, invalid ranges, report quarantine, revocation and concurrent approval. The hover transform and reduced-motion style are checked in the browser. All data is synthetic and isolated in a `_test` database.

Policy tests prove that incomplete approval flags are rejected; they do not claim visual nudity detection or automatic educational classification. FFmpeg/FFprobe tests verify real generated media and malformed-file rejection. Production content still requires a complete human review. The source-download page is a separate private static Site; publishing it does not deploy the application or its database.

## MSQ and Windows media support — 19 October 2026

**39 domain tests and all 16 browser/database tests passed**, plus strict TypeScript, ESLint, production build, migration checks and `setup:media` checks on the managed Linux environment. New coverage includes explicit English/Hindi MSQ detection, labeled sections, nonempty/unique/in-range key validation, exact-set/partial/extra/unattempted/unscored handling, mixed MCQ/MSQ penalties and a single-correct-option MSQ.

The new end-to-end flow uploads a generated mixed-question PDF, waits for automatic JSON conversion, regenerates a pending draft, reviews/publishes it and exercises multiple selections, reload recovery, invalid-selection rejection, hidden active keys, immutable scoring after a later source correction, results and progress. All fixtures remain isolated in the test database.

Media tests check explicit executable paths, synthetic WinGet discovery with a stale PATH, the generated Windows install command, and actionable missing-tool errors. The installer was not executed on a Windows machine in this environment. No claim is made that FFmpeg was remotely installed on the user's laptop.

## Quiz synchronization and cache recovery — 19 October 2026

All **42 domain tests and 16 browser/database tests passed** after the fixes. The browser MSQ flow starts with a corrupt `null` cache and deliberately holds an answer request open while the student submits; results appear only after the held save succeeds. Unit tests cover overlapping saves, edits arriving during a save, offline failure/retry and invalid cache selections. TypeScript and ESLint passed. The final production build passed using `npm run build -- --webpack`; the sandbox denied the local port used by Turbopack, so Webpack was used for this run. Earlier Turbopack validation remains recorded above.

Browser-storage failure handling is implemented, but this run does not simulate every browser privacy/storage policy. Timed-exam deadline rules remain enforced on the server.

## Upload origin compatibility and 20 MB PDFs — 19 October 2026

**44 domain tests and all 16 browser flows passed across the final suite run and a focused rerun of the large-file test.** The browser server deliberately uses NEXTAUTH_URL at localhost:3000 while requests target localhost:3001. PDF/video upload, recording, review and practice flows succeed with this mismatch, and external-origin rejection remains covered. Unit checks also cover IPv4/IPv6 loopback targets, missing/null origins, invalid settings and forged forwarded-host headers.

The PDF test uploads/downloads an actual ~20 MB generated document, checks byte length and SHA-256 equality, rejects a PDF above 20 MB and JSON above 2 MB, and retains existing moderation/quota tests. Native extraction of the ~20 MB fixture also passed. The first oversized-file assertion exposed a generic 400 response; file-size rejections now consistently return 413. A later test timeout came from deep-comparing a 20 MB buffer; the test now compares length/hash and passed its focused rerun in 12.1 seconds. The other 15 browser flows passed in the final full run.

Strict TypeScript, ESLint, `git diff --check` and the production Webpack build passed. These checks used an isolated PostgreSQL 17 test database; they do not assert that the user's Windows .env or Google OAuth configuration has been inspected.

## Visual question and answer-key review — 19 October 2026

All **44 domain tests and 16 browser/database flows passed**, plus TypeScript, ESLint, `git diff --check` and a production Webpack build. The mixed-question browser flow now reviews the converted PDF entirely through the visual editor: it selects MCQ/MSQ keys, supplies references, changes scoring/permission/subjects, saves the private draft, reloads and verifies selections, publishes through the review button, verifies the student exam collection and exercises immutable practice scoring and results. Student writes, missing origins, tampered PDF checksums and changes to an already-reviewed draft are rejected. Existing raw-JSON review flows continue to pass through Advanced JSON.

Parser tests now assert that a partially recovered document is flagged as needing review. The worker maps these results to NEEDS_REVIEW while retaining the recoverable draft and source text. This does not establish extraction accuracy for the user's multi-column source PDF; its supplied text/JSON contains omitted and merged material that requires source comparison and manual correction.

## Scanned-card update verification — 19 October 2026

49 domain/unit tests passed, including bounded source regions, skew-divider detection, preservation of nested numbered statements, the 100-region profile and real Poppler/Sharp rendering. TypeScript, ESLint and the production Webpack build passed. All 17 browser scenarios passed: the full run passed 16, and the remaining scenario passed after disambiguating its status-message selector. New coverage includes private image access, publication, retained PDF assets, immutable practice-image snapshots, shared answer references, per-answer draft saving and final publication gates.

The supplied image-only GS Series D PDF was converted privately: 100 cards, expected count 100, no verified keys. Representative cards 1, 13, 60 and 100 were rendered and visually checked for complete questions/options. This is evidence for the checksum-matched paper, not a claim of perfect OCR/segmentation across arbitrary scans. The user's PDF and extracted question pixels are excluded from the source archive.

## Administration approval update — 21 October 2026

49 domain tests passed using the installed native Poppler tools (`PATH=/usr/bin:$PATH`). Production Webpack build and TypeScript passed; ESLint passed. All 17 browser scenarios passed across the full run and focused reruns. The first full run passed 13; selector updates for collapsed statistics, renamed screens and relocated status messages were then verified in focused reruns. The authorization regression test additionally selects and saves both PENDING and AUTHORIZED through the actual browser form, reads the persisted database permission, and verifies the publication gate.

Browser evidence covers the admin starting cards and navigation, mobile width without horizontal overflow, guided answer feedback and publication, explicit video approval with all checks, blocked approval without checks/note, visible own-upload restrictions, own-upload rejection, independent approval, revocation and private-media behavior. Desktop and mobile admin screenshots were inspected during testing. These tests use synthetic accounts/content in an isolated PostgreSQL database; they do not exercise the user's Windows installation or establish the cause of a particular remote failure with no error message.

## PDF-only intake — 21 October 2026

52 domain tests passed, including known/ambiguous exam inference and checksum-bound uploaded source identities. All 18 browser scenarios passed in one full run. The new scenario submits only a PDF, confirms the form has one visible input and no source URL, verifies automatic conversion/metadata, reopens the same file without duplicate rows, preserves the existing record, moves an administrator's own pending community PDF into the admin-upload flow, supplies answer feedback and publishes to the chosen examination. A published repeat creates no second paper; another member receives no private submission ID. Previous PDF conversion, review, privacy, MCQ/MSQ scoring, paper authorization and video moderation scenarios also passed. Production Webpack build, TypeScript and ESLint passed. Tests use synthetic content and an isolated database; automatic metadata suggestions still need human checking for real papers.

## CBT review, Shorts and daily uploads — 21 October 2026

56 domain tests passed. All 20 browser scenarios passed in the full suite; focused reruns then verified final playback-state accounting, phone/tablet/laptop feed controls, original-PDF/CBT comparison and the corrected narrow-screen form sizing. The final production Webpack build, TypeScript and ESLint checks passed. A type check initially collided with a concurrently regenerating Next types directory; sequential build/type checking passed.

The browser tests cover no required answer-reference input, native text/options after publishing a PDF-backed question, cleared published source regions and unavailable crop endpoints for new CBT snapshots, preserved keys/scoring across reload/corrections, original full-page preview and review layouts at 390×844, 820×1180 and 1366×900, swipe/scroll activation with the previous video paused, a matching Pause control, no initial click-to-play gate, likes across reload and duplicate like requests, unlike, cross-origin rejection, hidden/reported videos and moderation. Daily-limit coverage blocks a user's 21st recent upload, then permits an upload after an older item ages out even with 20 pending items.

The supplied GS Series D scan was also examined locally. Representative questions 1, 6, 13 and 100 produced native stems/options; question 6 exercised removal of the marked label gutter to recover an omitted option. OCR spelling errors were observed, so this is not a claim of perfect transcription or complete correctness across all 100 questions. Source images/text from the user's PDF remain private workspace diagnostics and are excluded from the archive. Synthetic fixtures are used in automated tests. Real device/browser behavior, external YouTube playback and arbitrary scan/diagram accuracy are not exhaustively verified.
