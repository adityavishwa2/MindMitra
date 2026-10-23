# Recover a paper and provide its answers

If a paper says **CANCELLED** and shows a previous rejection note, its review was closed. Open the paper in Content Studio and choose **Reopen paper and convert**. This reopens the saved PDF for review and queues extraction again. Published and revoked papers are not reopened by this action.

When a pending paper has no question draft, a visible **Review questions and provide answers** panel explains extraction progress. Choose **Enter questions and answers manually** to start immediately from the original PDF, without editing JSON. Enter the question text and four answer choices, select **Correct option A/B/C/D**, and choose MCQ or MSQ as appropriate. MSQs allow multiple correct options. Use **Add missing question** for subsequent questions, and **Save answer & next** to save completed questions.

Automatic extraction populates the same visual editor when ready. Compare each question and option with the original and correct OCR errors. The source PDF is an administrator reference, not the published question format.

Confirm reuse permission, check scoring/exam details and finish all correct-answer reviews. **Finish review and publish to practice** stays disabled while required text/options, answer selections or authorization are missing. Publication stores typed CBT questions/options; original image regions are removed from the published question records. Students answer native MCQ/MSQ controls, rather than selecting answers on a cropped scan.

This update has no new database migration. Keep your .env and database, replace source in a fresh folder, run npm.cmd ci, npm.cmd run db:generate and npm.cmd run db:migrate, then restart with npm.cmd run dev.

Verification: 61 domain tests passed, along with four focused browser/database scenarios covering cancelled-paper reopening, manual answer selection, own-PDF publication and native MCQ/MSQ practice. Production build, TypeScript and ESLint passed.
