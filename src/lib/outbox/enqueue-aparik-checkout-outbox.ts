import { Prisma } from "@white-shop/db";
import {
  OUTBOX_AGGREGATE_TYPE,
  OUTBOX_EVENT_TYPE,
  OUTBOX_PAYLOAD_VERSION,
  OUTBOX_STATUS,
} from "./outbox.constants";
import { isOutboxDedupeConflict } from "./outbox-dedupe-conflict";
import type { AparikCheckoutOutboxPayload } from "./aparik-checkout-outbox-payload";

export async function enqueueAparikCheckoutOutbox(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    correlationId: string;
    payload: AparikCheckoutOutboxPayload;
  },
): Promise<"enqueued" | "duplicate"> {
  try {
    await tx.outboxEvent.create({
      data: {
        eventType: OUTBOX_EVENT_TYPE.APARIK_CHECKOUT_EMAIL,
        aggregateType: OUTBOX_AGGREGATE_TYPE.ORDER,
        aggregateId: input.orderId,
        payload: JSON.parse(JSON.stringify(input.payload)) as Prisma.InputJsonValue,
        payloadVersion: OUTBOX_PAYLOAD_VERSION.APARIK_CHECKOUT_EMAIL,
        status: OUTBOX_STATUS.PENDING,
        correlationId: input.correlationId,
      },
    });
    return "enqueued";
  } catch (error) {
    if (isOutboxDedupeConflict(error)) {
      return "duplicate";
    }
    throw error;
  }
}
