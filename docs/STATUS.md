# Implementation checklist and release gates

This is a working development release, not completion of every item in the [original product brief](product-brief.md). Checkboxes describe implemented functionality; verification evidence is in [testing](testing.md).

## Implemented

- [x] Next.js App Router, TypeScript, Tailwind, responsive design tokens, light/dark appearance, original brand assets, reduced-motion handling.
- [x] Public landing page and four public playable games; protected student shell, dashboard, planner, profile, settings.
- [x] Google-only NextAuth wiring, database account/session persistence, verified Google email requirement, logout-all, private data export/deletion.
- [x] Skippable onboarding; display name, English/Hindi preference, multiple exam goals, date, daily target, dashboard reminders.
- [x] PostgreSQL relational schema, committed migrations, repeatable local setup, non-destructive directory seed.
- [x] Fifty-two exam directory entries; favorites, search/category/state filtering; year/stage/shift paper identities and honest pending availability.
- [x] Rights/provenance metadata, SHA-256 records, JSON upload/import, duplicate protection, CSV conversion, operator PDF extraction assist.
- [x] Human verification queue, draft correction, versioned answer keys, rights updates, publication/withdrawal, administrator audit trail.
- [x] MCQ and MSQ import, automatic explicit MSQ recognition, multi-select persistence/recovery, immutable key snapshots, exact-set scoring, results and progress analytics.
- [x] Full-paper timed/untimed practice; per-paper subject/topic/revision/bookmark/unsolved filters and shorter sets.
- [x] Selection/review flags, local reconnect recovery, server persistence, source-linked results, configurable negative marking, unscored disputed/descriptive questions.
- [x] Idempotent finalization, owner isolation, question/key snapshots, server-bounded focused-time heartbeats, exact-session break return.
- [x] Private activity/subject charts, unique question/paper/year progress, streaks, basic milestones, game history, printable reports and CSV export.
- [x] Memory Match, Number Merge, Pattern Pulse, solvable Sliding Puzzle with shared pause/restart and private score saving.
- [x] Browser video recording and private MP4/WebM uploads, native media integrity checks, full educational/safety approval checklist, moderation audit trail, byte-range playback, report quarantine and revocation.
- [x] Curated finite video feed, approved embeds, creator attribution, topic filters, bookmark/report, session limit and return-to-study action.
- [x] Installable manifest/icons, service worker restricted to public offline fallback/assets, no cached private exam content.
- [x] Server validation, same-origin write checks, role/ownership enforcement, database-shared write limits, security headers, isolated automated tests.
- [x] Architecture, auth, import, administration, game extension, progress, deployment, local development, and backup guidance.

## External prerequisites

- [ ] Supply Google OAuth client ID/secret, configure the actual callback origin, and validate a real Google sign-in/logout/expiration flow.
- [ ] Obtain authorized real papers, original document checksums, reliable keys, and human verification. **Genuine published PYQ coverage: zero papers, zero questions.**
- [ ] Curate and approve actual educational videos, checking creator attribution and embed permission/availability.
- [ ] Select/configure hosting, managed database, operational contact, backup policy, and monitoring. Nothing has been deployed.

## Remaining product work before public testing

- [ ] Complete Hindi localization across every screen. A shared catalog translates most static student/admin controls and headings, with bundled Hindi fonts and persisted preferences; remaining dynamic messages, long descriptions, and legal pages need a complete language review.
- [ ] Complete age/parental-consent requirements, legal/privacy review, contact information, retention automation, and public enrollment controls.
- [x] Automatic browser PDF upload conversion with page-wise text/OCR extraction, durable worker queue, interruption recovery, editable MCQ drafts, private status, errors and administrator retry.
- [ ] Add diagram asset handling and support additional question layouts; automatic drafts still require source/key review.
- [ ] Add a complete expected historical-paper registry and sourcing queues beyond actual imported inventory, including metadata-only pending records.
- [ ] Add cross-paper custom practice/daily challenges, configurable timed subsets, advanced review queues, and question-specific explanation feedback during practice.
- [ ] Add richer primary-goal selection, scheduled reminders, and weekly paper targets. Favorites, state filters, and editable/reschedulable/deletable planner tasks are implemented.
- [ ] Add full date/exam report filtering, more comparison analytics, and robust provider-event watch accounting/daily limits. CSV export is implemented.
- [ ] Add the remaining games incrementally, sound controls, more puzzle sizes, expanded badges, and permitted offline game packaging.
- [ ] Expand accessibility audits and device testing, establish performance budgets, external security review, live provider tests, and operational backup restoration drills.

Do not publish claims of complete historical coverage, verified real content, full bilingual support, exact watch-time tracking, or production readiness based on this release.

## Moderated community contributions

Implemented: private PDF/JSON uploads with source metadata and reuse confirmation, per-member quotas, file duplicate checks, admin review/rejection/revocation, verified publication into practice, and an optional public-alias leaderboard crediting only approved published papers. PDFs convert automatically into drafts; unsupported layouts and source/key verification require human review before publication. Uploaded originals are stored in PostgreSQL with owner/admin download controls.

Admin Overview now reports registered/new/active users, contributors, contribution statuses and learning totals; Users provides a private searchable directory. Settings includes a browser-supported PWA installation action and platform-specific instructions. See `contributions-and-launch.md` for local upgrade, administrator access, storage, privacy and hosting steps. This addition has not created a public deployment.
