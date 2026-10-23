ALTER TABLE "Video" ALTER COLUMN "youtubeId" DROP NOT NULL;
CREATE TABLE "VideoSubmission" (
 id TEXT PRIMARY KEY,
 "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 creator TEXT NOT NULL,
 category TEXT NOT NULL,
 "learningObjective" TEXT NOT NULL,
 "fileName" TEXT NOT NULL,
 "mimeType" TEXT NOT NULL,
 bytes BYTEA NOT NULL,
 checksum TEXT NOT NULL UNIQUE,
 "durationSeconds" DOUBLE PRECISION NOT NULL,
 status TEXT NOT NULL DEFAULT 'PENDING',
 "reviewNote" TEXT,
 "reviewerId" TEXT,
 "reviewedAt" TIMESTAMP(3),
 "videoId" TEXT UNIQUE REFERENCES "Video"(id),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "VideoSubmission_userId_createdAt_idx" ON "VideoSubmission"("userId", "createdAt");
CREATE INDEX "VideoSubmission_status_createdAt_idx" ON "VideoSubmission"(status, "createdAt");
