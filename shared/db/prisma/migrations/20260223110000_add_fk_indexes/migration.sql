-- Add indexes on foreign keys for faster JOINs and WHERE filters
CREATE INDEX IF NOT EXISTS "addresses_userId_idx" ON "addresses"("userId");
CREATE INDEX IF NOT EXISTS "cart_items_cartId_idx" ON "cart_items"("cartId");
CREATE INDEX IF NOT EXISTS "cart_items_variantId_idx" ON "cart_items"("variantId");
CREATE INDEX IF NOT EXISTS "cart_items_productId_idx" ON "cart_items"("productId");
CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX IF NOT EXISTS "order_items_variantId_idx" ON "order_items"("variantId");
CREATE INDEX IF NOT EXISTS "payments_orderId_idx" ON "payments"("orderId");
CREATE INDEX IF NOT EXISTS "order_events_orderId_idx" ON "order_events"("orderId");
CREATE INDEX IF NOT EXISTS "product_labels_productId_idx" ON "product_labels"("productId");
