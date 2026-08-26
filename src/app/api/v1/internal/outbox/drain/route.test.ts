import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/outbox/drain-outbox", () => ({
  drainOutboxBatch: vi.fn().mockResolvedValue({ claimed: 0, completed: 0, retried: 0, failed: 0 }),
}));

vi.mock("@/lib/security/outbox-drain-secret", () => ({
  getOutboxDrainSecret: vi.fn(),
  verifyOutboxDrainSecret: vi.fn(),
}));

import { POST } from "./route";
import { drainOutboxBatch } from "@/lib/outbox/drain-outbox";
import {
  getOutboxDrainSecret,
  verifyOutboxDrainSecret,
} from "@/lib/security/outbox-drain-secret";

describe("POST /api/v1/internal/outbox/drain", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 503 when the drain secret is not configured", async () => {
    vi.mocked(getOutboxDrainSecret).mockReturnValue("");
    const res = await POST(new NextRequest("http://localhost:3000/api/v1/internal/outbox/drain", { method: "POST" }));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(JSON.stringify(body)).not.toContain("OUTBOX_DRAIN_SECRET");
  });

  it("returns 401 for an invalid secret without leaking the configured value", async () => {
    vi.mocked(getOutboxDrainSecret).mockReturnValue("configured-secret-value");
    vi.mocked(verifyOutboxDrainSecret).mockReturnValue(false);
    const res = await POST(
      new NextRequest("http://localhost:3000/api/v1/internal/outbox/drain", {
        method: "POST",
        headers: { "x-outbox-drain-secret": "wrong" },
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(JSON.stringify(body)).not.toContain("configured-secret-value");
  });

  it("drains pending events when the secret matches", async () => {
    vi.mocked(getOutboxDrainSecret).mockReturnValue("configured-secret-value");
    vi.mocked(verifyOutboxDrainSecret).mockReturnValue(true);
    vi.mocked(drainOutboxBatch).mockResolvedValue({ claimed: 1, completed: 1, retried: 0, failed: 0 });

    const res = await POST(
      new NextRequest("http://localhost:3000/api/v1/internal/outbox/drain", {
        method: "POST",
        headers: { "x-outbox-drain-secret": "configured-secret-value" },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ claimed: 1, completed: 1, retried: 0, failed: 0 });
  });
});
