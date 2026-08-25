import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminInventoryService } from "@/lib/services/admin/admin-inventory.service";

vi.mock("@/lib/middleware/admin-api-auth", () => ({
  requireAdminApiContext: vi.fn(),
}));

vi.mock("@/lib/services/admin/admin-inventory.service", () => ({
  adminInventoryService: {
    adjustInventory: vi.fn(),
  },
}));

describe("POST /api/v1/admin/inventory/adjustments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminApiContext).mockResolvedValue({
      userId: "admin-1",
      roles: ["admin"],
      source: "fallback-auth",
    });
  });

  it("applies stock adjustment for admin", async () => {
    vi.mocked(adminInventoryService.adjustInventory).mockResolvedValue({
      variantId: "variant-1",
      stock: 5,
    } as never);

    const req = new NextRequest("http://localhost:3000/api/v1/admin/inventory/adjustments", {
      method: "POST",
      body: JSON.stringify({
        variantId: "variant-1",
        quantityDelta: 2,
        reason: "manual-adjustment",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(adminInventoryService.adjustInventory).toHaveBeenCalledWith(
      {
        variantId: "variant-1",
        quantityDelta: 2,
        reason: "manual-adjustment",
        note: undefined,
      },
      expect.objectContaining({
        actorUserId: "admin-1",
        source: "admin",
      }),
    );
    expect(body.variantId).toBe("variant-1");
  });

  it("returns validation error for zero quantity delta", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/inventory/adjustments", {
      method: "POST",
      body: JSON.stringify({
        variantId: "variant-1",
        quantityDelta: 0,
        reason: "manual-adjustment",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 for non-admin users", async () => {
    vi.mocked(requireAdminApiContext).mockResolvedValue(
      NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
        },
        { status: 403 },
      ),
    );
    const req = new NextRequest("http://localhost:3000/api/v1/admin/inventory/adjustments", {
      method: "POST",
      body: JSON.stringify({
        variantId: "variant-1",
        quantityDelta: 1,
        reason: "manual-adjustment",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
