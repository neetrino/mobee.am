import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { authenticateToken } from "@/lib/middleware/auth";
import { ordersService } from "@/lib/services/orders.service";

vi.mock("@/lib/middleware/auth", () => ({
  authenticateToken: vi.fn(),
}));

vi.mock("@/lib/services/orders.service", () => ({
  ordersService: {
    reorder: vi.fn(),
  },
}));

describe("POST /api/v1/orders/[number]/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is unauthorized", async () => {
    vi.mocked(authenticateToken).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/v1/orders/ORD-1/reorder", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ number: "ORD-1" }) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.title).toBe("Unauthorized");
  });

  it("returns reorder summary for authorized users", async () => {
    vi.mocked(authenticateToken).mockResolvedValue({
      id: "user-1",
      email: null,
      phone: null,
      locale: "en",
      roles: ["customer"],
    });
    vi.mocked(ordersService.reorder).mockResolvedValue({
      orderNumber: "ORD-1",
      added: 2,
      skipped: 1,
      totalRequested: 3,
      addedItems: [
        { variantId: "variant-1", productId: "product-1", quantity: 1 },
        { variantId: "variant-2", productId: "product-2", quantity: 1 },
      ],
      skippedItems: [
        {
          variantId: "variant-3",
          productTitle: "Unavailable product",
          quantity: 1,
          reason: "insufficient_stock",
          availableStock: 0,
        },
      ],
      hasPartialFailure: true,
    });

    const req = new NextRequest("http://localhost:3000/api/v1/orders/ORD-1/reorder", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ number: "ORD-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(ordersService.reorder).toHaveBeenCalledWith("ORD-1", "user-1");
    expect(body.added).toBe(2);
    expect(body.skipped).toBe(1);
    expect(body.hasPartialFailure).toBe(true);
  });
});
