import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PATCH } from "./route";
import { authenticateToken } from "@/lib/middleware/auth";
import { cartService } from "@/lib/services/cart.service";
import { REQUEST_ID_HEADER } from "@/lib/errors/request-id";

vi.mock("@/lib/middleware/auth", () => ({
  authenticateToken: vi.fn(),
}));

vi.mock("@/lib/services/cart.service", () => ({
  cartService: {
    updateItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe("cart item reservation requestId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateToken).mockResolvedValue({
      id: "user-1",
      roles: ["customer"],
    } as never);
  });

  it("PATCH forwards the request id to updateItem", async () => {
    vi.mocked(cartService.updateItem).mockResolvedValue({
      item: { id: "item-1", quantity: 1 },
    });
    const req = new NextRequest("http://localhost:3000/api/v1/cart/items/item-1", {
      method: "PATCH",
      body: JSON.stringify({ quantity: 1 }),
      headers: {
        "content-type": "application/json",
        [REQUEST_ID_HEADER]: "req-cart-patch-1",
      },
    });

    await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(cartService.updateItem).toHaveBeenCalledWith("user-1", "item-1", 1, {
      requestId: "req-cart-patch-1",
    });
  });

  it("DELETE forwards the request id to removeItem", async () => {
    vi.mocked(cartService.removeItem).mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/v1/cart/items/item-1", {
      method: "DELETE",
      headers: { [REQUEST_ID_HEADER]: "req-cart-del-1" },
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: "item-1" }) });
    expect(res.status).toBe(204);
    expect(cartService.removeItem).toHaveBeenCalledWith("user-1", "item-1", {
      requestId: "req-cart-del-1",
    });
  });
});
