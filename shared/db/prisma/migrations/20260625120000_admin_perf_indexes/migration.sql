-- Phase 3 admin performance indexes (non-destructive)
-- Supports: category product counts, analytics date-range filters, low-stock stats

CREATE INDEX IF NOT EXISTS "products_primaryCategoryId_idx"
  ON "products"("primaryCategoryId")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "products_categoryIds_gin_idx"
  ON "products" USING GIN ("categoryIds");

CREATE INDEX IF NOT EXISTS "orders_paymentStatus_createdAt_idx"
  ON "orders"("paymentStatus", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "product_variants_stock_published_idx"
  ON "product_variants"("stock", "published")
  WHERE "published" = true;
