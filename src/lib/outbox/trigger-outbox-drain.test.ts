import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  drainOutboxBatch: vi.fn(),
  error: vi.fn(),
}));

vi.mock("./drain-outbox", () => ({
  drainOutboxBatch: mocks.drainOutboxBatch,
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    error: mocks.error,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { triggerOutboxDrainBestEffort } from "./trigger-outbox-drain";

describe("triggerOutboxDrainBestEffort", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs only safe fields when best-effort drain fails", async () => {
    mocks.drainOutboxBatch.mockRejectedValue(new Error("OUTBOX_DRAIN_SECRET=super-secret"));
    triggerOutboxDrainBestEffort();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const logged = JSON.stringify(mocks.error.mock.calls[0]?.[1]);
    expect(logged).not.toContain("super-secret");
  });
});
