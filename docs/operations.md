# Operations, administration, and deployment

## Configuration

| Name                   | Use                                                                            |
| ---------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`         | PostgreSQL connection; use verified TLS and a pooler appropriate for your host |
| `NEXTAUTH_URL`         | Canonical origin, local HTTP during development and HTTPS in production        |
| `NEXTAUTH_SECRET`      | High-entropy authentication secret, unique to each environment                 |
| `GOOGLE_CLIENT_ID`     | Google OAuth Web application identifier                                        |
| `GOOGLE_CLIENT_SECRET` | Matching Google OAuth secret; enter through secure environment settings        |
| `TEST_DATABASE_URL`    | Dedicated disposable database ending `_test`; test tooling only                |
| `CHROMIUM_PATH`        | Optional system browser executable for Playwright                              |

The app runs without Google credentials for public pages and games; sign-in clearly reports missing configuration. Private development needs valid OAuth credentials. Do not invent user credentials or enable a production authentication bypass.

## Hosting

Vercel: use the Next.js preset, Node 22/24, a compatible managed PostgreSQL provider, and secure environment bindings. Build with `npm run build`. Apply migrations from an authorized release job; do not run schema changes on every serverless request. Use the provider’s PostgreSQL pooling guidance. Do not disable TLS certificate verification.

Render or another Node host: install dependencies with `npm ci`, generate and build, run migrations as a release step, then `npm run start` with the platform’s PORT. Persist the managed database separately from the web container. Docker in `setup:local` is only for local/cloud development, not a production database architecture.

After choosing the production origin, register its exact Google callback URI, review authorized origins, rotate development secrets, grant your intended admin using the CLI, and verify actual OAuth plus two-user isolation. Review legal/consent gates before opening enrollment. No deployment, account provisioning, or paid service purchase has been performed.

## Administrator workflow

- `/admin/exams`: create examination/authority directory entries. Annual stage, shift, scoring, duration, and source metadata are supplied during each paper import.
- `/admin/imports`: validate structured authorized paper uploads and inspect successful import jobs.
- `/admin/questions`: compare every question with the original, record rights evidence, correct drafts, append keys, approve, or withdraw. Source-rights revocation withdraws its papers.
- `/admin/coverage`: inspect actual registered/published counts. This is not a comprehensive historical expected-paper registry.
- `/admin/videos`: add/update reviewed YouTube IDs, creator attribution, category, and approval; uncheck approval to remove a video. Review student reports. Preview embeds and confirm creator authorization/provider availability before approval.
- `/admin`: aggregate content counts and a bounded audit feed; no student personal records are listed.

Failed validation returns a safe error; successful imports and review decisions have persistent records. More detailed failed-import logs, automated video refresh workers, queues, and monitoring integrations remain future work.

## Migrations and recovery

Committed migration directories are applied in lexical order by `npm run db:migrate`. The runner acquires a database advisory lock, validates stored checksums, and commits SQL plus its migration record together. Repeating the command does not repeat applied changes. Never change previously applied migration files or reset a shared database to work around drift.

Before a release, take a database backup using the provider’s encrypted backup mechanism or `pg_dump` with credentials supplied securely. Retain backups outside the checkout and restrict access. For local development, `docker exec mindmitra-postgres pg_dump -U mindmitra -Fc mindmitra > mindmitra.dump` works when using the default development user. Do not commit dumps.

Exercise restoration into a fresh database with `pg_restore`, validate migration history, run representative reads and practice tests, and only then use the restored database. A snapshot of source files is not evidence of a restored database. Backup encryption, retention/deletion policy, offsite storage, and restoration drills are operator responsibilities; no production restore is claimed here.

## Cloud onboarding configuration

The install/start instructions saved in environment settings prepare this existing isolated checkout. Do not create a worktree for normal tasks. Installed dependencies and files may be snapshotted; live Node/PostgreSQL processes must be restarted. Docker volumes are not assumed to transfer to every new environment: `setup:local` can create a fresh development database and seed the directory, while actual content/user data requires a separately verified backup or managed database.

Network destinations: package registries already provided by environment presets; Prisma’s native binaries at `binaries.prisma.sh` only if native tools are used; Google discovery/token/profile endpoints for real OAuth; YouTube privacy-enhanced embeds in the browser. Current engine-free runtime and SQL runner do not require native Prisma downloads. Draft network saves do not apply or publish themselves.
