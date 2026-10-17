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
| Vitest                                                          | 8 tests passed, 0 failed                                                                                                                            |
| Playwright against isolated PostgreSQL                          | 6 suites passed, 0 failed                                                                                                                           |
| Landing responsive widths                                       | 320, 390, 768, 1024, and 1440 px passed without horizontal overflow                                                                                 |
| Structured content flows                                        | Rights gate, duplicate rejection, publication, hidden active explanations/keys, recovery, finalization, shift completion, and user isolation passed |
| Game and video flows                                            | Four games launched, Memory Match completed, Number Merge played; finite video-session limit passed using an intercepted synthetic provider frame   |
| Import helpers                                                  | Authorized synthetic PDF text/checksum and validated CSV conversion passed; no test data imported into the main database                            |
| Main database inventory                                         | 52 exam directory entries; 0 papers, 0 questions, 0 videos, 0 users                                                                                 |
| Production dependency audit                                     | 0 known advisories                                                                                                                                  |
| Full dependency audit                                           | 5 high findings in one development lint-parser chain; no patched compatible upstream release available; see security.md                             |
| Live Google OAuth / actual video playback / real PYQ collection | Not validated: external credentials, reviewed video curation, and authorized paper sources are absent                                               |

Expected failed API requests in the browser server log belong to negative authorization, draft-practice, and rights-gate assertions; they are not counted as passed application operations. The application has not been deployed or tested through a published fresh environment snapshot. The local development server also rendered the Brain Arcade without browser JavaScript errors.
