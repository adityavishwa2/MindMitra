ALTER TABLE "Question" ADD COLUMN "sourceRegions" JSONB NOT NULL DEFAULT '[]'::jsonb;
