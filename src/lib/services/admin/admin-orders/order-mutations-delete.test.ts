import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "@/lib/errors/app-error";

const mocks = vi.hoisted(() => ({
  deleteEmptyOrder: vi.fn(),
}));

vi.mock("../../orders/delete-empty-order", () => ({
  deleteEmptyOrder: mocks.deleteEmptyOrder,
}));

import { deleteOrder } from "./order-mutations";

const context = {
  requestId: "req-1",
  actorUserId: "admin-1",
  source: "admin" as const,
};

describe("deleteOrder", () => {
  beforeEach(() => {
    mocks.deleteEmptyOrder.mockReset();
  });

  it("delegates empty-order delete with trusted commerce context", async () => {
    mocks.deleteEmptyOrder.mockResolvedValue({ success: true });
    await expect(deleteOrder("order-2", context)).resolves.toEqual({ success: true });
    expect(mocks.deleteEmptyOrder).toHaveBeenCalledWith("order-2", context);
  });

  it("surfaces commerce-order conflicts", async () => {
    mocks.deleteEmptyOrder.mockRejectedValue(AppError.conflict("Order with items or payments cannot be deleted. Cancel the order instead."));
    await expect(deleteOrder("order-1", context)).rejects.toBeInstanceOf(AppError);
  });
});
