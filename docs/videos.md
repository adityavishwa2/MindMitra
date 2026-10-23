# Create and share educational videos

Open **Learn Shorts → Create a learning video**. Choose an MP4/WebM or record with the browser camera and microphone. The upload button has a moving highlight, floating lens, sparkle and keyboard-focus treatment. Reduced-motion preferences disable animation.

## Recording and uploading

- Videos are limited to 25 MB and 1–180 seconds. The browser recorder stops automatically before three minutes; select Stop recording sooner when finished.
- Recording requires a supported MediaRecorder browser, HTTPS (or localhost), and camera/microphone permission. The app asks for permission only when Record a lesson is selected. Files can be uploaded without camera access.
- MP4 must use H.264; WebM can use VP8, VP9 or AV1. File signatures and actual codec, dimensions and duration are checked by FFprobe. Renaming HTML or another file to `.mp4` does not make it valid.
- Streaming browser recordings missing duration/index metadata are locally remuxed with FFmpeg, without re-encoding, before storage. No remote video URL is fetched.
- Uploads require an educational category, a specific learning objective, creator attribution, reuse/participant permission and acceptance of the content rules.
- Members can submit at most three videos per day and have five waiting for review. Uploads are checked against duplicates by original-file SHA-256. File bodies are streamed with an actual size cap, regardless of Content-Length.

## Educational content moderation

Every uploaded video starts **PENDING**. Only its uploader and administrators can view the quarantined media. It is excluded from Learn Shorts until a different administrator approves it. Even administrators cannot approve their own uploads.

Under **Administration → Videos**, open a submitted lesson, watch the entire video and listen to all audio, then record a moderation note and separately confirm:

1. The complete video was reviewed.
2. It teaches the stated educational subject accurately.
3. It contains no nudity or sexual content.
4. It contains no abuse, harassment, hate, graphic violence or dangerous activities.
5. It contains no advertising, external promotions or unrelated entertainment.

The server rejects approval unless every confirmation is true. Rejection keeps the video private. Revocation hides an approved video from new playback requests. A student's content report also hides it immediately pending another full review. A malicious report can therefore temporarily hide a valid lesson; this conservative behavior prioritizes review before further distribution. Already delivered media cannot be erased from a viewer's device.

The moderation gate is **human review**, not an AI nudity detector. FFprobe/FFmpeg check media integrity; they do not recognize sexual content, assess the lesson or listen for abuse. There is no claim that automated content screening can catch every unsafe frame or word. Do not approve a lesson without a complete review.

Existing YouTube approvals are hidden by the policy migration until re-reviewed. The existing external-video form now also requires a full educational/safety confirmation before approval. External providers control their own ads and recommendations; uploaded lessons use the site's native player without external links or third-party players.

## Playback, privacy and storage

Approved uploads play directly in Learn Shorts using authenticated MP4/WebM media routes. Byte ranges support seeking. Responses are private/no-store; unapproved, rejected or revoked media is unavailable to other members, including when someone shares its URL. The file is not placed under public assets. Uploader/admin previews remain available after rejection or revocation. Original and recorded local preview URLs are released when replaced or the page closes; camera/microphone tracks are stopped when recording ends.

Videos are stored privately in PostgreSQL in this release and included in database backups. Account deletion cascades to the upload bytes. Define retention and storage budgets before scaling; this is a small-library implementation, not a transcoding CDN. No antivirus service, automatic semantic classifier, resumable upload or outbound publishing to YouTube/social sites is implemented.

## Setup and upgrade

Keep your private `.env` and back up the database. Install **FFmpeg**, which includes `ffprobe`, on the web server. On Debian/Ubuntu:

```sh
sudo apt-get update
sudo apt-get install ffmpeg
```

On macOS use `brew install ffmpeg`. On Windows, run `npm run setup:media -- --install` inside the updated project folder. This installs `Gyan.FFmpeg` using WinGet and checks both executables. Restart PowerShell and the app afterwards. Standard WinGet/Scoop locations are detected even when PATH has not refreshed; custom installations can use `FFMPEG_PATH` and `FFPROBE_PATH`. See [the Windows fix guide](windows-media-setup.md).

Then run:

```sh
npm ci
npm run db:migrate
npm run doctor
npm run build
npm run start
```

The Dockerfile includes FFmpeg, Poppler and English/Hindi OCR data. Existing PDF conversion remains automatic. A persistent Node host is recommended for 25 MB uploads and native tools. Serverless hosts may impose smaller request bodies/timeouts; configure compatible upload infrastructure before using this feature there. Run the application and native media tools as an unprivileged account with host resource limits and patched binaries.
