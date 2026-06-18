-- Add external source tracking fields to product_variants.
-- Allows idempotent upserts and full traceability back to MobileCentre.
ALTER TABLE "product_variants"
  ADD COLUMN IF NOT EXISTS "source"    TEXT,
  ADD COLUMN IF NOT EXISTS "sourcePid" TEXT,
  ADD COLUMN IF NOT EXISTS "visibleId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;

-- Index on source for fast per-source queries.
CREATE INDEX IF NOT EXISTS "product_variants_source_idx"
  ON "product_variants"("source");

-- Partial unique index: enforce uniqueness only when both values are set.
-- NULL rows are excluded, so existing rows with NULL source/sourcePid do not conflict.
CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_source_sourcePid_key"
  ON "product_variants"("source", "sourcePid")
  WHERE "source" IS NOT NULL AND "sourcePid" IS NOT NULL;
