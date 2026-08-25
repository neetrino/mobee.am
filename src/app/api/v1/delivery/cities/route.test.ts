import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/admin/admin-delivery.service", () => ({
  adminDeliveryService: {
    getDeliverySettings: vi.fn(),
  },
}));

import { adminDeliveryService } from "@/lib/services/admin/admin-delivery.service";
import { GET } from "./route";

describe("GET /api/v1/delivery/cities", () => {
  beforeEach(() => {
    vi.mocked(adminDeliveryService.getDeliverySettings).mockReset();
  });

  it("returns 200 with fallback cities when settings are empty", async () => {
    vi.mocked(adminDeliveryService.getDeliverySettings).mockResolvedValue({ locations: [] });
    const res = await GET(new NextRequest("http://localhost:3000/api/v1/delivery/cities"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.cities)).toBe(true);
    expect(body.cities.length).toBeGreaterThan(0);
  });

  it("returns 503 problem+json when the database is unavailable", async () => {
    vi.mocked(adminDeliveryService.getDeliverySettings).mockRejectedValue(
      Object.assign(new Error("Can't reach database server at postgres://secret"), {
        name: "PrismaClientInitializationError",
      }),
    );
    const res = await GET(new NextRequest("http://localhost:3000/api/v1/delivery/cities"));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(JSON.stringify(body)).not.toContain("postgres://");
    expect(body.cities).toBeUndefined();
  });
});
