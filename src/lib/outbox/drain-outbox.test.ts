import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimOutboxEvents: vi.fn(),
  markOutboxEventCompleted: vi.fn(),
  markOutboxEventRetryOrFailed: vi.fn(),
  deliverOutboxEvent: vi.fn(),
}));

vi.mock("./claim-outbox-events", () => ({
  claimOutboxEvents: mocks.claimOutboxEvents,
  markOutboxEventCompleted: mocks.markOutboxEventCompleted,
  markOutboxEventRetryOrFailed: mocks.markOutboxEventRetryOrFailed,
}));

vi.mock("./deliver-outbox-event", () => ({
  deliverOutboxEvent: mocks.deliverOutboxEvent,
}));

import { drainOutboxBatch } from "./drain-outbox";
import { OUTBOX_EVENT_TYPE } from "./outbox.constants";

describe("drainOutboxBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes claimed events after successful delivery", async () => {
    mocks.claimOutboxEvents.mockResolvedValue([
      {
        id: "evt-1",
        eventType: OUTBOX_EVENT_TYPE.APARIK_CHECKOUT_EMAIL,
        aggregateType: "Order",
        aggregateId: "order-1",
        payload: {},
        payloadVersion: 1,
        attemptCount: 1,
        status: "processing",
      },
    ]);
    mocks.deliverOutboxEvent.mockResolvedValue(undefined);
    mocks.markOutboxEventCompleted.mockResolvedValue(undefined);

    const result = await drainOutboxBatch();

    expect(result).toEqual({ claimed: 1, completed: 1, retried: 0, failed: 0 });
    expect(mocks.markOutboxEventCompleted).toHaveBeenCalledWith("evt-1", expect.any(Date));
  });

  it("schedules retry when delivery fails before max attempts", async () => {
    mocks.claimOutboxEvents.mockResolvedValue([
      {
        id: "evt-2",
        eventType: OUTBOX_EVENT_TYPE.APARIK_CHECKOUT_EMAIL,
        aggregateType: "Order",
        aggregateId: "order-2",
        payload: {},
        payloadVersion: 1,
        attemptCount: 1,
        status: "processing",
      },
    ]);
    mocks.deliverOutboxEvent.mockRejectedValue(new Error("Resend unavailable"));
    mocks.markOutboxEventRetryOrFailed.mockResolvedValue("retry");

    const result = await drainOutboxBatch();

    expect(result).toEqual({ claimed: 1, completed: 0, retried: 1, failed: 0 });
    expect(mocks.markOutboxEventRetryOrFailed).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "evt-2", attemptCount: 1 }),
    );
  });
});
