# MindMitra — Learn, Play, Grow

A full-stack educational application built with Next.js App Router, React, TypeScript, Tailwind, PostgreSQL, Prisma, and Google-only NextAuth authentication. The repository includes a working practice engine, a human-reviewed content pipeline, seven browser games, planner, private analytics, and administration.

**Development release, not ready for unrestricted public registration.** Google OAuth needs your own credentials. No authorized real previous-year question collection has been supplied: the development database intentionally contains **zero PYQs and zero videos**, alongside 52 exam directory entries. Synthetic questions exist only in the isolated automated test database. See [completion status](docs/STATUS.md).

## Local start

Requirements: Node.js 22 or 24 LTS, npm, and either Docker Desktop/Engine or an existing PostgreSQL 16+ database. The cloud environment currently uses Node 24 and PostgreSQL 17. Automatic PDF conversion needs Poppler (`pdfinfo`, `pdftotext`, `pdftoppm`) and Tesseract OCR on the worker host. See [PDF conversion setup](docs/pdf-conversion.md).

```sh
cd MindMitra
npm ci
npm run setup:local
npm run dev
```

`setup:local` creates a private `.env` **only if absent**, generates local database credentials and an authentication secret, starts the local PostgreSQL container, generates Prisma Client, applies checked migrations, and seeds the exam directory. It preserves an existing environment file and existing database records. A local Docker volume is created for new containers. If the existing container has different credentials, setup fails without deleting it.

For a managed database, create `.env` from `.env.example`, set `DATABASE_URL` to your TLS-protected connection, set `NEXTAUTH_SECRET`, and run the same commands. The setup helper skips Docker for remote database hosts. Never use development credentials in production.

Windows: run these commands in PowerShell with Node LTS and Docker Desktop running. macOS: install Node LTS and Docker Desktop. Linux: install Node LTS and Docker Engine. `setup:local` is a TypeScript script, not a Bash-only installer.

## Google sign-in

1. Create a Google Cloud OAuth **Web application** and configure the consent screen. Use designated test users during development.
2. Add `http://localhost:3000` as an authorized origin and `http://localhost:3000/api/auth/callback/google` as the redirect URI.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` or secure hosting settings. Do not paste credentials into chat or commit them.
4. Set `NEXTAUTH_URL=http://localhost:3000`. The setup helper already generated `NEXTAUTH_SECRET` for a new local environment. For a separately managed environment, generate a fresh random value, for example with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`, and enter it securely.
5. Restart the application. Sign in with a verified Google account, complete or skip onboarding, then set study goals.

Only `openid email profile` permissions are requested. There is no password login or development authentication bypass. Existing sessions are database-backed, expire after 30 days, and can be revoked together from Settings. HTTPS enables secure cookies in production. See [authentication and security](docs/security.md).

## Administration, community contributions and hosting

**New Content Studio:** administrator accounts land in a separate animated workspace at `/admin`, with PDF uploads, private review queues and self-publication after checks. On Windows, `npm.cmd run setup:pdf` checks installed document tools, including Tesseract without a refreshed PATH. See [the studio and update guide](docs/admin-review.md) and [release details](docs/content-studio-update.md).

See [the owner and launch guide](docs/contributions-and-launch.md) for admin access, user statistics, moderated PDF/JSON contributions, the approval-based leaderboard, Windows updates without Docker, PWA installation, and Vercel/managed PostgreSQL deployment. PDF uploads automatically convert into editable MCQ/MSQ question drafts using text extraction and OCR. Both `dev` and `start` run the persistent worker with the app. Community submissions stay private until an administrator approves and publishes reviewed questions. See [conversion, retry and hosting setup](docs/pdf-conversion.md).

See [automatic MCQ/MSQ conversion and scoring](docs/msq.md).

## Mind Break replaces videos

Paper Ball Toss, Bridge Builder and Paper Football join the four classic games. Includes swipeable rules, practice rounds, pause/restart, accessible controls and a football bot. Games run in the browser. Video pages redirect to games and video APIs are retired; existing video data is preserved. FFmpeg is no longer required for the deployed application. See [Mind Break rules and update details](docs/mind-break.md).

## Commands

| Command                                                         | Purpose                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run setup:media -- --install`                              | Install/check FFmpeg and FFprobe on the server (WinGet on Windows)             |
| `npm run doctor`                                                | Check database, OAuth configuration and PDF/OCR tools without exposing secrets |
| `npm run worker:pdf`                                            | Run the persistent PDF converter separately when needed                        |
| `npm run dev`                                                   | Development server on port 3000                                                |
| `npm run build`                                                 | Prisma generation and production build                                         |
| `npm run start`                                                 | Production server after a build                                                |
| `npm run typecheck`                                             | Strict TypeScript checks                                                       |
| `npm run lint`                                                  | ESLint and React rules                                                         |
| `npm test`                                                      | Scoring, validation, completion, and game rules                                |
| `npm run test:e2e`                                              | Browser and database tests; separate test database required                    |
| `npm run db:migrate`                                            | Transactional, locked, checksum-checked SQL migrations                         |
| `npm run db:seed`                                               | Repeatable exam directory seed; never creates PYQs                             |
| `npm run admin:grant -- existing-user@example.com`              | Grant an existing signed-in user administrator access                          |
| `npm run import:csv -- metadata.json questions.csv output.json` | Convert validated CSV questions to an import payload                           |
| `npm run import:pdf -- paper.pdf review.json --authorized`      | Extract authorized PDF text for manual review; never publishes                 |

Run administrative scripts only from a trusted machine with authorized database access. No user becomes an administrator automatically.

## Structure and editing guide

```text
app/                  Public pages, protected student/admin routes, APIs
components/           UI, responsive shell, forms, games, quiz, charts, videos
lib/                  Authentication, Prisma, scoring, analytics, validation
prisma/               Relational schema, SQL migrations, directory seed
scripts/              Local setup, migrations, admin grant, import helpers
public/               Original brand icons, scoped service worker
 tests/               Domain tests and isolated Playwright flows
 docs/                Architecture, imports, security, operations, status
```

Edit colors and responsive layout in `app/globals.css`, the landing page in `app/page.tsx`, database models in `prisma/schema.prisma`, business rules in `lib/`, and game logic in `lib/games.ts` plus `components/game-player.tsx`. [Architecture](docs/architecture.md) explains the boundaries.

## Tests with a separate database

Never point browser tests at a production or personal development database. The runner refuses database names that do not end in `_test`. Fixtures and test sessions are created directly by test code, never by an application endpoint.

```sh
docker exec mindmitra-postgres createdb -U mindmitra mindmitra_test
```

Use the same credentials as your local `.env`, with database name `mindmitra_test`. In Bash:

```sh
export TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:5432/mindmitra_test'
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate
npm run build
npm run test:e2e
```

In PowerShell, assign `$env:TEST_DATABASE_URL`, temporarily assign `$env:DATABASE_URL` to it for migration, then restore the development URL before continuing. Browser tests run the production server on port 3001, use the test URL only for that server, and clean their test users and papers afterwards. Use installed Chromium (`CHROMIUM_PATH`) or `npx playwright install chromium` if no system Chromium is available. Details and evidence: [testing](docs/testing.md).

## Deploy

Use Vercel or a Node-compatible host such as Render plus managed PostgreSQL. Run `npm ci`, `npm run db:generate`, and `npm run build` in the build pipeline; apply `npm run db:migrate` once in an authorized release job before routing traffic. Configure the five variables in `.env.example`, replace `NEXTAUTH_URL` with the HTTPS application origin, and register the matching `/api/auth/callback/google` redirect in Google Cloud. Run `npm run db:seed` once to populate the directory and grant your first admin using the CLI after that user signs in.

Do not expose the local Docker database to the Internet. Use a PostgreSQL pooler suitable for your host’s connection limits, verified TLS, encrypted backups, and least-privileged application credentials. Hosting, database, backups, asset storage, and bandwidth can incur costs. No paid AI service is required.

Complete the release gates in [STATUS](docs/STATUS.md), including consent/legal review and a live OAuth test, before public launch. This work has not been deployed. See [operations and deployment](docs/operations.md) for migration, backup, restore, and hosting details.

### Review converted questions visually

Use **Admin → Contributions / PDF inbox** to review question text and options, select correct MCQ/MSQ answers, and save a private draft. Approve and publish makes the reviewed paper available in exam preparation. See [the visual review guide](docs/review-editor.md). Incomplete OCR must be corrected against the original PDF before publication.

For scanned papers, use the [CBT review workflow](docs/cbt-and-shorts.md), compare the original PDF, correct the text and choose the correct answers before publishing. The supplied GS Series D scan has a checksum-matched 100-question layout profile.

Administration now starts with **Review papers**, pending counts and visible approval checklists. See [the admin review guide](docs/admin-review.md) for the click-by-click flow and explanations when approval is disabled.

### PDF-only upload

Choose just the PDF under **Administration → Upload a paper**. Conversion starts automatically; repeat uploads reopen the existing record. Review the suggested exam/year and answers, then approve to add it directly to examination PYQ. Unknown exams use the Uploaded PYQ collection. [Full workflow and duplicate handling](docs/pdf-only-upload.md).

### CBT questions and swipeable Shorts

Review the original PDF and publish ordinary CBT text/options, without required answer-key references. The former video feature has been retired in favour of Mind Break. Historical video migrations are retained to preserve existing databases.
