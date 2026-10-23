# Content Studio and Windows OCR update — 21 October 2026

- Admin routes now have a separate layout, dark navigation, animated creation cards, responsive queues, a private welcome for Aditya Vishwakarma and accessible reduced-motion styling. `/dashboard` redirects administrator accounts to `/admin`; existing admin URLs are preserved.
- Admins can upload PDFs, correct native CBT questions/options, select MCQ/MSQ keys and publish their own papers. Students receive text/options, not paper crops. No answer-key reference is required.
- Studio video uploads open their review immediately. Administrators can publish their own educational lessons after all five checks and a review note; authorization, origin checks and audit records remain enforced. Twenty videos per account per rolling 24 hours remains the limit, with 25 MB/three-minute file limits.
- Admin video attribution uses “MindMitra Educators.” Existing linked admin submissions also use this generic attribution in the learner feed. Administrators are excluded from the public contributor ranking. Private welcome names are supplied only from the protected server layout.
- The public landing page includes the owner-provided statement “Built by an IITian,” without publishing the administrator's name/email or implying institute endorsement.
- PDF extraction, question OCR, original-paper rendering and diagnostics share executable discovery. Standard Windows Tesseract installations work without refreshing PATH. Explicit tool overrides are supported in `.env.example`. `npm.cmd run setup:pdf` verifies the four document tools; it does not install them or change the Windows execution policy.

Keep `.env` and your database when upgrading. Run `npm.cmd ci`, `npm.cmd run db:generate`, `npm.cmd run db:migrate`, `npm.cmd run setup:pdf`, then `npm.cmd run dev`. Retry failed conversions from Review papers. Installing this source does not update an already running server: stop and restart it.

OCR is imperfect on scans, handwriting, diagrams and unusual layouts. Review extracted text and answer choices against the original before publishing. The Windows path resolver is tested with simulated installation paths; the application/browser checks run on Linux, not on the owner's physical Windows laptop.

## Verification

61 domain tests and 21 browser/database scenarios passed. Production build, TypeScript and ESLint passed. After the final studio color isolation update, the admin recording/self-publication and responsive access/privacy browser scenarios were rerun and passed. Phone (390 px), tablet (820 px) and laptop (1366 px) layouts were checked, including studio rendering when the student theme preference is dark. The private welcome name is absent from the public static JavaScript bundles.
