> Historical scan-card guide. The current release publishes native CBT text/options; see [CBT and Shorts](cbt-and-shorts.md). Original images are for administrator comparison.

# Review scanned papers question by question

Scanned questions can lose columns, tables and options during OCR. MindMitra now supports source-image question cards: the printed question and options appear together, while answer buttons and scoring remain interactive. This preserves the scan rather than claiming perfect editable transcription.

## The supplied GS Series D paper

The exact supplied `GS Series D- English_compressed.pdf` has a reviewed layout profile for 100 questions on pages 2–26. Matching uses SHA-256, not the filename. The profile stores region coordinates only, without PDF pixels, question text or answer keys. Recompressed or different papers use ordinary extraction instead. Cover defaults are 2 marks, one-third negative marking and 120 minutes; check these before publishing.

After upgrading, open the existing submission in **Admin → Contributions / PDF inbox** and choose **Reconvert PDF**. This replaces the old draft after confirmation. The supplied file's checksum matches that submission, so reuploading is unnecessary. Expect 100 original scan cards.

1. Compare each card with the original PDF. Printed options are in the image; answer controls are labelled A–D. Handwritten ticks and circles are part of the scan and are never interpreted as correct answers.
2. Enter the shared **Answer-key reference for this paper** once. Use an independently checked answer key or documented reviewer solution. Individual references can override it.
3. Select the correct MCQ answer, or all correct MSQ answers. Choose **Save answer & next** to save privately and continue. Your selection becomes the verified scoring key.
4. Verify reuse permission and record its evidence. Select **Authorized** only when appropriate.
5. On the final question, **Finish review and publish to practice** becomes available once every question has a verified answer and the paper passes validation. It publishes directly to exam preparation; no separate JSON import is needed.

The ordinary draft/publish controls remain available for papers with missing or disputed keys. Student progress is recorded through practice attempts, not reviewer answer selections.

## Other scanned papers

Local extraction detects printed dividers, corrects modest skew and attempts column-based segmentation. Unknown scan layouts remain **NEEDS_REVIEW**. Check the recovered count, ordering and every crop. Expand a question's details to adjust the crop's top/bottom or repair question metadata/options. Missing or merged questions may still need manual correction. Native text PDFs retain editable text extraction. No external AI API or paid extraction service is used.

Poppler is required to render cards. Tesseract is required for OCR of unknown scanned layouts. The exact reviewed profile does not infer answers or require OCR for segmentation. PDF uploads remain limited to 20 MB.

## Access and persistence

Pending images are restricted to the uploader and administrators. Published images require the student's own practice session, published status and authorized source permission. Session snapshots preserve the original question regions. The authorized source PDF is retained separately when published, so removing a private submission copy does not break practice cards. Images use private, no-store responses. Source-image questions cannot be imported through standalone JSON without the original PDF contribution.

## Upgrade on Windows

Back up the database and keep your existing `.env`. Stop the server, replace the source, then run in the folder containing `package.json`:

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run dev
```

This release adds migrations for question regions and retained source PDFs. If necessary, add `C:\Program Files\Tesseract-OCR` to the current terminal's PATH before starting the app. Restart VS Code after changing persistent Windows PATH settings.
