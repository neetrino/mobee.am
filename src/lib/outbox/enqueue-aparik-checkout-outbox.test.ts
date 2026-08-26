import { describe, expect, it, vi, beforeEach } from "vitest";
import { OUTBOX_AGGREGATE_TYPE, OUTBOX_EVENT_TYPE, OUTBOX_STATUS } from "./outbox.constants";
import { isOutboxDedupeConflict } from "./outbox-dedupe-conflict";

const createMock = vi.fn();

vi.mock("@white-shop/db", () => ({
  Prisma: { InputJsonValue: {} },
  db: {},
}));

import { enqueueAparikCheckoutOutbox } from "./enqueue-aparik-checkout-outbox";

describe("enqueueAparikCheckoutOutbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues aparik checkout email on first write", async () => {
    createMock.mockResolvedValue({ id: "out-1" });
    const tx = { outboxEvent: { create: createMock } };

    const result = await enqueueAparikCheckoutOutbox(tx as never, {
      orderId: "order-1",
      correlationId: "req-1",
      payload: {
        orderNumber: "1001",
        customerEmail: "guest@test.com",
        customerPhone: "+37411111111",
        displayCurrency: "AMD",
        items: [],
        subtotal: 1000,
        discountAmount: 0,
        shippingAmount: 0,
        taxAmount: 0,
        total: 1000,
        shippingMethod: "pickup",
      },
    });

    expect(result).toBe("enqueued");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: OUTBOX_EVENT_TYPE.APARIK_CHECKOUT_EMAIL,
          aggregateType: OUTBOX_AGGREGATE_TYPE.ORDER,
          aggregateId: "order-1",
          status: OUTBOX_STATUS.PENDING,
          correlationId: "req-1",
        }),
      }),
    );
  });

  it("treats dedupe unique conflicts as duplicate without throwing", async () => {
    createMock.mockRejectedValue({
      code: "P2002",
      meta: { target: ["eventType", "aggregateType", "aggregateId"] },
    });
    const tx = { outboxEvent: { create: createMock } };

    await expect(
      enqueueAparikCheckoutOutbox(tx as never, {
        orderId: "order-1",
        correlationId: "req-1",
        payload: {
          orderNumber: "1001",
          customerEmail: "guest@test.com",
          customerPhone: "+37411111111",
          displayCurrency: "AMD",
          items: [],
          subtotal: 1000,
          discountAmount: 0,
          shippingAmount: 0,
          taxAmount: 0,
          total: 1000,
          shippingMethod: "pickup",
        },
      }),
    ).resolves.toBe("duplicate");
  });
});

describe("isOutboxDedupeConflict", () => {
  it("detects outbox dedupe unique violations", () => {
    expect(
      isOutboxDedupeConflict({
        code: "P2002",
        meta: { target: ["eventType", "aggregateType", "aggregateId"] },
      }),
    ).toBe(true);
    expect(isOutboxDedupeConflict({ code: "P2002", meta: { target: ["number"] } })).toBe(false);
  });
});
