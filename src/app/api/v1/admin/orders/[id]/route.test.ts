import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PUT } from "./route";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { AppError } from "@/lib/errors/app-error";
import { PROBLEM_JSON } from "@/lib/errors/problem-response";

vi.mock("@/lib/middleware/admin-api-auth", () => ({
  requireAdminApiContext: vi.fn(),
}));

vi.mock("@/lib/services/admin.service", () => ({
  adminService: {
    updateOrder: vi.fn(),
    deleteOrder: vi.fn(),
  },
}));

describe("admin order status routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminApiContext).mockResolvedValue({
      userId: "admin-1",
      roles: ["admin"],
      source: "fallback-auth",
    });
  });

  it("returns 409 problem+json for an invalid admin payment transition", async () => {
    vi.mocked(adminService.updateOrder).mockRejectedValue(
      AppError.conflict("Cannot change payment from pending to refunded."),
    );

    const req = new NextRequest("http://localhost:3000/api/v1/admin/orders/order-1", {
      method: "PUT",
      body: JSON.stringify({ paymentStatus: "refunded" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "order-1" }) });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(res.headers.get("content-type")).toContain(PROBLEM_JSON);
    expect(body.status).toBe(409);
    expect(adminService.updateOrder).toHaveBeenCalledWith(
      "order-1",
      { paymentStatus: "refunded" },
      expect.objectContaining({ actorUserId: "admin-1", source: "admin" }),
    );
  });

  it("returns 409 for DELETE of a commerce order and passes trusted context", async () => {
    vi.mocked(adminService.deleteOrder).mockRejectedValue(
      AppError.conflict("Order with items or payments cannot be deleted. Cancel the order instead."),
    );

    const req = new NextRequest("http://localhost:3000/api/v1/admin/orders/order-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "order-1" }) });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(res.headers.get("content-type")).toContain(PROBLEM_JSON);
    expect(body.status).toBe(409);
    expect(adminService.deleteOrder).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({
        actorUserId: "admin-1",
        source: "admin",
        requestId: expect.any(String),
      }),
    );
  });
});
