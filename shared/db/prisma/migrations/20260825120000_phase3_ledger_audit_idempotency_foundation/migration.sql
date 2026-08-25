-- Phase 3 expand-only foundation:
-- stock ledger, audit log, checkout idempotency hashes, OrderEvent provider replay.
-- No backfill. No NOT NULL columns without defaults. No Outbox.
-- Runtime writers are intentionally not wired in this phase.

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "variantId" TEXT,
    "variantIdSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "orderId" TEXT,
    "actorUserId" TEXT,
    "resultingBalance" INTEGER NOT NULL,
    "correlationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "beforeDiff" JSONB,
    "afterDiff" JSONB,
    "requestId" TEXT,
    "correlationId" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "orders"
ADD COLUMN "idempotencyScopeHash" TEXT,
ADD COLUMN "idempotencyKeyHash" TEXT,
ADD COLUMN "requestFingerprint" TEXT,
ADD COLUMN "correlationId" TEXT;

-- AlterTable
ALTER TABLE "order_events"
ADD COLUMN "fromState" TEXT,
ADD COLUMN "toState" TEXT,
ADD COLUMN "actorUserId" TEXT,
ADD COLUMN "isCustomerVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "provider" TEXT,
ADD COLUMN "providerEventId" TEXT,
ADD COLUMN "correlationId" TEXT;

-- StockMovement CHECKs (not representable in Prisma 5 schema).
ALTER TABLE "stock_movements"
ADD CONSTRAINT "stock_movements_delta_nonzero_check"
CHECK ("delta" <> 0);

ALTER TABLE "stock_movements"
ADD CONSTRAINT "stock_movements_resulting_balance_non_negative_check"
CHECK ("resultingBalance" >= 0);

ALTER TABLE "stock_movements"
ADD CONSTRAINT "stock_movements_reason_check"
CHECK ("reason" IN ('order', 'cancel', 'return', 'admin_adjustment', 'import'));

-- CreateIndex
CREATE INDEX "stock_movements_variantId_createdAt_idx" ON "stock_movements"("variantId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_orderId_idx" ON "stock_movements"("orderId");

-- CreateIndex
CREATE INDEX "stock_movements_correlationId_idx" ON "stock_movements"("correlationId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_createdAt_idx" ON "audit_logs"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");

-- CreateIndex
CREATE INDEX "audit_logs_correlationId_idx" ON "audit_logs"("correlationId");

-- CreateIndex
CREATE INDEX "orders_correlationId_idx" ON "orders"("correlationId");

-- Idempotency uniqueness is scope+key only. requestFingerprint is excluded so a
-- later payload change with the same key can resolve to the existing order (409).
-- Partial unique avoids NULL/NULL collisions on legacy rows (Prisma 5 has no
-- native partial unique). Existing Mobee pattern: product_variants source/sourcePid.
CREATE UNIQUE INDEX "orders_idempotency_scope_key_uidx"
ON "orders"("idempotencyScopeHash", "idempotencyKeyHash")
WHERE "idempotencyScopeHash" IS NOT NULL
  AND "idempotencyKeyHash" IS NOT NULL;

-- CreateIndex
CREATE INDEX "order_events_orderId_createdAt_idx" ON "order_events"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "order_events_type_idx" ON "order_events"("type");

-- CreateIndex
CREATE INDEX "order_events_correlationId_idx" ON "order_events"("correlationId");

-- Provider replay: unique per provider, not globally on providerEventId.
-- Idram and Arca may coincidentally share an event id.
CREATE UNIQUE INDEX "order_events_provider_providerEventId_uidx"
ON "order_events"("provider", "providerEventId")
WHERE "provider" IS NOT NULL
  AND "providerEventId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "order_events"
ADD CONSTRAINT "order_events_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements"
ADD CONSTRAINT "stock_movements_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "product_variants"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements"
ADD CONSTRAINT "stock_movements_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements"
ADD CONSTRAINT "stock_movements_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
