import { logger } from "@/lib/utils/logger";
import {
  claimOutboxEvents,
  markOutboxEventCompleted,
  markOutboxEventRetryOrFailed,
} from "./claim-outbox-events";
import { deliverOutboxEvent, type OutboxDeliveryHandler } from "./deliver-outbox-event";
import { redactOutboxError } from "./redact-outbox-error";

export interface DrainOutboxResult {
  claimed: number;
  completed: number;
  retried: number;
  failed: number;
}

export async function drainOutboxBatch(input?: {
  handlers?: Record<string, OutboxDeliveryHandler>;
  now?: Date;
}): Promise<DrainOutboxResult> {
  const now = input?.now ?? new Date();
  const claimed = await claimOutboxEvents(now);
  const result: DrainOutboxResult = {
    claimed: claimed.length,
    completed: 0,
    retried: 0,
    failed: 0,
  };

  for (const event of claimed) {
    try {
      await deliverOutboxEvent(event, input?.handlers);
      await markOutboxEventCompleted(event.id, now);
      result.completed += 1;
    } catch (error) {
      const disposition = await markOutboxEventRetryOrFailed({
        eventId: event.id,
        attemptCount: event.attemptCount,
        error: redactOutboxError(error),
        now,
      });
      if (disposition === "failed") {
        result.failed += 1;
      } else {
        result.retried += 1;
      }
      logger.warn("Outbox delivery failed", {
        eventId: event.id,
        eventType: event.eventType,
        attemptCount: event.attemptCount,
        disposition,
        errorName: error instanceof Error ? error.name : "Error",
      });
    }
  }

  return result;
}
