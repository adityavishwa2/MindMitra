CREATE TABLE "SourcePdf" (
  "sourceId" TEXT NOT NULL PRIMARY KEY,
  "bytes" BYTEA NOT NULL,
  "checksum" TEXT NOT NULL,
  CONSTRAINT "SourcePdf_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "SourcePdf" ("sourceId", "bytes", "checksum")
SELECT p."sourceId", c.pdf, c.checksum FROM "Contribution" c JOIN "Paper" p ON p.id=c."paperId"
WHERE c.status='APPROVED' AND c.pdf IS NOT NULL
ON CONFLICT ("sourceId") DO NOTHING;
