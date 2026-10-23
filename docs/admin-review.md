# Content Studio

Accounts with the ADMIN role land at `/admin` after sign-in. The separate Content Studio has its own navigation, private welcome for Aditya Vishwakarma, upload cards and review queues. Other accounts cannot access it. The public landing page says “Built by an IITian”; it does not display the administrator's name or email.

## Paper: upload → review → publish

1. Choose **Upload paper**, select your PDF (up to 20 MB) and upload. No other intake fields are required. Conversion starts automatically and opens the review.
2. Compare the original PDF with each editable CBT question and its options. Correct OCR errors. Choose MCQ or MSQ, select the correct answer(s), and use **Save answer & next**. No answer-key reference is required.
3. Check the suggested exam/year, scoring and reuse permission. The checklist explains anything still blocking publication. Placeholder questions/options must be replaced with real text.
4. Choose **Finish review and publish to practice**. Your admin-uploaded paper can be reviewed by you. Students receive native CBT text/options in exam preparation, while the original remains available privately for review.

**Review papers** opens pending uploads, with tabs for published and rejected records. Existing prepared papers are in **Paper library**. Duplicate uploads reuse the existing review rather than losing your work. Community contributions cannot be approved by their own uploader unless explicitly resubmitted through the admin upload workflow.

## Video: upload → watch → publish

1. Choose **Upload video**. Upload MP4/WebM (25 MB, three minutes maximum), or record a lesson. Each account can upload 20 videos per rolling 24 hours. Topic and learning-objective fields are not required.
2. Successful studio uploads open their review automatically. Admin uploads use the public creator name **MindMitra Educators**; the administrator's account name/email are not public attribution.
3. Watch the complete video and audio, complete all five content checks and enter a review note of at least 15 characters. Choose **Approve educational video** to publish to Learn Shorts. An administrator can review their own video; students have no moderation access. Checks and decisions are audited.
4. Reject unsuitable videos or revoke previously published ones. Each decision gives visible feedback. File validation checks formats and duration; educational suitability and nudity/abuse checks require human review.

## PDF tool recovery on Windows

The converter detects Tesseract at `C:\Program Files\Tesseract-OCR\tesseract.exe` even when the running terminal has an old PATH. Custom installations can set `TESSERACT_PATH` to the full executable in `.env`; optional Poppler overrides are documented in `.env.example`.

From the folder containing `package.json`, run:

```powershell
npm.cmd run setup:pdf
```

Restart the site after tools are ready, open **Review papers**, open the failed paper and choose **Retry conversion**. This queues the saved PDF again. Read the confirmation before replacing an existing draft; retain a copy of manual corrections if reconverting.

## Install the update

Keep your private `.env`, database and any configured local media. Stop the old app, extract the new source in a fresh folder, copy `.env`, then run:

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run setup:pdf
npm.cmd run dev
```

Do not copy `node_modules` or `.next`. This studio update adds no schema changes, but `db:migrate` applies any earlier outstanding migration, including video likes. Admin access continues to use database roles; signing in with a matching name does not grant access. If necessary, grant your existing signed-in account locally with `npm.cmd run admin:grant -- your-account@example.com`.
