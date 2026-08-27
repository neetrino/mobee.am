import { describe, expect, it, vi } from "vitest";
import type { CommerceRequestContext } from "../orders/order-transition.types";
import { createAuditLog } from "./write-audit-log";

const context: CommerceRequestContext = {
  requestId: "req-1",
  actorUserId: "admin-1",
  source: "admin",
};

describe("createAuditLog", () => {
  it("writes actor, request, and correlation fields from context", async () => {
    const tx = {
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    await createAuditLog(tx as never, context, {
      action: "inventory.adjust",
      targetType: "ProductVariant",
      targetId: "v1",
      beforeDiff: { stock: 5 },
      afterDiff: { stock: 7 },
      context: { adminReason: "manual-count" },
    });

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: "admin-1",
        action: "inventory.adjust",
        targetType: "ProductVariant",
        targetId: "v1",
        beforeDiff: { stock: 5 },
        afterDiff: { stock: 7 },
        requestId: "req-1",
        correlationId: "req-1",
        context: { adminReason: "manual-count" },
      },
    });
  });
});
