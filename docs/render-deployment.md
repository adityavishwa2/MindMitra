# Run MindMitra online

The root `render.yaml` provisions a Docker web service and PostgreSQL database.
The image includes Poppler and English/Hindi Tesseract. Startup applies
database migrations, seeds the exam directory, then runs Next.js and the PDF
worker together. Uploaded files and the conversion queue are stored in PostgreSQL.

## Deploy

1. Open https://dashboard.render.com/blueprint/new?repo=https://github.com/adityavishwa2/MindMitra
2. Choose your confirmed workspace and connect GitHub if requested.
3. Enter your Google OAuth web application client ID and client secret in Render.
   Do not commit these values or share them in chat.
4. Review the resources and apply the Blueprint.
5. Copy the resulting HTTPS site URL. In Google Cloud Console, add that origin
   to Authorized JavaScript origins and add
   `https://YOUR-HOST/api/auth/callback/google` to Authorized redirect URIs.
6. Open the site and sign in with Google. Grant your existing account admin access
   using `npm run admin:grant -- YOUR-VERIFIED-EMAIL` in a server shell with the
   production database environment. Render shell access requires a paid service.
   Never grant admin based on a browser-provided email or client-side setting.

`NEXTAUTH_URL` defaults to Render's `RENDER_EXTERNAL_URL`. For a custom domain,
set `NEXTAUTH_URL` to its HTTPS origin and update Google OAuth redirects to match.

## Preview limits and production

This Blueprint uses free plans so applying it does not select paid compute.
Free PostgreSQL expires after 30 days and has 1 GB storage. Existing stored files still consume database storage. Free web services sleep after 15 minutes of inactivity and
their limited memory/CPU may be insufficient for scanned-paper OCR. Queued work
resumes when the service runs again; this is a preview, not reliable production
hosting. Before opening to students, select an always-on web plan with sufficient
memory for OCR (start with 2 GB and measure) and a paid database with adequate
storage/backups. Review current prices in Render before upgrading.

This is a fresh database. Files and accounts on your Windows computer are not
automatically transferred. Export/import your existing database separately if
you need to preserve it; do not overwrite it with the new empty database.

## Verify

Wait for Render's deploy to show Live. `/api/health` should return HTTP 200 and
`{"status":"ok"}`; it returns 503 if the database/schema is unavailable.
Then verify Google sign-in, an admin upload, PDF review/publish, student practice,
and the Mind Break games. A successful build alone does not verify Google credentials
or the quality of OCR on an individual paper.
