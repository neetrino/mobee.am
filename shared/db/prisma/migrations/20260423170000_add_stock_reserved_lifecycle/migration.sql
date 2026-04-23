ALTER TABLE "product_variants"
ADD COLUMN "stock_reserved" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "product_variants"
ADD CONSTRAINT "product_variants_stock_reserved_non_negative_check"
CHECK ("stock_reserved" >= 0);

ALTER TABLE "product_variants"
ADD CONSTRAINT "product_variants_stock_reserved_not_exceed_stock_check"
CHECK ("stock_reserved" <= "stock");
