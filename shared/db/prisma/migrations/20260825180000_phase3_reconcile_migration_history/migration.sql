-- Phase 3.1 reconciliation: make a fresh migrate-deploy DB match the current
-- Prisma application schema without rewriting older migrations.
-- Non-destructive: preserve existing data; do not drop documented legacy extras
-- (attribute_values.colorHex, GIN indexes). Do not change Phase 3 semantics.

-- ---------------------------------------------------------------------------
-- User password-reset columns (nullable, no backfill)
-- ---------------------------------------------------------------------------
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3);

-- ---------------------------------------------------------------------------
-- ProductReview
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "product_reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "product_reviews_productId_idx"
  ON "product_reviews"("productId");

CREATE INDEX IF NOT EXISTS "product_reviews_userId_idx"
  ON "product_reviews"("userId");

CREATE INDEX IF NOT EXISTS "product_reviews_published_createdAt_idx"
  ON "product_reviews"("published", "createdAt" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "product_reviews_productId_userId_key"
  ON "product_reviews"("productId", "userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_reviews_productId_fkey'
  ) THEN
    ALTER TABLE "product_reviews"
      ADD CONSTRAINT "product_reviews_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_reviews_userId_fkey'
  ) THEN
    ALTER TABLE "product_reviews"
      ADD CONSTRAINT "product_reviews_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- ContactMessage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_messages_createdAt_idx"
  ON "contact_messages"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "contact_messages_email_idx"
  ON "contact_messages"("email");

-- ---------------------------------------------------------------------------
-- ProductVariantOption.valueId index + FK (abort on orphans)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM "product_variant_options" pvo
  WHERE pvo."valueId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "attribute_values" av WHERE av."id" = pvo."valueId"
    );

  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Reconciliation aborted: product_variant_options has % orphan valueId row(s); refusing to add FK',
      orphan_count;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "product_variant_options_valueId_idx"
  ON "product_variant_options"("valueId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_variant_options_valueId_fkey'
  ) THEN
    ALTER TABLE "product_variant_options"
      ADD CONSTRAINT "product_variant_options_valueId_fkey"
      FOREIGN KEY ("valueId") REFERENCES "attribute_values"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Product.primaryCategoryId: Prisma needs a non-partial index with this name.
-- If a partial index occupies the name, rename it (keep as documented extra).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  idx_def TEXT;
BEGIN
  SELECT indexdef INTO idx_def
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'products_primaryCategoryId_idx';

  IF idx_def IS NOT NULL AND idx_def ~* '\sWHERE\s' THEN
    IF EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'products_primaryCategoryId_deletedAt_null_idx'
    ) THEN
      RAISE EXCEPTION
        'Reconciliation aborted: both products_primaryCategoryId_idx (partial) and products_primaryCategoryId_deletedAt_null_idx exist';
    END IF;
    ALTER INDEX "products_primaryCategoryId_idx"
      RENAME TO "products_primaryCategoryId_deletedAt_null_idx";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'products_primaryCategoryId_idx'
  ) THEN
    CREATE INDEX "products_primaryCategoryId_idx"
      ON "products"("primaryCategoryId");
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- ProductVariant.stockReserved
-- 1) only stock_reserved -> rename, keep values
-- 2) only stockReserved -> leave column
-- 3) both -> compare; abort on mismatch; drop snake only when values match
-- 4) neither -> add stockReserved
-- Then ensure CHECKs on stockReserved. Never drop stock_reserved blindly.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  has_snake BOOLEAN;
  has_camel BOOLEAN;
  mismatch_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name = 'stock_reserved'
  ) INTO has_snake;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name = 'stockReserved'
  ) INTO has_camel;

  IF has_snake AND has_camel THEN
    SELECT COUNT(*) INTO mismatch_count
    FROM "product_variants"
    WHERE "stock_reserved" IS DISTINCT FROM "stockReserved";

    IF mismatch_count > 0 THEN
      RAISE EXCEPTION
        'Reconciliation aborted: product_variants has both stock_reserved and stockReserved with % mismatched row(s). Refusing to pick a value.',
        mismatch_count;
    END IF;

    ALTER TABLE "product_variants"
      DROP CONSTRAINT IF EXISTS "product_variants_stock_reserved_non_negative_check";
    ALTER TABLE "product_variants"
      DROP CONSTRAINT IF EXISTS "product_variants_stock_reserved_not_exceed_stock_check";
    ALTER TABLE "product_variants"
      DROP COLUMN "stock_reserved";

  ELSIF has_snake AND NOT has_camel THEN
    ALTER TABLE "product_variants"
      RENAME COLUMN "stock_reserved" TO "stockReserved";
  ELSIF NOT has_snake AND NOT has_camel THEN
    ALTER TABLE "product_variants"
      ADD COLUMN "stockReserved" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

ALTER TABLE "product_variants"
  DROP CONSTRAINT IF EXISTS "product_variants_stock_reserved_non_negative_check";
ALTER TABLE "product_variants"
  DROP CONSTRAINT IF EXISTS "product_variants_stock_reserved_not_exceed_stock_check";
ALTER TABLE "product_variants"
  DROP CONSTRAINT IF EXISTS "product_variants_stockReserved_non_negative_check";
ALTER TABLE "product_variants"
  DROP CONSTRAINT IF EXISTS "product_variants_stockReserved_not_exceed_stock_check";

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_stockReserved_non_negative_check"
  CHECK ("stockReserved" >= 0);

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_stockReserved_not_exceed_stock_check"
  CHECK ("stockReserved" <= "stock");

-- Prisma @@index([stock, published]) is non-partial. Rename occupying partial.
DO $$
DECLARE
  idx_def TEXT;
BEGIN
  SELECT indexdef INTO idx_def
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'product_variants_stock_published_idx';

  IF idx_def IS NOT NULL AND idx_def ~* '\sWHERE\s' THEN
    IF EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'product_variants_stock_published_true_idx'
    ) THEN
      RAISE EXCEPTION
        'Reconciliation aborted: both product_variants_stock_published_idx (partial) and product_variants_stock_published_true_idx exist';
    END IF;
    ALTER INDEX "product_variants_stock_published_idx"
      RENAME TO "product_variants_stock_published_true_idx";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'product_variants_stock_published_idx'
  ) THEN
    CREATE INDEX "product_variants_stock_published_idx"
      ON "product_variants"("stock", "published");
  END IF;
END $$;
