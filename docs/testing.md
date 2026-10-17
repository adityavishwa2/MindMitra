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
