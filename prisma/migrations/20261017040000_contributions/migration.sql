ALTER TABLE "User" ADD COLUMN "contributorAlias" TEXT;
CREATE UNIQUE INDEX "User_contributorAlias_key" ON "User"("contributorAlias");
CREATE TABLE "Contribution" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "examId" TEXT NOT NULL REFERENCES "Exam"("id"), "year" INTEGER NOT NULL,
 "stage" TEXT NOT NULL, "shift" TEXT NOT NULL, "title" TEXT NOT NULL,
 "sourceUrl" TEXT NOT NULL, "permissionEvidence" TEXT NOT NULL, "checksum" TEXT NOT NULL UNIQUE,
 "fileName" TEXT NOT NULL, "pdf" BYTEA, "payload" JSONB, "status" TEXT NOT NULL DEFAULT 'PENDING',
 "reviewerId" TEXT, "reviewNote" TEXT, "reviewedAt" TIMESTAMP(3),
 "paperId" TEXT UNIQUE REFERENCES "Paper"("id"), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Contribution_status_check" CHECK ("status" IN ('PENDING','APPROVED','REJECTED','REVOKED'))
);
CREATE INDEX "Contribution_status_createdAt_idx" ON "Contribution"("status","createdAt");
CREATE INDEX "Contribution_userId_createdAt_idx" ON "Contribution"("userId","createdAt");
