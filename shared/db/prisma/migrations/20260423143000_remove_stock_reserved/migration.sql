-- Drop unused reservation column from product variants.
ALTER TABLE "product_variants"
DROP COLUMN IF EXISTS "stockReserved";
