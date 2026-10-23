# CBT review and swipeable Learn Shorts

## Review the paper, publish a CBT

The administrator can view the original PDF as full pages beside the editor on laptops and above it on smaller screens. Page controls and a full-size link work without a browser PDF plug-in. An optional original-question preview remains available to administrators for comparison.

The main editor shows a question stem, compact option rows and the correct-answer selectors. Answer-key references are no longer requested or required. Select one answer for MCQ or all correct answers for MSQ, save and continue. Answer status and audit records still distinguish checked, unavailable and disputed answers.

Printed text PDFs use text extraction. Scanned question regions are transcribed locally with Tesseract; additional layout modes and an option-gutter pass help with handwritten labels. This can take several minutes for a long scanned paper. **Read text from PDF** retries a question during review; select the correct answer again after a retry. Check the transcript against the original: OCR can miss or misread text, tables, diagrams, handwriting and mathematical notation. Correct uncertain text/options before publication; the app cannot infer omitted content or a correct answer reliably. Placeholder scan cards cannot be published as CBT questions.

On publication, the checked text/options become ordinary interactive CBT questions. Source question crops stay in the private review payload and are cleared from the published question records. Students starting a new practice attempt see text/options and select answers; scoring and MSQ exact-set rules remain unchanged. Original source PDFs remain retained for review/audit. Existing historical practice snapshots remain unchanged, including image-backed snapshots created before this update. Previously published image papers need text correction and reapproval through the existing paper library before new attempts use CBT text; this release does not silently rewrite old attempts or promise complete OCR for every paper.

## Simpler uploads and daily allowance

Video upload no longer asks for Educational topic or What will the learner understand. Title, creator and the existing rights/content confirmations remain. Omitted topics use General education; older supplied metadata remains compatible. Full educational/content review is still required before a lesson appears in the feed.

Each user can submit **20 videos in a rolling 24-hour period**. There is no additional pending-review cap. The server checks the count before native inspection and again under the uploader lock, preventing concurrent requests from exceeding the daily allowance. File limits remain **25 MB and three minutes**; the daily allowance does not mean 20-minute videos.

## Learn Shorts

Swipe vertically on phones/tablets, scroll with a mouse/trackpad, or focus the feed and use arrow keys. The visible video starts muted; scrolling pauses the previous player. Tap the sound control to hear audio, and use Pause/Play when needed. Only adjacent native videos preload. Native media playback is verified; third-party YouTube playback remains subject to the provider and browser policies. If autoplay is blocked, a Resume playback control appears. Captions/player behavior for external providers is controlled by that provider.

Likes are saved to the signed-in account with a unique user/video pair; repeating a like request cannot increase the count twice. Like/unlike and bookmark state survive reload. Reported videos remain hidden pending moderation. The reviewed collection remains finite and keeps the existing viewing-session timer.

Touch targets, page comparison, option editing and feed layouts were exercised at phone, tablet and laptop viewport sizes in Chromium. These checks do not guarantee identical behavior on every physical device or browser. Muted autoplay is used for mobile compatibility; browser power/accessibility/media settings can still require a user gesture.

## Update

Keep your `.env`, database and any configured local media. Back up your database, extract the new source, copy `.env`, and run in the folder containing package.json:

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run dev
```

The new migration creates `VideoLike`. Apply it before opening Learn Shorts. Tesseract/Poppler are needed for scanned-paper transcription/page previews, and FFmpeg/ffprobe remain needed for video upload. No paid extraction service or new API key is required.
