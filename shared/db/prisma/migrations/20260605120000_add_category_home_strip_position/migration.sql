-- Home page category strip: admin picks category + slot (1–6).
ALTER TABLE "categories" ADD COLUMN "homeStripPosition" INTEGER;

CREATE INDEX "categories_homeStripPosition_idx" ON "categories"("homeStripPosition");

-- Seed first six root categories (by `position`) into home strip slots 1–6.
WITH ranked_roots AS (
  SELECT
    c."id",
    ROW_NUMBER() OVER (ORDER BY c."position" ASC, c."createdAt" ASC) AS slot
  FROM "categories" AS c
  WHERE c."parentId" IS NULL
    AND c."deletedAt" IS NULL
    AND c."published" = true
)
UPDATE "categories" AS c
SET "homeStripPosition" = ranked_roots.slot
FROM ranked_roots
WHERE c."id" = ranked_roots."id"
  AND ranked_roots.slot <= 6;
