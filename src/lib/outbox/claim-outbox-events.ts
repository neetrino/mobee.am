import { db } from "@white-shop/db";
import { Prisma } from "@white-shop/db";
import { computeOutboxRetryAvailableAt } from "./outbox-backoff";
import {
  OUTBOX_DRAIN_BATCH_SIZE,
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_STALE_PROCESSING_MS,
  OUTBOX_STATUS,
} from "./outbox.constants";

export interface ClaimedOutboxEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
  payloadVersion: number;
  attemptCount: number;
  status: string;
}

export async function claimOutboxEvents(now = new Date()): Promise<ClaimedOutboxEvent[]> {
  const staleBefore = new Date(now.getTime() - OUTBOX_STALE_PROCESSING_MS);

  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<ClaimedOutboxEvent[]>(
      Prisma.sql`
        SELECT
          id,
          "eventType",
          "aggregateType",
          "aggregateId",
          payload,
          "payloadVersion",
          "attemptCount",
          status
        FROM "outbox_events"
        WHERE (
          status = ${OUTBOX_STATUS.PENDING}
          AND "availableAt" <= ${now}
        ) OR (
          status = ${OUTBOX_STATUS.PROCESSING}
          AND "processingAt" IS NOT NULL
          AND "processingAt" < ${staleBefore}
        )
        ORDER BY "availableAt" ASC
        LIMIT ${OUTBOX_DRAIN_BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      `,
    );

    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    await tx.outboxEvent.updateMany({
      where: { id: { in: ids } },
      data: {
        status: OUTBOX_STATUS.PROCESSING,
        processingAt: now,
        attemptCount: { increment: 1 },
      },
    });

    return rows.map((row) => ({
      ...row,
      attemptCount: row.attemptCount + 1,
    }));
  });
}

export async function markOutboxEventCompleted(eventId: string, now = new Date()): Promise<void> {
  await db.outboxEvent.updateMany({
    where: {
      id: eventId,
      status: OUTBOX_STATUS.PROCESSING,
    },
    data: {
      status: OUTBOX_STATUS.COMPLETED,
      processedAt: now,
      lastError: null,
    },
  });
}

export async function markOutboxEventRetryOrFailed(input: {
  eventId: string;
  attemptCount: number;
  error: string;
  now?: Date;
}): Promise<"retry" | "failed"> {
  const now = input.now ?? new Date();
  const shouldFail = input.attemptCount >= OUTBOX_MAX_ATTEMPTS;

  if (shouldFail) {
    await db.outboxEvent.updateMany({
      where: {
        id: input.eventId,
        status: OUTBOX_STATUS.PROCESSING,
      },
      data: {
        status: OUTBOX_STATUS.FAILED,
        lastError: input.error,
        processedAt: now,
      },
    });
    return "failed";
  }

  await db.outboxEvent.updateMany({
    where: {
      id: input.eventId,
      status: OUTBOX_STATUS.PROCESSING,
    },
    data: {
      status: OUTBOX_STATUS.PENDING,
      availableAt: computeOutboxRetryAvailableAt(input.attemptCount, now),
      lastError: input.error,
      processingAt: null,
    },
  });
  return "retry";
}
