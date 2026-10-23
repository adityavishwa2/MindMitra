# Upload only the PDF

Open **Administration → Upload a paper**. Choose the PDF (up to 20 MB) and click **Upload PDF**. There is no required exam selection, year, title, source link, public alias or permission checkbox on the upload form. The community upload form also accepts only a PDF; optional alias management is separate in the contributor profile.

The application saves a private submission, starts the existing conversion worker and opens its review page for administrators. It creates a JSON draft containing the extracted MCQ/MSQ questions, options and source regions where applicable. The source PDF remains available for comparison and for scan cards; conversion does not imply perfect OCR or eliminate the need to compare extracted questions.

Known exam names/slugs and a year are suggested from the filename and early extracted PDF text. Unknown or ambiguous exams go into **Uploaded PYQ**, a collection created automatically. If no year is identified, the current year is a visible placeholder with a review warning. In step 1 of review, the administrator can correct the examination/collection, year and title. The application does not invent a conducting authority for an unidentified exam.

Complete the answer review and reuse-permission checks, then choose **Finish review and publish to practice**. The approved paper appears in the selected examination's PYQ directory without another JSON import. Papers assigned to Uploaded PYQ appear in that collection. Nothing is published merely by uploading.

## Repeat uploads

The same file is identified by its SHA-256. Uploading it again returns the existing submission instead of a file-registration error or duplicate question set. Existing answer edits and published papers are preserved. A failed conversion is queued again; rejected submissions without a published paper can return to review. An administrator using Upload a paper for their own earlier community PDF can move that pending record into the admin-upload workflow, which earns no contributor credit.

A different member's private submission ID and review details are not returned to another uploader; a generic receipt is shown instead. Administrators can open the existing submission. Concurrent identical uploads recover the existing record after a uniqueness race. Uploading never reserves or changes a public alias: aliases are managed independently in profile settings.

PDFs are identified internally by `urn:sha256:<checksum>`, rather than requiring or inventing an external source URL. The original file/hash and review evidence remain traceable. The source identity must match the PDF checksum. An uploaded identity is displayed as text, not as a broken external link.

Converting copyrighted material into questions does not itself establish reuse permission. This check occurs during approval, alongside answer verification, rather than blocking the initial upload.

No new database migration is needed beyond the previous releases. Keep `.env` and the existing database when updating; run `npm.cmd ci`, `npm.cmd run db:generate`, `npm.cmd run db:migrate`, then `npm.cmd run dev`. Poppler/Tesseract requirements for conversion and existing scan-layout limitations still apply.
