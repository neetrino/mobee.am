import { sendAparikCheckoutEmail, type AparikCheckoutEmailPayload } from "@/lib/email/send-aparik-checkout-email";
import { OUTBOX_EVENT_TYPE, OUTBOX_STATUS } from "./outbox.constants";
import type { ClaimedOutboxEvent } from "./claim-outbox-events";
import { db } from "@white-shop/db";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAparikCheckoutPayload(payload: unknown): AparikCheckoutEmailPayload {
  if (!isRecord(payload)) {
    throw new Error("Outbox payload is not an object");
  }
  return payload as unknown as AparikCheckoutEmailPayload;
}

export type OutboxDeliveryHandler = (event: ClaimedOutboxEvent) => Promise<void>;

const defaultHandlers: Record<string, OutboxDeliveryHandler> = {
  [OUTBOX_EVENT_TYPE.APARIK_CHECKOUT_EMAIL]: async (event) => {
    await sendAparikCheckoutEmail(parseAparikCheckoutPayload(event.payload));
  },
};

export async function deliverOutboxEvent(
  event: ClaimedOutboxEvent,
  handlers: Record<string, OutboxDeliveryHandler> = defaultHandlers,
): Promise<void> {
  const existing = await db.outboxEvent.findUnique({
    where: { id: event.id },
    select: { status: true },
  });
  if (!existing || existing.status === OUTBOX_STATUS.COMPLETED) {
    return;
  }

  const handler = handlers[event.eventType];
  if (!handler) {
    throw new Error(`Unsupported outbox event type: ${event.eventType}`);
  }

  await handler(event);
}
