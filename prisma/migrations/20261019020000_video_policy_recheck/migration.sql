-- Existing external videos must pass the new full educational/content review.
UPDATE "Video" SET approved = false WHERE "youtubeId" IS NOT NULL AND approved = true;
