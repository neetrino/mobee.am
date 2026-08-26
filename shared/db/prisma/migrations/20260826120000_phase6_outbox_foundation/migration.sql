-- Phase 6 expand-only: transactional outbox for post-commit side effects.
-- No backfill. Status values enforced via SQL CHECK (not Prisma enum).

CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadVersion" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outbox_events_dedupe_uidx"
ON "outbox_events"("eventType", "aggregateType", "aggregateId");

CREATE INDEX "outbox_events_status_availableAt_idx"
ON "outbox_events"("status", "availableAt");

CREATE INDEX "outbox_events_aggregateType_aggregateId_idx"
ON "outbox_events"("aggregateType", "aggregateId");

CREATE INDEX "outbox_events_correlationId_idx"
ON "outbox_events"("correlationId");

ALTER TABLE "outbox_events"
ADD CONSTRAINT "outbox_events_status_check"
CHECK ("status" IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE "outbox_events"
ADD CONSTRAINT "outbox_events_attempt_count_non_negative_check"
CHECK ("attemptCount" >= 0);

ALTER TABLE "outbox_events"
ADD CONSTRAINT "outbox_events_payload_version_positive_check"
CHECK ("payloadVersion" >= 1);
