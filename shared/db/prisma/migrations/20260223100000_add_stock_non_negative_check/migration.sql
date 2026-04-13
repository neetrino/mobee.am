-- Add CHECK constraint to prevent negative stock on product_variants.
-- Ensures atomic decrement at application level can rely on DB enforcement.
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_stock_non_negative" CHECK ("stock" >= 0);
