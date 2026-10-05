-- Expand-only: NULL rows fall back to the variant query until the next read-model sync.
ALTER TABLE "product_listing_rows" ADD COLUMN "attributeFacets" JSONB;
