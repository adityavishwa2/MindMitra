ALTER TABLE "Contribution"
  ADD COLUMN "conversionStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "conversionAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "conversionToken" TEXT,
  ADD COLUMN "conversionStartedAt" TIMESTAMP(3),
  ADD COLUMN "conversionError" TEXT,
  ADD COLUMN "conversionResult" JSONB;
UPDATE "Contribution" SET "conversionStatus" = 'QUEUED' WHERE pdf IS NOT NULL AND payload IS NULL AND status = 'PENDING';
CREATE INDEX "Contribution_conversionStatus_createdAt_idx" ON "Contribution"("conversionStatus", "createdAt");
